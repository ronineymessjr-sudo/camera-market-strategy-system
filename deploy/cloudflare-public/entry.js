import publicWorker from './worker.js'
import { handleCloudCrawl } from './cloud-crawl.js'

export default {
  async fetch(request, env = {}, ctx) {
    const cloudResponse = await handleCloudCrawl(request, env)
    if (cloudResponse) return cloudResponse

    const url = new URL(request.url)
    const response = await publicWorker.fetch(request, env, ctx)
    if (url.pathname === '/health' && request.method === 'GET' && response.ok) {
      const body = await response.json()
      return Response.json({
        ...body,
        version: '0.20-cloud-crawl',
        cloud_crawl_store: Boolean(env.FEEDBACK_DB),
        cloud_crawl_interval_minutes: 120,
      }, { status: response.status, headers: response.headers })
    }
    if (request.method === 'GET' && ['/', '/index.html'].includes(url.pathname) && response.ok) {
      return enhanceWorkbench(response)
    }
    return response
  },
}

async function enhanceWorkbench(response) {
  const html = await response.text()
  const style = `<style>
.cloud-crawl{margin-top:16px}.cloud-crawl-status{display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid #cfc5b5;border-radius:999px;background:#f7f3ea;color:#5b5145;font-size:10px}.cloud-crawl-status:before{content:"";width:7px;height:7px;border-radius:50%;background:#d39b2b;box-shadow:0 0 0 4px #d39b2b18}.cloud-crawl-status[data-ok="true"]:before{background:#2f8a5d;box-shadow:0 0 0 4px #2f8a5d18}.cloud-trust{margin:12px 0 0;color:#746b5f;font-size:10px}.cloud-link{color:#245cff;text-decoration:none;font-weight:700}.cloud-price{font-variant-numeric:tabular-nums;font-weight:800}.cloud-source{display:block;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#746b5f;font-size:9px}
@media(max-width:650px){.cloud-crawl .panel-head{display:grid}.cloud-crawl-status{justify-self:start}.cloud-crawl .data{min-width:760px}}
</style>`
  const panel = `<section class="panel reveal cloud-crawl" id="cloud-crawl"><div class="panel-head"><div><h2 id="cloud-crawl-title">自动价格抓取</h2><p id="cloud-crawl-subtitle">每两小时检查品牌官方页面，公开展示最新网页可见价格。</p></div><span class="cloud-crawl-status" id="cloud-crawl-status">正在读取抓取状态…</span></div><div class="table-wrap"><table class="data"><thead><tr><th id="cloud-head-product">商品</th><th id="cloud-head-platform">平台</th><th id="cloud-head-price">网页价格</th><th id="cloud-head-stock">库存状态</th><th id="cloud-head-trust">证据级别</th><th id="cloud-head-time">抓取时间</th></tr></thead><tbody id="cloud-price-rows"><tr><td colspan="6" class="empty">正在读取真实价格…</td></tr></tbody></table></div><p class="cloud-trust" id="cloud-trust">网页价格仅作为 VISIBLE_PRICE / UNVERIFIED 线索；只有人工核验的结算证据才能触发策略。</p></section>`
  const script = `<script>(()=>{const zh=document.documentElement.lang.startsWith('zh'),labels=zh?{title:'自动价格抓取',subtitle:'每两小时检查品牌官方页面，公开展示最新网页可见价格。',loading:'正在读取抓取状态…',empty:'本轮没有提取到网页价格。',failed:'云端抓取状态暂不可用',product:'商品',platform:'平台',price:'网页价格',stock:'库存状态',trust:'证据级别',time:'抓取时间',clue:'网页线索',run:'最近抓取',records:'条记录',notice:'网页价格仅作为 VISIBLE_PRICE / UNVERIFIED 线索；只有人工核验的结算证据才能触发策略。'}:{title:'Automated price crawl',subtitle:'Checks official brand pages every two hours and publishes the latest visible prices.',loading:'Loading crawl status…',empty:'No visible prices were extracted in this run.',failed:'Cloud crawl status is unavailable',product:'Product',platform:'Platform',price:'Visible price',stock:'Stock',trust:'Evidence level',time:'Captured',clue:'Visible clue',run:'Latest crawl',records:'records',notice:'Visible prices are VISIBLE_PRICE / UNVERIFIED clues only. A strategy requires manually verified checkout evidence.'};const byId=id=>document.getElementById(id),text=(id,value)=>{byId(id).textContent=value};text('cloud-crawl-title',labels.title);text('cloud-crawl-subtitle',labels.subtitle);text('cloud-crawl-status',labels.loading);text('cloud-head-product',labels.product);text('cloud-head-platform',labels.platform);text('cloud-head-price',labels.price);text('cloud-head-stock',labels.stock);text('cloud-head-trust',labels.trust);text('cloud-head-time',labels.time);text('cloud-trust',labels.notice);const money=(value,currency)=>value==null?'—':new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'CNY',maximumFractionDigits:2}).format(Number(value)),date=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—',cell=(value,className)=>{const td=document.createElement('td');td.textContent=value;if(className)td.className=className;return td};Promise.all([fetch('/api/cloud-crawl/status').then(response=>{if(!response.ok)throw new Error();return response.json()}),fetch('/api/cloud-crawl/prices?limit=50').then(response=>{if(!response.ok)throw new Error();return response.json()})]).then(([status,prices])=>{const badge=byId('cloud-crawl-status');badge.dataset.ok=String(Boolean(status.latest)&&!status.stale);badge.textContent=status.latest?labels.run+' · '+status.latest.status+' · '+status.latest.success_count+'/'+status.latest.total_count+' · '+status.age_minutes+' min':labels.empty;const rows=byId('cloud-price-rows');rows.replaceChildren();if(!prices.items.length){const tr=document.createElement('tr'),td=cell(labels.empty,'empty');td.colSpan=6;tr.append(td);rows.append(tr);return}prices.items.forEach(item=>{const tr=document.createElement('tr'),product=document.createElement('td'),link=document.createElement('a'),source=document.createElement('small');link.className='cloud-link';link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.product_name;source.className='cloud-source';source.textContent=item.source_url;product.append(link,source);tr.append(product,cell(item.platform||'—'),cell(money(item.promotion_price??item.list_price,item.currency),'cloud-price'),cell(item.stock_status||'—'),cell(labels.clue),cell(date(item.captured_at)));rows.append(tr)})}).catch(()=>{text('cloud-crawl-status',labels.failed);const badge=byId('cloud-crawl-status');badge.dataset.ok='false'})})()</script>`
  const enhanced = html
    .replace('</head>', `${style}</head>`)
    .replace('</main>', `${panel}</main>`)
    .replace('</body>', `${script}</body>`)
  return new Response(enhanced, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
