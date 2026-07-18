const GITHUB_URL = 'https://github.com/ronineymessjr-sudo/camera-market-strategy-system'
const SETUP_GUIDE_URL = `${GITHUB_URL}/blob/main/docs/API_KEY_APPLICATION_GUIDE.md`

const CONNECTORS = [
  { provider: 'jd', display_name: 'JD Union', required_env: ['JD_APP_KEY', 'JD_APP_SECRET', 'JD_UNION_ID'] },
  { provider: 'taobao', display_name: 'Taobao Alliance', required_env: ['TAOBAO_APP_KEY', 'TAOBAO_APP_SECRET', 'TAOBAO_ADZONE_ID'] },
  { provider: 'pdd', display_name: 'PDD Duoduo Jinbao', required_env: ['PDD_CLIENT_ID', 'PDD_CLIENT_SECRET', 'PDD_PID'] },
  { provider: 'ebay', display_name: 'eBay Browse API', required_env: ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'] },
  { provider: 'amazon', display_name: 'Amazon Creators API', required_env: ['AMAZON_CREDENTIAL_ID', 'AMAZON_CREDENTIAL_SECRET', 'AMAZON_PARTNER_TAG'] },
].map((connector) => ({
  ...connector,
  credential_mode: 'bring_your_own',
  secret_storage: 'private_backend_environment',
  setup_guide: SETUP_GUIDE_URL,
}))

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy': [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "img-src data:",
    "connect-src 'self'",
    "font-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}

const COPY = {
  en: {
    htmlLang: 'en',
    title: 'Camera Market Intelligence — Verified price evidence',
    description: 'Track camera-market prices, verify checkout evidence, and turn trusted data into reviewable strategy signals.',
    brand: 'Camera Market',
    brandSub: 'VERIFIED PRICE INTELLIGENCE',
    navSource: 'Source code',
    navConnect: 'Connect APIs',
    navLaunch: 'Open command center',
    navPreview: 'Private command center',
    eyebrow: 'REAL PRICE · VERIFIED EVIDENCE · HUMAN DECISION',
    headline: 'See the real price.\nDecide with evidence.',
    sub: 'A camera-market research system that separates visible price clues from checkout-verified evidence. It never buys automatically.',
    primary: 'Open command center',
    secondary: 'View source',
    connectCta: 'Connect your data',
    connectTitle: 'Bring your own marketplace access',
    connectBody: 'Every operator connects credentials issued to their own platform account. This public site never asks for, receives, or stores those keys.',
    connectStorage: 'Store the listed variables only in your private backend environment, restart it, then check the connector catalog for configuration status.',
    connectGuide: 'Open setup guide',
    connectApi: 'Connector catalog API',
    gateTitle: 'Evidence gate',
    gateBody: 'Only a fresh VERIFIED_CHECKOUT record can trigger an actionable strategy signal.',
    clueTitle: 'Visible price clue',
    clueBody: 'Search and marketplace prices remain review candidates until checkout is verified.',
    humanTitle: 'Human control',
    humanBody: 'Every decision stays with the operator. The system records evidence and explains signals.',
    feedbackTitle: 'Help shape the public beta',
    feedbackBody: 'Share what is unclear, missing, or useful. Feedback is stored anonymously; do not include personal or account information.',
    categoryLabel: 'Feedback type',
    categories: [['general', 'General'], ['data', 'Data coverage'], ['usability', 'Usability'], ['translation', 'Translation']],
    messageLabel: 'Your feedback',
    placeholder: 'What should we improve next?',
    privacy: 'Anonymous feedback only. No email, phone number, IP address, or account credentials are requested.',
    send: 'Send feedback',
    sending: 'Sending…',
    success: 'Thank you. Your feedback is now in the review queue.',
    error: 'Feedback could not be sent. Please try again.',
  },
  zh: {
    htmlLang: 'zh-CN',
    title: '相机市场情报 — 可核验的价格证据',
    description: '追踪相机市场价格，核验结算证据，并将可信数据转化为可复核的策略信号。',
    brand: '相机市场情报',
    brandSub: '可核验价格智能',
    navSource: '源代码',
    navConnect: '接入 API',
    navLaunch: '打开指挥中心',
    navPreview: '私有指挥中心',
    eyebrow: '真实价格 · 可核验证据 · 人工决策',
    headline: '看见真实价格，\n再用证据做决定。',
    sub: '一套把网页可见价格线索与结算核验证据严格分开的相机市场研究系统。系统不会自动下单。',
    primary: '打开指挥中心',
    secondary: '查看源代码',
    connectCta: '接入你自己的数据',
    connectTitle: '每个人接入自己的平台账号',
    connectBody: '每位使用者使用自己申请的平台凭据。公开网站不会要求、接收或保存任何密钥。',
    connectStorage: '只需把下列变量保存在自己的私有后端环境中，重启后端，再通过统一目录查看配置状态。',
    connectGuide: '打开接入指南',
    connectApi: '连接器目录 API',
    gateTitle: '证据闸门',
    gateBody: '只有新鲜的 VERIFIED_CHECKOUT 记录才能触发可执行策略信号。',
    clueTitle: '可见价格线索',
    clueBody: '搜索页和平台价格在完成结算核验前，只进入人工复核队列。',
    humanTitle: '人工控制',
    humanBody: '所有决策都由操作员完成。系统只负责记录证据并解释信号。',
    feedbackTitle: '一起完善公开测试版',
    feedbackBody: '告诉我们哪里不清楚、缺了什么或哪些功能有用。反馈匿名保存，请勿填写个人或账户信息。',
    categoryLabel: '反馈类型',
    categories: [['general', '综合反馈'], ['data', '数据覆盖'], ['usability', '使用体验'], ['translation', '翻译问题']],
    messageLabel: '你的反馈',
    placeholder: '下一步最应该改进什么？',
    privacy: '仅收集匿名反馈，不要求邮箱、手机号、IP 地址或任何账户凭据。',
    send: '提交反馈',
    sending: '提交中…',
    success: '谢谢，反馈已进入集中复核队列。',
    error: '反馈提交失败，请稍后重试。',
  },
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()

    if (url.pathname === '/api/workspace/items' && method === 'GET') {
      return listWorkspaceItems(request, env)
    }

    if (url.pathname === '/api/workspace/items' && method === 'POST') {
      return createWorkspaceItem(request, env)
    }

    if (url.pathname === '/api/workspace/import' && method === 'POST') {
      return importWorkspaceItems(request, env)
    }

    if (url.pathname.startsWith('/api/workspace/items/') && method === 'DELETE') {
      return deleteWorkspaceItem(request, env, url.pathname.split('/').pop())
    }

    if (url.pathname === '/api/feedback' && method === 'POST') {
      return submitFeedback(request, env)
    }

    if (url.pathname === '/api/feedback/status' && method === 'GET') {
      return feedbackStatus(env)
    }

    if (url.pathname === '/api/connectors' && method === 'GET') {
      return jsonResponse({
        ok: true,
        credential_mode: 'bring_your_own',
        accepts_credentials: false,
        connectors: CONNECTORS,
      })
    }

    if (!['GET', 'HEAD'].includes(method)) {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD, POST' })
    }

    if (url.pathname === '/health') {
      return headSafe(method, jsonResponse({
        ok: true,
        service: 'camera-market-public-beta',
        version: '0.19-workbench',
        feedback_store: Boolean(env.FEEDBACK_DB),
        workspace_store: Boolean(env.FEEDBACK_DB),
        app_configured: /^https:\/\//.test(env.APP_URL || ''),
      }))
    }

    if (url.pathname === '/robots.txt') {
      return headSafe(method, textResponse(`User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`, 'text/plain; charset=utf-8'))
    }

    if (url.pathname === '/sitemap.xml') {
      return headSafe(method, textResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`, 'application/xml; charset=utf-8'))
    }

    if (url.pathname === '/llms.txt') {
      return headSafe(method, textResponse(`# Camera Market Strategy System\n\nA bilingual public beta for verified camera-market price intelligence. Each operator brings credentials from their own marketplace accounts; the public site never collects keys. Visible prices are clues only. A strategy can trigger only from fresh VERIFIED_CHECKOUT evidence. The system never purchases automatically.\n\nConnector catalog: ${url.origin}/api/connectors\nSource: ${GITHUB_URL}\n`, 'text/plain; charset=utf-8'))
    }

    if (!['/', '/index.html', '/about'].includes(url.pathname)) {
      return headSafe(method, jsonResponse({ ok: false, error: 'not_found', path: url.pathname }, 404))
    }

    const locale = selectLocale(url, request.headers.get('accept-language'))
    const html = url.pathname === '/about'
      ? renderPage(url.origin, env.APP_URL || '', locale)
      : renderWorkbench(url.origin, locale)
    const response = new Response(html, {
      headers: pageHeaders(),
    })
    return headSafe(method, response)
  },
}

function workspaceKey(request) {
  const value = request.headers.get('x-workspace-id') || ''
  return /^[a-f0-9]{32}$/.test(value) ? value : null
}

function workspaceStore(env) {
  return env.FEEDBACK_DB || null
}

async function parseJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function normalizeWorkspaceItem(value) {
  if (!value || typeof value !== 'object') return null
  const text = (field, max) => typeof value[field] === 'string' ? value[field].trim().slice(0, max) : ''
  const number = (field) => {
    if (value[field] === '' || value[field] == null) return null
    const parsed = Number(value[field])
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  }
  const name = text('name', 160)
  if (!name) return null
  const sourceUrl = text('source_url', 1000)
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return null
  return {
    name,
    brand: text('brand', 80),
    platform: text('platform', 40),
    source_url: sourceUrl,
    current_price: number('current_price'),
    trigger_price: number('trigger_price'),
    strong_buy_price: number('strong_buy_price'),
    notes: text('notes', 500),
  }
}

async function listWorkspaceItems(request, env) {
  const key = workspaceKey(request)
  const db = workspaceStore(env)
  if (!key) return jsonResponse({ ok: false, error: 'invalid_workspace' }, 401)
  if (!db) return jsonResponse({ ok: false, error: 'workspace_store_unavailable' }, 503)
  const result = await db.prepare(
    'SELECT id, name, brand, platform, source_url, current_price, trigger_price, strong_buy_price, notes, created_at, updated_at FROM workspace_watchlist WHERE workspace_key = ? ORDER BY updated_at DESC, id DESC',
  ).bind(key).all()
  return jsonResponse({ ok: true, items: result.results || [] })
}

async function createWorkspaceItem(request, env) {
  const key = workspaceKey(request)
  const db = workspaceStore(env)
  if (!key) return jsonResponse({ ok: false, error: 'invalid_workspace' }, 401)
  if (!db) return jsonResponse({ ok: false, error: 'workspace_store_unavailable' }, 503)
  const item = normalizeWorkspaceItem(await parseJson(request))
  if (!item) return jsonResponse({ ok: false, error: 'invalid_item' }, 422)
  const result = await insertWorkspaceItem(db, key, item)
  return jsonResponse({ ok: true, id: result.meta?.last_row_id ?? null }, 201)
}

async function importWorkspaceItems(request, env) {
  const key = workspaceKey(request)
  const db = workspaceStore(env)
  if (!key) return jsonResponse({ ok: false, error: 'invalid_workspace' }, 401)
  if (!db) return jsonResponse({ ok: false, error: 'workspace_store_unavailable' }, 503)
  const body = await parseJson(request)
  const values = Array.isArray(body?.items) ? body.items : []
  if (!values.length || values.length > 200) return jsonResponse({ ok: false, error: 'invalid_import_size', max: 200 }, 422)
  const items = values.map(normalizeWorkspaceItem)
  if (items.some((item) => !item)) return jsonResponse({ ok: false, error: 'invalid_item' }, 422)
  const statements = items.map((item) => workspaceInsert(db).bind(key, ...workspaceValues(item)))
  const results = await db.batch(statements)
  if (results.some((result) => !result.success)) return jsonResponse({ ok: false, error: 'import_failed' }, 500)
  return jsonResponse({ ok: true, imported: results.length }, 201)
}

async function deleteWorkspaceItem(request, env, rawId) {
  const key = workspaceKey(request)
  const db = workspaceStore(env)
  const id = Number(rawId)
  if (!key) return jsonResponse({ ok: false, error: 'invalid_workspace' }, 401)
  if (!db) return jsonResponse({ ok: false, error: 'workspace_store_unavailable' }, 503)
  if (!Number.isInteger(id) || id < 1) return jsonResponse({ ok: false, error: 'invalid_item_id' }, 422)
  await db.prepare('DELETE FROM workspace_watchlist WHERE id = ? AND workspace_key = ?').bind(id, key).run()
  return jsonResponse({ ok: true })
}

function workspaceInsert(db) {
  return db.prepare('INSERT INTO workspace_watchlist (workspace_key, name, brand, platform, source_url, current_price, trigger_price, strong_buy_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
}

function workspaceValues(item) {
  return [item.name, item.brand, item.platform, item.source_url, item.current_price, item.trigger_price, item.strong_buy_price, item.notes]
}

async function insertWorkspaceItem(db, key, item) {
  return workspaceInsert(db).bind(key, ...workspaceValues(item)).run()
}

async function submitFeedback(request, env) {
  if (!env.FEEDBACK_DB) return jsonResponse({ ok: false, error: 'feedback_store_unavailable' }, 503)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 8192) return jsonResponse({ ok: false, error: 'payload_too_large' }, 413)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400)
  }

  if (body.website) return jsonResponse({ ok: true })
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const locale = body.locale === 'zh' ? 'zh' : 'en'
  const categories = new Set(['general', 'data', 'usability', 'translation'])
  const category = categories.has(body.category) ? body.category : 'general'
  const page = typeof body.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 200) : '/'

  if (message.length < 10 || message.length > 2000) {
    return jsonResponse({ ok: false, error: 'message_length', min: 10, max: 2000 }, 422)
  }

  const result = await env.FEEDBACK_DB.prepare(
    'INSERT INTO feedback (message, locale, category, page) VALUES (?, ?, ?, ?)',
  ).bind(message, locale, category, page).run()

  if (!result.success) return jsonResponse({ ok: false, error: 'feedback_store_failed' }, 500)
  return jsonResponse({ ok: true, id: result.meta?.last_row_id ?? null }, 201)
}

