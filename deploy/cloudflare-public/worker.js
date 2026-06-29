const TEMP_APP_URL = 'https://camera-market-test-r9.loca.lt'
const GITHUB_URL = 'https://github.com/ronineymessjr-sudo/camera-market-strategy-system'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return Response.json({ ok:true, service:'camera-market-public-entry', version:'0.9-cinematic-vortex', temp_app_url:TEMP_APP_URL })
    }
    return new Response(renderPage(), { headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff'} })
  },
}

function renderPage() {
return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="相机价格追踪与策略平台，记录真实价格、核验证据并生成购买提醒。"/>
<title>影价追踪 | Camera Market Intelligence</title>
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
<canvas id="vortex"></canvas><div class="veil"></div><div class="shell">
<nav><a class="brand" href="/"><span class="mark">Ø</span><span><strong>影价追踪</strong><small>CAMERA MARKET INTELLIGENCE</small></span></a><div class="nav-actions"><a href="${GITHUB_URL}" target="_blank">GitHub</a><a class="launch" href="${TEMP_APP_URL}">进入系统</a></div></nav>
<main><section class="hero"><div class="eyebrow">REAL PRICE · VERIFIED EVIDENCE · DECISION</div><h1>看见真实价格<span>再决定是否购买</span></h1><p class="sub">记录真实商品链接、价格证据与变化趋势。系统只把已核验到手价作为可执行信号，其余数据只作为线索。</p><div class="actions"><a class="btn primary" href="${TEMP_APP_URL}">打开完整看板</a><a class="btn" href="${GITHUB_URL}" target="_blank">查看开源代码</a></div><div class="rule"><div><b>已核验到手价</b><span>可触发策略</span></div><div><b>网页可见价</b><span>仅作为证据</span></div><div><b>未核验线索</b><span>等待人工确认</span></div></div></section></main></div>
<script>
(()=>{const c=document.getElementById('vortex'),x=c.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;let d=Math.min(devicePixelRatio||1,2),w,h,cx,cy,p=[];
function resize(){w=innerWidth;h=innerHeight;cx=w/2;cy=h/2;c.width=w*d;c.height=h*d;c.style.width=w+'px';c.style.height=h+'px';x.setTransform(d,0,0,d,0,0);const n=Math.min(1200,Math.max(380,Math.floor(w*h/1500)));p=Array.from({length:n},(_,i)=>({r:36+Math.pow(Math.random(),.54)*Math.min(w,h)*.44,a:Math.random()*Math.PI*2,s:(.0015+Math.random()*.005)*(Math.random()>.5?1:-1),z:.3+Math.random()*1.7,l:Math.random()*6.28,arm:i%6}))}
function draw(t){x.clearRect(0,0,w,h);x.globalCompositeOperation='lighter';const time=t*.001;for(const q of p){if(!reduced){q.a+=q.s;q.l+=.01}const flame=Math.sin(q.l*2.1+q.arm)*12+Math.sin(time*1.6+q.a*4)*7,rr=q.r+flame,ang=q.a+q.arm*Math.PI/3+rr*.013,xx=cx+Math.cos(ang)*rr,yy=cy+Math.sin(ang)*rr*.68,hot=1-Math.min(1,Math.abs(rr-150)/Math.max(150,rr)),alpha=.07+hot*.36+(1-Math.min(1,rr/(Math.min(w,h)*.5)))*.11;x.beginPath();x.fillStyle='rgba(255,255,255,'+alpha.toFixed(3)+')';x.arc(xx,yy,q.z*(.75+hot),0,6.283);x.fill()}x.globalCompositeOperation='source-over';const g=x.createRadialGradient(cx,cy,8,cx,cy,Math.min(w,h)*.32);g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(.055,'rgba(255,255,255,.28)');g.addColorStop(.22,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);requestAnimationFrame(draw)}
addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(draw)})()
</script></body></html>`
}
