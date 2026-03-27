'use client';

import { cn } from '@/lib/utils';

interface MetricBoxProps {
  label: string;
  value: string;
  toneClass?: string;
}

export function MetricBox({ label, value, toneClass }: MetricBoxProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/75 px-2.5 py-2 text-center dark:bg-background/20">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-sm font-black tabular-nums text-foreground sm:text-base', toneClass)}>{value}</div>
    </div>
  );
}
