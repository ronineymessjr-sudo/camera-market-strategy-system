import ReactMarkdown from 'react-markdown'

import { ReportControls } from '@/components/report-controls'
import { MetricCard, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api, API_BASE } from '@/lib/api'
import { bestPrice, shortDate } from '@/lib/format'
import type { FrontendBootstrap, Price, Report } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadReports() {
  try {
    const [reports, bootstrap, prices] = await Promise.all([
      api<Report[]>('/api/reports/daily'),
      api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=20&candidate_limit=20'),
      api<Price[]>('/api/prices/latest?limit=100'),
    ])
    return { reports, bootstrap, prices }
  } catch {
    return { reports: [], bootstrap: null, prices: [] }
  }
}

export default async function Reports() {
  const { reports, bootstrap, prices } = await loadReports()
  const latest = reports[0]
  const buySignals = bootstrap?.selection_candidates.filter((row) => row.is_buy_signal).length ?? 0
  const pricedRows = prices.filter((price) => typeof bestPrice(price) === 'number')
  const currencyCounts = pricedRows.reduce<Record<string, number>>((counts, price) => {
    const currency = (price.currency || 'CNY').toUpperCase()
    counts[currency] = (counts[currency] ?? 0) + 1
    return counts
  }, {})
  const marketCurrency = Object.entries(currencyCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'CNY'
  const marketPoints = pricedRows
    .filter((price) => (price.currency || 'CNY').toUpperCase() === marketCurrency)
    .map((price) => bestPrice(price)!)
    .slice(0, 40)
    .reverse()

  return <>
    <div className="page-title"><div><h1>日报中心 / 策略日报</h1><p>每日生成你的策略执行与价格洞察报告</p></div><ReportControls /></div>
    <div className="metrics">
      <MetricCard label="报告生成状态" value={latest ? '已生成' : '待生成'} note={latest ? shortDate(latest.updated_at ?? latest.created_at) : '点击按钮生成'} tone={latest ? 'green' : 'amber'} icon="✓" />
      <MetricCard label="当前商品池" value={bootstrap?.products.length ?? 0} note="参与日报统计" />
      <MetricCard label="买入信号" value={buySignals} note="来自候选池" tone="green" />
      <MetricCard label="待核验线索" value={bootstrap?.price_stats.needs_review ?? 0} note="影响策略可信度" tone="amber" />
    </div>
    <div className="two-col">
      <SectionCard title="今日结论">
        {latest ? <>
          <p><StatusPill tone={buySignals > 0 ? 'green' : 'blue'}>{buySignals > 0 ? '存在机会' : '继续观察'}</StatusPill></p>
          <p className="muted">{latest.summary || '日报已生成，详细内容如下。'}</p>
          <div className="report-markdown"><ReactMarkdown>{latest.markdown_content}</ReactMarkdown></div>
        </> : <div className="empty">暂无日报。点击右上角“生成/刷新今日日报”后，这里会展示真实报告。</div>}
      </SectionCard>
      <SectionCard title="用户策略状态">
        <div className="three-col">
          <div className="panel"><b>{bootstrap?.selection_candidates.length ?? 0}</b><small className="muted">候选机会</small></div>
          <div className="panel"><b style={{ color: '#34d399' }}>{buySignals}</b><small className="muted">买入信号</small></div>
          <div className="panel"><b style={{ color: '#f7b64b' }}>{bootstrap?.price_stats.needs_review ?? 0}</b><small className="muted">需核验</small></div>
        </div>
        <div className="gauge" style={{ marginTop: 18 }}><b>{bootstrap?.price_stats.total ? Math.round((bootstrap.price_stats.verified_checkout / bootstrap.price_stats.total) * 100) : 0}%</b></div>
      </SectionCard>
    </div>
    <div className="two-col" style={{ marginTop: 16 }}>
      <SectionCard title="历史日报" action="查看全部">
        <div className="list">{reports.length ? reports.slice(0, 8).map((report) => <div className="list-row" key={report.id}>
          <div><strong>{report.title}</strong><small>{report.report_date} · {shortDate(report.created_at)}</small></div>
          <a className="text-btn" href={`${API_BASE}/api/reports/${report.id}/download`}>下载</a>
        </div>) : <div className="empty">暂无历史日报。</div>}</div>
      </SectionCard>
      <SectionCard title={`今日市场概览（${marketCurrency}）`}>
        <Sparkline points={marketPoints} />
        <div className="list-row"><span>已核验记录</span><b style={{ color: '#34d399' }}>{bootstrap?.price_stats.verified_checkout ?? 0}</b></div>
        <div className="list-row"><span>可见价线索</span><b style={{ color: '#f7b64b' }}>{bootstrap?.price_stats.visible_price ?? 0}</b></div>
      </SectionCard>
    </div>
  </>
}
