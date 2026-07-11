export default function Loading() {
  return <div className="loading-screen" aria-label="正在加载">
    <div className="loading-head">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-button" />
    </div>
    <div className="loading-metrics">
      {[0,1,2].map((item) => <div className="skeleton skeleton-card" key={item} />)}
    </div>
    <div className="loading-grid">
      <div className="skeleton skeleton-panel" />
      <div className="skeleton skeleton-panel small" />
    </div>
  </div>
}
