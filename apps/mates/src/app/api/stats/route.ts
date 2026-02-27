import { NextResponse } from 'next/server'
import { engineJson } from '@/lib/engine'

export async function GET() {
  try {
    const { data, ok } = await engineJson('/mates/stats')

    if (!ok || !data) {
      return NextResponse.json(
        { totalProfiles: 0, readyProfiles: 0, totalMatches: 0, recentLookups: [] },
        { status: 200 },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { totalProfiles: 0, readyProfiles: 0, totalMatches: 0, recentLookups: [] },
      { status: 200 },
    )
  }
}
