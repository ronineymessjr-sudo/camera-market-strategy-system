import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { FlowRun, ProviderStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type RuntimeStatus = {
  version: string
  runtime_mode: 'local' | 'cloud'
  checks: Record<string, boolean>
  counts: Record<string, number>
  providers: ProviderStatus[]
  last_flow?: FlowRun | null
}

async function loadStatus() {
  try {
    return await api<RuntimeStatus>('/api/system/status')
  } catch {
    return null
  }
}

const checkLabels: Record<string, string> = {
  database_ready: 'Database reachable',
  production_database: 'Postgres production database',
  operator_auth_configured: 'Operator authentication',
  cloudflare_access_configured: 'Cloudflare Access identity',
  evidence_storage_configured: 'Private evidence storage',
  public_https: 'Public HTTPS URL',
  scheduler_enabled: 'Automatic scheduler',
}

export default async function SettingsPage() {
  const status = await loadStatus()
  const readyChecks = status ? Object.values(status.checks).filter(Boolean).length : 0
  const totalChecks = status ? Object.keys(status.checks).length : 0
  const configuredProviders = status?.providers.filter((provider) => provider.configured).length ?? 0

  return <>
    <div className="page-title"><div><span className="eyebrow">RUNTIME TRUTH</span><h1>System Settings & Readiness</h1><p>Safe configuration visibility only. Secret values are never returned to the browser.</p></div></div>
    <div className="metrics">
      <MetricCard label="Runtime" value={status?.runtime_mode ?? 'offline'} note={`Version ${status?.version ?? 'unknown'}`} tone={status?.runtime_mode === 'cloud' ? 'green' : 'amber'} />
      <MetricCard label="Readiness checks" value={`${readyChecks}/${totalChecks}`} note="Current configuration, not a deployment claim" />
      <MetricCard label="Providers configured" value={configuredProviders} note={`${status?.providers.length ?? 0} adapters available`} tone="cyan" />
      <MetricCard label="Pending review" value={status?.counts.pending_reviews ?? 0} note="Clues that cannot trigger strategy" tone="amber" />
    </div>
    {!status && <div className="empty">Backend status is unavailable. Start the real API runtime before using operator controls.</div>}
    {status && <div className="two-col">
      <SectionCard title="Release gates">
        <div className="list">{Object.entries(status.checks).map(([key, value]) => <div className="list-row" key={key}>
          <div><strong>{checkLabels[key] ?? key}</strong><small>{value ? 'Configured and detectable' : 'Missing or intentionally disabled'}</small></div>
          <StatusPill tone={value ? 'green' : 'amber'}>{value ? 'READY' : 'OPEN'}</StatusPill>
        </div>)}</div>
      </SectionCard>
      <SectionCard title="Live data footprint">
        <div className="list">{Object.entries(status.counts).map(([key, value]) => <div className="list-row" key={key}><span>{key.replaceAll('_', ' ')}</span><b>{value}</b></div>)}</div>
        <div className="list-row"><span>Last flow</span><b>{status.last_flow?.status ?? 'No run'}</b></div>
      </SectionCard>
    </div>}
    {status && <SectionCard title="Marketplace provider checklist" className="settings-providers">
      <div className="provider-checklist">{status.providers.map((provider) => <div key={provider.provider}>
        <span>{provider.display_name}</span>
        <StatusPill tone={provider.configured ? 'green' : 'amber'}>{provider.configured ? 'CONFIGURED' : 'MISSING KEY'}</StatusPill>
        <small>{provider.mode}</small>
      </div>)}</div>
    </SectionCard>}
    <div className="operator-disclaimer"><strong>Decision boundary</strong><span>Visible and unverified prices are clues only. Only fresh checkout evidence can trigger a signal, and the system never places an order.</span></div>
  </>
}
