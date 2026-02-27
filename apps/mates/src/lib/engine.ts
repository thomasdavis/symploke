const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001'

export async function engineFetch(path: string, options?: RequestInit) {
  const url = `${ENGINE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return res
}

export async function engineJson<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T | null; status: number; ok: boolean }> {
  const res = await engineFetch(path, options)
  const text = await res.text()
  let data: T | null = null
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      // Engine returned non-JSON body
    }
  }
  return { data, status: res.status, ok: res.ok }
}
