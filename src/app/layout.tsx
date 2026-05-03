import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Career Architect - Build Your Future, Not Just a Resume',
  description: 'Go from overlooked to in-demand. Our AI Career Architect transforms your experience into the professional identity that lands you the job you deserve.',
  keywords: 'career, resume, AI, job search, professional development, career coaching',
  authors: [{ name: 'Career Architect Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff5f00',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
