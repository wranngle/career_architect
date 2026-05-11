import Image from 'next/image';
import {
  ArrowRight,
  FileText,
  Github,
  Monitor,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import demoGif from '../../docs/demo.gif';

const workflow = [
  {
    title: 'Evaluate',
    body: 'Score a job description against your CV with the same rubric the report uses. Low-fit roles get called low-fit.',
    icon: ShieldCheck,
  },
  {
    title: 'Tailor',
    body: 'Generate a focused CV variant, then review the diff before anything goes near an application portal.',
    icon: FileText,
  },
  {
    title: 'Track',
    body: 'Keep applications, follow-ups, scans, reports, and PDFs in files you can inspect with a terminal.',
    icon: Monitor,
  },
];

const commands = [
  ['npm run doctor', 'check local prerequisites'],
  ['npm run scan', 'scan configured portals'],
  ['npm run verify', 'validate tracker/report integrity'],
  ['npm run dev', 'open the web demo'],
];

const boundaries = [
  'No auto-submit. The user reviews and sends applications.',
  'No hidden queue. Reports, tracker rows, and generated CVs stay on disk.',
  'No fake SaaS shell. The web UI is a local demo, not an account system.',
];

export default function CareerArchitectLandingPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <header className='border-b border-border bg-card'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4'>
          <a href='/' className='font-display text-lg font-semibold tracking-tight'>
            Career Architect
          </a>
          <nav className='flex items-center gap-4 text-sm'>
            <a className='text-muted-foreground hover:text-foreground' href='/admin'>
              Admin demo
            </a>
            <a
              className='text-muted-foreground hover:text-foreground'
              href='https://github.com/wranngle/career_architect'
            >
              Source
            </a>
          </nav>
        </div>
      </header>

      <section className='border-b border-border bg-night-950 text-sand-50'>
        <div className='mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl content-center gap-10 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center'>
          <div className='max-w-2xl'>
            <h1 className='font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl'>
              A local job-search pipeline you can audit.
            </h1>
            <p className='mt-6 text-lg leading-relaxed text-sand-100 md:text-xl'>
              Career Architect evaluates job descriptions against your CV, drafts
              tailored variants, scans configured portals, and keeps the tracker
              in plain files.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <a
                href='https://github.com/wranngle/career_architect'
                className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-sunset-600'
              >
                <Github className='h-4 w-4' aria-hidden />
                Read the source
                <ArrowRight className='h-4 w-4' aria-hidden />
              </a>
              <a
                href='/admin'
                className='inline-flex items-center gap-2 rounded-md border border-sand-300/30 px-4 py-2 text-sm font-semibold text-sand-50 hover:border-sand-100'
              >
                <Monitor className='h-4 w-4' aria-hidden />
                Open /admin
              </a>
            </div>
          </div>

          <div className='overflow-hidden rounded-lg border border-night-700 bg-night-900'>
            <Image
              src={demoGif}
              alt='Terminal dashboard showing scored job applications grouped by status'
              className='h-auto w-full'
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className='border-b border-border bg-card'>
        <div className='mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-3'>
          {workflow.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className='border-l border-border pl-5'>
                <Icon className='mb-4 h-5 w-5 text-primary' aria-hidden />
                <h2 className='font-display text-xl font-semibold tracking-tight'>
                  {item.title}
                </h2>
                <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className='border-b border-border'>
        <div className='mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]'>
          <div>
            <h2 className='font-display text-3xl font-semibold tracking-tight'>
              The useful surface is the file tree.
            </h2>
            <p className='mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground'>
              The scripts write reports to <code className='font-mono'>reports/</code>,
              CV variants to <code className='font-mono'>output/</code>, pending URLs
              to <code className='font-mono'>data/pipeline.md</code>, and tracker rows
              to <code className='font-mono'>data/applications.md</code>.
            </p>
          </div>
          <div className='rounded-lg border border-border bg-card p-5'>
            <div className='mb-4 flex items-center gap-2 text-sm font-medium'>
              <Terminal className='h-4 w-4 text-primary' aria-hidden />
              Common commands
            </div>
            <dl className='divide-y divide-border'>
              {commands.map(([command, description]) => (
                <div key={command} className='grid gap-2 py-3 sm:grid-cols-[12rem_1fr]'>
                  <dt className='font-mono text-sm text-foreground'>{command}</dt>
                  <dd className='text-sm text-muted-foreground'>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className='border-b border-border bg-card'>
        <div className='mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr]'>
          <h2 className='font-display text-3xl font-semibold tracking-tight'>
            Sharp boundaries beat fake automation.
          </h2>
          <ul className='grid gap-3 text-sm leading-relaxed text-muted-foreground'>
            {boundaries.map(boundary => (
              <li key={boundary} className='flex gap-3'>
                <span className='mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-primary' />
                <span>{boundary}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className='bg-night-950 text-sand-50'>
        <div className='mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between'>
          <p className='text-sand-200'>
            MIT licensed. Forked from santifer/career-ops.
          </p>
          <div className='flex flex-wrap gap-4'>
            <a className='hover:text-sunset-300' href='/admin'>Admin demo</a>
            <a
              className='hover:text-sunset-300'
              href='https://github.com/wranngle/career_architect'
            >
              GitHub
            </a>
            <a
              className='hover:text-sunset-300'
              href='https://github.com/santifer/career-ops'
            >
              Upstream
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
