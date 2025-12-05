import Pusher from 'pusher-js'

let pusherInstance: Pusher | null = null

export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null

  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

    if (!key) {
      console.warn('Pusher key not configured, real-time updates disabled')
      return null
    }

    pusherInstance = new Pusher(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
    })
  }

  return pusherInstance
}
