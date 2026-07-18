import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { ProviderStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadCatalog() {
  try {
    return await api<ProviderStatus[]>('/api/integrations/catalog')
  } catch {
    return []
  }
}

export default async function ConnectorsPage() {
  const providers = await loadCatalog()
  const configured = providers.filter((provider) => provider.configured).length
  const guide = providers[0]?.setup_guide ?? 'https://github.com/ronineymessjr-sudo/camera-market-strategy-system/blob/main/docs/API_KEY_APPLICATION_GUIDE.md'

  return <>
    <div className="page-title"><div><span className="eyebrow">BRING YOUR OWN CREDENTIALS</span><h1>Connect Your Marketplace APIs</h1><p>Use your own platform account and keep every credential inside your private backend environment.</p></div><a className="btn-primary" href={guide} target="_blank" rel="noreferrer">Open setup guide</a></div>
    <div className="metrics">
      <MetricCard label="Connector model" value="BYOK" note="One credential set per operator" tone="cyan" />
      <MetricCard label="Available adapters" value={providers.length || 5} note="JD · Taobao · PDD · eBay · Amazon" />
      <MetricCard label="Configured here" value={`${configured}/${providers.length || 5}`} note="Read from this private runtime only" tone={configured ? 'green' : 'amber'} />
      <MetricCard label="Browser secret storage" value="OFF" note="Credential values are never returned" tone="green" />
    </div>
    <SectionCard title="Private setup flow">
      <ol className="connector-steps">
        <li><b>Apply with your own account</b><span>Each platform issues credentials to its own developer or affiliate account.</span></li>
        <li><b>Store keys in backend/.env</b><span>Never paste credentials into the public site, feedback form, Git, or frontend variables.</span></li>
        <li><b>Restart and verify</b><span>The catalog reports only CONFIGURED or MISSING KEY; it never exposes the values.</span></li>
      </ol>
    </SectionCard>
    <div className="connector-grid">{providers.map((provider) => <article className="connector-card" key={provider.provider}>
      <div><strong>{provider.display_name}</strong><StatusPill tone={provider.configured ? 'green' : 'amber'}>{provider.configured ? 'CONFIGURED' : 'CONNECT YOUR KEY'}</StatusPill></div>
      <p>{provider.mode} · credentials owned by this operator</p>
      <div className="env-list">{provider.required_env.map((name) => <code key={name}>{name}</code>)}</div>
    </article>)}</div>
    {!providers.length && <div className="empty">The private backend is offline. The connector guide is still available, but configuration status cannot be read.</div>}
    <div className="operator-disclaimer"><strong>Security boundary</strong><span>This page is a setup entry, not a credential collector. Secrets remain in each user&apos;s own deployment; imported API prices remain VISIBLE_PRICE clues until checkout evidence is verified.</span></div>
  </>
}
