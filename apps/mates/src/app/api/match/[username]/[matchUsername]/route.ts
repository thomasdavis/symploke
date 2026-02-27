import { type NextRequest, NextResponse } from 'next/server'
import { engineJson } from '@/lib/engine'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; matchUsername: string }> },
) {
  const { username, matchUsername } = await params

  try {
    const { data, status, ok } = await engineJson(
      `/mates/narrative/${username.toLowerCase()}/${matchUsername.toLowerCase()}`,
    )

    if (!ok) {
      return NextResponse.json(data || { error: `Engine returned ${status}` }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching match narrative:', error)
    return NextResponse.json({ error: 'Failed to fetch narrative' }, { status: 502 })
  }
}
