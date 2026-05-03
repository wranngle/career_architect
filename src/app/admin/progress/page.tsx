import {
  buildProgressMetrics,
  sampleApplications,
} from '@/lib/sample-data';
import {Bar, MetricTile} from '@/components/admin/metric-tile';

export default function AdminProgressPage() {
  const m = buildProgressMetrics(sampleApplications);
  const maxBucket = Math.max(...m.scoreBuckets.map(b => b.count), 1);
  const maxWeekly = Math.max(...m.weeklyActivity.map(w => w.count), 1);

  return (
    <div className='flex flex-col gap-8 pt-2'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-semibold tracking-tight'>
          Progress
        </h1>
        <p className='text-sm text-muted-foreground'>
          Funnel, score distribution, and weekly activity. Mirrors the Go TUI&apos;s
          progress screen (
          <code className='font-mono text-xs'>dashboard/internal/ui/screens/progress.go</code>
          ).
        </p>
      </header>

      <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricTile
          label='Response rate'
          value={`${(m.responseRate * 100).toFixed(0)}%`}
          hint='responded / applied'
          accent='primary'
        />
        <MetricTile
          label='Interview rate'
          value={`${(m.interviewRate * 100).toFixed(0)}%`}
          hint='interview / applied'
          accent='secondary'
        />
        <MetricTile
          label='Offer rate'
          value={`${(m.offerRate * 100).toFixed(0)}%`}
          hint={`${m.totalOffers} offer${m.totalOffers === 1 ? '' : 's'}`}
          accent='primary'
        />
        <MetricTile
          label='Active apps'
          value={m.activeApps}
          hint='excluding skip/rejected/discarded'
          accent='muted'
        />
      </section>

      <section className='rounded-lg border border-border bg-card p-6 shadow-sm'>
        <h2 className='mb-4 font-display text-lg font-semibold tracking-tight'>
          Funnel
        </h2>
        <ul className='flex flex-col gap-3'>
          {m.funnelStages.map(stage => (
            <li key={stage.label} className='flex items-center gap-4'>
              <div className='w-24 shrink-0 text-sm font-medium text-foreground'>
                {stage.label}
              </div>
              <div className='flex-1'>
                <Bar pct={stage.pct} variant='primary' />
              </div>
              <div className='w-24 shrink-0 text-right font-mono text-sm tabular-nums text-foreground'>
                {stage.count}
                <span className='ml-1 text-muted-foreground'>
                  ({stage.pct.toFixed(0)}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
          <h2 className='mb-4 font-display text-lg font-semibold tracking-tight'>
            Score distribution
          </h2>
          <ul className='flex flex-col gap-3'>
            {m.scoreBuckets.map(b => (
              <li key={b.label} className='flex items-center gap-4'>
                <div className='w-20 shrink-0 font-mono text-sm tabular-nums text-foreground'>
                  {b.label}
                </div>
                <div className='flex-1'>
                  <Bar
                    pct={(b.count / maxBucket) * 100}
                    variant='secondary'
                  />
                </div>
                <div className='w-10 shrink-0 text-right font-mono text-sm tabular-nums text-foreground'>
                  {b.count}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
          <h2 className='mb-4 font-display text-lg font-semibold tracking-tight'>
            Weekly activity
          </h2>
          {m.weeklyActivity.length === 0
            ? (
              <p className='text-sm text-muted-foreground'>No activity yet.</p>
            )
            : (
              <ul className='flex flex-col gap-3'>
                {m.weeklyActivity.map(w => (
                  <li key={w.week} className='flex items-center gap-4'>
                    <div className='w-24 shrink-0 font-mono text-xs tabular-nums text-foreground'>
                      {w.week}
                    </div>
                    <div className='flex-1'>
                      <Bar
                        pct={(w.count / maxWeekly) * 100}
                        variant='primary'
                      />
                    </div>
                    <div className='w-8 shrink-0 text-right font-mono text-sm tabular-nums text-foreground'>
                      {w.count}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>
    </div>
  );
}
