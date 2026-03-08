'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Clock3,
  Copy,
  Flag,
  History,
  Link2,
  Loader2,
  Plus,
  Swords,
  Users,
  Zap,
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

interface ChallengeHistoryItem {
  challengeId: string;
  createdAt: string;
  endedAt: string;
  me: { displayName: string; avatarUrl: string | null; goalTitle: string } | null;
  opponent: { displayName: string; avatarUrl: string | null; goalTitle: string } | null;
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

const compactCopy = {
  en: {
    noneSummary: 'Start a duel or join with an invite code.',
    pendingSummary: 'Waiting for the rival to join.',
    pendingHostSummary: 'Your duel is ready. Share the code and let the rival join from their side.',
    pendingGuestSummary: 'Your join request is saved and waiting for the duel to begin.',
    activeSummary: 'Live scoring is active now.',
    endedSummary: 'Last duel result is archived here.',
    boardTitle: 'Scoreboard',
    recentTitle: 'Recent activity',
    historyTitle: 'Previous duels',
    joinHint: 'Invite code',
    lead: 'Lead',
    tied: 'Tied',
    inviteReady: 'Share this code with the opponent.',
    inviteOwnerHint: 'You already created this duel. Joining does not happen here; the rival uses this code from their goal.',
    inviteGuestHint: 'You already joined this duel. Once the rival side is ready, the scoreboard will appear here.',
    inviteLabel: 'Invite code for rival',
    archiveEmpty: 'No previous duels yet.',
    activityEmpty: 'No scoring events yet.',
    noCode: '--------',
    total: 'Total',
    today: 'Today',
    last7: '7 days',
    rematch: 'Start another duel',
    endedAt: 'Ended',
    waiting: 'Waiting',
    points: 'pts',
    youLane: 'You',
    rivalLane: 'Rival',
  },
  ar: {
    noneSummary: 'ابدأ تحديًا جديدًا أو انضم عبر كود الدعوة.',
    pendingSummary: 'بانتظار انضمام المنافس.',
    pendingHostSummary: 'التحدي صار جاهز. فقط شارك الكود وخلي المنافس ينضم من جهته.',
    pendingGuestSummary: 'تم حفظ طلب الانضمام وبانتظار بدء التحدي.',
    activeSummary: 'التسجيل المباشر للنقاط شغال الآن.',
    endedSummary: 'آخر نتيجة محفوظة هنا.',
    boardTitle: 'لوحة النقاط',
    recentTitle: 'النشاط الأخير',
    historyTitle: 'التحديات السابقة',
    joinHint: 'كود الدعوة',
    lead: 'الفارق',
    tied: 'تعادل',
    inviteReady: 'شارك هذا الكود مع المنافس.',
    inviteOwnerHint: 'أنت أنشأت هذا التحدي بالفعل. الانضمام لا يتم من هنا؛ المنافس يستخدم هذا الكود من هدفه.',
    inviteGuestHint: 'أنت منضم بالفعل لهذا التحدي. بمجرد جاهزية الطرف الثاني ستظهر لوحة النقاط هنا.',
    inviteLabel: 'كود الدعوة للمنافس',
    archiveEmpty: 'لا توجد تحديات سابقة بعد.',
    activityEmpty: 'لا توجد أحداث نقاط بعد.',
    noCode: '--------',
    total: 'الإجمالي',
    today: 'اليوم',
    last7: '7 أيام',
    rematch: 'ابدأ تحديًا جديدًا',
    endedAt: 'انتهى',
    waiting: 'بانتظار',
    points: 'نقطة',
    youLane: 'أنت',
    rivalLane: 'المنافس',
  },
} as const;

const cardClass = 'rounded-2xl border border-border/70 bg-white dark:bg-card/50 p-3 sm:p-4';
const softCardClass = 'rounded-xl border border-border/60 bg-background/55 p-2.5 sm:p-3';

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
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function formatTime(dateIso: string, locale: string) {
  return new Date(dateIso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateIso: string | null, locale: string) {
  if (!dateIso) return '—';
  return new Date(dateIso).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initialFromName(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return 'U';
  return clean[0]?.toUpperCase() || 'U';
}

function initialsFromName(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return 'U';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || '')
    .join('')
    .toUpperCase();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function buildFallbackAvatar(displayName: string) {
  const palette = [
    ['#0f766e', '#34d399'],
    ['#1d4ed8', '#60a5fa'],
    ['#7c3aed', '#a78bfa'],
    ['#be185d', '#f472b6'],
    ['#c2410c', '#fb923c'],
    ['#475569', '#94a3b8'],
  ];
  const safeName = displayName?.trim() || 'User';
  const [startColor, endColor] = palette[hashString(safeName) % palette.length];
  const initials = initialsFromName(safeName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="g" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stop-color="${startColor}" />
          <stop offset="1" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)" />
      <circle cx="74" cy="22" r="10" fill="white" fill-opacity="0.16" />
      <circle cx="24" cy="78" r="14" fill="white" fill-opacity="0.12" />
      <text
        x="48"
        y="55"
        text-anchor="middle"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="30"
        font-weight="800"
        fill="white"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function PlayerAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null | undefined;
  displayName: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const fallbackAvatar = useMemo(() => buildFallbackAvatar(displayName), [displayName]);
  const src = avatarUrl && failedUrl !== avatarUrl ? avatarUrl : fallbackAvatar;

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40 text-sm font-black text-foreground">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={displayName || initialFromName(displayName)}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          if (avatarUrl && failedUrl !== avatarUrl) setFailedUrl(avatarUrl);
        }}
      />
    </div>
  );
}

