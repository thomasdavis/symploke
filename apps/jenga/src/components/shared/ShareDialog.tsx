'use client'

import { useState } from 'react'
import { useScreenshot } from '@/hooks/useScreenshot'

interface ShareDialogProps {
  owner: string
  repo: string
  score: number
}

export function ShareDialog({ owner, repo, score }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const { downloadScreenshot, copyShareLink } = useScreenshot()

  const handleCopy = () => {
    copyShareLink(owner, repo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="jenga-share-btn" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      <button
        type="button"
        className="jenga-share-btn"
        onClick={() => downloadScreenshot(`${owner}-${repo}`, score)}
      >
        Save PNG
      </button>
    </div>
  )
}
