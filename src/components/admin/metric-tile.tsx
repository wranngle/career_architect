import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

export function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'primary' | 'secondary' | 'muted';
}) {
  const accentBar
    = accent === 'primary'
      ? 'bg-primary'
      : (accent === 'secondary'
        ? 'bg-wviolet-500'
        : 'bg-sand-300');

  return (
    <div className='relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm'>
      <div
        className={cn('absolute left-0 top-0 h-full w-1', accentBar)}
        aria-hidden
      />
      <div className='flex flex-col gap-1.5 pl-2'>
        <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
          {label}
        </span>
        <span className='font-display text-3xl font-semibold tabular-nums text-foreground'>
          {value}
        </span>
        {hint
          ? (
            <span className='text-xs text-muted-foreground'>{hint}</span>
          )
          : null}
      </div>
    </div>
  );
}

export function Bar({
  pct,
  variant = 'primary',
}: {
  pct: number;
  variant?: 'primary' | 'secondary';
}) {
  const safe = Math.max(0, Math.min(100, pct));
  const color = variant === 'primary' ? 'bg-primary' : 'bg-wviolet-500';
  return (
    <div className='h-2 w-full overflow-hidden rounded-pill bg-muted'>
      <div
        className={cn('h-full rounded-pill', color)}
        style={{width: `${safe}%`}}
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        role='progressbar'
      />
    </div>
  );
}
