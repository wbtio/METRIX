'use client';

import {
  Check,
  Copy,
  Flag,
  Link2,
  Loader2,
  Plus,
  Swords,
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
  summaryText: string;
  statusLabel: string;
  statusToneClass: string;
  leadText: string;
  isPendingHost: boolean;
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
}

export function HeaderCard({
  snapshot,
  summaryText,
  statusLabel,
  statusToneClass,
  leadText,
  isPendingHost: _isPendingHost,
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
}: HeaderCardProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-5/12 text-chart-5 ring-1 ring-chart-5/20">
              <Swords className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-foreground">{t.challengeTab}</div>
              <div className="text-[12px] leading-5 text-muted-foreground">{summaryText}</div>
            </div>
          </div>
        </div>

        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-black', statusToneClass)}>
          {statusLabel}
        </span>
      </div>

      {snapshot.status === 'none' && (
        <div className="mt-3 space-y-2">
          <button
            onClick={onCreate}
            disabled={busyAction !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busyAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t.createChallenge}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
              placeholder={t.challengeCodePlaceholder}
              maxLength={8}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-mono tracking-[0.18em] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
            <button
              onClick={onJoin}
              disabled={busyAction !== null || joinCode.trim().length < 8}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {busyAction === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {t.joinByCode}
            </button>
          </div>
        </div>
      )}

      {snapshot.status === 'pending' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-border/60 bg-background/60 p-3 dark:bg-background/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{ui.inviteLabel}</div>
                <div
                  className="mt-1 text-base font-black tracking-[0.22em] text-foreground"
                  dir="ltr"
                >
                  {snapshot.inviteCode || ui.noCode}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCopyInvite}
                  disabled={!snapshot.inviteCode}
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                  {copied ? t.challengeCodeCopied : t.copyCode}
                </button>
                <button
                  onClick={() => setConfirmCancel(true)}
                  disabled={busyAction !== null}
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/8 px-3 text-sm font-bold text-destructive/80 transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {t.cancelChallenge}
                </button>
              </div>
            </div>

            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              {isPendingGuest ? ui.inviteGuestHint : ui.inviteOwnerHint}
            </p>
          </div>

          {confirmCancel && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/6 px-3 py-2.5">
              <p className="text-[12px] font-bold text-destructive">{t.cancelChallengeConfirmTitle}</p>
              <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{t.cancelChallengeConfirmDesc}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { setConfirmCancel(false); onCancelPending(); }}
                  disabled={busyAction !== null}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-destructive/90 px-3 text-[12px] font-black text-white transition-colors hover:bg-destructive disabled:opacity-60"
                >
                  {busyAction === 'end' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t.cancelChallengeConfirmAction}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex h-8 items-center justify-center rounded-lg border border-border px-3 text-[12px] font-bold text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t.challengeEndConfirmCancel}
                </button>
              </div>
            </div>
          )}

          {!confirmCancel && (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-3 py-2.5 text-[12px] leading-5 text-muted-foreground dark:bg-background/15">
              {ui.inviteReady}
            </div>
          )}
        </div>
      )}

      {snapshot.status === 'active' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.me.total)} toneClass="text-chart-2" />
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.opponent.total)} toneClass="text-chart-5" />
            <MetricBox label={ui.lead} value={leadText} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[12px] text-muted-foreground dark:bg-background/20">
              <Zap className="h-3.5 w-3.5 text-chart-3" />
              {t.challengeLiveNow}
            </div>
            <button
              onClick={onRequestEnd}
              disabled={busyAction !== null}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-3 text-sm font-black text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
            >
              {busyAction === 'end' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {t.endChallenge}
            </button>
          </div>
        </div>
      )}

      {snapshot.status === 'ended' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.me.total)} toneClass="text-chart-2" />
            <MetricBox label={ui.total} value={numberFormatter.format(snapshot.scoreboard.opponent.total)} toneClass="text-chart-5" />
            <MetricBox label={ui.endedAt} value={formatDate(snapshot.endedAt, locale)} />
          </div>

          <button
            onClick={onCreate}
            disabled={busyAction !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busyAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {ui.rematch}
          </button>
        </div>
      )}
    </section>
  );
}
