import type { Metadata } from 'next'
import '@symploke/ui/styles.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Symploke',
  description: 'AI-powered project connections',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
