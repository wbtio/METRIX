'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const actionLockRef = useRef<'create' | 'join' | 'end' | null>(null);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  const fetchSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const payload = await postJSON<{ data: ChallengeSnapshot }>('/api/challenges/by-goal', { goalId });
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

    const intervalId = setInterval(() => {
      fetchSnapshot(true);
    }, 20000);

    const onLogSaved = (event: Event) => {
      const custom = event as CustomEvent<{ goalId?: string }>;
      if (!custom.detail?.goalId || custom.detail.goalId === goalId) {
        fetchSnapshot(true);
      }
    };

    window.addEventListener('challenge-log-updated', onLogSaved as EventListener);

    return () => {
      clearInterval(intervalId);
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
  }, [snapshot.challengeId, snapshot.status, snapshot.recentEvents.length]);

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
        />

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

        {snapshot.status === 'active' && (
          <ActivityCard
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

        {(snapshot.status === 'none' || snapshot.status === 'pending' || snapshot.status === 'ended') && (
          <HistoryCard
            history={history}
            historyLoading={historyLoading}
            locale={locale}
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
