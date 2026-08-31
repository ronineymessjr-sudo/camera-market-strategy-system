const API_PREFIX = '/api/cloud-crawl'
const OIDC_AUDIENCE = 'camera-market-cloud-crawl'
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
const OIDC_JWKS_URL = `${OIDC_ISSUER}/.well-known/jwks`
const EXPECTED_REPOSITORY = 'ronineymessjr-sudo/camera-market-strategy-system'
const EXPECTED_REF = 'refs/heads/main'
const EXPECTED_WORKFLOW_REF = `${EXPECTED_REPOSITORY}/.github/workflows/cloud-crawl.yml@${EXPECTED_REF}`
const ALLOWED_EVENTS = new Set(['schedule', 'workflow_dispatch'])
const MAX_BODY_BYTES = 512 * 1024
const MAX_RECORDS = 200

const API_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
}

class HttpError extends Error {
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

export async function handleCloudCrawl(request, env = {}, fetchImpl = globalThis.fetch) {
  const url = new URL(request.url)
  if (!url.pathname.startsWith(API_PREFIX)) return null

  try {
    if (url.pathname === `${API_PREFIX}/status` && ['GET', 'HEAD'].includes(request.method)) {
      return headSafe(request.method, await cloudCrawlStatus(env))
    }
    if (url.pathname === `${API_PREFIX}/prices` && ['GET', 'HEAD'].includes(request.method)) {
      return headSafe(request.method, await cloudCrawlPrices(url, env))
    }
    if (url.pathname === `${API_PREFIX}/ingest` && request.method === 'POST') {
      return await ingestCloudCrawl(request, env, fetchImpl)
    }
    if ([`${API_PREFIX}/status`, `${API_PREFIX}/prices`, `${API_PREFIX}/ingest`].includes(url.pathname)) {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
    }
    return jsonResponse({ ok: false, error: 'not_found' }, 404)
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ ok: false, error: error.code }, error.status)
    }
    console.error('cloud-crawl request failed', error instanceof Error ? error.message : 'unknown_error')
    return jsonResponse({ ok: false, error: 'internal_error' }, 500)
  }
}

async function cloudCrawlStatus(env) {
  const db = requireDb(env)
  const [latestResult, countResult] = await db.batch([
    db.prepare(
      'SELECT run_key, github_run_id, github_run_attempt, status, started_at, finished_at, duration_seconds, total_count, success_count, failure_count, skipped_count, received_at FROM cloud_crawl_runs ORDER BY received_at DESC LIMIT 1',
    ),
    db.prepare('SELECT COUNT(*) AS stored_records, COUNT(DISTINCT source_url) AS tracked_sources FROM cloud_price_records'),
  ])
  const latest = latestResult?.results?.[0] || null
  const counts = countResult?.results?.[0] || {}
  const lastReceived = parseD1Timestamp(latest?.received_at)
  const ageMinutes = lastReceived ? Math.max(0, Math.round((Date.now() - lastReceived) / 60000)) : null
  return jsonResponse({
    ok: true,
    scheduler: 'github-actions',
    interval_minutes: 120,
    latest,
    age_minutes: ageMinutes,
    stale: ageMinutes == null || ageMinutes > 240,
    stored_records: Number(counts.stored_records || 0),
    tracked_sources: Number(counts.tracked_sources || 0),
  }, 200, { 'cache-control': 'public, max-age=60' })
}

async function cloudCrawlPrices(url, env) {
  const db = requireDb(env)
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 200)) : 50
  const platform = cleanText(url.searchParams.get('platform'), 40)
  const result = await db.prepare(`
    WITH ranked AS (
      SELECT id, run_key, product_id, listing_id, product_name, brand, category, title,
             platform, source_url, list_price, promotion_price, currency, stock_status,
             verification_status, confidence_score, extraction_method, needs_review, captured_at,
             ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY captured_at DESC, id DESC) AS position
      FROM cloud_price_records
    )
    SELECT id, run_key, product_id, listing_id, product_name, brand, category, title,
           platform, source_url, list_price, promotion_price, currency, stock_status,
           verification_status, confidence_score, extraction_method, needs_review, captured_at
    FROM ranked
    WHERE position = 1 AND (?1 = '' OR platform = ?1)
    ORDER BY captured_at DESC, id DESC
    LIMIT ?2
  `).bind(platform, limit).all()
  return jsonResponse({
    ok: true,
    count: result.results?.length || 0,
    items: result.results || [],
    trust: 'VISIBLE_PRICE clues only; manual checkout verification is required for strategy triggers.',
  }, 200, { 'cache-control': 'public, max-age=300' })
}

