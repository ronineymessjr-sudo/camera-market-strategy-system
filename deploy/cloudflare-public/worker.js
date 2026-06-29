const TEMP_APP_URL = 'https://camera-market-test-r9.loca.lt'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'camera-market-public-entry',
        temp_app_url: TEMP_APP_URL,
        note: 'Full app is currently exposed by a temporary local tunnel.',
      })
    }

    return new Response(renderPage(), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
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
  <title>影价追踪测试入口</title>
  <style>
    :root { color-scheme: dark; --bg: #07111d; --panel: #0d1c2b; --line: #21364d; --text: #edf4ff; --muted: #8aa0b8; --blue: #4297ff; --cyan: #2dd4bf; --amber: #f2a93b; }
    body { margin: 0; min-height: 100vh; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; background: radial-gradient(circle at 20% 0, #17375f, transparent 34%), linear-gradient(180deg, #07111d, #07101a); color: var(--text); }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 72px 0; }
    .hero { border: 1px solid var(--line); background: linear-gradient(145deg, #0f2032, #081522); border-radius: 24px; padding: 34px; box-shadow: 0 30px 90px #0007; }
    .badge { display: inline-flex; gap: 8px; align-items: center; border: 1px solid #2f5f8c; background: #0e2742; color: #80c4ff; border-radius: 999px; padding: 7px 12px; font-size: 13px; }
    h1 { font-size: clamp(34px, 5vw, 60px); line-height: 1.05; margin: 22px 0 14px; }
    p { color: var(--muted); line-height: 1.8; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    a { color: inherit; }
    .btn { text-decoration: none; border: 1px solid #2d5f93; border-radius: 12px; padding: 12px 16px; background: #10243a; }
    .btn.primary { background: linear-gradient(180deg, #338dff, #246bd4); border-color: #4297ff; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
    .card { border: 1px solid var(--line); background: #0a1928; border-radius: 16px; padding: 18px; }
    .card b { display: block; font-size: 24px; margin-bottom: 8px; }
    code { color: #9bd7ff; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } main { padding-top: 28px; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <span class="badge">Cloudflare Workers 公共测试入口</span>
      <h1>影价追踪平台<br/>V0.6 测试发布页</h1>
      <p>完整系统目前运行在本机生产服务，并通过临时公网隧道暴露。Cloudflare 正式账号已验证可用，但当前账号没有已接入的域名 Zone，因此暂不能绑定正式域名。</p>
      <div class="actions">
        <a class="btn primary" href="${TEMP_APP_URL}" target="_blank" rel="noreferrer">打开完整临时系统</a>
        <a class="btn" href="/health">Cloudflare 入口健康检查</a>
        <a class="btn" href="${TEMP_APP_URL}/sources" target="_blank" rel="noreferrer">查看数据源状态</a>
      </div>
      <div class="grid">
        <div class="card"><b>20</b><span>监控商品</span></div>
        <div class="card"><b>23</b><span>平台链接</span></div>
        <div class="card"><b>5</b><span>API Provider 槽位</span></div>
      </div>
      <p>如果 localtunnel 首次访问出现安全提示，请输入页面显示的 IP 继续；正式上线建议接入 Cloudflare Zone 后使用 Named Tunnel 或部署到支持 Python 后端的服务器。</p>
      <p>已预留国内 API：京东、淘宝、拼多多；海外 API：eBay Browse API、Amazon Product API。密钥填入后通过 <code>/api/integrations/{provider}/sync</code> 联调。</p>
    </section>
  </main>
</body>
</html>`
}
