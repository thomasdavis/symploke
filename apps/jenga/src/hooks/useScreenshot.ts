'use client'

import { useCallback } from 'react'

export function useScreenshot() {
  const captureCanvas = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null

    try {
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  }, [])

  const downloadScreenshot = useCallback(
    (repoName: string, score: number) => {
      const dataUrl = captureCanvas()
      if (!dataUrl) return

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `jenga-${repoName}-${score}.png`
      link.click()
    },
    [captureCanvas],
  )

  const copyShareLink = useCallback((owner: string, repo: string) => {
    const url = `${window.location.origin}/play/${owner}/${repo}`
    navigator.clipboard.writeText(url)
    return url
  }, [])

  return { captureCanvas, downloadScreenshot, copyShareLink }
}
