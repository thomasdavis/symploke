import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Azeret_Mono, Sen, Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const sen = Sen({
  subsets: ['latin'],
  variable: '--font-sen',
  display: 'swap',
})

const azeretMono = Azeret_Mono({
  subsets: ['latin'],
  variable: '--font-azeret-mono',
  display: 'swap',
})

const siteUrl = 'https://mates.symploke.dev'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mates by Symploke — Find Your GitHub Coding Mates',
    template: '%s — Mates by Symploke',
  },
  description:
    'Submit your GitHub username and discover developers who share your technical interests, coding style, and open source philosophy.',
  openGraph: {
    title: 'Mates by Symploke',
    description: 'Find developers who code like you. AI-powered GitHub profile matching.',
    type: 'website',
    siteName: 'Mates by Symploke',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mates by Symploke',
    description: 'Find developers who code like you. AI-powered GitHub profile matching.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${sen.variable} ${azeretMono.variable}`}
    >
      <body className={sora.className}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header className="mates-header">
            <div className="mates-header-inner">
              <a href="/" className="mates-header-logo">
                <span className="mates-header-title">Mates</span>
                <span className="mates-header-badge">by Symploke</span>
              </a>
            </div>
          </header>
          <main style={{ flex: 1 }}>{children}</main>
          <footer className="mates-footer">
            <p>
              All data sourced from public GitHub profiles. Built by{' '}
              <a href="https://symploke.dev">Symploke</a>.
            </p>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
