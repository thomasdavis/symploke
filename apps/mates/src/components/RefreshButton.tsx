'use client'

import { Button } from '@symploke/ui/Button/Button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RefreshButton({ username }: { username: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, force: true }),
      })

      if (res.ok) {
        router.push(`/${username}`)
        router.refresh()
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh profile'}
    </Button>
  )
}
