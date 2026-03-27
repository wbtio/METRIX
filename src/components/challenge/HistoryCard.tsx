'use client';

import { History, Loader2 } from 'lucide-react';
import type { ChallengeHistoryItem } from './challenge-types';
import { cardClass, softCardClass } from './challenge-types';
import { formatDate } from './challenge-utils';
import { PlayerAvatar } from './PlayerAvatar';

interface HistoryCardProps {
  history: ChallengeHistoryItem[];
  historyLoading: boolean;
  locale: string;
  ui: {
    historyTitle: string;
    archiveEmpty: string;
    endedAt: string;
  };
  t: {
    challengeLoading: string;
    challengeYou: string;
    challengeOpponent: string;
    challengeVs: string;
  };
}

export function HistoryCard({ history, historyLoading, locale, ui, t }: HistoryCardProps) {
  if (historyLoading) {
    return (
      <section className={cardClass}>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.challengeLoading}
        </div>
      </section>
    );
  }

  if (history.length === 0) {
    return (
      <section className={cardClass}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/60">
            <History className="h-4 w-4" />
          </div>
          <div className="text-sm font-black text-foreground">{ui.historyTitle}</div>
        </div>
        <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-3 py-6 text-center text-sm text-muted-foreground dark:bg-background/20">
          {ui.archiveEmpty}
        </div>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/60">
          <History className="h-4 w-4" />
        </div>
        <div className="text-sm font-black text-foreground">{ui.historyTitle}</div>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
        {history.map((item) => (
          <div key={item.challengeId} className={softCardClass}>
            <div className="flex items-center gap-2">
              <PlayerAvatar avatarUrl={item.me?.avatarUrl} displayName={item.me?.displayName || t.challengeYou} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-black text-foreground">
                  <span className="truncate">{item.me?.displayName || t.challengeYou}</span>
                  <span className="text-muted-foreground">{t.challengeVs}</span>
                  <span className="truncate">{item.opponent?.displayName || '—'}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {ui.endedAt} {formatDate(item.endedAt, locale)}
                </div>
              </div>
              <PlayerAvatar
                avatarUrl={item.opponent?.avatarUrl}
                displayName={item.opponent?.displayName || t.challengeOpponent}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
