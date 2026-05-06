import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
  Target,
} from 'lucide-react';
import {
  buildProfileReadinessMetrics,
  sampleProfileSignals,
  samplePublicSurfaceChecks,
  sampleRoleVocabularyRows,
  type ProfileSignalStatus,
} from '@/lib/sample-data';
import {Bar, MetricTile} from '@/components/admin/metric-tile';
import {cn} from '@/lib/utils';

const STATUS_CLASSES: Record<ProfileSignalStatus, string> = {
  ready: 'bg-sunset-500/15 text-sunset-800 ring-sunset-500/30',
  watch: 'bg-wviolet-500/12 text-wviolet-800 ring-wviolet-500/30',
  blocked: 'bg-destructive/10 text-destructive ring-destructive/30',
};

const STATUS_LABELS: Record<ProfileSignalStatus, string> = {
  ready: 'Ready',
  watch: 'Watch',
  blocked: 'Blocked',
};

export default function ProfileReadinessPage() {
  const metrics = buildProfileReadinessMetrics();
  const blockers = sampleProfileSignals.filter(signal => signal.status === 'blocked');
  const watchItems = sampleProfileSignals.filter(signal => signal.status === 'watch');

  return (
    <div className='flex flex-col gap-8 pt-2'>
      <header className='flex flex-col gap-2'>
        <div className='flex items-center gap-2 text-sm font-medium text-primary'>
          <ShieldCheck className='h-4 w-4' aria-hidden />
          Public-safe profile system
        </div>
        <h1 className='font-display text-3xl font-semibold tracking-tight'>
          Profile readiness
        </h1>
        <p className='max-w-3xl text-sm leading-relaxed text-muted-foreground'>
          Deprivatized signal map for keeping the CV, LinkedIn profile,
          portfolio, GitHub, and application answers precise, coherent, and
          hiring-manager legible.
        </p>
      </header>

      <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricTile
          label='Readiness'
          value={`${metrics.score}%`}
          hint={`${metrics.ready} ready, ${metrics.watch} watch, ${metrics.blocked} blocked`}
          accent='primary'
        />
        <MetricTile
          label='Public safe'
          value={`${metrics.publicSafe}/${metrics.total}`}
          hint='synthetic profile signals'
          accent='secondary'
        />
        <MetricTile
          label='Blockers'
          value={metrics.blocked}
          hint='must resolve before featuring'
          accent='muted'
        />
        <MetricTile
          label='Vocabulary rows'
          value={sampleRoleVocabularyRows.length}
          hint='target-role language map'
          accent='primary'
        />
      </section>

      <section className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <div className='rounded-lg border border-border bg-card p-6 shadow-sm lg:col-span-2'>
          <div className='mb-5 flex items-start justify-between gap-4'>
            <div>
              <h2 className='font-display text-lg font-semibold tracking-tight'>
                Signal map
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Ordered checks for precision, cross-surface coherence, and
                profile conversion quality.
              </p>
            </div>
            <StatusBadge status={metrics.blocked > 0 ? 'blocked' : 'ready'} />
          </div>

          <div className='mb-5'>
            <Bar pct={metrics.score} />
          </div>

          <ul className='divide-y divide-border'>
            {sampleProfileSignals.map(signal => (
              <li key={signal.id} className='grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_9rem]'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='font-medium text-foreground'>{signal.label}</h3>
                    <span className='rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                      {signal.category}
                    </span>
                  </div>
                  <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
                    {signal.evidence}
                  </p>
                  <p className='mt-2 text-sm leading-relaxed text-foreground'>
                    {signal.action}
                  </p>
                </div>
                <div className='flex items-start justify-between gap-3 md:flex-col md:items-end'>
                  <StatusBadge status={signal.status} />
                  <span className='text-xs text-muted-foreground'>{signal.owner}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className='flex flex-col gap-6'>
          <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-destructive' aria-hidden />
              <h2 className='font-display text-lg font-semibold tracking-tight'>
                Next blockers
              </h2>
            </div>
            <ul className='space-y-4'>
              {[...blockers, ...watchItems].slice(0, 4).map(signal => (
                <li key={signal.id} className='text-sm'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='font-medium text-foreground'>{signal.label}</span>
                    <StatusBadge status={signal.status} />
                  </div>
                  <p className='mt-1 leading-relaxed text-muted-foreground'>
                    {signal.action}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2'>
              <ClipboardCheck className='h-4 w-4 text-primary' aria-hidden />
              <h2 className='font-display text-lg font-semibold tracking-tight'>
                Hiring signal rules
              </h2>
            </div>
            <ul className='space-y-3 text-sm leading-relaxed text-muted-foreground'>
              <li>Use target-team language only when there is visible proof.</li>
              <li>Promote claims after the CV, profile, and portfolio agree.</li>
              <li>Prefer operator-facing outcomes over broad tool lists.</li>
              <li>Track one public-surface change per weekly measurement loop.</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
          <div className='mb-5 flex items-center gap-2'>
            <GitBranch className='h-4 w-4 text-primary' aria-hidden />
            <h2 className='font-display text-lg font-semibold tracking-tight'>
              Surface coherence
            </h2>
          </div>
          <ul className='divide-y divide-border'>
            {samplePublicSurfaceChecks.map(check => (
              <li key={check.surface} className='py-4 first:pt-0 last:pb-0'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <h3 className='font-medium text-foreground'>{check.surface}</h3>
                  <StatusBadge status={check.status} />
                </div>
                <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
                  {check.currentUse}
                </p>
                <p className='mt-1 text-sm leading-relaxed text-foreground'>
                  {check.requiredAlignment}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className='rounded-lg border border-border bg-card p-6 shadow-sm'>
          <div className='mb-5 flex items-center gap-2'>
            <Target className='h-4 w-4 text-primary' aria-hidden />
            <h2 className='font-display text-lg font-semibold tracking-tight'>
              Role vocabulary
            </h2>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-border text-xs uppercase tracking-wider text-muted-foreground'>
                  <th className='pb-3 pr-4 font-medium'>Employer language</th>
                  <th className='pb-3 pr-4 font-medium'>Profile phrase</th>
                  <th className='pb-3 font-medium'>Evidence</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {sampleRoleVocabularyRows.map(row => (
                  <tr key={row.employerLanguage} className='align-top'>
                    <td className='py-3 pr-4 font-medium text-foreground'>
                      {row.employerLanguage}
                      {row.priority === 'core'
                        ? (
                          <span className='ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary'>
                            Core
                          </span>
                        )
                        : null}
                    </td>
                    <td className='py-3 pr-4 text-muted-foreground'>
                      {row.publicProfilePhrase}
                    </td>
                    <td className='py-3 text-muted-foreground'>{row.evidenceType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({status}: {status: ProfileSignalStatus}) {
  const Icon = status === 'ready' ? CheckCircle2 : AlertTriangle;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_CLASSES[status],
      )}
    >
      <Icon className='h-3.5 w-3.5' aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
