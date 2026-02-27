'use client'

import Pusher from 'pusher-js'

let pusherInstance: Pusher | null = null

export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null

  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

    if (!key) {
      console.warn('Pusher key not configured')
      return null
    }

    // Mates uses public channels (no auth needed)
    pusherInstance = new Pusher(key, { cluster })
  }

  return pusherInstance
}
