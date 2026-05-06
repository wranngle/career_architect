import type {Metadata, Viewport} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';

const inter = Inter({subsets: ['latin']});

export const metadata: Metadata = {
  title: 'Career Architect — an open-source job-search pipeline you can read',
  description: 'MIT-licensed tooling that scores a job description against your CV, drafts a tailored variant, and tracks where every application went. Local-first. No SaaS. Built by Cody Arnold.',
  keywords: 'open source, job search, resume, CV, AI, career, MIT, local-first, n8n, automation',
  authors: [{name: 'Cody Arnold', url: 'https://github.com/wranngle'}],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff5f00',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
