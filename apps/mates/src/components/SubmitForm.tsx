'use client'

import { Button } from '@symploke/ui/Button/Button'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

export function SubmitForm() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      router.push(`/${data.username}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mates-submit-form">
      <div className="mates-submit-row">
        <div className="mates-input-wrapper">
          <span className="mates-input-prefix">github.com/</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="mates-input-field"
            disabled={loading}
          />
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={loading || !username.trim()}>
          {loading ? 'Finding...' : 'Find Mates'}
        </Button>
      </div>
      {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</p>}
    </form>
  )
}
