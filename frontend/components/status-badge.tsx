export function StatusBadge({ status }: { status: string }) {
  const cls = status === 'STRONG_BUY' || status === 'BUY_TRIGGERED' || status === 'VERIFIED_CHECKOUT'
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : status === 'INVALID' || status === 'CRAWL_ERROR'
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : status === 'VISIBLE_PRICE' || status === 'WATCH_ONLY'
        ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
        : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>
}
