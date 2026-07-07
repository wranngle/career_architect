import {
  buildPipelineMetrics,
  STATUS_LABELS,
  type Status,
} from '@/lib/sample-data';
import {getApplications} from '@/lib/career-data';
import {MetricTile} from '@/components/admin/metric-tile';
import {StatusBadge, ScoreChip} from '@/components/admin/status-badge';

const GROUP_ORDER: Status[] = [
  'onsite',
  'tech',
  'screen',
  'interview',
  'offer',
  'responded',
  'applied',
  'evaluated',
  'skip',
  'rejected',
  'ghosted',
  'discarded',
];

export default function AdminPipelinePage() {
  const applications = getApplications();
  const apps = [...applications.items];
  const metrics = buildPipelineMetrics(apps);

  // Group by status, then sort within each group by score desc.
  const grouped = GROUP_ORDER.map(status => ({
    status,
    items: apps
      .filter(a => a.status === status)
      .sort((a, b) => b.score - a.score),
  })).filter(g => g.items.length > 0);

  return (
    <div className='flex flex-col gap-8 pt-2'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-semibold tracking-tight'>
          Pipeline
        </h1>
        <p className='text-sm text-muted-foreground'>
          Grouped by status priority, then score. Source: {applications.source}.
        </p>
      </header>

      <section className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <MetricTile
          label='Total'
          value={metrics.total}
          accent='primary'
        />
        <MetricTile
          label='Avg score'
          value={metrics.avgScore.toFixed(1)}
          accent='secondary'
        />
        <MetricTile
          label='Top'
          value={metrics.topScore.toFixed(1)}
          accent='primary'
        />
        <MetricTile
          label='With PDF'
          value={metrics.withPDF}
          accent='muted'
        />
      </section>

      <section className='rounded-lg border border-border bg-card shadow-sm'>
        <div className='grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold text-muted-foreground'>
          <div className='col-span-1'>Score</div>
          <div className='col-span-2'>Date</div>
          <div className='col-span-3'>Company</div>
          <div className='col-span-4'>Role</div>
          <div className='col-span-2 text-right'>Comp</div>
        </div>

        {grouped.length === 0
          ? (
            <div className='px-4 py-6 text-sm text-muted-foreground'>
              No tracked applications yet.
            </div>
          )
          : grouped.map(group => (
            <div key={group.status}>
              <div className='border-b border-border bg-sand-50 px-4 py-1.5 text-xs font-semibold text-night-700'>
                {STATUS_LABELS[group.status]} ({group.items.length})
              </div>
              <ul className='divide-y divide-border'>
                {group.items.map(app => (
                  <li
                    key={app.number}
                    className='grid grid-cols-12 items-center gap-2 px-4 py-3 transition hover:bg-muted/30'
                  >
                    <div className='col-span-1'>
                      <ScoreChip score={app.score} />
                    </div>
                    <div className='col-span-2 font-mono text-xs text-muted-foreground tabular-nums'>
                      {app.date}
                    </div>
                    <div className='col-span-3 truncate font-medium text-foreground'>
                      {app.company}
                    </div>
                    <div className='col-span-4 truncate text-sm text-muted-foreground'>
                      {app.jobURL
                        ? (
                          <a
                            href={app.jobURL}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='hover:text-primary hover:underline'
                          >
                            {app.role}
                          </a>
                        )
                        : app.role}
                      {app.archetype
                        ? (
                          <span className='ml-2 inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
                            {app.archetype}
                          </span>
                        )
                        : null}
                    </div>
                    <div className='col-span-2 truncate text-right font-mono text-xs text-foreground'>
                      {app.compEstimate ?? '-'}
                    </div>
                    {app.tldr
                      ? (
                        <div className='col-span-12 -mt-1 truncate pl-[8.333%] text-xs text-muted-foreground'>
                          {app.tldr}
                        </div>
                      )
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>

      <section className='flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground'>
        <span className='font-semibold text-foreground'>
          Status legend
        </span>
        {(GROUP_ORDER).map(s => (
          <StatusBadge key={s} status={s} />
        ))}
      </section>
    </div>
  );
}
