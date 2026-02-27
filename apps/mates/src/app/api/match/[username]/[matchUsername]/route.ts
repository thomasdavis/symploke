import { type NextRequest, NextResponse } from 'next/server'
import { engineFetch } from '@/lib/engine'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; matchUsername: string }> },
) {
  const { username, matchUsername } = await params

  try {
    const res = await engineFetch(
      `/mates/narrative/${username.toLowerCase()}/${matchUsername.toLowerCase()}`,
    )
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching match narrative:', error)
    return NextResponse.json({ error: 'Failed to fetch narrative' }, { status: 500 })
  }
}
