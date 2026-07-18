import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = (await readFile(new URL('./worker.js', import.meta.url), 'utf8')).replace(
  'export default',
  'globalThis.__worker =',
)
const context = { Request, Response, URL, FormData, Set, console, globalThis: null }
context.globalThis = context
vm.runInNewContext(source, context, { filename: 'worker.js' })
const worker = context.__worker

function feedbackDb() {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              assert.match(sql, /INSERT INTO feedback/)
              assert.equal(values[0], 'The price evidence flow is clear.')
              return { success: true, meta: { last_row_id: 7 } }
            },
          }
        },
        async first() {
          assert.match(sql, /COUNT\(\*\)/)
          return { total: 3, latest: '2026-07-18 10:00:00' }
        },
      }
    },
  }
}

test('health reports beta runtime and feedback binding', async () => {
  const response = await worker.fetch(new Request('https://example.test/health'), { FEEDBACK_DB: feedbackDb() })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'camera-market-public-beta',
    version: '0.16-feedback',
    feedback_store: true,
    app_configured: false,
  })
})

test('root serves English and Chinese versions without mojibake', async () => {
  const english = await worker.fetch(new Request('https://example.test/?lang=en'))
  const englishHtml = await english.text()
  assert.match(englishHtml, /See the real price/)
  assert.match(englishHtml, /Send feedback/)
  assert.doesNotMatch(englishHtml, /锟|褰|杩/)

  const chinese = await worker.fetch(new Request('https://example.test/?lang=zh'))
  const chineseHtml = await chinese.text()
  assert.match(chineseHtml, /看见真实价格/)
  assert.match(chineseHtml, /提交反馈/)
  assert.match(chineseHtml, /lang="zh-CN"/)
})

test('feedback submission validates and stores anonymous content', async () => {
  const request = new Request('https://example.test/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      category: 'data',
      message: 'The price evidence flow is clear.',
      locale: 'en',
      page: '/',
    }),
  })
  const response = await worker.fetch(request, { FEEDBACK_DB: feedbackDb() })
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { ok: true, id: 7 })

  const invalid = await worker.fetch(new Request('https://example.test/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'short' }),
  }), { FEEDBACK_DB: feedbackDb() })
  assert.equal(invalid.status, 422)
})

test('feedback status exposes counts but not messages', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/feedback/status'), { FEEDBACK_DB: feedbackDb() })
  assert.deepEqual(await response.json(), { ok: true, pending: 3, latest: '2026-07-18 10:00:00' })
})

test('discovery files and security headers are correct', async () => {
  const robots = await worker.fetch(new Request('https://example.test/robots.txt'))
  assert.match(await robots.text(), /Sitemap: https:\/\/example\.test\/sitemap\.xml/)

  const page = await worker.fetch(new Request('https://example.test/'))
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff')
  assert.match(page.headers.get('content-security-policy') ?? '', /connect-src 'self'/)

  const unknown = await worker.fetch(new Request('https://example.test/missing'))
  assert.equal(unknown.status, 404)
})

test('HEAD returns no body', async () => {
  const response = await worker.fetch(new Request('https://example.test/', { method: 'HEAD' }))
  assert.equal(await response.text(), '')
})
