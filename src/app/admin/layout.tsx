import Link from 'next/link';
import type {ReactNode} from 'react';

const NAV = [
  {href: '/admin', label: 'Overview'},
  {href: '/admin/pipeline', label: 'Pipeline'},
  {href: '/admin/progress', label: 'Progress'},
  {href: '/admin/profile', label: 'Profile'},
  {href: '/admin/scans', label: 'Scans'},
];

export default function AdminLayout({children}: {children: ReactNode}) {
  return (
    <div className='min-h-screen bg-background text-foreground font-sans'>
      <header className='border-b border-border bg-card'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4'>
          <Link href='/admin' className='flex items-center gap-3'>
            <span className='inline-block h-3 w-3 rounded-pill bg-primary' />
            <span className='font-display text-lg font-semibold tracking-tight'>
              Career Architect
            </span>
            <span className='text-xs uppercase tracking-widest text-muted-foreground'>
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
        <DemoBanner />
      </div>

      <main className='mx-auto max-w-7xl px-6 pb-16'>{children}</main>

      <footer className='border-t border-border bg-card'>
        <div className='mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground'>
          The web equivalent of the Go terminal dashboard at{' '}
          <code className='font-mono text-foreground'>dashboard/</code>. Both surfaces
          share the same data model. See <code className='font-mono'>dashboard/README.md</code>{' '}
          for the TUI install + usage.
        </div>
      </footer>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className='flex items-start gap-3 rounded-lg border border-sunset-300 bg-sunset-50 px-4 py-3 text-sm text-night-900'>
      <span className='mt-0.5 inline-flex h-5 items-center rounded-pill bg-primary px-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground'>
        Demo
      </span>
      <p className='leading-relaxed'>
        This admin panel is a <strong>web equivalent of the Go TUI</strong> at{' '}
        <code className='rounded bg-sand-100 px-1.5 py-0.5 font-mono text-xs'>dashboard/</code>.
        All data shown here is <strong>synthetic</strong> (placeholder companies,
        roles, dates, and notes). Wire it to live tracker data by reading
        <code className='ml-1 rounded bg-sand-100 px-1.5 py-0.5 font-mono text-xs'>
          tracker.md
        </code>{' '}
        on the server.
      </p>
    </div>
  );
}
