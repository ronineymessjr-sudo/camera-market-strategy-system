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
    "connect-src 'none'",
    "font-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
}

function jsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...SECURITY_HEADERS,
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  })
}

function textResponse(body, contentType) {
  return new Response(body, {
    headers: {
      ...SECURITY_HEADERS,
      'content-type': contentType,
      'cache-control': 'public, max-age=300',
    },
  })
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()
    const appUrl = env.APP_URL || ''
    const appConfigured = /^https:\/\//.test(appUrl)

    if (!['GET', 'HEAD'].includes(method)) {
      return jsonResponse(
        { ok: false, error: 'method_not_allowed', method },
        { status: 405, headers: { allow: 'GET, HEAD' } },
      )
    }

    if (url.pathname === '/health') {
      const response = jsonResponse({
        ok: true,
        service: 'camera-market-public-entry',
        version: '0.15-entry',
        app_url: appConfigured ? appUrl : null,
        app_configured: appConfigured,
      })
      return method === 'HEAD' ? new Response(null, response) : response
    }

    if (url.pathname === '/robots.txt') {
      const response = textResponse(`User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`, 'text/plain; charset=utf-8')
      return method === 'HEAD' ? new Response(null, response) : response
    }

    if (url.pathname === '/sitemap.xml') {
      const response = textResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`, 'application/xml; charset=utf-8')
      return method === 'HEAD' ? new Response(null, response) : response
    }

    if (url.pathname === '/llms.txt') {
      const response = textResponse(`# Camera Market Strategy System\n\nA single-operator camera price intelligence system. Visible and unverified prices are clues only. A strategy can trigger only from a fresh VERIFIED_CHECKOUT record backed by server-recorded operator-uploaded checkout evidence. The system never purchases automatically.\n\nSource: ${GITHUB_URL}\n`, 'text/plain; charset=utf-8')
      return method === 'HEAD' ? new Response(null, response) : response
    }

    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      const response = jsonResponse(
        { ok: false, error: 'not_found', path: url.pathname },
        { status: 404 },
      )
      return method === 'HEAD' ? new Response(null, response) : response
    }

    const response = new Response(renderPage(appUrl, appConfigured, url.origin), {
      headers: {
        ...SECURITY_HEADERS,
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      },
    })
    return method === 'HEAD' ? new Response(null, response) : response
  },
}

function renderPage(appUrl, appConfigured, publicOrigin) {
  const launchHref = appConfigured ? appUrl : GITHUB_URL
  const launchLabel = appConfigured ? '进入系统' : '等待云端应用地址'
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="相机价格追踪与策略平台，记录真实价格、核验证据并生成购买提醒。"/>
<link rel="canonical" href="${publicOrigin}/"/>
<meta property="og:type" content="website"/><meta property="og:url" content="${publicOrigin}/"/>
<meta property="og:title" content="影价追踪 | Camera Market Intelligence"/>
<meta property="og:description" content="区分网页价格线索与真实结算证据，只让可信到手价参与策略。"/>
<meta name="twitter:card" content="summary"/>
<title>影价追踪 | Camera Market Intelligence</title>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: '影价追踪', url: `${publicOrigin}/` },
      { '@type': 'SoftwareApplication', name: 'Camera Market Strategy System', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: `${publicOrigin}/`, description: 'Verified camera-market price intelligence for a single operator.' },
      { '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: '网页显示价格会直接触发购买策略吗？', acceptedAnswer: { '@type': 'Answer', text: '不会。网页可见价和未核验价仅作为线索。' } },
        { '@type': 'Question', name: '什么价格可以触发策略？', acceptedAnswer: { '@type': 'Answer', text: '只有仍在有效期内、币种匹配并关联操作员上传结算证据的 VERIFIED_CHECKOUT 价格。' } },
        { '@type': 'Question', name: '系统会自动下单吗？', acceptedAnswer: { '@type': 'Answer', text: '不会。系统只提供价格情报、人工核验、策略信号和报告。' } },
      ] },
    ],
  })}</script>
