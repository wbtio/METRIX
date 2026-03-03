'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Swords,
  Plus,
  Link2,
  Copy,
  Check,
  Trophy,
  Flag,
  Loader2,
  Clock3,
  Activity,
} from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScoreSlice {
  today: number;
  last7Days: number;
  total: number;
}

interface ChallengePerson {
  userId: string;
  role: 'host' | 'guest';
  displayName: string;
  avatarUrl: string | null;
  goalTitle: string;
}

interface ChallengeEvent {
  actor: 'me' | 'opponent';
  points: number;
  createdAt: string;
}

interface ChallengeSnapshot {
  status: 'none' | 'pending' | 'active' | 'ended';
  challengeId: string | null;
  inviteCode: string | null;
  me: ChallengePerson | null;
  opponent: ChallengePerson | null;
  scoreboard: {
    me: ScoreSlice;
    opponent: ScoreSlice;
  };
  recentEvents: ChallengeEvent[];
  endedAt: string | null;
}

interface ChallengeTabProps {
  goalId: string;
  language?: Language;
}

const EMPTY_SNAPSHOT: ChallengeSnapshot = {
  status: 'none',
  challengeId: null,
  inviteCode: null,
  me: null,
  opponent: null,
  scoreboard: {
    me: { today: 0, last7Days: 0, total: 0 },
    opponent: { today: 0, last7Days: 0, total: 0 },
  },
  recentEvents: [],
  endedAt: null,
};

async function postJSON<T = unknown>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }

  return payload as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

