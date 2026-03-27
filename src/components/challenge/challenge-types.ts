import type { Language } from '@/lib/translations';

export interface ScoreSlice {
  today: number;
  last7Days: number;
  total: number;
}

export interface ChallengePerson {
  userId: string;
  role: 'host' | 'guest';
  displayName: string;
  avatarUrl: string | null;
  goalTitle: string;
}

export interface ChallengeEvent {
  actor: 'me' | 'opponent';
  points: number;
  createdAt: string;
}

export interface ChallengeSnapshot {
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

export interface ChallengeTabProps {
  goalId: string;
  currentPoints: number;
  targetPoints: number;
  language?: Language;
}

export interface ChallengeHistoryItem {
  challengeId: string;
  createdAt: string;
  endedAt: string;
  me: { displayName: string; avatarUrl: string | null; goalTitle: string } | null;
  opponent: { displayName: string; avatarUrl: string | null; goalTitle: string } | null;
}

export const EMPTY_SNAPSHOT: ChallengeSnapshot = {
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

export const compactCopy = {
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

export const cardClass = 'rounded-2xl border border-border/70 bg-white dark:bg-card/50 p-3 sm:p-4';
export const softCardClass = 'rounded-xl border border-border/60 bg-background/55 p-2.5 sm:p-3';