<style>
:root{color-scheme:dark;--text:#f6f6f2;--muted:#8b8b86;--line:rgba(255,255,255,.13);font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#020202;color:var(--text)}body{overflow-x:hidden;background:radial-gradient(circle at 50% 44%,#1c1c1c 0,transparent 20%),#020202}a{color:inherit;text-decoration:none}
#vortex{position:fixed;inset:0;width:100%;height:100%;z-index:0}.veil{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 0 22%,rgba(0,0,0,.18) 44%,rgba(0,0,0,.82) 82%,#000 100%)}
.shell{position:relative;z-index:2;min-height:100vh;padding:24px clamp(18px,4vw,56px) 32px}nav{display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:11px}.mark{width:40px;height:40px;border:1px solid #fff;border-radius:50%;display:grid;place-items:center}.brand strong{display:block;font-size:15px;letter-spacing:.12em}.brand small{display:block;color:#666;font-size:9px;letter-spacing:.17em;margin-top:4px}.nav-actions{display:flex;align-items:center;gap:14px}.nav-actions a:first-child{font-size:11px;color:#888}.launch{background:#f4f4f0;color:#050505;padding:11px 17px;border-radius:999px;font-size:11px}
main{min-height:calc(100vh - 64px);display:grid;place-items:center;text-align:center}.hero{width:min(920px,100%);display:flex;flex-direction:column;align-items:center}.eyebrow{font-size:9px;letter-spacing:.5em;color:#888;margin-bottom:25px}h1{font-size:clamp(50px,9vw,116px);line-height:.94;letter-spacing:-.065em;margin:0}h1 span{display:block;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.88)}.sub{max-width:620px;color:#aaa;font-size:15px;line-height:1.9;margin:27px auto 0}.actions{display:flex;gap:11px;flex-wrap:wrap;justify-content:center;margin-top:31px}.btn{min-height:49px;padding:0 21px;border:1px solid #333;border-radius:999px;display:inline-flex;align-items:center;background:#0a0a0adc;backdrop-filter:blur(14px);font-size:12px}.btn.primary{background:#f4f4f0;color:#050505;border-color:#fff}
.rule{margin-top:52px;display:grid;grid-template-columns:repeat(3,1fr);width:min(760px,100%);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.rule div{padding:16px 13px;border-right:1px solid var(--line)}.rule div:last-child{border-right:0}.rule b{display:block;font-size:11px}.rule span{display:block;color:#666;font-size:9px;margin-top:6px}
@media(max-width:700px){.shell{padding:18px}.nav-actions a:first-child{display:none}.rule{grid-template-columns:1fr}.rule div{border-right:0;border-bottom:1px solid var(--line)}.rule div:last-child{border-bottom:0}h1{font-size:clamp(43px,16vw,74px)}}
@media(prefers-reduced-motion:reduce){#vortex{display:none}}
</style></head><body>
<canvas id="vortex" aria-hidden="true"></canvas><div class="veil"></div><div class="shell">
<nav><a class="brand" href="/"><span class="mark">Ø</span><span><strong>影价追踪</strong><small>CAMERA MARKET INTELLIGENCE</small></span></a><div class="nav-actions"><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">GitHub</a><a class="launch" href="${launchHref}">${launchLabel}</a></div></nav>
<main><section class="hero"><div class="eyebrow">REAL PRICE · VERIFIED EVIDENCE · DECISION</div><h1>看见真实价格<span>再决定是否购买</span></h1><p class="sub">记录真实商品链接、价格证据与变化趋势。系统只把已核验到手价作为可执行信号，其余数据只作为线索。</p><div class="actions"><a class="btn primary" href="${launchHref}">${appConfigured ? '打开完整看板' : '查看部署状态'}</a><a class="btn" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">查看开源代码</a></div><div class="rule"><div><b>已核验到手价</b><span>可触发策略</span></div><div><b>网页可见价</b><span>仅作为证据</span></div><div><b>未核验线索</b><span>等待人工确认</span></div></div></section></main></div>
<script>
(()=>{const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;if(reduced)return;const c=document.getElementById('vortex'),x=c.getContext('2d');if(!x)return;let d=Math.min(devicePixelRatio||1,2),w,h,cx,cy,p=[];
function resize(){w=innerWidth;h=innerHeight;cx=w/2;cy=h/2;c.width=w*d;c.height=h*d;c.style.width=w+'px';c.style.height=h+'px';x.setTransform(d,0,0,d,0,0);const ceiling=w<700?520:900,n=Math.min(ceiling,Math.max(260,Math.floor(w*h/1900)));p=Array.from({length:n},(_,i)=>({r:36+Math.pow(Math.random(),.54)*Math.min(w,h)*.44,a:Math.random()*Math.PI*2,s:(.0015+Math.random()*.005)*(Math.random()>.5?1:-1),z:.3+Math.random()*1.7,l:Math.random()*6.28,arm:i%6}))}
function draw(t){x.clearRect(0,0,w,h);x.globalCompositeOperation='lighter';const time=t*.001;for(const q of p){q.a+=q.s;q.l+=.01;const flame=Math.sin(q.l*2.1+q.arm)*12+Math.sin(time*1.6+q.a*4)*7,rr=q.r+flame,ang=q.a+q.arm*Math.PI/3+rr*.013,xx=cx+Math.cos(ang)*rr,yy=cy+Math.sin(ang)*rr*.68,hot=1-Math.min(1,Math.abs(rr-150)/Math.max(150,rr)),alpha=.07+hot*.36+(1-Math.min(1,rr/(Math.min(w,h)*.5)))*.11;x.beginPath();x.fillStyle='rgba(255,255,255,'+alpha.toFixed(3)+')';x.arc(xx,yy,q.z*(.75+hot),0,6.283);x.fill()}x.globalCompositeOperation='source-over';const g=x.createRadialGradient(cx,cy,8,cx,cy,Math.min(w,h)*.32);g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(.055,'rgba(255,255,255,.28)');g.addColorStop(.22,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);requestAnimationFrame(draw)}
addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(draw)})()
</script></body></html>`
}
