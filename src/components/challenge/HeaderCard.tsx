'use client';

import {
  Check,
  Copy,
  Flag,
  Link2,
  Loader2,
  Plus,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChallengeSnapshot } from './challenge-types';
import { cardClass } from './challenge-types';
import { MetricBox } from './MetricBox';
import { formatDate } from './challenge-utils';

interface HeaderCardProps {
  snapshot: ChallengeSnapshot;
  leadText: string;
  isPendingGuest: boolean;
  busyAction: 'create' | 'join' | 'end' | null;
  joinCode: string;
  copied: boolean;
  locale: string;
  numberFormatter: Intl.NumberFormat;
  ui: {
    inviteLabel: string;
    noCode: string;
    inviteGuestHint: string;
    inviteOwnerHint: string;
    inviteReady: string;
    total: string;
    lead: string;
    endedAt: string;
    rematch: string;
  };
  t: {
    challengeTab: string;
    createChallenge: string;
    challengeCodePlaceholder: string;
    joinByCode: string;
    challengeCodeCopied: string;
    copyCode: string;
    challengeLiveNow: string;
    endChallenge: string;
    cancelChallenge: string;
    cancelChallengeConfirmTitle: string;
    cancelChallengeConfirmDesc: string;
    cancelChallengeConfirmAction: string;
    challengeEndConfirmCancel: string;
  };
  onCreate: () => void;
  onJoin: () => void;
  onJoinCodeChange: (value: string) => void;
  onCopyInvite: () => void;
  onRequestEnd: () => void;
  onCancelPending: () => void;
  embedded?: boolean;
}

export function HeaderCard({
  snapshot,
  leadText,
  isPendingGuest,
  busyAction,
  joinCode,
  copied,
  locale,
  numberFormatter,
  ui,
  t,
  onCreate,
  onJoin,
  onJoinCodeChange,
  onCopyInvite,
  onRequestEnd,
  onCancelPending,
  embedded = false,
}: HeaderCardProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const shellClass =
    'overflow-hidden border-border/60 bg-card shadow-sm shadow-black/[0.02]';
  const innerPanelClass =
    cn(
      'mt-3 rounded-xl border border-border/40 bg-background',
      embedded ? 'p-3' : 'p-3 sm:p-4',
    );

  return (
    <section className={cn(!embedded && cardClass, !embedded && shellClass)}>
      {snapshot.status === 'none' && (
        <div className={innerPanelClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-bold tracking-tight text-foreground">{t.challengeTab}</div>
            <div className="text-xs font-semibold text-muted-foreground">{ui.inviteLabel}</div>
          </div>

          <button
            onClick={onCreate}
            disabled={busyAction !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {busyAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t.createChallenge}
          </button>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
              placeholder={t.challengeCodePlaceholder}
              maxLength={8}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-[0.18em] text-foreground outline-none focus:ring-1 focus:ring-primary/20"
              dir="ltr"
            />
            <button
              onClick={onJoin}
              disabled={busyAction !== null || joinCode.trim().length < 8}
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted px-3 text-xs font-semibold text-muted-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {busyAction === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {t.joinByCode}
            </button>
          </div>
        </div>
      )}

      {snapshot.status === 'pending' && (
        <div className={innerPanelClass}>
          <div className="rounded-xl border border-border/40 bg-background p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{ui.inviteLabel}</div>
                <div
                  className="mt-1 text-base font-bold tracking-[0.22em] text-foreground sm:text-lg"
                  dir="ltr"
                >
                  {snapshot.inviteCode || ui.noCode}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={onCopyInvite}
                  disabled={!snapshot.inviteCode}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted px-3 text-xs font-semibold text-muted-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                  {copied ? t.challengeCodeCopied : t.copyCode}
                </button>
                <button
                  onClick={() => setConfirmCancel(true)}
                  disabled={busyAction !== null}
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {t.cancelChallenge}
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {isPendingGuest ? ui.inviteGuestHint : ui.inviteOwnerHint}
            </p>
          </div>

          {confirmCancel && (
            <div className="mt-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5">
              <p className="text-xs font-bold text-destructive">{t.cancelChallengeConfirmTitle}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.cancelChallengeConfirmDesc}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => { setConfirmCancel(false); onCancelPending(); }}
                  disabled={busyAction !== null}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-xs font-bold text-destructive-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {busyAction === 'end' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t.cancelChallengeConfirmAction}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex h-8 items-center justify-center rounded-lg border border-border/60 bg-muted px-3 text-xs font-semibold text-muted-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
                >
                  {t.challengeEndConfirmCancel}
                </button>
              </div>
            </div>
          )}

          {!confirmCancel && (
            <div className="mt-2 rounded-xl border border-dashed border-border/40 bg-muted/30 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              {ui.inviteReady}
            </div>
          )}
        </div>
      )}

      {snapshot.status === 'active' && (
        <div className={innerPanelClass}>
          <div className={cn('grid gap-2', embedded ? 'grid-cols-2' : 'grid-cols-1 min-[420px]:grid-cols-3')}>
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.me.total)} toneClass="text-chart-2" />
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.opponent.total)} toneClass="text-chart-5" />
            {!embedded && <MetricBox label={ui.lead} value={leadText} />}
          </div>

          <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', embedded ? 'mt-2.5' : 'mt-3')}>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-chart-3" />
              {t.challengeLiveNow}
            </div>
            <button
              onClick={onRequestEnd}
              disabled={busyAction !== null}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {busyAction === 'end' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {t.endChallenge}
            </button>
          </div>
        </div>
      )}

      {snapshot.status === 'ended' && (
        <div className={innerPanelClass}>
          <div className={cn('grid gap-2', embedded ? 'grid-cols-2' : 'grid-cols-1 min-[420px]:grid-cols-3')}>
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.me.total)} toneClass="text-chart-2" />
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.opponent.total)} toneClass="text-chart-5" />
            {!embedded && <MetricBox label={ui.endedAt} value={formatDate(snapshot.endedAt, locale)} />}
          </div>

          <button
            onClick={onCreate}
            disabled={busyAction !== null}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60',
              embedded ? 'mt-2.5 h-9' : 'mt-3 h-10',
            )}
          >
            {busyAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {ui.rematch}
          </button>
        </div>
      )}
    </section>
  );
}
