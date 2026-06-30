import { SourceHealthAtlas } from '@/components/experience-modules'
import { CrawlControls } from '@/components/crawl-controls'
import { MetricCard, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
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

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">SOURCE HEALTH</span>
        <h1>Source Health Atlas</h1>
        <p>See which platforms are connected, fresh, and trustworthy enough to feed pricing decisions.</p>
      </div>
      <CrawlControls />
    </div>

    <div className="metrics">
      <MetricCard label="Configured providers" value={`${configured}/${providers.length}`} />
      <MetricCard label="Source health" value={providers.length ? `${Math.round((configured / providers.length) * 100)}%` : '0%'} tone={configured === providers.length ? 'green' : 'amber'} />
      <MetricCard label="Latest crawl success" value={latestRun?.success_count ?? 0} tone="amber" />
      <MetricCard label="Price records" value={bootstrap?.price_stats.total ?? 0} tone="cyan" />
    </div>

    <SourceHealthAtlas providers={providers} integrationRuns={integrationRuns} latestRun={latestRun} stats={bootstrap?.price_stats ?? null} />

    <SectionCard title="Provider matrix" className="ledger-panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Provider</th><th>Type</th><th>Status</th><th>Credential</th><th>Mode</th><th>Trend</th><th>Next action</th></tr></thead>
          <tbody>{providers.map((provider) => <tr key={provider.provider}>
            <td><strong>{provider.display_name}</strong></td>
            <td>Official / affiliate API</td>
            <td><StatusPill tone={providerTone(provider)}>{provider.configured ? 'READY' : 'MISSING'}</StatusPill></td>
            <td><StatusPill tone={providerTone(provider)}>{provider.configured ? 'VALID' : 'NEEDS KEY'}</StatusPill></td>
            <td>{provider.mode}</td>
            <td><Sparkline points={provider.configured ? [40, 42, 43, 47, 48, 52, 50, 56] : [20, 20, 18, 20, 19, 20, 19, 20]} /></td>
            <td>{provider.configured ? 'Run sync and compare checkout evidence' : 'Add API credentials before real import'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!providers.length && <div className="empty">No provider status returned. Check that the backend is running.</div>}
    </SectionCard>
  </>
}
