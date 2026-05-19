'use client';

import { cn } from '@/lib/utils';

interface MetricBoxProps {
  label: string;
  value: string;
  toneClass?: string;
}

export function MetricBox({ label, value, toneClass }: MetricBoxProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-2.5 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-sm font-bold tabular-nums text-foreground sm:text-base', toneClass)}>{value}</div>
    </div>
  );
}
