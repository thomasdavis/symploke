import { type NextRequest, NextResponse } from 'next/server'
import { engineFetch } from '@/lib/engine'

export async function POST(req: NextRequest) {
  const { username } = await req.json()

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  const cleaned = username.trim().toLowerCase().replace(/^@/, '')

  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(cleaned)) {
    return NextResponse.json({ error: 'Invalid GitHub username' }, { status: 400 })
  }

  try {
    const res = await engineFetch(`/mates/submit/${cleaned}`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json({ ...data, username: cleaned })
  } catch (error) {
    console.error('Error submitting profile:', error)
    return NextResponse.json(
      { error: 'Failed to submit profile. Please try again.' },
      { status: 500 },
    )
  }
}
