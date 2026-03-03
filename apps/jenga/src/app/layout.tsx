import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Azeret_Mono, Sen, Sora } from 'next/font/google'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
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

const siteUrl = 'https://jenga.symploke.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jenga by Symploke — 3D Dependency Visualization Game',
    template: '%s — Jenga by Symploke',
  },
  description:
    'Paste a GitHub repo URL and watch its dependency tree become a playable 3D Jenga tower. Pull blocks to see what breaks. Inspired by XKCD #2347.',
  openGraph: {
    title: 'Jenga by Symploke',
    description: 'Your dependency tree as a playable Jenga tower. How fragile is your stack?',
    type: 'website',
    siteName: 'Jenga by Symploke',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jenga by Symploke',
    description: 'Your dependency tree as a playable Jenga tower. How fragile is your stack?',
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
        <ThemeProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
