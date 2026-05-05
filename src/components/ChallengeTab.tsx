'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Swords } from 'lucide-react';
import { translations } from '@/lib/translations';
import type { ChallengeSnapshot, ChallengeHistoryItem, ChallengeTabProps } from './challenge/challenge-types';
import { EMPTY_SNAPSHOT, compactCopy } from './challenge/challenge-types';
import { postJSON, getErrorMessage } from './challenge/challenge-utils';
import { HeaderCard } from './challenge/HeaderCard';
import { BoardCard } from './challenge/BoardCard';
import { ActivityCard } from './challenge/ActivityCard';
import { HistoryCard } from './challenge/HistoryCard';
import { EndChallengeDialog } from './challenge/EndChallengeDialog';
import { LoadingSkeleton } from './challenge/LoadingSkeleton';
import { FeedbackBanner } from './challenge/FeedbackBanner';
import { RewardsSection } from './challenge/RewardsSection';

export default function ChallengeTab({ goalId, currentPoints, targetPoints, language = 'en' }: ChallengeTabProps) {
  const t = translations[language];
  const ui = compactCopy[language];
  const isArabic = language === 'ar';
  const locale = isArabic ? 'ar-IQ' : 'en-US';

  const [snapshot, setSnapshot] = useState<ChallengeSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'create' | 'join' | 'end' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isChallengePanelCollapsed, setIsChallengePanelCollapsed] = useState(true);
  const actionLockRef = useRef<'create' | 'join' | 'end' | null>(null);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  const fetchSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const now = new Date();
      const localMidnightUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      try {
        const payload = await postJSON<{ data: ChallengeSnapshot }>('/api/challenges/by-goal', { goalId, localMidnightUtc });
        setSnapshot(payload.data || EMPTY_SNAPSHOT);
      } catch (error: unknown) {
        setFeedback({ type: 'error', text: getErrorMessage(error, 'Failed to load challenge') });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [goalId],
  );

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const payload = await postJSON<{ data: ChallengeHistoryItem[] }>('/api/challenges/history', { goalId });
      setHistory(payload.data || []);
    } catch {
      // Archive is optional.
    } finally {
      setHistoryLoading(false);
    }
  }, [goalId]);

  const beginAction = useCallback((action: 'create' | 'join' | 'end') => {
    if (actionLockRef.current !== null) {
      return false;
    }

    actionLockRef.current = action;
    setBusyAction(action);
    return true;
  }, []);

  const endAction = useCallback(() => {
    actionLockRef.current = null;
    setBusyAction(null);
  }, []);

  useEffect(() => {
    fetchSnapshot();
    fetchHistory();

    // Refresh only when user returns to the tab (not on a fixed 20s timer)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSnapshot(true);
      }
    };

    const onLogSaved = (event: Event) => {
      const custom = event as CustomEvent<{ goalId?: string }>;
      if (!custom.detail?.goalId || custom.detail.goalId === goalId) {
        fetchSnapshot(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('challenge-log-updated', onLogSaved as EventListener);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('challenge-log-updated', onLogSaved as EventListener);
    };
  }, [fetchSnapshot, fetchHistory, goalId]);

  useEffect(() => {
    if (snapshot.status === 'none' || snapshot.status === 'ended') {
      fetchHistory();
    }
  }, [snapshot.status, fetchHistory]);

  useEffect(() => {
    setShowAllEvents(false);
  }, [snapshot.challengeId, snapshot.status]);

  const handleCreate = async () => {
    if (!beginAction('create')) return;
    setFeedback(null);

    try {
      await postJSON('/api/challenges/create', { goalId });
      setFeedback({ type: 'success', text: t.challengeCreated });
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      endAction();
    }
  };

  const handleJoin = async () => {
    const inviteCode = joinCode.trim().toUpperCase();
    if (!inviteCode) return;

    if (!beginAction('join')) return;
    setFeedback(null);

    try {
      await postJSON('/api/challenges/join', { goalId, inviteCode });
      setFeedback({ type: 'success', text: t.challengeJoined });
      setJoinCode('');
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      endAction();
    }
  };

  const handleEnd = async () => {
    if (!snapshot.challengeId) return;

    if (!beginAction('end')) return;
    setFeedback(null);

    try {
      await postJSON('/api/challenges/end', { challengeId: snapshot.challengeId });
      setFeedback({ type: 'success', text: t.challengeEnded });
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      endAction();
    }
  };

  const confirmEndChallenge = async () => {
    setConfirmEndOpen(false);
    await handleEnd();
  };

  const handleCopyInvite = async () => {
    if (!snapshot.inviteCode) return;

    try {
      await navigator.clipboard.writeText(snapshot.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      setFeedback({ type: 'error', text: t.challengeCopyFailed });
    }
  };

  const statusLabel = useMemo(() => {
    if (snapshot.status === 'active') return t.challengeStatusActive;
    if (snapshot.status === 'pending') return t.challengeStatusPending;
    if (snapshot.status === 'ended') return t.challengeStatusEnded;
    return t.challengeStatusNone;
  }, [snapshot.status, t]);

  const statusToneClass = useMemo(() => {
    if (snapshot.status === 'active') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    }
    if (snapshot.status === 'pending') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
    if (snapshot.status === 'ended') {
      return 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300';
    }
    return 'border-primary/20 bg-primary/10 text-primary';
  }, [snapshot.status]);

  const visibleEvents = useMemo(
    () => (showAllEvents ? snapshot.recentEvents : snapshot.recentEvents.slice(0, 4)),
    [showAllEvents, snapshot.recentEvents],
  );

  const meName = snapshot.me?.displayName || t.challengeYou;
  const opponentName = snapshot.opponent?.displayName || t.challengeOpponent;
  const totalDelta = snapshot.scoreboard.me.total - snapshot.scoreboard.opponent.total;
  const canToggleEvents = snapshot.recentEvents.length > 4;
  const hasHeadToHead = Boolean(snapshot.me && snapshot.opponent);
  const isPendingHost = snapshot.status === 'pending' && snapshot.me?.role === 'host';
  const isPendingGuest = snapshot.status === 'pending' && snapshot.me?.role === 'guest';

  const leadText =
    snapshot.status === 'pending'
      ? ui.waiting
      : totalDelta === 0
        ? ui.tied
        : `${numberFormatter.format(Math.abs(totalDelta))} ${ui.points}`;

  const summaryText = useMemo(() => {
    if (snapshot.status === 'active') return ui.activeSummary;
    if (snapshot.status === 'pending') {
      if (isPendingHost) return ui.pendingHostSummary;
      if (isPendingGuest) return ui.pendingGuestSummary;
      return ui.pendingSummary;
    }
    if (snapshot.status === 'ended') return ui.endedSummary;
    return ui.noneSummary;
  }, [isPendingGuest, isPendingHost, snapshot.status, ui]);

  if (loading) {
    return (
      <div className="h-full min-h-0" dir={isArabic ? 'rtl' : 'ltr'}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5" dir={isArabic ? 'rtl' : 'ltr'}>
      <FeedbackBanner feedback={feedback} />

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin space-y-2.5">
        <section className="rounded-2xl border border-border/80 bg-gradient-to-br from-white via-white to-muted/20 p-3 shadow-sm shadow-black/[0.03] dark:bg-card/50 dark:from-card/70 dark:via-card/60 dark:to-background/30 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-5/12 text-chart-5 ring-1 ring-chart-5/20">
                <Swords className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-foreground">{t.challengeTab}</div>
                <div className="text-[11px] text-muted-foreground">{statusLabel}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChallengePanelCollapsed((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 text-[11px] font-black text-muted-foreground transition-colors hover:bg-muted dark:bg-background/20"
              aria-expanded={!isChallengePanelCollapsed}
            >
              {isChallengePanelCollapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  {isArabic ? 'إظهار' : 'Show'}
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  {isArabic ? 'إخفاء' : 'Hide'}
                </>
              )}
            </button>
          </div>

          {!isChallengePanelCollapsed && (
            <>
              <div className="mt-3">
                <HeaderCard
                  snapshot={snapshot}
                  summaryText={summaryText}
                  statusLabel={statusLabel}
                  statusToneClass={statusToneClass}
                  leadText={leadText}
                  isPendingHost={isPendingHost}
                  isPendingGuest={isPendingGuest}
                  busyAction={busyAction}
                  joinCode={joinCode}
                  copied={copied}
                  locale={locale}
                  numberFormatter={numberFormatter}
                  ui={ui}
                  t={t}
                  onCreate={handleCreate}
                  onJoin={handleJoin}
                  onJoinCodeChange={setJoinCode}
                  onCopyInvite={handleCopyInvite}
                  onRequestEnd={() => setConfirmEndOpen(true)}
                  onCancelPending={handleEnd}
                  embedded
                />
              </div>

              <div className="my-4 h-px bg-border/60" />

              <HistoryCard
                history={history}
                historyLoading={historyLoading}
                locale={locale}
                ui={ui}
                t={t}
                embedded
              />
            </>
          )}
        </section>

        {hasHeadToHead && (
          <BoardCard
            snapshot={snapshot}
            isArabic={isArabic}
            numberFormatter={numberFormatter}
            ui={ui}
            t={t}
          />
        )}

        <RewardsSection
          goalId={goalId}
          currentPoints={currentPoints}
          targetPoints={targetPoints}
          language={language}
          numberFormatter={numberFormatter}
          t={t}
        />

        {(snapshot.status === 'active' || snapshot.status === 'ended') && (
          <ActivityCard
            goalId={goalId}
            recentEvents={snapshot.recentEvents}
            visibleEvents={visibleEvents}
            canToggleEvents={canToggleEvents}
            showAllEvents={showAllEvents}
            onToggleShowAll={() => setShowAllEvents((prev) => !prev)}
            meName={meName}
            opponentName={opponentName}
            locale={locale}
            numberFormatter={numberFormatter}
            ui={ui}
            t={t}
          />
        )}

      </div>

      <EndChallengeDialog
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        onConfirm={confirmEndChallenge}
        busyAction={busyAction}
        isArabic={isArabic}
        t={t}
      />
    </div>
  );
}
