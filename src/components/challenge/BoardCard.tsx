'use client';

import { Users } from 'lucide-react';
import type { ChallengeSnapshot } from './challenge-types';
import { cardClass } from './challenge-types';
import { ScoreCard } from './ScoreCard';

interface BoardCardProps {
  snapshot: ChallengeSnapshot;
  isArabic: boolean;
  numberFormatter: Intl.NumberFormat;
  ui: {
    boardTitle: string;
    youLane: string;
    rivalLane: string;
    total: string;
    today: string;
    last7: string;
  };
  t: {
    challengeYou: string;
    challengeOpponent: string;
  };
}

export function BoardCard({ snapshot, isArabic, numberFormatter, ui, t }: BoardCardProps) {
  return (
    <section className={cardClass}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Users className="h-4 w-4" />
        </div>
        <div className="text-sm font-black text-foreground">{ui.boardTitle}</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreCard
          person={snapshot.me}
          fallbackName={t.challengeYou}
          score={snapshot.scoreboard.me}
          laneLabel={ui.youLane}
          totalLabel={ui.total}
          todayLabel={ui.today}
          last7Label={ui.last7}
          badgeClass="bg-chart-2/12 text-chart-2"
          valueClass="text-chart-2"
          isArabic={isArabic}
          numberFormatter={numberFormatter}
        />
        <ScoreCard
          person={snapshot.opponent}
          fallbackName={t.challengeOpponent}
          score={snapshot.scoreboard.opponent}
          laneLabel={ui.rivalLane}
          totalLabel={ui.total}
          todayLabel={ui.today}
          last7Label={ui.last7}
          badgeClass="bg-chart-5/12 text-chart-5"
          valueClass="text-chart-5"
          isArabic={isArabic}
          numberFormatter={numberFormatter}
        />
      </div>
    </section>
  );
}
