import { type NextRequest, NextResponse } from 'next/server'
import { engineJson } from '@/lib/engine'

export async function POST(req: NextRequest) {
  const { username, force } = await req.json()

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  const cleaned = username.trim().toLowerCase().replace(/^@/, '')

  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(cleaned)) {
    return NextResponse.json({ error: 'Invalid GitHub username' }, { status: 400 })
  }

  try {
    const path = force ? `/mates/submit/${cleaned}?force=true` : `/mates/submit/${cleaned}`
    const { data, status, ok } = await engineJson(path, { method: 'POST' })

    if (!ok) {
      return NextResponse.json(data || { error: `Engine returned ${status}` }, { status })
    }

    return NextResponse.json({ ...(data as Record<string, unknown>), username: cleaned })
  } catch (error) {
    console.error('Error submitting profile:', error)
    return NextResponse.json(
      { error: 'Failed to submit profile. The engine may not be available.' },
      { status: 502 },
    )
  }
}
