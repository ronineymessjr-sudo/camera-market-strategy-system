import { CrawlControls } from '@/components/crawl-controls'
import { MetricCard, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel } from '@/lib/format'
import type { FlowRun, FrontendBootstrap, IntegrationRun, ProviderStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadSources() {
  try {
    const [bootstrap, runs, latestRun] = await Promise.all([
      api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=10&candidate_limit=5'),
      api<IntegrationRun[]>('/api/integrations/runs'),
      api<FlowRun | null>('/api/prices/runs/latest'),
    ])
    return { providers: bootstrap.providers, integrationRuns: runs, latestRun, bootstrap }
  } catch {
    return { providers: [] as ProviderStatus[], integrationRuns: [] as IntegrationRun[], latestRun: null, bootstrap: null as FrontendBootstrap | null }
  }
}

function providerTone(provider: ProviderStatus) {
  return provider.configured ? 'green' : 'amber'
}

export default async function Sources() {
  const { providers, integrationRuns, latestRun, bootstrap } = await loadSources()
  const configured = providers.filter((provider) => provider.configured).length
  const lastRuns = integrationRuns.slice(0, 8)

  return <>
    <div className="page-title"><div><h1>平台与数据源管理</h1><p>管理数据源连接、API 凭证与爬取任务</p></div><CrawlControls /></div>
    <div className="metrics">
      <MetricCard label="已配置平台" value={`${configured}/${providers.length}`} />
      <MetricCard label="数据源健康度" value={providers.length ? `${Math.round((configured / providers.length) * 100)}%` : '0%'} tone={configured === providers.length ? 'green' : 'amber'} />
      <MetricCard label="最近抓取成功" value={latestRun?.success_count ?? 0} tone="amber" />
      <MetricCard label="价格记录总数" value={bootstrap?.price_stats.total ?? 0} tone="cyan" />
    </div>
    <SectionCard title="数据源连接状态">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>平台 / 数据源</th><th>类型</th><th>供应商状态</th><th>凭证状态</th><th>最近模式</th><th>同步趋势</th><th>操作建议</th></tr></thead>
          <tbody>{providers.map((provider) => <tr key={provider.provider}>
            <td><strong>{provider.display_name}</strong></td>
            <td>官方 / 联盟 API</td>
            <td><StatusPill tone={providerTone(provider)}>{provider.configured ? '可调用' : '未配置'}</StatusPill></td>
            <td><StatusPill tone={providerTone(provider)}>{provider.configured ? '有效' : '缺少密钥'}</StatusPill></td>
            <td>{provider.mode}</td>
            <td><Sparkline points={provider.configured ? [40, 42, 43, 47, 48, 52, 50, 56] : [20, 20, 18, 20, 19, 20, 19, 20]} /></td>
            <td>{provider.configured ? '可执行同步' : '按 API 密钥文档补齐凭证'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!providers.length && <div className="empty">暂无供应商状态，请确认后端服务已启动。</div>}
    </SectionCard>
    <div className="two-col" style={{ marginTop: 16 }}>
      <SectionCard title="本地爬虫运行状态">
        <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div><b>{latestRun?.total_count ?? 0}</b><small className="muted">总任务</small></div>
          <div><b>{latestRun?.success_count ?? 0}</b><small className="muted">成功</small></div>
          <div><b>{latestRun?.failure_count ?? 0}</b><small className="muted">失败</small></div>
          <div><b>{latestRun?.skipped_count ?? 0}</b><small className="muted">跳过</small></div>
        </div>
        <div className="list">
          <div className="list-row"><span>最近运行</span><b>{latestRun ? ageLabel(latestRun.finished_at ?? latestRun.started_at) : '暂无'}</b></div>
          <div className="list-row"><span>状态</span><StatusPill tone={latestRun?.status === 'SUCCESS' ? 'green' : 'amber'}>{latestRun?.status ?? '未运行'}</StatusPill></div>
          <div className="list-row"><span>耗时</span><b>{latestRun?.duration_seconds ? `${latestRun.duration_seconds.toFixed(1)} 秒` : '暂无'}</b></div>
        </div>
      </SectionCard>
      <SectionCard title="API 同步日志">
        <div className="list">{lastRuns.length ? lastRuns.map((run) => <div className="list-row" key={run.id}>
          <div><strong>{run.provider} · {run.keyword || '手动同步'}</strong><small>{ageLabel(run.finished_at ?? run.started_at)} · 收录 {run.ingested_count}/{run.offer_count}</small></div>
          <StatusPill tone={run.status === 'SUCCESS' ? 'green' : run.status === 'FAILED' ? 'red' : 'amber'}>{run.status}</StatusPill>
        </div>) : <div className="empty">暂无 API 同步记录。配置密钥后可从集成接口同步真实商品链接。</div>}</div>
      </SectionCard>
    </div>
  </>
}
