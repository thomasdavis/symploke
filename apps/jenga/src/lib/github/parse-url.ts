/**
 * Parse a GitHub URL or owner/repo string into { owner, repo }.
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()

  // Try owner/repo format
  const slashMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
  if (slashMatch?.[1] && slashMatch[2]) {
    return { owner: slashMatch[1], repo: slashMatch[2] }
  }

  // Try full URL
  try {
    const url = new URL(trimmed)
    if (url.hostname !== 'github.com') return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2 || !parts[0] || !parts[1]) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}
