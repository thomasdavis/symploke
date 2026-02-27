import { type NextRequest, NextResponse } from 'next/server'
import { engineJson } from '@/lib/engine'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  try {
    const { data, status, ok } = await engineJson(`/mates/profile/${username.toLowerCase()}`)

    if (!ok) {
      return NextResponse.json(data || { error: `Engine returned ${status}` }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 502 })
  }
}
