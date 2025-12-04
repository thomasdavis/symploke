import type { Metadata } from 'next'
import { Sora, Sen, Azeret_Mono } from 'next/font/google'
import '@symploke/ui/styles.css'
import { Providers } from './providers'
import { Header } from '@/components/Header'

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
  title: 'Symploke',
  description: 'AI finds connections between your friend group's projects',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${sen.variable} ${azeretMono.variable}`}
    >
      <body className="font-sora">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  )
}
