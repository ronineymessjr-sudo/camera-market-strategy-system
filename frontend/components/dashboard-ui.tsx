export function MetricCard({ label, value, note, tone='blue', icon='•' }: { label:string; value:string|number; note?:string; tone?:string; icon?:string }) {
  return <div className={`metric-card tone-${tone}`}><div><span className="metric-label">{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div><span className="metric-icon">{icon}</span></div>
}

export function SectionCard({ title, action, children, className='' }: { title:string; action?:string; children:React.ReactNode; className?:string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{action && <button className="text-btn">{action} →</button>}</div>{children}</section>
}

export function Sparkline({ points=[38,42,39,47,45,52,48,55,51,58], color='var(--blue)' }: { points?:number[]; color?:string }) {
  const max=Math.max(...points), min=Math.min(...points); const w=220,h=54; const coords=points.map((p,i)=>`${(i/(points.length-1))*w},${h-((p-min)/(max-min||1))*h}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} className="spark"><polyline fill="none" stroke={color} strokeWidth="3" points={coords}/></svg>
}

export function PriceChart({ compact=false }: { compact?:boolean }) {
  return <div className={`price-chart ${compact?'compact':''}`}>
    <div className="chart-y"><span>¥7,000</span><span>¥6,400</span><span>¥5,800</span><span>¥5,200</span><span>¥4,600</span></div>
    <svg viewBox="0 0 760 260" preserveAspectRatio="none">
      <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".35"/><stop offset="1" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>
      {[30,85,140,195,250].map(y=><line key={y} x1="0" y1={y} x2="760" y2={y} stroke="#213044" strokeDasharray="4 6"/>)}
      <rect x="0" y="176" width="760" height="40" fill="#f59e0b" opacity=".09"/>
      <line x1="0" y1="176" x2="760" y2="176" stroke="#f59e0b" strokeDasharray="6 5"/>
      <line x1="0" y1="215" x2="760" y2="215" stroke="#2dd4bf" strokeDasharray="6 5"/>
      <path d="M0,54 C50,62 78,46 112,68 S180,48 215,90 S270,112 315,105 S375,118 420,132 S475,121 520,160 S595,147 640,178 S705,166 760,186 L760,260 L0,260 Z" fill="url(#fill)"/>
      <path d="M0,54 C50,62 78,46 112,68 S180,48 215,90 S270,112 315,105 S375,118 420,132 S475,121 520,160 S595,147 640,178 S705,166 760,186" fill="none" stroke="#4ea1ff" strokeWidth="4"/>
      <circle cx="760" cy="186" r="6" fill="#60a5fa"/>
    </svg>
    <div className="chart-x"><span>05-01</span><span>05-08</span><span>05-15</span><span>05-22</span><span>05-29</span></div>
  </div>
}

export function StatusPill({ children, tone='blue' }: { children:React.ReactNode; tone?:string }) { return <span className={`status-pill ${tone}`}>{children}</span> }

export const demoProducts = [
  ['Sony FE 24-70mm F2.8 GM II','镜头 / 全画幅','¥13,499','¥12,299','9.8%','高','监控中'],
  ['Canon RF 24-70mm F2.8 L IS USM','镜头 / 全画幅','¥13,899','¥12,499','11.2%','高','监控中'],
  ['Sony A7 IV 单机身','相机 / 全画幅','¥13,299','¥11,999','10.8%','高','监控中'],
  ['DJI Air 3S 畅飞套装','无人机','¥8,699','¥7,799','11.5%','中高','监控中'],
  ['Tamron 28-75mm F2.8 G2','镜头 / 全画幅','¥4,199','¥3,699','13.5%','中高','监控中'],
  ['Nikon Z6 III 单机身','相机 / 全画幅','¥8,860','¥7,999','10.8%','中','监控中'],
  ['Sigma 17-40mm F1.8 DC Art','镜头 / APS-C','¥5,599','¥4,500','7.7%','中','已暂停'],
]
