import {type Status, STATUS_LABELS} from '@/lib/sample-data';
import {cn} from '@/lib/utils';

const STATUS_CLASSES: Record<Status, string> = {
  // Map status to brand-aligned hues. Healthy/positive = sunset; signal = wviolet;
  // neutral = sand; muted = night.
  interview: 'bg-sunset-500/10 text-sunset-700 ring-sunset-500/30',
  offer: 'bg-sunset-500 text-primary-foreground ring-sunset-600/30',
  applied: 'bg-wviolet-500/10 text-wviolet-700 ring-wviolet-500/30',
  responded: 'bg-wviolet-500/15 text-wviolet-800 ring-wviolet-500/30',
  evaluated: 'bg-sand-200 text-night-800 ring-sand-300',
  skip: 'bg-night-200 text-night-700 ring-night-300',
  rejected: 'bg-night-100 text-night-600 ring-night-200',
  discarded: 'bg-night-100 text-night-500 ring-night-200',
};

export function StatusBadge({status}: {status: Status}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ScoreChip({score}: {score: number}) {
  let cls = 'bg-muted text-muted-foreground ring-border';
  if (score >= 4.2) {
    cls = 'bg-sunset-500/15 text-sunset-700 ring-sunset-500/30';
  } else if (score >= 3.8) {
    cls = 'bg-sunset-300/30 text-sunset-800 ring-sunset-300';
  } else if (score < 3) {
    cls = 'bg-wviolet-100 text-wviolet-700 ring-wviolet-200';
  }

  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-[2.75rem] items-center justify-center rounded-md px-2 font-mono text-sm font-semibold tabular-nums ring-1 ring-inset',
        cls,
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}
