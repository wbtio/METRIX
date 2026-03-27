'use client';

import { Activity, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChallengeEvent } from './challenge-types';
import { cardClass, softCardClass } from './challenge-types';
import { formatTime } from './challenge-utils';

interface ActivityCardProps {
  recentEvents: ChallengeEvent[];
  visibleEvents: ChallengeEvent[];
  canToggleEvents: boolean;
  showAllEvents: boolean;
  onToggleShowAll: () => void;
  meName: string;
  opponentName: string;
  locale: string;
  numberFormatter: Intl.NumberFormat;
  ui: {
    recentTitle: string;
    activityEmpty: string;
  };
  t: {
    challengeShowLess: string;
    challengeShowMore: string;
  };
}

export function ActivityCard({
  recentEvents,
  visibleEvents,
  canToggleEvents,
  showAllEvents,
  onToggleShowAll,
  meName,
  opponentName,
  locale,
  numberFormatter,
  ui,
  t,
}: ActivityCardProps) {
  return (
    <section className={cardClass}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/12 text-chart-3 ring-1 ring-chart-3/20">
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-sm font-black text-foreground">{ui.recentTitle}</div>
        </div>

        {canToggleEvents && (
          <button
            onClick={onToggleShowAll}
            className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAllEvents ? t.challengeShowLess : t.challengeShowMore}
          </button>
        )}
      </div>

      {recentEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-3 py-6 text-center text-sm text-muted-foreground dark:bg-background/20">
          {ui.activityEmpty}
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibleEvents.map((event, index) => {
            const actorIsMe = event.actor === 'me';
            const actorName = actorIsMe ? meName : opponentName;

            return (
              <div key={`${event.actor}-${event.createdAt}-${index}`} className={softCardClass}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-foreground">{actorName}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {formatTime(event.createdAt, locale)}
                    </div>
                  </div>
                  <div className={cn('rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums', actorIsMe ? 'bg-chart-2/12 text-chart-2' : 'bg-chart-5/12 text-chart-5')}>
                    +{numberFormatter.format(event.points)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
