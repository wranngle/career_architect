import {sampleScans} from '@/lib/sample-data';

const STATUS_PILL: Record<'completed' | 'partial' | 'failed', string> = {
  completed: 'bg-sunset-500/15 text-sunset-700 ring-sunset-500/30',
  partial: 'bg-wviolet-500/15 text-wviolet-700 ring-wviolet-500/30',
  failed: 'bg-destructive/15 text-destructive ring-destructive/30',
};

export default function AdminScansPage() {
  const completed = sampleScans.filter(s => s.status === 'completed').length;
  const newJobsTotal = sampleScans.reduce((sum, s) => sum + s.newJobs, 0);
  const evaluatedTotal = sampleScans.reduce((sum, s) => sum + s.evaluated, 0);

  return (
    <div className='flex flex-col gap-8 pt-2'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-semibold tracking-tight'>
          Scans
        </h1>
        <p className='text-sm text-muted-foreground'>
          Recent batch portal scans. Each row is one execution of{' '}
          <code className='font-mono text-xs'>npm run scan</code>.
        </p>
      </header>

      <section className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <Stat label='Total runs' value={sampleScans.length} />
        <Stat label='Completed cleanly' value={completed} />
        <Stat label='Jobs found / evaluated' value={`${newJobsTotal} / ${evaluatedTotal}`} />
      </section>

      <section className='overflow-hidden rounded-lg border border-border bg-card shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground'>
            <tr>
              <th className='px-4 py-2 text-left'>Started</th>
              <th className='px-4 py-2 text-left'>Run ID</th>
              <th className='px-4 py-2 text-right'>Duration</th>
              <th className='px-4 py-2 text-right'>Portals</th>
              <th className='px-4 py-2 text-right'>New</th>
              <th className='px-4 py-2 text-right'>Evaluated</th>
              <th className='px-4 py-2 text-left'>Status</th>
              <th className='px-4 py-2 text-left'>Notes</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {sampleScans.map(scan => {
              const date = new Date(scan.startedAt);
              const duration = scan.durationSec
                ? `${Math.floor(scan.durationSec / 60)}m ${scan.durationSec % 60}s`
                : '—';
              return (
                <tr key={scan.id} className='transition hover:bg-muted/30'>
                  <td className='px-4 py-3 font-mono text-xs tabular-nums text-foreground'>
                    {date.toISOString().replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
                    {scan.id}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground'>
                    {duration}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground'>
                    {scan.portalsScanned}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground'>
                    {scan.newJobs}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground'>
                    {scan.evaluated}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_PILL[scan.status]}`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-xs text-muted-foreground'>
                    {scan.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({label, value}: {label: string; value: number | string}) {
  return (
    <div className='rounded-lg border border-border bg-card p-5 shadow-sm'>
      <div className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
        {label}
      </div>
      <div className='mt-1 font-display text-2xl font-semibold tabular-nums text-foreground'>
        {value}
      </div>
    </div>
  );
}
