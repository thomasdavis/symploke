import { NextResponse } from 'next/server'
import { fetchNpmDownloads } from '@/lib/npm/registry'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const packages = searchParams.get('packages')

  if (!packages) {
    return NextResponse.json({ error: 'Missing packages parameter' }, { status: 400 })
  }

  const names = packages.split(',').slice(0, 50) // Limit to 50

  const results: Record<string, { downloads: number }> = {}

  await Promise.all(
    names.map(async (name) => {
      const downloads = await fetchNpmDownloads(name.trim())
      results[name.trim()] = { downloads }
    }),
  )

  return NextResponse.json(results)
}
