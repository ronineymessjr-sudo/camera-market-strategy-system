const GITHUB_URL = 'https://github.com/ronineymessjr-sudo/camera-market-strategy-system'

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
    navLaunch: 'Open command center',
    navPreview: 'Private command center',
    eyebrow: 'REAL PRICE · VERIFIED EVIDENCE · HUMAN DECISION',
    headline: 'See the real price.\nDecide with evidence.',
    sub: 'A camera-market research system that separates visible price clues from checkout-verified evidence. It never buys automatically.',
    primary: 'Open command center',
    secondary: 'View source',
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
    navLaunch: '打开指挥中心',
    navPreview: '私有指挥中心',
    eyebrow: '真实价格 · 可核验证据 · 人工决策',
    headline: '看见真实价格，\n再用证据做决定。',
    sub: '一套把网页可见价格线索与结算核验证据严格分开的相机市场研究系统。系统不会自动下单。',
    primary: '打开指挥中心',
    secondary: '查看源代码',
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

    if (url.pathname === '/api/feedback' && method === 'POST') {
      return submitFeedback(request, env)
    }

    if (url.pathname === '/api/feedback/status' && method === 'GET') {
      return feedbackStatus(env)
    }

    if (!['GET', 'HEAD'].includes(method)) {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD, POST' })
    }

    if (url.pathname === '/health') {
      return headSafe(method, jsonResponse({
        ok: true,
        service: 'camera-market-public-beta',
        version: '0.16-feedback',
        feedback_store: Boolean(env.FEEDBACK_DB),
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
      return headSafe(method, textResponse(`# Camera Market Strategy System\n\nA bilingual public beta for verified camera-market price intelligence. Visible prices are clues only. A strategy can trigger only from fresh VERIFIED_CHECKOUT evidence. The system never purchases automatically.\n\nSource: ${GITHUB_URL}\n`, 'text/plain; charset=utf-8'))
    }

    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      return headSafe(method, jsonResponse({ ok: false, error: 'not_found', path: url.pathname }, 404))
    }

    const locale = selectLocale(url, request.headers.get('accept-language'))
    const response = new Response(renderPage(url.origin, env.APP_URL || '', locale), {
      headers: pageHeaders(),
    })
    return headSafe(method, response)
  },
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

function renderPage(origin, appUrl, locale) {
  const copy = COPY[locale]
  const appConfigured = /^https:\/\//.test(appUrl)
  const launchHref = appConfigured ? appUrl : GITHUB_URL
  const headline = copy.headline.split('\n').map(escapeHtml).join('<br>')
  const categories = copy.categories.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')
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
    *{box-sizing:border-box}html{background:#05070a;color:#f7f7f2;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{margin:0;min-height:100vh;background:radial-gradient(circle at 72% 18%,rgba(255,176,72,.16),transparent 27%),radial-gradient(circle at 14% 72%,rgba(94,198,255,.1),transparent 28%),#05070a}.shell{width:min(1180px,calc(100% - 40px));margin:auto}.nav{height:84px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff1a}.brand{display:flex;gap:12px;align-items:center;color:inherit;text-decoration:none}.mark{width:38px;height:38px;border:1px solid #ffffff38;border-radius:50%;display:grid;place-items:center;font-weight:800;letter-spacing:-.08em}.brand strong,.brand small{display:block}.brand small{font-size:10px;color:#a9adb5;letter-spacing:.16em;margin-top:3px}.nav-actions{display:flex;align-items:center;gap:10px}.nav-actions a{color:#d5d7db;text-decoration:none;font-size:13px;padding:10px 14px}.nav-actions .launch{border:1px solid #f6a744;color:#fff;border-radius:999px}.lang{border:0;background:#ffffff0d;border-radius:999px}.hero{padding:98px 0 64px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:70px;align-items:center}.eyebrow{font-size:11px;color:#f6a744;letter-spacing:.18em;font-weight:700}.hero h1{font-size:clamp(48px,7vw,90px);line-height:.98;letter-spacing:-.065em;margin:20px 0 26px;max-width:820px}.sub{font-size:19px;line-height:1.65;color:#b9bec7;max-width:700px}.actions{display:flex;gap:12px;margin-top:34px}.btn{display:inline-flex;padding:13px 18px;border-radius:10px;border:1px solid #ffffff26;color:#fff;text-decoration:none;font-weight:700}.btn.primary{background:#f6a744;color:#171008;border-color:#f6a744}.lens{aspect-ratio:1;border-radius:50%;border:1px solid #ffffff21;display:grid;place-items:center;box-shadow:0 0 100px #f6a74418}.lens:before{content:"";width:58%;aspect-ratio:1;border-radius:50%;border:1px solid #f6a74480;box-shadow:inset 0 0 70px #5ec6ff24,0 0 50px #f6a74438}.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ffffff14;border:1px solid #ffffff14}.principles article{background:#090c11;padding:30px}.principles b{display:block;font-size:17px;margin-bottom:10px}.principles p{margin:0;color:#9da3ad;line-height:1.55;font-size:14px}.feedback{margin:64px 0 96px;display:grid;grid-template-columns:.85fr 1.15fr;gap:70px;padding:52px;border:1px solid #ffffff18;background:#0a0d12}.feedback h2{font-size:clamp(32px,4vw,52px);letter-spacing:-.04em;margin:0 0 16px}.feedback-copy p{color:#aeb4be;line-height:1.65}.feedback form{display:grid;gap:14px}.feedback label{font-size:12px;font-weight:700;color:#d7d9dd}.feedback select,.feedback textarea{width:100%;margin-top:7px;border:1px solid #ffffff25;background:#05070a;color:#f7f7f2;padding:13px;border-radius:8px;font:inherit}.feedback textarea{min-height:150px;resize:vertical}.feedback button{justify-self:start;border:0;border-radius:8px;background:#f6a744;color:#171008;padding:13px 19px;font-weight:800;cursor:pointer}.feedback button:disabled{opacity:.65;cursor:wait}.privacy,.status{font-size:12px;color:#888f9b;margin:0}.status{min-height:18px;color:#7fd8a2}.trap{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}.footer{border-top:1px solid #ffffff17;padding:26px 0 44px;color:#777e89;font-size:12px;display:flex;justify-content:space-between}
    @media(max-width:800px){.shell{width:min(100% - 24px,680px)}.nav{height:auto;padding:18px 0;align-items:flex-start}.brand small,.nav-source{display:none}.nav-actions{gap:2px}.nav-actions a{padding:9px}.hero{grid-template-columns:1fr;padding:70px 0 44px;gap:38px}.hero h1{font-size:clamp(44px,15vw,68px)}.lens{width:min(72vw,330px);margin:auto}.principles{grid-template-columns:1fr}.feedback{grid-template-columns:1fr;gap:28px;padding:28px;margin-top:44px}.footer{display:block;line-height:1.8}}
    @media(prefers-reduced-motion:no-preference){.lens{animation:breathe 7s ease-in-out infinite}@keyframes breathe{50%{transform:scale(1.025);box-shadow:0 0 140px #f6a74426}}}
  </style>
</head>
<body><div class="shell">
  <nav class="nav"><a class="brand" href="/?lang=${locale}"><span class="mark">CM</span><span><strong>${escapeHtml(copy.brand)}</strong><small>${escapeHtml(copy.brandSub)}</small></span></a><div class="nav-actions"><a class="nav-source" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.navSource)}</a><a class="lang" href="/?lang=${alternateLocale}" hreflang="${alternateLocale}">${alternateLabel}</a><a class="launch" href="${launchHref}">${escapeHtml(appConfigured ? copy.navLaunch : copy.navPreview)}</a></div></nav>
  <main>
    <section class="hero"><div><div class="eyebrow">${escapeHtml(copy.eyebrow)}</div><h1>${headline}</h1><p class="sub">${escapeHtml(copy.sub)}</p><div class="actions"><a class="btn primary" href="${launchHref}">${escapeHtml(appConfigured ? copy.primary : copy.secondary)}</a><a class="btn" href="#feedback">${escapeHtml(copy.feedbackTitle)}</a></div></div><div class="lens" aria-hidden="true"></div></section>
    <section class="principles"><article><b>${escapeHtml(copy.gateTitle)}</b><p>${escapeHtml(copy.gateBody)}</p></article><article><b>${escapeHtml(copy.clueTitle)}</b><p>${escapeHtml(copy.clueBody)}</p></article><article><b>${escapeHtml(copy.humanTitle)}</b><p>${escapeHtml(copy.humanBody)}</p></article></section>
    <section class="feedback" id="feedback"><div class="feedback-copy"><h2>${escapeHtml(copy.feedbackTitle)}</h2><p>${escapeHtml(copy.feedbackBody)}</p></div><form id="feedback-form"><label>${escapeHtml(copy.categoryLabel)}<select name="category">${categories}</select></label><label>${escapeHtml(copy.messageLabel)}<textarea name="message" minlength="10" maxlength="2000" required placeholder="${escapeHtml(copy.placeholder)}"></textarea></label><label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="privacy">${escapeHtml(copy.privacy)}</p><button type="submit">${escapeHtml(copy.send)}</button><p class="status" role="status" aria-live="polite"></p></form></section>
  </main><footer class="footer"><span>Camera Market Strategy System · Public beta</span><span>VISIBLE PRICE ≠ VERIFIED_CHECKOUT</span></footer>
</div>
<script>(()=>{const form=document.getElementById('feedback-form'),button=form.querySelector('button'),status=form.querySelector('.status');form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;button.textContent=${JSON.stringify(copy.sending)};status.textContent='';const data=new FormData(form);try{const response=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({category:data.get('category'),message:data.get('message'),website:data.get('website'),locale:${JSON.stringify(locale)},page:location.pathname})});if(!response.ok)throw new Error('request failed');form.reset();status.textContent=${JSON.stringify(copy.success)}}catch{status.textContent=${JSON.stringify(copy.error)}}finally{button.disabled=false;button.textContent=${JSON.stringify(copy.send)}}})})()</script>
</body></html>`
}
