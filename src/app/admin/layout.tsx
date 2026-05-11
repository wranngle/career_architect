import Link from 'next/link';
import type {ReactNode} from 'react';
import {getAdminDataStatus} from '@/lib/career-data';

const NAV = [
  {href: '/admin', label: 'Overview'},
  {href: '/admin/pipeline', label: 'Pipeline'},
  {href: '/admin/progress', label: 'Progress'},
  {href: '/admin/profile', label: 'Profile'},
  {href: '/admin/scans', label: 'Scans'},
];

export const dynamic = 'force-dynamic';

export default function AdminLayout({children}: {children: ReactNode}) {
  const status = getAdminDataStatus();

  return (
    <div className='min-h-screen bg-background text-foreground font-sans'>
      <header className='border-b border-border bg-card'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4'>
          <Link href='/admin' className='flex items-center gap-3'>
            <span className='font-display text-lg font-semibold tracking-tight'>
              Career Architect
            </span>
            <span className='text-xs text-muted-foreground'>
              Admin
            </span>
          </Link>
          <nav className='flex items-center gap-1'>
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className='rounded-md px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-muted hover:text-foreground'
              >
                {n.label}
              </Link>
            ))}
            <Link
              href='/'
              className='ml-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary'
            >
              Back to landing
            </Link>
          </nav>
        </div>
      </header>

      <div className='mx-auto max-w-7xl px-6 py-4'>
        <DataBanner mode={status.mode} />
      </div>

      <main className='mx-auto max-w-7xl px-6 pb-16'>{children}</main>

      <footer className='border-t border-border bg-card'>
        <div className='mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground'>
          Local web dashboard for career-ops. The Go TUI lives at{' '}
          <code className='font-mono text-foreground'>dashboard/</code>; see{' '}
          <code className='font-mono'>dashboard/README.md</code> for terminal usage.
        </div>
      </footer>
    </div>
  );
}

function DataBanner({mode}: {mode: 'live' | 'demo'}) {
  return (
    <div className='flex items-start gap-3 rounded-lg border border-sunset-300 bg-sunset-50 px-4 py-3 text-sm text-night-900'>
      <span className='mt-0.5 inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground'>
        {mode === 'live' ? 'Live' : 'Demo'}
      </span>
      <p className='leading-relaxed'>
        {mode === 'live'
          ? 'This view is reading local career-ops files from disk where available. Missing datasets still fall back to clearly marked sample data.'
          : 'This view is showing sample data because local tracker files are not initialized in this workspace.'}
      </p>
    </div>
  );
}
