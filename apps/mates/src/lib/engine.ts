const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001'

export async function engineFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return res
}
