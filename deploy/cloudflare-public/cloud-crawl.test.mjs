import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) globalThis.crypto = webcrypto
if (!globalThis.atob) globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary')

const { default: entry } = await import('./entry.js')
const { handleCloudCrawl } = await import('./cloud-crawl.js')

const AUDIENCE = 'camera-market-cloud-crawl'
const REPOSITORY = 'ronineymessjr-sudo/camera-market-strategy-system'
const REF = 'refs/heads/main'
const WORKFLOW_REF = `${REPOSITORY}/.github/workflows/cloud-crawl.yml@${REF}`
const now = new Date()
const capturedAt = now.toISOString()

class FakeD1 {
  constructor() {
    this.writes = []
    this.latest = null
    this.records = []
  }

  prepare(sql) {
    const statement = {
      sql,
      params: [],
      bind: (...params) => ({
        sql,
        params,
        all: async () => this.read(sql),
      }),
      all: async () => this.read(sql),
    }
    return statement
  }

  async batch(statements) {
    this.writes.push(...statements)
    if (statements.every((statement) => statement.sql.trimStart().startsWith('SELECT'))) {
      return Promise.all(statements.map((statement) => this.read(statement.sql)))
    }
    return statements.map(() => ({ success: true }))
  }

  async read(sql) {
    if (sql.includes('COUNT(*) AS stored_records')) {
      return { results: [{ stored_records: this.records.length, tracked_sources: this.records.length }] }
    }
    if (sql.includes('FROM cloud_crawl_runs')) return { results: this.latest ? [this.latest] : [] }
    return { results: this.records }
  }
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

async function createSigner() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  jwk.kid = 'test-key'
  return { privateKey: pair.privateKey, jwk }
}

async function signClaims(privateKey, overrides = {}) {
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: AUDIENCE,
    repository: REPOSITORY,
    ref: REF,
    workflow_ref: WORKFLOW_REF,
    event_name: 'workflow_dispatch',
    sub: `repo:${REPOSITORY}:ref:${REF}`,
    run_id: '998877',
    run_attempt: '1',
    sha: 'abc123',
    actor: 'ronineymessjr-sudo',
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  }
  const header = { alg: 'RS256', typ: 'JWT', kid: 'test-key' }
  const encodedHeader = base64Url(JSON.stringify(header))
  const encodedClaims = base64Url(JSON.stringify(claims))
  const signingInput = `${encodedHeader}.${encodedClaims}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput),
  )
  return `${signingInput}.${base64Url(Buffer.from(signature))}`
}

function payload(extraRecord = {}) {
  return {
    run: {
      local_run_id: 41,
      status: 'SUCCESS',
      started_at: capturedAt,
      finished_at: capturedAt,
      duration_seconds: 2.5,
      total_count: 1,
      success_count: 1,
      failure_count: 0,
      skipped_count: 0,
    },
    records: [{
      product_id: 1,
      listing_id: 2,
      product_name: 'Test Camera',
      brand: 'Test',
      category: 'camera',
      title: 'Test Camera official price',
      platform: 'official',
      source_url: 'https://example.com/products/test-camera',
      list_price: 4999,
      promotion_price: 4799,
      currency: 'CNY',
      stock_status: 'in_stock',
      verification_status: 'VISIBLE_PRICE',
      confidence_score: 0.9,
      extraction_method: 'structured_data',
      captured_at: capturedAt,
      ...extraRecord,
    }],
  }
}

function request(path, init) {
  return new Request(`https://camera-market-intelligence.photomagic.workers.dev${path}`, init)
}

test('valid GitHub OIDC ingest stores only visible-price records', async () => {
  const signer = await createSigner()
  const db = new FakeD1()
  const token = await signClaims(signer.privateKey)
  const response = await handleCloudCrawl(
    request('/api/cloud-crawl/ingest', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload()),
    }),
    { FEEDBACK_DB: db },
    async () => new Response(JSON.stringify({ keys: [signer.jwk] }), { headers: { 'content-type': 'application/json' } }),
  )
  const body = await response.json()
  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.deepEqual(body.verification_statuses, ['VISIBLE_PRICE'])
  assert.equal(db.writes.length, 3)
  assert.match(db.writes[0].sql, /INSERT INTO cloud_crawl_runs/)
  assert.match(db.writes[2].sql, /INSERT INTO cloud_price_records/)
})

test('OIDC from another repository is rejected before any write', async () => {
  const signer = await createSigner()
  const db = new FakeD1()
  const token = await signClaims(signer.privateKey, { repository: 'someone-else/not-this-repo' })
  const response = await handleCloudCrawl(
    request('/api/cloud-crawl/ingest', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload()),
    }),
    { FEEDBACK_DB: db },
    async () => new Response(JSON.stringify({ keys: [signer.jwk] })),
  )
  assert.equal(response.status, 401)
  assert.equal((await response.json()).error, 'oidc_invalid')
  assert.equal(db.writes.length, 0)
})

test('checkout evidence cannot enter the public crawl store', async () => {
  const signer = await createSigner()
  const db = new FakeD1()
  const token = await signClaims(signer.privateKey)
  const response = await handleCloudCrawl(
    request('/api/cloud-crawl/ingest', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload({ verification_status: 'VERIFIED_CHECKOUT', checkout_price: 4500 })),
    }),
    { FEEDBACK_DB: db },
    async () => new Response(JSON.stringify({ keys: [signer.jwk] })),
  )
  assert.equal(response.status, 422)
  assert.equal((await response.json()).error, 'invalid_record')
  assert.equal(db.writes.length, 0)
})

test('status and prices endpoints return sanitized public data', async () => {
  const db = new FakeD1()
  db.latest = {
    run_key: '998877:1',
    status: 'SUCCESS',
    started_at: capturedAt,
    finished_at: capturedAt,
    duration_seconds: 2.5,
    total_count: 1,
    success_count: 1,
    failure_count: 0,
    skipped_count: 0,
    received_at: capturedAt,
  }
  db.records = [{
    id: 7,
    product_name: 'Test Camera',
    platform: 'official',
    source_url: 'https://example.com/products/test-camera',
    promotion_price: 4799,
    currency: 'CNY',
    verification_status: 'VISIBLE_PRICE',
    captured_at: capturedAt,
  }]
  const status = await handleCloudCrawl(request('/api/cloud-crawl/status'), { FEEDBACK_DB: db })
  const prices = await handleCloudCrawl(request('/api/cloud-crawl/prices?limit=1'), { FEEDBACK_DB: db })
  assert.equal(status.status, 200)
  assert.equal((await status.json()).latest.status, 'SUCCESS')
  assert.equal(prices.status, 200)
  const priceBody = await prices.json()
  assert.equal(priceBody.count, 1)
  assert.equal(priceBody.items[0].verification_status, 'VISIBLE_PRICE')
  assert.match(priceBody.trust, /manual checkout verification/i)
})

test('entry exposes the cloud crawl panel and upgraded health metadata', async () => {
  const health = await entry.fetch(request('/health'), { FEEDBACK_DB: {} })
  const healthBody = await health.json()
  assert.equal(health.status, 200)
  assert.equal(healthBody.version, '0.20-cloud-crawl')
  const home = await entry.fetch(request('/'), {})
  const html = await home.text()
  assert.equal(home.status, 200)
  assert.match(html, /id="cloud-crawl"/)
  assert.match(html, /api\/cloud-crawl\/prices/)
})
