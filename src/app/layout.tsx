import type {Metadata, Viewport} from 'next';
import {
  Bricolage_Grotesque,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
});
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

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
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
