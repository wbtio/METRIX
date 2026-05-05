'use client';

import { cn, formatNumberEn } from '@/lib/utils';

interface GoalProgressBarProps {
  currentPoints: number;
  targetPoints: number;
  progress: number;
  className?: string;
  labelClassName?: string;
  currentClassName?: string;
  percentClassName?: string;
  targetClassName?: string;
  showXpLabel?: boolean;
}

export default function GoalProgressBar({
  currentPoints,
  targetPoints,
  progress,
  className,
  labelClassName = 'px-2 sm:px-5 text-[10px] sm:text-sm',
  currentClassName,
  percentClassName = 'text-xs sm:text-base',
  targetClassName,
  showXpLabel = false,
}: GoalProgressBarProps) {
  const fillWidth = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        'relative h-10 w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/30',
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fillWidth)}
      aria-label={`${formatNumberEn(currentPoints)} of ${formatNumberEn(targetPoints)}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[40%] bg-gradient-to-b from-black/5 to-transparent"
      />
      <div
        className="relative h-full bg-gradient-to-r from-primary/80 via-primary to-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all duration-1000 ease-out"
        style={{ width: `${fillWidth}%` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/patterns/waves.svg')] bg-center bg-repeat-x bg-[length:120px_28px] opacity-35"
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        />
      </div>

      <div
        className={cn(
          'absolute inset-0 z-20 flex items-center justify-between font-bold tracking-wide',
          labelClassName
        )}
        dir="ltr"
      >
        <span
          className={cn(
            'text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex min-w-0 max-w-[32%] items-center gap-1',
            currentClassName
          )}
        >
          <span className="truncate">{formatNumberEn(currentPoints)}</span>
          {showXpLabel && (
            <span className="shrink-0 text-[9px] sm:text-[10px] font-medium opacity-70">XP</span>
          )}
        </span>
        <span
          className={cn(
            'shrink-0 font-black text-foreground/90 mix-blend-screen drop-shadow-sm',
            percentClassName
          )}
        >
          {progress}%
        </span>
        <span
          className={cn(
            'text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex min-w-0 max-w-[32%] items-center gap-0.5',
            targetClassName
          )}
        >
          <span className="shrink-0 text-[9px] sm:text-[10px] opacity-60">/</span>
          <span className="truncate">{formatNumberEn(targetPoints)}</span>
        </span>
      </div>
    </div>
  );
}
