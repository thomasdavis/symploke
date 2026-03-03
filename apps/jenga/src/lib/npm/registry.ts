interface NpmPackageInfo {
  name: string
  version: string
  description: string
  dependencies: Record<string, string>
  weeklyDownloads: number
  lastPublished: string | null
  maintainers: number
}

// In-memory cache with 30-min TTL
const cache = new Map<string, { data: NpmPackageInfo; expiresAt: number }>()
const CACHE_TTL = 30 * 60 * 1000

export async function fetchNpmPackage(name: string): Promise<NpmPackageInfo> {
  const cached = cache.get(name)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    return {
      name,
      version: 'unknown',
      description: '',
      dependencies: {},
      weeklyDownloads: 0,
      lastPublished: null,
      maintainers: 0,
    }
  }

  const data = await res.json()

  const info: NpmPackageInfo = {
    name: data.name ?? name,
    version: data.version ?? 'unknown',
    description: data.description ?? '',
    dependencies: data.dependencies ?? {},
    weeklyDownloads: 0,
    lastPublished: data.time?.modified ?? null,
    maintainers: data.maintainers?.length ?? 0,
  }

  cache.set(name, { data: info, expiresAt: Date.now() + CACHE_TTL })
  return info
}

export async function fetchNpmDownloads(name: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`,
    )
    if (!res.ok) return 0
    const data = await res.json()
    return data.downloads ?? 0
  } catch {
    return 0
  }
}

/**
 * Concurrency-limited batch fetch.
 */
export async function batchFetchNpm(
  names: string[],
  concurrency = 10,
): Promise<Map<string, NpmPackageInfo>> {
  const results = new Map<string, NpmPackageInfo>()
  const queue = [...names]

  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()!
      const info = await fetchNpmPackage(name)
      results.set(name, info)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, names.length) }, () => worker())
  await Promise.all(workers)

  return results
}
