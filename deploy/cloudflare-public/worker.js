const TEMP_APP_URL = 'https://camera-market-test-r9.loca.lt'
const GITHUB_URL = 'https://github.com/ronineymessjr-sudo/camera-market-strategy-system'

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'camera-market-public-entry',
        version: '0.6-entry-particle',
        temp_app_url: TEMP_APP_URL,
        note: 'Full app is currently exposed by a temporary local tunnel; the Worker entry is static and edge-served.',
      })
    }

    return new Response(renderPage(), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60',
        'x-content-type-options': 'nosniff',
      },
    })
  },
}

function renderPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="相机价格追踪与策略平台测试入口，整合价格采集、趋势分析、库存观察与决策提醒。" />
  <title>影价追踪 | Camera Market Intelligence</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #030303;
      --paper: #f4f4f0;
      --text: #f7f7f2;
      --muted: #9b9b95;
      --dim: #62625d;
      --line: rgba(255,255,255,.14);
      --line-strong: rgba(255,255,255,.34);
      --glass: rgba(255,255,255,.055);
      --glass-strong: rgba(255,255,255,.095);
      --shadow: 0 28px 90px rgba(0,0,0,.72);
      --ease: cubic-bezier(.2,.8,.2,1);
      font-family: "LXGW WenKai Screen", "Noto Serif SC", "Source Han Serif SC", "Microsoft YaHei", serif;
    }

    * { box-sizing: border-box; }

    html { min-height: 100%; background: var(--bg); }

    body {
      min-height: 100vh;
      margin: 0;
      overflow-x: hidden;
      color: var(--text);
      background:
        radial-gradient(circle at 50% 42%, rgba(255,255,255,.18), transparent 7%),
        radial-gradient(circle at 68% 20%, rgba(255,255,255,.08), transparent 26%),
        radial-gradient(circle at 14% 14%, rgba(255,255,255,.07), transparent 28%),
        linear-gradient(180deg, #070707 0%, #010101 66%, #050505 100%);
    }

    body::before {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      content: "";
      background-image:
        linear-gradient(rgba(255,255,255,.032) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.026) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(circle at 50% 45%, black, transparent 76%);
    }

    body::after {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      content: "";
      background:
        linear-gradient(90deg, rgba(0,0,0,.76), transparent 25%, transparent 72%, rgba(0,0,0,.66)),
        radial-gradient(circle at 50% 48%, transparent 0 34%, rgba(0,0,0,.52) 62%, rgba(0,0,0,.92) 100%);
    }

    a { color: inherit; text-decoration: none; }

    .particle-field {
      position: fixed;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      opacity: .96;
    }

    .shell {
      position: relative;
      z-index: 2;
      min-height: 100vh;
      padding: 26px clamp(18px, 4vw, 56px) 40px;
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      animation: rise .7s var(--ease) both;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .iris {
      position: relative;
      width: 44px;
      height: 44px;
      border: 1px solid rgba(255,255,255,.48);
      border-radius: 50%;
      background:
        conic-gradient(from 20deg, #fff 0 28deg, #171717 28deg 58deg, #fff 58deg 82deg, #171717 82deg 124deg, #fff 124deg 160deg, #171717 160deg 210deg, #fff 210deg 248deg, #171717 248deg 306deg, #fff 306deg 360deg);
      box-shadow: 0 0 26px rgba(255,255,255,.18);
    }

    .iris::after {
      position: absolute;
      inset: 12px;
      content: "";
      border-radius: 50%;
      background: #050505;
      border: 1px solid rgba(255,255,255,.72);
    }

    .brand strong {
      display: block;
      font-family: "Times New Roman", "Noto Serif SC", serif;
      font-size: 18px;
      letter-spacing: .16em;
      line-height: 1;
    }

    .brand span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      font: 12px/1.1 "Microsoft YaHei", sans-serif;
      letter-spacing: .28em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: clamp(12px, 2.2vw, 34px);
      color: rgba(255,255,255,.78);
      font: 13px/1 "Microsoft YaHei", sans-serif;
      letter-spacing: .12em;
    }

    .nav-links a {
      padding: 10px 0;
      transition: color .2s ease, text-shadow .2s ease;
    }

    .nav-links a:hover { color: #fff; text-shadow: 0 0 18px rgba(255,255,255,.5); }

    .launch {
      border: 1px solid rgba(255,255,255,.52);
      border-radius: 999px;
      padding: 12px 18px;
      background: rgba(255,255,255,.07);
      backdrop-filter: blur(16px);
      transition: transform .22s var(--ease), background .22s ease, border-color .22s ease;
    }

    .launch:hover {
      transform: translateY(-2px);
      background: rgba(255,255,255,.14);
      border-color: #fff;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.02fr) minmax(320px, .8fr);
      align-items: center;
      gap: clamp(28px, 5vw, 78px);
      min-height: calc(100vh - 112px);
      padding: clamp(54px, 8vw, 110px) 0 28px;
    }

    .copy {
      max-width: 690px;
      animation: rise .9s .08s var(--ease) both;
    }

    .overline {
      margin: 0 0 28px;
      color: rgba(255,255,255,.62);
      font: 12px/1 "Microsoft YaHei", sans-serif;
      letter-spacing: .56em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 760px;
      margin: 0;
      font-size: clamp(54px, 8.2vw, 132px);
      font-weight: 700;
      line-height: .96;
      letter-spacing: -.08em;
      text-wrap: balance;
    }

    .headline-accent {
      display: block;
      margin-top: 8px;
      padding-left: .08em;
      color: transparent;
      -webkit-text-stroke: 1.2px rgba(255,255,255,.9);
      text-shadow: none;
    }

    .subtitle {
      max-width: 580px;
      margin: 28px 0 0;
      color: rgba(255,255,255,.7);
      font: 17px/1.9 "Microsoft YaHei", sans-serif;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 34px;
      font-family: "Microsoft YaHei", sans-serif;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      border-radius: 999px;
      padding: 0 22px;
      border: 1px solid rgba(255,255,255,.28);
      background: rgba(255,255,255,.055);
      color: rgba(255,255,255,.86);
      letter-spacing: .08em;
      transition: transform .22s var(--ease), background .22s ease, border-color .22s ease, box-shadow .22s ease;
    }

    .btn.primary {
      color: #050505;
      background: #f7f7f2;
      border-color: #fff;
      box-shadow: 0 12px 50px rgba(255,255,255,.22);
    }

    .btn:hover {
      transform: translateY(-3px);
      background: rgba(255,255,255,.13);
      border-color: rgba(255,255,255,.66);
    }

    .btn.primary:hover {
      background: #fff;
      box-shadow: 0 18px 70px rgba(255,255,255,.3);
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(86px, 1fr));
      gap: 0;
      width: min(620px, 100%);
      margin-top: 56px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }

    .metric {
      padding: 18px 20px;
      border-right: 1px solid var(--line);
    }

    .metric:last-child { border-right: 0; }

    .metric b {
      display: block;
      margin-bottom: 8px;
      font: 28px/1 "Times New Roman", serif;
      letter-spacing: -.02em;
    }

    .metric span {
      color: var(--muted);
      font: 12px/1.5 "Microsoft YaHei", sans-serif;
      letter-spacing: .12em;
    }

    .visual {
      position: relative;
      min-height: 680px;
      animation: rise .9s .16s var(--ease) both;
    }

    .lens {
      position: absolute;
      top: 50%;
      left: 35%;
      width: min(48vw, 540px);
      max-width: 100%;
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background:
        radial-gradient(circle at 57% 46%, rgba(255,255,255,.95) 0 2%, rgba(255,255,255,.32) 3%, transparent 7%),
        radial-gradient(circle, #050505 0 18%, rgba(255,255,255,.18) 19%, #060606 21% 31%, rgba(255,255,255,.1) 32%, transparent 33%),
        repeating-radial-gradient(circle, rgba(255,255,255,.22) 0 1px, transparent 1px 12px);
      border: 1px solid rgba(255,255,255,.26);
      box-shadow:
        inset 0 0 80px rgba(255,255,255,.12),
        0 0 140px rgba(255,255,255,.18);
    }

    .lens::before,
    .lens::after {
      position: absolute;
      inset: -20%;
      content: "";
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,.14);
      animation: orbit 22s linear infinite;
    }

    .lens::after {
      inset: -34%;
      border-style: dashed;
      animation-duration: 36s;
      animation-direction: reverse;
      opacity: .72;
    }

    .signal-card {
      position: absolute;
      right: 0;
      width: min(360px, 92vw);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 22px;
      background: linear-gradient(180deg, rgba(12,12,12,.82), rgba(7,7,7,.58));
      box-shadow: var(--shadow);
      backdrop-filter: blur(22px);
    }

    .signal-card.market { top: 28px; }
    .signal-card.latency { bottom: 26px; }

    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      font-family: "Microsoft YaHei", sans-serif;
    }

    .card-top h2 {
      margin: 0;
      font-size: 18px;
      letter-spacing: .08em;
    }

    .status-dot {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: rgba(255,255,255,.68);
      font-size: 12px;
    }

    .status-dot::before {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 20px #fff;
      content: "";
    }

    .market-value {
      margin: 0 0 16px;
      font: 48px/1 "Times New Roman", serif;
      letter-spacing: -.05em;
    }

    .market-list {
      display: grid;
      gap: 12px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      font: 13px/1.4 "Microsoft YaHei", sans-serif;
      color: rgba(255,255,255,.68);
    }

    .market-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .spark {
      width: 100%;
      height: 76px;
      margin-top: 12px;
    }

    .latency-grid {
      display: grid;
      gap: 10px;
      font-family: "Microsoft YaHei", sans-serif;
    }

    .latency-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px 0;
      border-top: 1px solid var(--line);
      color: rgba(255,255,255,.72);
      font-size: 13px;
    }

    .latency-row:first-child { border-top: 0; }

    .latency-row strong {
      color: #fff;
      font: 20px/1 "Times New Roman", serif;
    }

    .explain {
      margin: 18px 0 0;
      color: rgba(255,255,255,.58);
      font: 12px/1.8 "Microsoft YaHei", sans-serif;
    }

    .footer-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      border-top: 1px solid var(--line);
      padding-top: 24px;
      color: rgba(255,255,255,.55);
      font: 12px/1.4 "Microsoft YaHei", sans-serif;
      letter-spacing: .1em;
      animation: rise .9s .24s var(--ease) both;
    }

    .brand-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: clamp(14px, 2.4vw, 34px);
      color: rgba(255,255,255,.38);
      font: 700 15px/1 "Arial", sans-serif;
      letter-spacing: .18em;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(20px); filter: blur(8px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    @keyframes orbit {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 980px) {
      .nav-links { display: none; }
      .hero { grid-template-columns: 1fr; min-height: auto; }
      .visual { min-height: 620px; }
      .lens { left: 50%; top: 45%; width: min(82vw, 540px); }
      .signal-card.market { top: 0; right: 0; }
      .signal-card.latency { left: 0; right: auto; bottom: 0; }
    }

    @media (max-width: 680px) {
      .shell { padding-inline: 18px; }
      .brand strong { font-size: 15px; }
      .launch { display: none; }
      .hero { padding-top: 48px; gap: 18px; }
      .overline { letter-spacing: .34em; }
      h1 { font-size: clamp(48px, 16vw, 72px); }
      .subtitle { font-size: 15px; }
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .metric:nth-child(2) { border-right: 0; }
      .metric:nth-child(n + 3) { border-top: 1px solid var(--line); }
      .visual { min-height: 690px; }
      .signal-card { width: 100%; }
      .footer-strip { display: block; }
      .brand-row { justify-content: flex-start; margin-top: 18px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
      }

      .particle-field { display: none; }
    }
  </style>
</head>
<body>
  <canvas class="particle-field" id="particle-field" aria-hidden="true"></canvas>
  <div class="shell">
    <header class="nav" aria-label="主导航">
      <a class="brand" href="/" aria-label="影价追踪首页">
        <span class="iris" aria-hidden="true"></span>
        <span>
          <strong>LENSINTEL</strong>
          <span>影像 · 价格 · 洞察</span>
        </span>
      </a>
      <nav class="nav-links" aria-label="页面导航">
        <a href="${TEMP_APP_URL}" target="_blank" rel="noreferrer">产品演示</a>
        <a href="${TEMP_APP_URL}/sources" target="_blank" rel="noreferrer">数据源</a>
        <a href="/health">健康检查</a>
        <a href="${GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
      <a class="launch" href="${TEMP_APP_URL}" target="_blank" rel="noreferrer">进入系统</a>
    </header>

    <main class="hero">
      <section class="copy" aria-labelledby="hero-title">
        <p class="overline">Camera Price Intelligence</p>
        <h1 id="hero-title">洞见价格波动<span class="headline-accent">把握市场先机</span></h1>
        <p class="subtitle">相机价格追踪系统 V0.6 测试入口。当前完整应用仍运行在本机生产服务，通过临时隧道对外开放；这个 Cloudflare Worker 入口页则部署在边缘网络，用来承载公开访问、状态说明和后续正式域名入口。</p>
        <div class="actions">
          <a class="btn primary" href="${TEMP_APP_URL}" target="_blank" rel="noreferrer">打开完整系统</a>
          <a class="btn" href="${TEMP_APP_URL}/sources" target="_blank" rel="noreferrer">查看数据源状态</a>
          <a class="btn" href="${GITHUB_URL}" target="_blank" rel="noreferrer">查看代码仓库</a>
        </div>

        <div class="metrics" aria-label="当前平台规模">
          <div class="metric"><b>20</b><span>监控商品</span></div>
          <div class="metric"><b>23</b><span>平台链接</span></div>
          <div class="metric"><b>5</b><span>Provider 槽位</span></div>
          <div class="metric"><b>0.17s</b><span>本地首包实测</span></div>
        </div>
      </section>

      <section class="visual" aria-label="平台状态概览">
        <div class="lens" aria-hidden="true"></div>

        <article class="signal-card market">
          <div class="card-top">
            <h2>市场信号</h2>
            <span class="status-dot">实时测试</span>
          </div>
          <p class="market-value">-3.24%</p>
          <svg class="spark" viewBox="0 0 320 76" role="img" aria-label="价格趋势示意图">
            <defs>
              <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="white" stop-opacity=".28" />
                <stop offset="100%" stop-color="white" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 50 L22 46 L42 53 L60 41 L78 45 L98 34 L118 38 L140 28 L160 37 L180 33 L202 48 L222 42 L244 51 L266 30 L288 23 L320 12 L320 76 L0 76 Z" fill="url(#fade)" />
            <path d="M0 50 L22 46 L42 53 L60 41 L78 45 L98 34 L118 38 L140 28 L160 37 L180 33 L202 48 L222 42 L244 51 L266 30 L288 23 L320 12" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="market-list">
            <div class="market-row"><span>新机价格指数</span><strong>102.48</strong></div>
            <div class="market-row"><span>二手价格指数</span><strong>98.73</strong></div>
            <div class="market-row"><span>热度指数</span><strong>76.19</strong></div>
          </div>
        </article>

        <article class="signal-card latency">
          <div class="card-top">
            <h2>为什么会慢</h2>
            <span class="status-dot">已定位</span>
          </div>
          <div class="latency-grid">
            <div class="latency-row"><span>本地完整应用</span><strong>快</strong></div>
            <div class="latency-row"><span>临时 localtunnel</span><strong>不稳</strong></div>
            <div class="latency-row"><span>Worker 入口页</span><strong>轻量</strong></div>
          </div>
          <p class="explain">慢点主要来自免费临时隧道、首次访问提示页、跨网络转发和动态后端请求。正式上线建议切到 Cloudflare Named Tunnel 或独立服务器后端，再绑定正式 Zone 域名。</p>
        </article>
      </section>
    </main>

    <footer class="footer-strip">
      <span>Public edge entry for the self-use price strategy workflow</span>
      <div class="brand-row" aria-label="覆盖品牌示例">
        <span>CANON</span><span>SONY</span><span>NIKON</span><span>FUJIFILM</span><span>SIGMA</span>
      </div>
    </footer>
  </div>

  <script>
    (function () {
      var canvas = document.getElementById('particle-field');
      if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var ctx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var particles = [];
      var pointer = { x: -9999, y: -9999 };
      var raf = 0;

      function resize() {
        var width = window.innerWidth;
        var height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed(width, height);
      }

      function seed(width, height) {
        var count = Math.min(180, Math.max(70, Math.floor(width * height / 10500)));
        particles = [];
        for (var i = 0; i < count; i += 1) {
          var ring = Math.random() < .46;
          var angle = Math.random() * Math.PI * 2;
          var radius = ring ? Math.min(width, height) * (.18 + Math.random() * .22) : Math.random() * Math.max(width, height) * .62;
          var cx = width * .5;
          var cy = height * .48;
          particles.push({
            x: ring ? cx + Math.cos(angle) * radius : Math.random() * width,
            y: ring ? cy + Math.sin(angle) * radius : Math.random() * height,
            vx: (Math.random() - .5) * .42,
            vy: (Math.random() - .5) * .42,
            size: Math.random() * 1.7 + .45,
            energy: Math.random() * .65 + .35
          });
        }
      }

      function tick() {
        var width = window.innerWidth;
        var height = window.innerHeight;
        var cx = width * .5;
        var cy = height * .48;

        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        for (var i = 0; i < particles.length; i += 1) {
          var p = particles[i];
          var dx = p.x - cx;
          var dy = p.y - cy;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var orbit = Math.atan2(dy, dx) + Math.PI / 2;
          var pull = Math.min(.018, 24 / (dist * dist));
          p.vx += Math.cos(orbit) * .011 * p.energy - dx * pull * .018;
          p.vy += Math.sin(orbit) * .011 * p.energy - dy * pull * .018;

          var mx = p.x - pointer.x;
          var my = p.y - pointer.y;
          var md = Math.sqrt(mx * mx + my * my) || 1;
          if (md < 130) {
            p.vx += mx / md * .18;
            p.vy += my / md * .18;
          }

          p.x += p.vx;
          p.y += p.vy;
          p.vx *= .985;
          p.vy *= .985;

          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;

          ctx.beginPath();
          ctx.fillStyle = 'rgba(255,255,255,' + (.22 + p.energy * .56) + ')';
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        for (var a = 0; a < particles.length; a += 1) {
          for (var b = a + 1; b < particles.length; b += 1) {
            var p1 = particles[a];
            var p2 = particles[b];
            var x = p1.x - p2.x;
            var y = p1.y - p2.y;
            var gap = x * x + y * y;
            if (gap < 7600) {
              var alpha = (1 - gap / 7600) * .13;
              ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        raf = requestAnimationFrame(tick);
      }

      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', function (event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }, { passive: true });
      window.addEventListener('pointerleave', function () {
        pointer.x = -9999;
        pointer.y = -9999;
      }, { passive: true });

      resize();
      raf = requestAnimationFrame(tick);
      window.addEventListener('pagehide', function () { cancelAnimationFrame(raf); });
    })();
  </script>
</body>
</html>`
}