function formatTime(dateIso: string, isArabic: boolean) {
  return new Date(dateIso).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initialFromName(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return 'U';
  return clean[0]?.toUpperCase() || 'U';
}

function GoalTitleReveal({ title, isArabic }: { title: string | null | undefined; isArabic: boolean }) {
  const safeTitle = title?.trim() || '—';

  if (safeTitle === '—') {
    return <p className="text-[11px] text-muted-foreground truncate">—</p>;
  }

  const triggerClassName =
    'w-full truncate text-[11px] text-muted-foreground transition-colors hover:text-foreground active:text-foreground';
  const titleStyle = { textAlign: isArabic ? ('right' as const) : ('left' as const) };

  return (
    <>
      <div className="hidden sm:block min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={triggerClassName} style={titleStyle}>
              {safeTitle}
            </button>
          </TooltipTrigger>
          <TooltipContent side={isArabic ? 'left' : 'right'} sideOffset={8} className="max-w-xs whitespace-normal break-words">
            {safeTitle}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="sm:hidden min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClassName} style={titleStyle}>
              {safeTitle}
            </button>
          </PopoverTrigger>
          <PopoverContent align={isArabic ? 'end' : 'start'} side="top" sideOffset={8} className="w-64 p-3">
            <p className="text-xs leading-relaxed break-words">{safeTitle}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

function PlayerRow({
  person,
  fallbackName,
  score,
  isArabic,
  rowToneClass,
  todayToneClass,
}: {
  person: ChallengePerson | null;
  fallbackName: string;
  score: ScoreSlice;
  isArabic: boolean;
  rowToneClass: string;
  todayToneClass: string;
}) {
  const displayName = person?.displayName || fallbackName;

  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem] sm:grid-cols-[minmax(0,1fr)_5.25rem_5.25rem] items-center gap-2 rounded-xl border border-border p-2.5 sm:p-3',
        rowToneClass
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        <div className="h-9 w-9 shrink-0 rounded-full border border-border/70 overflow-hidden bg-muted/40 flex items-center justify-center text-xs font-black text-foreground">
          {person?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span>{initialFromName(displayName)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <GoalTitleReveal title={person?.goalTitle} isArabic={isArabic} />
        </div>
      </div>

      <p className={cn('text-center font-black text-sm tabular-nums', todayToneClass)}>{score.today}</p>
      <p className="text-center font-black text-sm tabular-nums">{score.last7Days}</p>
    </div>
  );
}

export default function ChallengeTab({ goalId, language = 'en' }: ChallengeTabProps) {
  const t = translations[language];
  const isArabic = language === 'ar';

  const [snapshot, setSnapshot] = useState<ChallengeSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'create' | 'join' | 'end' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const fetchSnapshot = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const payload = await postJSON<{ data: ChallengeSnapshot }>('/api/challenges/by-goal', { goalId });
      setSnapshot(payload.data || EMPTY_SNAPSHOT);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Failed to load challenge') });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [goalId]);

  useEffect(() => {
    fetchSnapshot();

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
  }, [fetchSnapshot, goalId]);

  const handleCreate = async () => {
    setBusyAction('create');
    setFeedback(null);
    try {
      await postJSON('/api/challenges/create', { goalId });
      setFeedback({ type: 'success', text: t.challengeCreated });
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoin = async () => {
    const inviteCode = joinCode.trim().toUpperCase();
    if (!inviteCode) {
      return;
    }

    setBusyAction('join');
    setFeedback(null);

    try {
      await postJSON('/api/challenges/join', { goalId, inviteCode });
      setFeedback({ type: 'success', text: t.challengeJoined });
      setJoinCode('');
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      setBusyAction(null);
    }
  };

  const handleEnd = async () => {
    if (!snapshot.challengeId) {
      return;
    }

    setBusyAction('end');
    setFeedback(null);

    try {
      await postJSON('/api/challenges/end', { challengeId: snapshot.challengeId });
      setFeedback({ type: 'success', text: t.challengeEnded });
      await fetchSnapshot(true);
    } catch (error: unknown) {
      setFeedback({ type: 'error', text: getErrorMessage(error, t.challengeActionFailed) });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmEndChallenge = async () => {
    setConfirmEndOpen(false);
    await handleEnd();
  };

  const handleCopyInvite = async () => {
    if (!snapshot.inviteCode) {
      return;
    }

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
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300';
    }
    if (snapshot.status === 'pending') {
      return 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300';
    }
    if (snapshot.status === 'ended') {
      return 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300';
    }
    return 'bg-muted text-muted-foreground border-border';
  }, [snapshot.status]);

  const visibleEvents = useMemo(() => {
    return showAllEvents ? snapshot.recentEvents : snapshot.recentEvents.slice(0, 5);
  }, [showAllEvents, snapshot.recentEvents]);

  const canToggleEvents = snapshot.recentEvents.length > 5;

  useEffect(() => {
    setShowAllEvents(false);
  }, [snapshot.challengeId, snapshot.status, snapshot.recentEvents.length]);

  if (loading && snapshot.status === 'none') {
    return (
      <div className="h-full min-h-0 flex flex-col justify-center items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-sm">{t.challengeLoading}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="shrink-0 rounded-2xl border border-border bg-background/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Swords className="w-4 h-4 text-chart-5 shrink-0" />
            <p className="font-semibold text-sm sm:text-base truncate">{t.challengeTab}</p>
          </div>
          <span className={cn('text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border', statusToneClass)}>
            {statusLabel}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'shrink-0 text-xs sm:text-sm rounded-xl border px-3 py-2',
            feedback.type === 'success'
              ? 'bg-chart-2/10 text-chart-2 border-chart-2/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          )}
        >
          {feedback.text}
        </div>
      )}

      {snapshot.status === 'none' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4 space-y-2">
            <p className="font-semibold text-sm">{t.challengeEmptyTitle}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t.challengeEmptyDesc}</p>
            <button
              onClick={handleCreate}
              disabled={busyAction !== null}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busyAction === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t.createChallenge}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4 space-y-2">
            <p className="font-semibold text-sm">{t.joinByCode}</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t.challengeCodePlaceholder}
                maxLength={8}
                className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 uppercase tracking-wider"
                dir="ltr"
              />
              <button
                onClick={handleJoin}
                disabled={busyAction !== null || joinCode.trim().length < 8}
                className="h-10 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
              >
                {busyAction === 'join' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {t.joinByCode}
              </button>
            </div>
          </div>
        </div>
      )}

      {snapshot.status !== 'none' && (
        <>
          {snapshot.status === 'pending' && (
            <div className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4 space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground">{t.waitingForOpponent}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 rounded-xl border border-border bg-background px-3 flex items-center justify-between" dir="ltr">
                  <span className="font-black tracking-[0.2em] text-sm">{snapshot.inviteCode || '--------'}</span>
                </div>
                <button
                  onClick={handleCopyInvite}
                  disabled={!snapshot.inviteCode}
                  className="h-10 px-3 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold disabled:opacity-60 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t.challengeCodeCopied : t.copyCode}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 overflow-y-auto pr-0.5">
            <div className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem] sm:grid-cols-[minmax(0,1fr)_5.25rem_5.25rem] text-[11px] sm:text-xs font-semibold text-muted-foreground mb-2 gap-2">
                <span>{isArabic ? 'اللاعب' : 'Player'}</span>
                <span className="text-center">{t.todayPoints}</span>
                <span className="text-center">{t.last7Days}</span>
              </div>

              <div className="space-y-2">
                <PlayerRow
                  person={snapshot.me}
                  fallbackName={t.challengeYou}
                  score={snapshot.scoreboard.me}
                  isArabic={isArabic}
                  rowToneClass="bg-background/60"
                  todayToneClass="text-chart-2"
                />

                <PlayerRow
                  person={snapshot.opponent}
                  fallbackName={t.challengeOpponent}
                  score={snapshot.scoreboard.opponent}
                  isArabic={isArabic}
                  rowToneClass="bg-background/40"
                  todayToneClass="text-chart-5"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">{snapshot.me?.displayName || t.challengeYou}</p>
                  <p className="text-[11px] text-muted-foreground">{t.totalChallengePoints}</p>
                  <p className="text-base font-black text-chart-2 tabular-nums">{snapshot.scoreboard.me.total}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">{snapshot.opponent?.displayName || t.challengeOpponent}</p>
                  <p className="text-[11px] text-muted-foreground">{t.totalChallengePoints}</p>
                  <p className="text-base font-black text-chart-5 tabular-nums">{snapshot.scoreboard.opponent.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4">
              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-chart-3" />
                {t.challengeRecentActivity}
              </p>

              {snapshot.recentEvents.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground">{t.challengeNoRecentActivity}</p>
              ) : (
                <div className="space-y-2">
                  {visibleEvents.map((event, index) => (
                    <div key={`${event.actor}-${event.createdAt}-${index}`} className="rounded-xl border border-border bg-background/50 px-2.5 py-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">
                          {event.actor === 'me' ? snapshot.me?.displayName || t.challengeYou : snapshot.opponent?.displayName || t.challengeOpponent}
                        </span>
                        <span className={cn('font-black', event.actor === 'me' ? 'text-chart-2' : 'text-chart-5')}>+{event.points}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Clock3 className="w-3 h-3" />
                        {formatTime(event.createdAt, isArabic)}
                      </div>
                    </div>
                  ))}

                  {canToggleEvents && (
                    <button
                      onClick={() => setShowAllEvents((prev) => !prev)}
                      className="w-full h-9 rounded-xl border border-border bg-background/40 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {showAllEvents ? t.challengeShowLess : t.challengeShowMore}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-chart-5" />
              {snapshot.status === 'ended' && snapshot.endedAt
                ? `${t.challengeEndedAt}: ${new Date(snapshot.endedAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}`
                : t.challengeLiveNow}
            </div>

            {snapshot.status === 'active' && (
              <button
                onClick={() => setConfirmEndOpen(true)}
                disabled={busyAction !== null}
                className="h-10 px-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 disabled:opacity-60 flex items-center gap-1.5"
              >
                {busyAction === 'end' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                {t.endChallenge}
              </button>
            )}
          </div>
        </>
      )}

      <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <DialogContent className="sm:max-w-[420px]" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader className={isArabic ? 'sm:text-right' : undefined}>
            <DialogTitle>{t.challengeEndConfirmTitle}</DialogTitle>
            <DialogDescription>{t.challengeEndConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className={cn(isArabic && 'sm:flex-row-reverse sm:space-x-reverse')}>
            <button
              type="button"
              onClick={() => setConfirmEndOpen(false)}
              className="h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted"
            >
              {t.challengeEndConfirmCancel}
            </button>
            <button
              type="button"
              onClick={confirmEndChallenge}
              disabled={busyAction !== null}
              className="h-10 px-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {busyAction === 'end' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              {t.challengeEndConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