function GoalTitleReveal({ title, isArabic }: { title: string | null | undefined; isArabic: boolean }) {
  const safeTitle = title?.trim() || '—';

  if (safeTitle === '—') {
    return <p className="truncate text-[11px] text-muted-foreground">—</p>;
  }

  const triggerClassName =
    'w-full truncate text-[11px] leading-5 text-muted-foreground transition-colors hover:text-foreground';
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
          <PopoverContent align={isArabic ? 'end' : 'start'} side="top" sideOffset={8} className="w-60 p-3">
            <p className="text-xs leading-relaxed break-words">{safeTitle}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

function MetricBox({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/75 px-2.5 py-2 text-center dark:bg-background/20">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-sm font-black tabular-nums text-foreground sm:text-base', toneClass)}>{value}</div>
    </div>
  );
}

function ScoreCard({
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
}: {
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
}) {
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

export default function ChallengeTab({ goalId, language = 'en' }: ChallengeTabProps) {
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
    if (!inviteCode) return;

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
    if (!snapshot.challengeId) return;

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

  const renderHeaderCard = () => (
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
            onClick={handleCreate}
            disabled={busyAction !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busyAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t.createChallenge}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder={t.challengeCodePlaceholder}
              maxLength={8}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-mono tracking-[0.18em] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
            <button
              onClick={handleJoin}
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
              <button
                onClick={handleCopyInvite}
                disabled={!snapshot.inviteCode}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                {copied ? t.challengeCodeCopied : t.copyCode}
              </button>
            </div>

            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              {isPendingGuest ? ui.inviteGuestHint : ui.inviteOwnerHint}
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-3 py-2.5 text-[12px] leading-5 text-muted-foreground dark:bg-background/15">
            {ui.inviteReady}
          </div>
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
              onClick={() => setConfirmEndOpen(true)}
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
            onClick={handleCreate}
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

  const renderBoardCard = () => (
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

  const renderActivityCard = () => (
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
            onClick={() => setShowAllEvents((prev) => !prev)}
            className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAllEvents ? t.challengeShowLess : t.challengeShowMore}
          </button>
        )}
      </div>

      {snapshot.recentEvents.length === 0 ? (
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

  const renderHistoryCard = () => {
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
  };

  const renderLoading = () => (
    <div className="space-y-2.5 animate-pulse">
      <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
        <div className="h-4 w-28 rounded bg-muted/40" />
        <div className="mt-2 h-3 w-2/3 rounded bg-muted/30" />
        <div className="mt-3 h-10 rounded-xl bg-muted/25" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-36 rounded-2xl border border-border/70 bg-background/60" />
        <div className="h-36 rounded-2xl border border-border/70 bg-background/60" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full min-h-0" dir={isArabic ? 'rtl' : 'ltr'}>
        {renderLoading()}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5" dir={isArabic ? 'rtl' : 'ltr'}>
      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-3 py-2.5 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/25 bg-destructive/10 text-destructive',
          )}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin space-y-2.5">
        {renderHeaderCard()}

        {hasHeadToHead && renderBoardCard()}

        {snapshot.status === 'active' && renderActivityCard()}

        {(snapshot.status === 'none' || snapshot.status === 'pending' || snapshot.status === 'ended') && renderHistoryCard()}
      </div>

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
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
            >
              {t.challengeEndConfirmCancel}
            </button>
            <button
              type="button"
              onClick={confirmEndChallenge}
              disabled={busyAction !== null}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
            >
              {busyAction === 'end' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {t.challengeEndConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
