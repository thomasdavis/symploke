'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { parseGitHubUrl } from '@/lib/github/parse-url'

export function RepoInput() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = parseGitHubUrl(value)
    if (!parsed) {
      setError('Enter a valid GitHub URL or owner/repo (e.g. facebook/react)')
      return
    }

    router.push(`/play/${parsed.owner}/${parsed.repo}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="jenga-input-wrapper">
        <input
          type="text"
          className={`jenga-input ${error ? 'jenga-input-error' : ''}`}
          placeholder="github.com/owner/repo"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
        />
        <button type="submit" className="jenga-build-btn" disabled={!value.trim()}>
          Build Tower
        </button>
      </div>
      {error && <p className="jenga-input-error-text">{error}</p>}
    </form>
  )
}
