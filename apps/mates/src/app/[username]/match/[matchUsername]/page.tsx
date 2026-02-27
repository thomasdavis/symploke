import type { Metadata } from 'next'
import { MatchNarrative } from './MatchNarrative'

interface MatchPageProps {
  params: Promise<{ username: string; matchUsername: string }>
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { username, matchUsername } = await params

  const title = `${username} & ${matchUsername}`
  const description = `See how ${username} and ${matchUsername} connect as coding mates — an AI-generated comparison of their developer profiles.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} — Mates by Symploke`,
      description,
      type: 'article',
      url: `https://mates.symploke.dev/${username}/match/${matchUsername}`,
    },
    twitter: {
      card: 'summary',
      title: `${title} — Mates by Symploke`,
      description,
    },
  }
}

export default async function MatchDetailPage({ params }: MatchPageProps) {
  const { username, matchUsername } = await params
  return <MatchNarrative username={username} matchUsername={matchUsername} />
}
