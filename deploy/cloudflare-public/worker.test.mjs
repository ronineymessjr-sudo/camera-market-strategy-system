import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = (await readFile(new URL('./worker.js', import.meta.url), 'utf8')).replace(
  'export default',
  'globalThis.__worker =',
)
const context = { Request, Response, URL, console, globalThis: null }
context.globalThis = context
vm.runInNewContext(source, context, { filename: 'worker.js' })
const worker = context.__worker

test('health endpoint is uncached JSON', async () => {
  const response = await worker.fetch(new Request('https://example.test/health'))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /application\/json/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.service, 'camera-market-public-entry')
})

test('root and index return the landing page', async () => {
  for (const path of ['/', '/index.html']) {
    const response = await worker.fetch(new Request(`https://example.test${path}`))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control') ?? '', /stale-while-revalidate=300/)
    const html = await response.text()
    assert.match(html, /已核验到手价/)
    assert.match(html, /rel="noopener noreferrer"/)
    assert.match(html, /aria-hidden="true"/)
  }
})

test('unknown paths return a real 404', async () => {
  const response = await worker.fetch(new Request('https://example.test/does-not-exist'))
  assert.equal(response.status, 404)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.deepEqual(body, { ok: false, error: 'not_found', path: '/does-not-exist' })
})

test('unsupported methods return 405 and Allow', async () => {
  const response = await worker.fetch(new Request('https://example.test/', { method: 'POST' }))
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
  const body = await response.json()
  assert.equal(body.error, 'method_not_allowed')
})

test('HEAD returns headers without a body', async () => {
  for (const path of ['/', '/health', '/missing']) {
    const response = await worker.fetch(new Request(`https://example.test${path}`, { method: 'HEAD' }))
    assert.equal(await response.text(), '')
  }
})

test('security headers are present', async () => {
  const response = await worker.fetch(new Request('https://example.test/'))
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin')
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/)
})

test('reduced motion exits before creating an animation loop', async () => {
  const workerSource = await readFile(new URL('./worker.js', import.meta.url), 'utf8')
  assert.match(workerSource, /if\(reduced\)return;/)
  assert.match(workerSource, /w<700\?520:900/)
})
