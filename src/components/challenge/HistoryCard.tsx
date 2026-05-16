'use client';

import { useState } from 'react';
import { ChevronDown, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  embedded?: boolean;
}

export function HistoryCard({ history, historyLoading, locale, ui, t, embedded = false }: HistoryCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const shellClass =
    'overflow-hidden border-border/80 bg-gradient-to-br from-white via-white to-muted/20 shadow-sm shadow-black/[0.03] dark:from-card/70 dark:via-card/60 dark:to-background/30';
  const innerPanelClass =
    'mt-3 rounded-2xl border border-border/60 bg-background/75 p-3 sm:p-4 dark:bg-background/20';
  const isArabic = locale.startsWith('ar');
  const historyMeta = isArabic
    ? `${history.length} ${history.length === 1 ? 'تحدٍ محفوظ' : 'تحديات محفوظة'}`
    : `${history.length} saved ${history.length === 1 ? 'duel' : 'duels'}`;
  const emptyMeta = isArabic ? 'سيظهر الأرشيف هنا' : 'Your archive will appear here';

  if (historyLoading) {
    return (
      <section className={cn(!embedded && cardClass, !embedded && shellClass)}>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border/60">
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-black text-foreground">{ui.historyTitle}</div>
              <div className="text-[12px] text-muted-foreground">{emptyMeta}</div>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', !collapsed && 'rotate-180')} />
        </button>

        {!collapsed && (
          <div className={innerPanelClass}>
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.challengeLoading}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (history.length === 0) {
    return (
      <section className={cn(!embedded && cardClass, !embedded && shellClass)}>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border/60">
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-black text-foreground">{ui.historyTitle}</div>
              <div className="text-[12px] text-muted-foreground">{emptyMeta}</div>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', !collapsed && 'rotate-180')} />
        </button>

        {!collapsed && (
          <div className={innerPanelClass}>
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/55 px-3 py-6 text-center text-sm text-muted-foreground dark:bg-background/20">
              {ui.archiveEmpty}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn(!embedded && cardClass, !embedded && shellClass)}>
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border/60">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-black text-foreground">{ui.historyTitle}</div>
            <div className="text-[12px] text-muted-foreground">{historyMeta}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-black text-muted-foreground dark:bg-background/20">
            {history.length}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', !collapsed && 'rotate-180')} />
        </div>
      </button>

      {!collapsed && (
        <div className={innerPanelClass}>
          <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-0.5 scrollbar-thin sm:max-h-[24rem] lg:max-h-[26rem]">
            {history.map((item) => (
              <div
                key={item.challengeId}
                className={cn(
                  softCardClass,
                  'rounded-2xl border-border/70 bg-white/80 px-3 py-3 dark:bg-card/50',
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar avatarUrl={item.me?.avatarUrl} displayName={item.me?.displayName || t.challengeYou} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-sm font-black text-foreground">
                        <span className="truncate">{item.me?.displayName || t.challengeYou}</span>
                        <span className="text-muted-foreground">{t.challengeVs}</span>
                        <span className="truncate">{item.opponent?.displayName || '—'}</span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground sm:hidden">
                        {ui.endedAt} {formatDate(item.endedAt, locale)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:ms-auto sm:min-w-[11rem] sm:justify-end">
                    <div className="hidden text-[11px] text-muted-foreground sm:block">
                      {ui.endedAt} {formatDate(item.endedAt, locale)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-muted-foreground">{t.challengeOpponent}</div>
                      <PlayerAvatar
                        avatarUrl={item.opponent?.avatarUrl}
                        displayName={item.opponent?.displayName || t.challengeOpponent}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