async function ingestCloudCrawl(request, env, fetchImpl) {
  const db = requireDb(env)
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large')

  const token = bearerToken(request.headers.get('authorization'))
  if (!token) throw new HttpError(401, 'oidc_required')
  const claims = await verifyGitHubOidc(token, fetchImpl)

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, 'payload_too_large')
  }
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_json')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'invalid_payload')
  }

  const run = normalizeRun(payload.run)
  const values = Array.isArray(payload.records) ? payload.records : []
  if (!run || values.length > MAX_RECORDS) throw new HttpError(422, 'invalid_payload')
  const records = values.map(normalizeRecord)
  if (records.some((record) => !record)) throw new HttpError(422, 'invalid_record')

  const runKey = `${claims.run_id}:${claims.run_attempt}`
  const statements = [
    db.prepare(`
      INSERT INTO cloud_crawl_runs (
        run_key, github_run_id, github_run_attempt, repository, ref, commit_sha,
        workflow_ref, event_name, actor, local_run_id, status, started_at, finished_at,
        duration_seconds, total_count, success_count, failure_count, skipped_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_key) DO UPDATE SET
        commit_sha = excluded.commit_sha, actor = excluded.actor, local_run_id = excluded.local_run_id,
        status = excluded.status, started_at = excluded.started_at, finished_at = excluded.finished_at,
        duration_seconds = excluded.duration_seconds, total_count = excluded.total_count,
        success_count = excluded.success_count, failure_count = excluded.failure_count,
        skipped_count = excluded.skipped_count, received_at = CURRENT_TIMESTAMP
    `).bind(
      runKey, String(claims.run_id), Number(claims.run_attempt), EXPECTED_REPOSITORY, EXPECTED_REF,
      String(claims.sha || ''), EXPECTED_WORKFLOW_REF, String(claims.event_name), String(claims.actor || ''),
      run.local_run_id, run.status, run.started_at, run.finished_at, run.duration_seconds,
      run.total_count, run.success_count, run.failure_count, run.skipped_count,
    ),
    db.prepare('DELETE FROM cloud_price_records WHERE run_key = ?').bind(runKey),
    ...records.map((record) => db.prepare(`
      INSERT INTO cloud_price_records (
        run_key, product_id, listing_id, product_name, brand, category, title, platform,
        source_url, list_price, promotion_price, currency, stock_status, verification_status,
        confidence_score, extraction_method, needs_review, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      runKey, record.product_id, record.listing_id, record.product_name, record.brand,
      record.category, record.title, record.platform, record.source_url, record.list_price,
      record.promotion_price, record.currency, record.stock_status, record.verification_status,
      record.confidence_score, record.extraction_method, record.captured_at,
    )),
  ]
  const results = await db.batch(statements)
  if (results.some((result) => result?.success === false)) throw new HttpError(500, 'database_write_failed')
  return jsonResponse({
    ok: true,
    run_key: runKey,
    status: run.status,
    record_count: records.length,
    verification_statuses: [...new Set(records.map((record) => record.verification_status))],
  }, 201)
}

export async function verifyGitHubOidc(token, fetchImpl = globalThis.fetch) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new HttpError(401, 'oidc_invalid')
  let header
  let claims
  try {
    header = decodeJwtJson(parts[0])
    claims = decodeJwtJson(parts[1])
  } catch {
    throw new HttpError(401, 'oidc_invalid')
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new HttpError(401, 'oidc_invalid')
  }

  let jwks
  try {
    const response = await fetchImpl(OIDC_JWKS_URL, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error('jwks_unavailable')
    jwks = await response.json()
  } catch {
    throw new HttpError(503, 'oidc_provider_unavailable')
  }
  const jwk = Array.isArray(jwks?.keys) ? jwks.keys.find((key) => key.kid === header.kid) : null
  if (!jwk) throw new HttpError(401, 'oidc_invalid')

  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    if (!verified) throw new Error('signature_invalid')
  } catch {
    throw new HttpError(401, 'oidc_invalid')
  }

  const now = Math.floor(Date.now() / 1000)
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (
    claims.iss !== OIDC_ISSUER || !audience.includes(OIDC_AUDIENCE)
    || claims.repository !== EXPECTED_REPOSITORY || claims.ref !== EXPECTED_REF
    || claims.workflow_ref !== EXPECTED_WORKFLOW_REF || !ALLOWED_EVENTS.has(claims.event_name)
    || claims.sub !== `repo:${EXPECTED_REPOSITORY}:ref:${EXPECTED_REF}`
    || !/^\d+$/.test(String(claims.run_id || '')) || !/^\d+$/.test(String(claims.run_attempt || ''))
    || !Number.isFinite(Number(claims.exp)) || Number(claims.exp) < now - 60
    || !Number.isFinite(Number(claims.iat)) || Number(claims.iat) > now + 60
    || (claims.nbf != null && Number(claims.nbf) > now + 60)
  ) {
    throw new HttpError(401, 'oidc_invalid')
  }
  return claims
}

function normalizeRun(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const statuses = new Set(['SUCCESS', 'PARTIAL', 'FAILED'])
  const status = statuses.has(value.status) ? value.status : null
  const startedAt = nullableIso(value.started_at)
  const finishedAt = nullableIso(value.finished_at)
  if (!status || (value.started_at && !startedAt) || (value.finished_at && !finishedAt)) return null
  return {
    local_run_id: positiveInteger(value.local_run_id),
    status,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: boundedNumber(value.duration_seconds, 0, 86400),
    total_count: nonNegativeInteger(value.total_count),
    success_count: nonNegativeInteger(value.success_count),
    failure_count: nonNegativeInteger(value.failure_count),
    skipped_count: nonNegativeInteger(value.skipped_count),
  }
}

function normalizeRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (['checkout_price', 'verified_at', 'verified_by', 'evidence'].some((field) => value[field] != null)) return null
  const productName = cleanText(value.product_name, 160)
  const sourceUrl = httpsUrl(value.source_url)
  const capturedAt = nullableIso(value.captured_at)
  const statuses = new Set(['VISIBLE_PRICE', 'UNVERIFIED'])
  if (!productName || !sourceUrl || !capturedAt || !statuses.has(value.verification_status)) return null
  const listPrice = nullablePrice(value.list_price)
  const promotionPrice = nullablePrice(value.promotion_price)
  const confidenceScore = value.confidence_score == null
    ? null
    : boundedNumber(value.confidence_score, 0, 1)
  if ((value.list_price != null && listPrice == null) || (value.promotion_price != null && promotionPrice == null)) return null
  if (value.confidence_score != null && confidenceScore == null) return null
  return {
    product_id: positiveInteger(value.product_id),
    listing_id: positiveInteger(value.listing_id),
    product_name: productName,
    brand: cleanText(value.brand, 80),
    category: cleanText(value.category, 80),
    title: cleanText(value.title, 500),
    platform: cleanText(value.platform, 40),
    source_url: sourceUrl,
    list_price: listPrice,
    promotion_price: promotionPrice,
    currency: cleanText(value.currency, 12).toUpperCase(),
    stock_status: cleanText(value.stock_status, 80),
    verification_status: value.verification_status,
    confidence_score: confidenceScore,
    extraction_method: cleanText(value.extraction_method, 80),
    captured_at: capturedAt,
  }
}

function requireDb(env) {
  if (!env.FEEDBACK_DB) throw new HttpError(503, 'cloud_crawl_store_unavailable')
  return env.FEEDBACK_DB
}

function bearerToken(value) {
  if (typeof value !== 'string') return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function httpsUrl(value) {
  if (typeof value !== 'string' || value.length > 1000) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function positiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function nonNegativeInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 10000 ? number : 0
}

function boundedNumber(value, min, max) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

function nullablePrice(value) {
  return value == null ? null : boundedNumber(value, 0, 1_000_000_000)
}

function nullableIso(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString()
}

function parseD1Timestamp(value) {
  if (typeof value !== 'string') return null
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function decodeJwtJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)))
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function headSafe(method, response) {
  return method === 'HEAD' ? new Response(null, response) : response
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { ...API_HEADERS, 'cache-control': 'no-store', ...extraHeaders },
  })
}
