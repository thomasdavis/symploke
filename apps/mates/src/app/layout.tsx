import type { Metadata } from 'next'
import { Sora, Sen, Azeret_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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

export const metadata: Metadata = {
  title: 'Mates by Symploke — Find Your GitHub Coding Mates',
  description:
    'Submit your GitHub username and discover developers who share your technical interests, coding style, and open source philosophy.',
  openGraph: {
    title: 'Mates by Symploke',
    description: 'Find developers who code like you. AI-powered GitHub profile matching.',
    type: 'website',
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
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-[var(--color-border-subtle)] px-6 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="font-bold text-lg">Mates</span>
              <span className="text-xs text-[var(--color-fg-muted)]">by Symploke</span>
            </a>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--color-border-subtle)] px-6 py-4 text-center text-xs text-[var(--color-fg-muted)]">
            All data sourced from public GitHub profiles. Built by{' '}
            <a href="https://symploke.com" className="underline">
              Symploke
            </a>
            .
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
