'use client';

import { cn } from '@/lib/utils';
import type { ChallengePerson, ScoreSlice } from './challenge-types';
import { softCardClass } from './challenge-types';
import { PlayerAvatar } from './PlayerAvatar';
import { GoalTitleReveal } from './GoalTitleReveal';
import { MetricBox } from './MetricBox';

interface ScoreCardProps {
  person: ChallengePerson | null;
  fallbackName: string;
  score: ScoreSlice;
  laneLabel: string;
  totalLabel: string;
  todayLabel: string;
  last7Label: string;
  badgeClass: string;
  valueClass: string;
  isArabic: boolean;
  numberFormatter: Intl.NumberFormat;
}

export function ScoreCard({
  person,
  fallbackName,
  score,
  laneLabel,
  totalLabel,
  todayLabel,
  last7Label,
  badgeClass,
  valueClass,
  isArabic,
  numberFormatter,
}: ScoreCardProps) {
  const displayName = person?.displayName || fallbackName;

  return (
    <div className={softCardClass}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2.5">
          <PlayerAvatar avatarUrl={person?.avatarUrl} displayName={displayName} />
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{laneLabel}</div>
            <div className="truncate text-sm font-black text-foreground">{displayName}</div>
            <GoalTitleReveal title={person?.goalTitle} isArabic={isArabic} />
          </div>
        </div>

        <div className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums', badgeClass)}>
          {numberFormatter.format(score.total)} {totalLabel}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <MetricBox label={todayLabel} value={numberFormatter.format(score.today)} toneClass={valueClass} />
        <MetricBox label={last7Label} value={numberFormatter.format(score.last7Days)} />
        <MetricBox label={totalLabel} value={numberFormatter.format(score.total)} />
      </div>
    </div>
  );
}
