import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Pusher from 'pusher'
import { auth } from '@/lib/auth'

// Initialize Pusher server
function getPusher(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (!appId || !key || !secret) {
    return null
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const pusher = getPusher()
    if (!pusher) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const socketId = formData.get('socket_id') as string
    const channel = formData.get('channel_name') as string

    if (!socketId || !channel) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
    }

    // Validate channel access
    // Channel format: private-plexus-{plexusId}
    if (channel.startsWith('private-plexus-')) {
      const plexusId = channel.replace('private-plexus-', '')

      // Check if user is a member of this plexus
      const member = await db.plexusMember.findUnique({
        where: {
          userId_plexusId: {
            userId: session.user.id,
            plexusId,
          },
        },
      })

      if (!member) {
        return NextResponse.json({ error: 'Not a member of this plexus' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 403 })
    }

    // Authorize the channel
    const authResponse = pusher.authorizeChannel(socketId, channel)

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
