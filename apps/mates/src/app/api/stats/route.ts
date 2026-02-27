import { NextResponse } from 'next/server'
import { engineFetch } from '@/lib/engine'

export async function GET() {
  try {
    const res = await engineFetch('/mates/stats')
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { totalProfiles: 0, readyProfiles: 0, totalMatches: 0, recentLookups: [] },
      { status: 200 },
    )
  }
}
