import Link from 'next/link';
import {
  buildPipelineMetrics,
  buildProfileReadinessMetrics,
  buildProgressMetrics,
  sampleApplications,
  sampleScans,
} from '@/lib/sample-data';
import {MetricTile} from '@/components/admin/metric-tile';
import {StatusBadge, ScoreChip} from '@/components/admin/status-badge';

export default function AdminOverviewPage() {
  const metrics = buildPipelineMetrics(sampleApplications);
  const progress = buildProgressMetrics(sampleApplications);
  const profile = buildProfileReadinessMetrics();
  const top = [...sampleApplications]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const lastScan = sampleScans[0];

  return (
    <div className='flex flex-col gap-8 pt-2'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-semibold tracking-tight'>
          Pipeline overview
        </h1>
        <p className='text-sm text-muted-foreground'>
          Aggregate snapshot of evaluations, application stages, and recent
          scans. Same data the Go TUI renders — rendered for the web.
        </p>
      </header>

      <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricTile
          label='Total tracked'
          value={metrics.total}
          hint={`${metrics.actionable} actionable`}
          accent='primary'
        />
        <MetricTile
          label='Avg score'
          value={metrics.avgScore.toFixed(1)}
          hint={`Top ${metrics.topScore.toFixed(1)} / 5.0`}
          accent='secondary'
        />
        <MetricTile
          label='Interview / Offer'
          value={
            (metrics.byStatus.interview ?? 0) + (metrics.byStatus.offer ?? 0)
          }
          hint={`${progress.totalOffers} offer${progress.totalOffers === 1 ? '' : 's'}`}
          accent='primary'
        />
        <MetricTile
          label='Tailored CVs'
          value={metrics.withPDF}
          hint='rendered PDFs on disk'
          accent='muted'
        />
      </section>

      <section className='rounded-lg border border-border bg-card p-6 shadow-sm'>
        <div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
          <div className='max-w-3xl'>
            <h2 className='font-display text-lg font-semibold tracking-tight'>
              Profile readiness
            </h2>
            <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
              Public-safe coherence checks for the CV, LinkedIn profile,
              portfolio, GitHub, and reusable application answers. Use this
              before promoting new skills or featuring proof surfaces.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='rounded-md bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-primary'>
              {profile.score}% ready
            </span>
            <span className='rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground'>
              {profile.blocked} blocked
            </span>
            <Link
              href='/admin/profile'
              className='rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/5'
            >
              Open profile map
            </Link>
          </div>
        </div>
      </section>

      <section className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-display text-lg font-semibold tracking-tight'>
              Top scores
            </h2>
            <Link
              href='/admin/pipeline'
              className='text-xs font-medium text-primary hover:underline'
            >
              View full pipeline →
            </Link>
          </div>
          <ul className='divide-y divide-border'>
            {top.map(app => (
              <li
                key={app.number}
                className='flex items-center gap-4 py-3 first:pt-0 last:pb-0'
              >
                <ScoreChip score={app.score} />
                <div className='flex-1 min-w-0'>
                  <div className='truncate font-medium text-foreground'>
                    {app.company}
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    {app.role}
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-display text-lg font-semibold tracking-tight'>
              Last scan
            </h2>
            <Link
              href='/admin/scans'
              className='text-xs font-medium text-primary hover:underline'
            >
              All scans →
            </Link>
          </div>
          <dl className='space-y-2 text-sm'>
            <Row label='ID' value={<span className='font-mono text-xs'>{lastScan.id}</span>} />
            <Row label='New jobs' value={lastScan.newJobs} />
            <Row label='Evaluated' value={lastScan.evaluated} />
            <Row label='Portals' value={lastScan.portalsScanned} />
            <Row
              label='Status'
              value={
                <span
                  className={
                    lastScan.status === 'completed'
                      ? 'text-sunset-700'
                      : (lastScan.status === 'partial'
                        ? 'text-wviolet-700'
                        : 'text-destructive')
                  }
                >
                  {lastScan.status}
                </span>
              }
            />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Row({label, value}: {label: string; value: React.ReactNode}) {
  return (
    <div className='flex items-baseline justify-between gap-4'>
      <dt className='text-xs uppercase tracking-wider text-muted-foreground'>
        {label}
      </dt>
      <dd className='font-medium text-foreground'>{value}</dd>
    </div>
  );
}