async function feedbackStatus(env) {
  if (!env.FEEDBACK_DB) return jsonResponse({ ok: false, error: 'feedback_store_unavailable' }, 503)
  const summary = await env.FEEDBACK_DB.prepare(
    "SELECT COUNT(*) AS total, MAX(created_at) AS latest FROM feedback WHERE status = 'NEW'",
  ).first()
  return jsonResponse({ ok: true, pending: Number(summary?.total || 0), latest: summary?.latest || null })
}

function selectLocale(url, acceptLanguage = '') {
  const requested = url.searchParams.get('lang')
  if (requested === 'zh' || requested === 'en') return requested
  return /^zh\b/i.test(acceptLanguage) ? 'zh' : 'en'
}

function headSafe(method, response) {
  return method === 'HEAD' ? new Response(null, response) : response
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { ...SECURITY_HEADERS, 'cache-control': 'no-store', ...extraHeaders },
  })
}

function textResponse(body, contentType) {
  return new Response(body, {
    headers: { ...SECURITY_HEADERS, 'content-type': contentType, 'cache-control': 'public, max-age=300' },
  })
}

function pageHeaders() {
  return {
    ...SECURITY_HEADERS,
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=60, stale-while-revalidate=300',
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
}

function renderWorkbench(origin, locale) {
  const zh = locale === 'zh'
  const copy = zh ? {
    title: '影价追踪｜相机市场操作台', brand: '影价追踪', subbrand: 'VERIFIED PRICE INTELLIGENCE',
    overview: '总览', products: '商品与链接', strategy: '策略', reports: '日报', connectors: '接入 API', about: '项目介绍',
    search: '搜索已记录的商品、品牌或平台…', workspace: '浏览器专属数据空间', heroKicker: '真实数据操作台', heroTitle: '把商品与价格\n真正记录进去',
    heroBody: '这是昨天那套浅米白色操作界面。你可以手动添加，也可以导入 CSV 或 JSON；数据会保存到独立的云端工作区。',
    add: '添加商品', import: '导入数据', empty: '还没有商品。添加一条，或导入现有清单。', saved: '云端已保存', loading: '正在读取数据…',
    tracked: '已记录商品', priced: '已有价格', triggered: '达到触发价', sources: '数据平台', desk: '商品与价格工作台', deskSub: '这里才是日常录入、导入和管理数据的主入口。',
    name: '商品名称', brandLabel: '品牌', platform: '平台', url: '商品链接', current: '当前价格', trigger: '触发价格', strong: '强买价格', notes: '备注', actions: '操作', remove: '删除',
    save: '保存到云端', cancel: '取消', manualTitle: '手动录入商品', importTitle: '批量导入 CSV 或 JSON', importHelp: 'CSV 表头：name,brand,platform,source_url,current_price,trigger_price,strong_buy_price,notes；最多 200 条。', importNow: '导入并保存',
    successAdd: '商品已记录。', successImport: '数据已导入。', failed: '操作失败，请稍后重试。', price: '价格', noPrice: '待补充', language: 'EN', langCode: 'en',
  } : {
    title: 'Camera Market | Operator Workbench', brand: 'Camera Market', subbrand: 'VERIFIED PRICE INTELLIGENCE',
    overview: 'Overview', products: 'Products & links', strategy: 'Strategies', reports: 'Reports', connectors: 'Connect APIs', about: 'About',
    search: 'Search saved products, brands, or platforms…', workspace: 'Browser-specific cloud workspace', heroKicker: 'REAL DATA WORKBENCH', heroTitle: 'Put products and prices\ninto the system',
    heroBody: 'The cream operator interface is back. Add items manually or import CSV or JSON; records are stored in an isolated cloud workspace for this browser.',
    add: 'Add product', import: 'Import data', empty: 'No products yet. Add one or import your existing list.', saved: 'Saved in cloud', loading: 'Loading data…',
    tracked: 'Tracked products', priced: 'With prices', triggered: 'At trigger price', sources: 'Platforms', desk: 'Product and price workbench', deskSub: 'The main place to enter, import, and manage working data.',
    name: 'Product name', brandLabel: 'Brand', platform: 'Platform', url: 'Product URL', current: 'Current price', trigger: 'Trigger price', strong: 'Strong-buy price', notes: 'Notes', actions: 'Actions', remove: 'Delete',
    save: 'Save to cloud', cancel: 'Cancel', manualTitle: 'Add a product', importTitle: 'Import CSV or JSON', importHelp: 'CSV headers: name,brand,platform,source_url,current_price,trigger_price,strong_buy_price,notes. Up to 200 items.', importNow: 'Import and save',
    successAdd: 'Product saved.', successImport: 'Data imported.', failed: 'The operation failed. Please try again.', price: 'Price', noPrice: 'Missing', language: '中文', langCode: 'zh',
  }
  const c = Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, escapeHtml(value)]))
  const heroTitle = c.heroTitle.split('\n').join('<br>')
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.title}</title>
<meta name="description" content="${c.heroBody}"><link rel="canonical" href="${origin}/"><meta name="theme-color" content="#f4efe5">
<style>
:root{color-scheme:light;--paper:#f4efe5;--paper-2:#fffaf1;--ink:#15120e;--muted:#746b5f;--line:#cfc5b5;--blue:#245cff;--shadow:#584b3822;font-family:Georgia,"Noto Serif SC","Songti SC",serif}*{box-sizing:border-box}html{background:var(--paper);color:var(--ink)}body{margin:0;min-height:100vh;background:radial-gradient(circle at 24% 4%,#fff 0,transparent 25%),linear-gradient(135deg,#f7f3ea,#dcd5c8 52%,#f8f5ee)}button,input,textarea{font:inherit}.app{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:100vh}.side{position:sticky;top:0;height:100vh;padding:24px 14px;background:#f7f3ea;border-right:1px solid var(--line);display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:11px;padding:0 8px 26px;color:inherit;text-decoration:none}.mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#111;color:#fff;font-weight:800}.brand strong,.brand small{display:block}.brand small{margin-top:3px;color:#766d60;font-size:8px;letter-spacing:.14em}.nav{display:grid;gap:5px}.nav a{display:flex;gap:12px;align-items:center;padding:11px 12px;border-radius:8px;color:#5b5145;text-decoration:none;font-size:12px;font-weight:700}.nav a span{width:20px;color:#928575;font-size:9px}.nav a.active{background:#111;color:#fff;box-shadow:0 10px 28px #0002}.nav a.active span{color:#d8c9ae}.side-status{margin-top:auto;padding:14px;border:1px solid var(--line);border-radius:12px;background:#fffaf2}.side-status b,.side-status small{display:block}.side-status small{margin-top:5px;color:var(--muted);font-size:9px;line-height:1.45}.main{min-width:0}.top{position:sticky;top:0;z-index:10;height:64px;padding:0 24px;border-bottom:1px solid var(--line);background:#f7f3eae8;backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:space-between;gap:16px}.search{width:min(560px,55vw);border:1px solid var(--line);background:#fffaf2;border-radius:999px;padding:11px 15px;color:var(--muted)}.top-actions{display:flex;align-items:center;gap:9px}.top-actions a,.top-actions span{padding:9px 12px;border:1px solid var(--line);border-radius:999px;color:#3f382f;text-decoration:none;font-size:10px;background:#fffaf2}.content{max-width:1380px;margin:auto;padding:24px}.hero{position:relative;overflow:hidden;min-height:430px;padding:38px;border:1px solid #bfb4a3;border-radius:18px;background:linear-gradient(128deg,#fbf7ed 0,#efe6d7 58%,#171717 59%,#050505 100%);box-shadow:0 32px 80px var(--shadow);display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:32px;align-items:center}.hero-copy{position:relative;z-index:1}.kicker{color:#776a59;font-size:9px;letter-spacing:.19em;text-transform:uppercase}.hero h1{max-width:760px;margin:14px 0 16px;font-size:clamp(36px,4vw,62px);line-height:.95;letter-spacing:-.045em}.hero p{max-width:660px;margin:0;color:#5b5145;font-size:15px;line-height:1.7}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.btn{min-height:42px;padding:0 16px;border:1px solid #17130f;border-radius:999px;background:#fffaf1;color:#17130f;font-weight:800;font-size:11px;cursor:pointer}.btn.primary{border-radius:9px;border-color:var(--blue);background:var(--blue);color:#fff;box-shadow:0 12px 28px #245cff35}.focus{position:relative;z-index:1;min-height:300px;padding:22px;border:1px solid #ffffff26;border-radius:26px;background:#090909e8;color:#f7f2e9;box-shadow:0 28px 70px #0008;display:flex;flex-direction:column;justify-content:space-between}.focus small{color:#a69d90;font-size:9px;letter-spacing:.12em}.focus strong{display:block;margin-top:10px;font-size:28px;line-height:1.2}.focus-price{padding-top:20px;border-top:1px solid #ffffff24;display:flex;justify-content:space-between;gap:12px}.focus-price b{font-size:32px}.focus-price span{color:#bdb4a7;font-size:11px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.metric{padding:18px;border:1px solid var(--line);border-radius:12px;background:#fffaf2;box-shadow:0 16px 40px var(--shadow)}.metric span,.metric small{display:block;color:var(--muted);font-size:10px}.metric strong{display:block;margin:8px 0 5px;font-size:30px}.panel{padding:22px;border:1px solid var(--line);border-radius:14px;background:#fffaf2;box-shadow:0 18px 48px var(--shadow)}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.panel-head h2{margin:0;font-size:23px}.panel-head p{margin:6px 0 0;color:var(--muted);font-size:12px}.panel-actions{display:flex;gap:8px}.table-wrap{overflow:auto;border:1px solid #d8cfc1;border-radius:11px}.data{width:100%;border-collapse:collapse;min-width:920px}.data th{padding:12px;text-align:left;background:#eee5d7;color:#655c51;font-size:10px}.data td{padding:13px 12px;border-top:1px solid #e1d8cb;font-size:12px}.data tr:hover td{background:#f7efe3}.product b,.product small{display:block}.product small{margin-top:4px;color:var(--muted);font-size:9px}.price{font-weight:800}.delete{border:0;background:transparent;color:#8b4a42;cursor:pointer;font-size:10px}.empty{padding:48px;text-align:center;color:var(--muted)}dialog{width:min(680px,calc(100% - 24px));border:1px solid var(--line);border-radius:16px;background:#fffaf2;color:var(--ink);box-shadow:0 30px 100px #0005}dialog::backdrop{background:#1118;backdrop-filter:blur(4px)}dialog h2{margin:0 0 18px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-grid label{display:grid;gap:6px;color:#5d5449;font-size:11px}.form-grid label.full{grid-column:1/-1}.form-grid input,.form-grid textarea,.import-box{width:100%;border:1px solid var(--line);border-radius:9px;background:#fffdf8;color:#17130f;padding:11px}.form-grid textarea,.import-box{min-height:110px;resize:vertical}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.help,.status{color:var(--muted);font-size:11px;line-height:1.55}.status{min-height:18px;margin:12px 0 0;color:#2f6b4d}.loading{opacity:.65}.reveal{animation:rise .55s cubic-bezier(.2,.7,.2,1) both}.metrics .metric:nth-child(2){animation-delay:.05s}.metrics .metric:nth-child(3){animation-delay:.1s}.metrics .metric:nth-child(4){animation-delay:.15s}@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@media(max-width:900px){.app{grid-template-columns:76px 1fr}.brand div,.nav a:not(.active){font-size:0}.nav a{justify-content:center}.side-status{display:none}.hero{grid-template-columns:1fr;min-height:auto}.focus{min-height:220px}.metrics{grid-template-columns:1fr 1fr}}@media(max-width:650px){.app{display:block}.side{display:none}.top{height:auto;padding:10px;align-items:stretch;flex-direction:column}.search{width:100%}.top-actions{justify-content:space-between}.content{padding:10px 10px 80px}.hero{padding:20px 14px;background:linear-gradient(180deg,#fbf7ed 0,#efe6d7 59%,#111 60%,#050505 100%)}.hero h1{font-size:38px}.hero p{font-size:13px}.focus{min-height:190px}.metrics{grid-template-columns:1fr 1fr;gap:8px}.metric{padding:13px}.metric strong{font-size:24px}.panel{padding:14px}.panel-head{display:block}.panel-actions{margin-top:12px}.form-grid{grid-template-columns:1fr}.form-grid label.full{grid-column:auto}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head><body><div class="app"><aside class="side"><a class="brand" href="/?lang=${locale}"><span class="mark">CM</span><div><strong>${c.brand}</strong><small>${c.subbrand}</small></div></a><nav class="nav"><a class="active" href="#overview"><span>01</span>${c.overview}</a><a href="#workbench"><span>02</span>${c.products}</a><a href="#workbench"><span>03</span>${c.strategy}</a><a href="#workbench"><span>04</span>${c.reports}</a><a href="/api/connectors"><span>05</span>${c.connectors}</a><a href="/about?lang=${locale}"><span>06</span>${c.about}</a></nav><div class="side-status"><b>${c.saved}</b><small>${c.workspace}</small></div></aside><div class="main"><header class="top"><input class="search" id="search" placeholder="${c.search}" aria-label="${c.search}"><div class="top-actions"><span id="cloud-state">${c.loading}</span><a href="/?lang=${c.langCode}">${c.language}</a></div></header><main class="content"><section class="hero reveal" id="overview"><div class="hero-copy"><div class="kicker">${c.heroKicker}</div><h1>${heroTitle}</h1><p>${c.heroBody}</p><div class="hero-actions"><button class="btn primary" id="open-add">${c.add}</button><button class="btn" id="open-import">${c.import}</button></div></div><div class="focus"><div><small>TOP WATCH ITEM</small><strong id="focus-name">${c.empty}</strong></div><div class="focus-price"><div><small>${c.current}</small><b id="focus-price">—</b></div><span id="focus-platform">${c.workspace}</span></div></div></section><section class="metrics"><article class="metric reveal"><span>${c.tracked}</span><strong id="metric-total">0</strong><small>${c.saved}</small></article><article class="metric reveal"><span>${c.priced}</span><strong id="metric-priced">0</strong><small>${c.price}</small></article><article class="metric reveal"><span>${c.triggered}</span><strong id="metric-triggered">0</strong><small>${c.strategy}</small></article><article class="metric reveal"><span>${c.sources}</span><strong id="metric-platforms">0</strong><small>${c.connectors}</small></article></section><section class="panel reveal" id="workbench"><div class="panel-head"><div><h2>${c.desk}</h2><p>${c.deskSub}</p></div><div class="panel-actions"><button class="btn primary" id="open-add-2">${c.add}</button><button class="btn" id="open-import-2">${c.import}</button></div></div><div class="table-wrap"><table class="data"><thead><tr><th>${c.name}</th><th>${c.platform}</th><th>${c.current}</th><th>${c.trigger}</th><th>${c.strong}</th><th>${c.notes}</th><th>${c.actions}</th></tr></thead><tbody id="rows"><tr><td colspan="7" class="empty">${c.loading}</td></tr></tbody></table></div><p class="status" id="page-status" role="status"></p></section></main></div></div>
<dialog id="add-dialog"><form id="add-form"><h2>${c.manualTitle}</h2><div class="form-grid"><label>${c.name}<input name="name" maxlength="160" required></label><label>${c.brandLabel}<input name="brand" maxlength="80"></label><label>${c.platform}<input name="platform" maxlength="40"></label><label>${c.url}<input name="source_url" type="url" maxlength="1000"></label><label>${c.current}<input name="current_price" type="number" min="0" step="0.01"></label><label>${c.trigger}<input name="trigger_price" type="number" min="0" step="0.01"></label><label>${c.strong}<input name="strong_buy_price" type="number" min="0" step="0.01"></label><label class="full">${c.notes}<textarea name="notes" maxlength="500"></textarea></label></div><div class="dialog-actions"><button class="btn" type="button" data-close>${c.cancel}</button><button class="btn primary" type="submit">${c.save}</button></div><p class="status" role="status"></p></form></dialog>
<dialog id="import-dialog"><form id="import-form"><h2>${c.importTitle}</h2><p class="help">${c.importHelp}</p><textarea class="import-box" name="payload" required placeholder="name,brand,platform,source_url,current_price,trigger_price,strong_buy_price,notes"></textarea><div class="dialog-actions"><button class="btn" type="button" data-close>${c.cancel}</button><button class="btn primary" type="submit">${c.importNow}</button></div><p class="status" role="status"></p></form></dialog>
<script>(()=>{const labels=${JSON.stringify({ empty: copy.empty, loading: copy.loading, noPrice: copy.noPrice, remove: copy.remove, saved: copy.saved, failed: copy.failed, successAdd: copy.successAdd, successImport: copy.successImport })};const keyName='camera-market-workspace-id';let key=localStorage.getItem(keyName);if(!/^[a-f0-9]{32}$/.test(key||'')){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);key=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');localStorage.setItem(keyName,key)}let items=[];const rows=document.getElementById('rows'),pageStatus=document.getElementById('page-status'),cloud=document.getElementById('cloud-state'),search=document.getElementById('search');const money=value=>value==null||value===''?'—':new Intl.NumberFormat(undefined,{style:'currency',currency:'CNY',maximumFractionDigits:2}).format(Number(value));const api=async(path,options={})=>{const response=await fetch(path,{...options,headers:{'content-type':'application/json','x-workspace-id':key,...(options.headers||{})}});if(!response.ok)throw new Error(await response.text());return response.json()};function cell(text,className){const td=document.createElement('td');if(className)td.className=className;td.textContent=text;return td}function render(){const query=search.value.trim().toLowerCase(),filtered=items.filter(item=>[item.name,item.brand,item.platform].some(value=>(value||'').toLowerCase().includes(query)));rows.replaceChildren();if(!filtered.length){const tr=document.createElement('tr'),td=cell(items.length?labels.empty:labels.empty,'empty');td.colSpan=7;tr.append(td);rows.append(tr)}else filtered.forEach(item=>{const tr=document.createElement('tr'),product=cell('','product'),name=document.createElement('b'),meta=document.createElement('small');name.textContent=item.name;meta.textContent=[item.brand,item.source_url].filter(Boolean).join(' · ');product.append(name,meta);tr.append(product,cell(item.platform||'—'),cell(money(item.current_price),'price'),cell(money(item.trigger_price)),cell(money(item.strong_buy_price)),cell(item.notes||'—'));const action=document.createElement('td'),button=document.createElement('button');button.className='delete';button.textContent=labels.remove;button.addEventListener('click',()=>removeItem(item.id));action.append(button);tr.append(action);rows.append(tr)});document.getElementById('metric-total').textContent=items.length;document.getElementById('metric-priced').textContent=items.filter(item=>item.current_price!=null).length;document.getElementById('metric-triggered').textContent=items.filter(item=>item.current_price!=null&&item.trigger_price!=null&&Number(item.current_price)<=Number(item.trigger_price)).length;document.getElementById('metric-platforms').textContent=new Set(items.map(item=>item.platform).filter(Boolean)).size;const focus=items[0];document.getElementById('focus-name').textContent=focus?.name||labels.empty;document.getElementById('focus-price').textContent=focus?money(focus.current_price):'—';document.getElementById('focus-platform').textContent=focus?.platform||labels.saved}async function load(){try{const data=await api('/api/workspace/items');items=data.items;cloud.textContent=labels.saved;render()}catch{cloud.textContent=labels.failed;rows.innerHTML='<tr><td colspan="7" class="empty">'+labels.failed+'</td></tr>'}}async function removeItem(id){try{await api('/api/workspace/items/'+id,{method:'DELETE'});items=items.filter(item=>item.id!==id);render()}catch{pageStatus.textContent=labels.failed}}function open(id){document.getElementById(id).showModal()}document.getElementById('open-add').onclick=()=>open('add-dialog');document.getElementById('open-add-2').onclick=()=>open('add-dialog');document.getElementById('open-import').onclick=()=>open('import-dialog');document.getElementById('open-import-2').onclick=()=>open('import-dialog');document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());search.addEventListener('input',render);document.getElementById('add-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,status=form.querySelector('.status'),data=Object.fromEntries(new FormData(form));try{await api('/api/workspace/items',{method:'POST',body:JSON.stringify(data)});status.textContent=labels.successAdd;form.reset();await load();setTimeout(()=>form.closest('dialog').close(),350)}catch{status.textContent=labels.failed}});function parseCsv(text){const lines=text.trim().split(/\\r?\\n/),read=line=>{const result=[];let value='',quoted=false;for(let index=0;index<=line.length;index++){const char=line[index];if(char==='"'&&quoted&&line[index+1]==='"'){value+='"';index++}else if(char==='"'){quoted=!quoted}else if((char===','||index===line.length)&&!quoted){result.push(value.trim());value=''}else value+=char||''}return result};const headers=read(lines.shift()||'');return lines.filter(Boolean).map(line=>Object.fromEntries(read(line).map((value,index)=>[headers[index],value])))}document.getElementById('import-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,status=form.querySelector('.status'),text=new FormData(form).get('payload').trim();try{const parsed=text.startsWith('[')?JSON.parse(text):parseCsv(text);await api('/api/workspace/import',{method:'POST',body:JSON.stringify({items:parsed})});status.textContent=labels.successImport;form.reset();await load();setTimeout(()=>form.closest('dialog').close(),350)}catch{status.textContent=labels.failed}});load()})()</script></body></html>`
}

function renderPage(origin, appUrl, locale) {
  const copy = COPY[locale]
  const appConfigured = /^https:\/\//.test(appUrl)
  const launchHref = appConfigured ? appUrl : GITHUB_URL
  const headline = copy.headline.split('\n').map((line) => `<span class="headline-line">${escapeHtml(line)}</span>`).join('')
  const categories = copy.categories.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')
  const connectorCards = CONNECTORS.map((connector, index) => `<article class="reveal" style="--delay:${index * 55}ms"><div><b>${escapeHtml(connector.display_name)}</b><span>BYOK</span></div><p>${connector.required_env.map(escapeHtml).join(' · ')}</p></article>`).join('')
  const alternateLocale = locale === 'zh' ? 'en' : 'zh'
  const alternateLabel = locale === 'zh' ? 'EN' : '中文'

  return `<!doctype html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(copy.title)}</title><meta name="description" content="${escapeHtml(copy.description)}">
  <link rel="canonical" href="${origin}/"><meta name="theme-color" content="#05070a">
  <meta property="og:title" content="${escapeHtml(copy.title)}"><meta property="og:description" content="${escapeHtml(copy.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${origin}/">
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Camera Market Intelligence', applicationCategory: 'BusinessApplication', operatingSystem: 'Web' }).replaceAll('<', '\\u003c')}</script>
  <style>
    *{box-sizing:border-box}html{background:#05070a;color:#f7f7f2;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{margin:0;min-height:100vh;background:radial-gradient(circle at 72% 18%,rgba(255,176,72,.16),transparent 27%),radial-gradient(circle at 14% 72%,rgba(94,198,255,.1),transparent 28%),#05070a}.shell{width:min(1180px,calc(100% - 40px));margin:auto}.nav{height:84px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff1a}.brand{display:flex;gap:12px;align-items:center;color:inherit;text-decoration:none}.mark{width:38px;height:38px;border:1px solid #ffffff38;border-radius:50%;display:grid;place-items:center;font-weight:800;letter-spacing:-.08em}.brand strong,.brand small{display:block}.brand small{font-size:10px;color:#a9adb5;letter-spacing:.16em;margin-top:3px}.nav-actions{display:flex;align-items:center;gap:10px}.nav-actions a{color:#d5d7db;text-decoration:none;font-size:13px;padding:10px 14px}.nav-actions .launch{border:1px solid #f6a744;color:#fff;border-radius:999px}.lang{border:0;background:#ffffff0d;border-radius:999px}.hero{padding:98px 0 64px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:70px;align-items:center}.eyebrow{font-size:11px;color:#f6a744;letter-spacing:.18em;font-weight:700}.hero h1{font-size:clamp(48px,7vw,90px);line-height:.98;letter-spacing:-.065em;margin:20px 0 26px;max-width:820px}.sub{font-size:19px;line-height:1.65;color:#b9bec7;max-width:700px}.actions{display:flex;gap:12px;margin-top:34px}.btn{display:inline-flex;padding:13px 18px;border-radius:10px;border:1px solid #ffffff26;color:#fff;text-decoration:none;font-weight:700}.btn.primary{background:#f6a744;color:#171008;border-color:#f6a744}.lens{aspect-ratio:1;border-radius:50%;border:1px solid #ffffff21;display:grid;place-items:center;box-shadow:0 0 100px #f6a74418}.lens:before{content:"";width:58%;aspect-ratio:1;border-radius:50%;border:1px solid #f6a74480;box-shadow:inset 0 0 70px #5ec6ff24,0 0 50px #f6a74438}.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ffffff14;border:1px solid #ffffff14}.principles article{background:#090c11;padding:30px}.principles b{display:block;font-size:17px;margin-bottom:10px}.principles p{margin:0;color:#9da3ad;line-height:1.55;font-size:14px}.connect{margin:64px 0;padding:52px;border:1px solid #ffffff18;background:#0a0d12}.connect-head{display:grid;grid-template-columns:.9fr 1.1fr;gap:70px}.connect h2{font-size:clamp(32px,4vw,52px);letter-spacing:-.04em;margin:0}.connect-copy p{margin:0 0 12px;color:#aeb4be;line-height:1.65}.connector-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin-top:34px;background:#05070a}.connector-list article{min-width:0;background:#070a0e;padding:18px}.connector-list article:last-child{grid-column:1/-1}.connector-list article>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.connector-list span{font-size:10px;color:#f6a744}.connector-list p{margin:9px 0 0;color:#858c97;font-size:11px;line-height:1.6;overflow-wrap:anywhere}.connect-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.feedback{margin:64px 0 96px;display:grid;grid-template-columns:.85fr 1.15fr;gap:70px;padding:52px;border:1px solid #ffffff18;background:#0a0d12}.feedback h2{font-size:clamp(32px,4vw,52px);letter-spacing:-.04em;margin:0 0 16px}.feedback-copy p{color:#aeb4be;line-height:1.65}.feedback form{display:grid;gap:14px}.feedback label{font-size:12px;font-weight:700;color:#d7d9dd}.feedback select,.feedback textarea{width:100%;margin-top:7px;border:1px solid #ffffff25;background:#05070a;color:#f7f7f2;padding:13px;border-radius:8px;font:inherit}.feedback textarea{min-height:150px;resize:vertical}.feedback button{justify-self:start;border:0;border-radius:8px;background:#f6a744;color:#171008;padding:13px 19px;font-weight:800;cursor:pointer}.feedback button:disabled{opacity:.65;cursor:wait}.privacy,.status{font-size:12px;color:#888f9b;margin:0}.status{min-height:18px;color:#7fd8a2}.trap{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}.footer{border-top:1px solid #ffffff17;padding:26px 0 44px;color:#777e89;font-size:12px;display:flex;justify-content:space-between}
    @media(max-width:800px){.shell{width:min(100% - 24px,680px)}.nav{height:auto;padding:18px 0;align-items:flex-start}.brand small,.nav-source{display:none}.nav-actions{gap:2px}.nav-actions a{padding:9px}.hero{grid-template-columns:1fr;padding:70px 0 44px;gap:38px}.hero h1{font-size:clamp(44px,15vw,68px)}.lens{width:min(72vw,330px);margin:auto}.principles,.connector-list{grid-template-columns:1fr}.connect,.feedback{padding:28px;margin-top:44px}.connect-head,.feedback{grid-template-columns:1fr;gap:28px}.footer{display:block;line-height:1.8}}
    html{scroll-behavior:smooth}body{overflow-x:hidden}.shell{position:relative}.headline-line{display:block}.btn{position:relative;isolation:isolate;overflow:hidden;transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}.btn:after{content:"";position:absolute;z-index:-1;inset:-2px;transform:translateX(-115%) skewX(-20deg);background:linear-gradient(100deg,transparent 22%,#ffffff2f 48%,transparent 74%);transition:transform .65s cubic-bezier(.2,.8,.2,1)}.btn:hover{transform:translateY(-3px);border-color:#f6a74480;box-shadow:0 14px 32px #0007}.btn:hover:after{transform:translateX(115%) skewX(-20deg)}.btn.primary:hover{box-shadow:0 14px 42px #f6a74435}.lens{--mx:0px;--my:0px;transform:translate3d(var(--mx),var(--my),0);transition:transform .7s cubic-bezier(.2,.8,.2,1),box-shadow .7s ease}.principles article,.connector-list article{transition:transform .35s ease,background-color .35s ease,box-shadow .35s ease}.principles article:hover,.connector-list article:hover{position:relative;z-index:1;transform:translateY(-5px);background:#0d1118;box-shadow:0 22px 45px #0008}.feedback select,.feedback textarea{transition:border-color .25s ease,box-shadow .25s ease}.feedback select:focus,.feedback textarea:focus{outline:none;border-color:#f6a744a8;box-shadow:0 0 0 3px #f6a74418}.feedback button{transition:transform .25s ease,box-shadow .25s ease}.feedback button:hover{transform:translateY(-2px);box-shadow:0 12px 30px #f6a74430}.reveal{opacity:1;transform:none}
    @media(prefers-reduced-motion:no-preference){body:before,body:after{content:"";position:fixed;z-index:-1;width:42vw;aspect-ratio:1;border-radius:50%;filter:blur(90px);opacity:.14;pointer-events:none}body:before{top:-18vw;right:-12vw;background:#f6a744;animation:ambient-one 18s ease-in-out infinite alternate}body:after{left:-18vw;bottom:-22vw;background:#5ec6ff;animation:ambient-two 22s ease-in-out infinite alternate}.motion-ready .nav,.motion-ready .eyebrow,.motion-ready .headline-line,.motion-ready .sub,.motion-ready .actions,.motion-ready .lens{opacity:0;transform:translateY(18px)}.motion-ready.is-loaded .nav,.motion-ready.is-loaded .eyebrow,.motion-ready.is-loaded .headline-line,.motion-ready.is-loaded .sub,.motion-ready.is-loaded .actions{opacity:1;transform:translateY(0);transition:opacity .75s ease,transform .75s cubic-bezier(.2,.8,.2,1)}.motion-ready.is-loaded .nav{transition-delay:40ms}.motion-ready.is-loaded .eyebrow{transition-delay:140ms}.motion-ready.is-loaded .headline-line:nth-child(1){transition-delay:220ms}.motion-ready.is-loaded .headline-line:nth-child(2){transition-delay:310ms}.motion-ready.is-loaded .sub{transition-delay:400ms}.motion-ready.is-loaded .actions{transition-delay:480ms}.motion-ready.is-loaded .lens{opacity:1;transform:translate3d(var(--mx),var(--my),0);transition:opacity 1s .32s ease,transform .7s cubic-bezier(.2,.8,.2,1),box-shadow .7s ease;animation:breathe 7s 1.3s ease-in-out infinite}.motion-ready .reveal{opacity:0;transform:translateY(26px)}.motion-ready .reveal.is-visible{opacity:1;transform:translateY(0);transition:opacity .72s var(--delay,0ms) ease,transform .72s var(--delay,0ms) cubic-bezier(.2,.8,.2,1)}@keyframes breathe{50%{box-shadow:0 0 145px #f6a7442b}}@keyframes ambient-one{to{transform:translate3d(-8vw,10vh,0) scale(1.18)}}@keyframes ambient-two{to{transform:translate3d(12vw,-8vh,0) scale(.88)}}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition-duration:.01ms!important}.motion-ready .nav,.motion-ready .eyebrow,.motion-ready .headline-line,.motion-ready .sub,.motion-ready .actions,.motion-ready .lens,.motion-ready .reveal{opacity:1!important;transform:none!important}}
  </style>
</head>
<body><div class="shell">
  <nav class="nav"><a class="brand" href="/?lang=${locale}"><span class="mark">CM</span><span><strong>${escapeHtml(copy.brand)}</strong><small>${escapeHtml(copy.brandSub)}</small></span></a><div class="nav-actions"><a class="nav-source" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.navSource)}</a><a class="lang" href="/?lang=${alternateLocale}" hreflang="${alternateLocale}">${alternateLabel}</a><a class="launch" href="#connect">${escapeHtml(copy.navConnect)}</a></div></nav>
  <main>
    <section class="hero"><div><div class="eyebrow">${escapeHtml(copy.eyebrow)}</div><h1>${headline}</h1><p class="sub">${escapeHtml(copy.sub)}</p><div class="actions"><a class="btn primary" href="#connect">${escapeHtml(copy.connectCta)}</a><a class="btn" href="#feedback">${escapeHtml(copy.feedbackTitle)}</a></div></div><div class="lens" aria-hidden="true"></div></section>
    <section class="principles"><article class="reveal" style="--delay:0ms"><b>${escapeHtml(copy.gateTitle)}</b><p>${escapeHtml(copy.gateBody)}</p></article><article class="reveal" style="--delay:70ms"><b>${escapeHtml(copy.clueTitle)}</b><p>${escapeHtml(copy.clueBody)}</p></article><article class="reveal" style="--delay:140ms"><b>${escapeHtml(copy.humanTitle)}</b><p>${escapeHtml(copy.humanBody)}</p></article></section>
    <section class="connect" id="connect"><div class="connect-head reveal"><h2>${escapeHtml(copy.connectTitle)}</h2><div class="connect-copy"><p>${escapeHtml(copy.connectBody)}</p><p>${escapeHtml(copy.connectStorage)}</p></div></div><div class="connector-list">${connectorCards}</div><div class="connect-actions reveal"><a class="btn primary" href="${SETUP_GUIDE_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.connectGuide)}</a><a class="btn" href="/api/connectors">${escapeHtml(copy.connectApi)}</a>${appConfigured ? `<a class="btn" href="${escapeHtml(launchHref)}">${escapeHtml(copy.navLaunch)}</a>` : ''}</div></section>
    <section class="feedback" id="feedback"><div class="feedback-copy reveal"><h2>${escapeHtml(copy.feedbackTitle)}</h2><p>${escapeHtml(copy.feedbackBody)}</p></div><form class="reveal" id="feedback-form"><label>${escapeHtml(copy.categoryLabel)}<select name="category">${categories}</select></label><label>${escapeHtml(copy.messageLabel)}<textarea name="message" minlength="10" maxlength="2000" required placeholder="${escapeHtml(copy.placeholder)}"></textarea></label><label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="privacy">${escapeHtml(copy.privacy)}</p><button type="submit">${escapeHtml(copy.send)}</button><p class="status" role="status" aria-live="polite"></p></form></section>
  </main><footer class="footer"><span>Camera Market Strategy System · Public beta</span><span>VISIBLE PRICE ≠ VERIFIED_CHECKOUT</span></footer>
</div>
<script>(()=>{const body=document.body,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;body.classList.add('motion-ready');requestAnimationFrame(()=>requestAnimationFrame(()=>body.classList.add('is-loaded')));const reveals=[...document.querySelectorAll('.reveal')];if(reduced){reveals.forEach(item=>item.classList.add('is-visible'))}else{const show=item=>{item.classList.add('is-visible');observer.unobserve(item)},observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)show(entry.target)})},{threshold:.13,rootMargin:'0px 0px -6%'});reveals.forEach(item=>observer.observe(item));requestAnimationFrame(()=>reveals.filter(item=>item.getBoundingClientRect().top<innerHeight*.98).forEach(show));const hero=document.querySelector('.hero'),lens=document.querySelector('.lens');if(matchMedia('(pointer: fine)').matches){hero.addEventListener('pointermove',event=>{const rect=hero.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;lens.style.setProperty('--mx',x*16+'px');lens.style.setProperty('--my',y*12+'px')});hero.addEventListener('pointerleave',()=>{lens.style.setProperty('--mx','0px');lens.style.setProperty('--my','0px')})}}const form=document.getElementById('feedback-form'),button=form.querySelector('button'),status=form.querySelector('.status');form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;button.textContent=${JSON.stringify(copy.sending)};status.textContent='';const data=new FormData(form);try{const response=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({category:data.get('category'),message:data.get('message'),website:data.get('website'),locale:${JSON.stringify(locale)},page:location.pathname})});if(!response.ok)throw new Error('request failed');form.reset();status.textContent=${JSON.stringify(copy.success)}}catch{status.textContent=${JSON.stringify(copy.error)}}finally{button.disabled=false;button.textContent=${JSON.stringify(copy.send)}}})})()</script>
</body></html>`
}
