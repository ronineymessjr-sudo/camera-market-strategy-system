import { API_BASE } from '@/lib/api'

export type BackgroundJob = {
  id: number
  job_type: string
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  result_json?: string | null
  error_message?: string | null
}

export async function operatorFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(await response.text())
  return response
}

export async function operatorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await operatorFetch(path, init)
  return response.json() as Promise<T>
}

export async function waitForJob(jobId: number, timeoutMs = 10 * 60 * 1000): Promise<BackgroundJob> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const job = await operatorRequest<BackgroundJob>(`/api/jobs/${jobId}`)
    if (job.status === 'SUCCESS') return job
    if (job.status === 'FAILED') throw new Error(job.error_message || 'Background job failed')
    await new Promise(resolve => window.setTimeout(resolve, 1500))
  }
  throw new Error('Background job is still running. Check the job status later.')
}
