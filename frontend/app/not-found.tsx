import Link from 'next/link'

export default function NotFound() {
  return <section className="not-found">
    <span>404 / ROUTE NOT FOUND</span>
    <h1>这个页面不存在</h1>
    <p>返回概览，继续查看真实价格、核验证据和策略机会。</p>
    <Link href="/" className="btn-primary">返回概览</Link>
  </section>
}
