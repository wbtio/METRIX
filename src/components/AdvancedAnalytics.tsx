'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Minus,
  Rocket,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  currentWeekPoints: number;
  lastWeekPoints: number;
  weekComparison: number;
  averagePointsPerLog: number;
  totalActiveDays: number;
  mostProductiveDay: string | null;
  bestTimeOfDay: string | null;
  projectedCompletionDate: string | null;
  onTrack: boolean;
  daysAheadOrBehind: number;
}

interface AdvancedAnalyticsProps {
  goalId: string;
  language?: Language;
}

type MomentumKey = 'rising' | 'steady' | 'neutral' | 'slowing' | 'declining';

const copy = {
  en: {
    onTrack: 'On track',
    needsAttention: 'Needs attention',
    onTrackSummary: 'The weekly pace is stable and the finish estimate is still within reach.',
    needsAttentionSummary: 'This week needs more active sessions to recover rhythm and close the gap.',
    exactlyOnTime: 'Exactly on schedule',
    aheadBy: 'Ahead by',
    behindBy: 'Behind by',
    days: 'days',
    projected: 'Projected finish',
    activeDays: 'Active days',
    weekRhythm: 'Week rhythm',
    metricsTitle: 'Quick metrics',
    thisWeek: 'This week',
    weekDelta: 'Weekly delta',
    avgSession: 'Avg/session',
    consistency: 'Consistency',
    efficiency: 'Efficiency',
    bestDay: 'Best day',
    bestTime: 'Best time',
    noDate: 'TBD',
    noBestDay: 'No standout',
    pendingTime: 'Tracking',
    dayShort: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    points: 'pts',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
  },
  ar: {
    onTrack: 'على المسار',
    needsAttention: 'يحتاج انتباه',
    onTrackSummary: 'الإيقاع الأسبوعي مستقر وتوقع الإنجاز ما زال ضمن المسار.',
    needsAttentionSummary: 'هذا الأسبوع يحتاج جلسات أكثر حتى يرجع الإيقاع ويتقلص التأخير.',
    exactlyOnTime: 'تمامًا على الموعد',
    aheadBy: 'متقدم بـ',
    behindBy: 'متأخر بـ',
    days: 'أيام',
    projected: 'توقع الإنجاز',
    activeDays: 'الأيام النشطة',
    weekRhythm: 'إيقاع الأسبوع',
    metricsTitle: 'مؤشرات سريعة',
    thisWeek: 'هذا الأسبوع',
    weekDelta: 'الفرق الأسبوعي',
    avgSession: 'متوسط الجلسة',
    consistency: 'الانتظام',
    efficiency: 'الكفاءة',
    bestDay: 'أفضل يوم',
    bestTime: 'أفضل وقت',
    noDate: 'غير محدد',
    noBestDay: 'لا يوجد يوم بارز',
    pendingTime: 'قيد التتبع',
    dayShort: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
    points: 'نقطة',
    morning: 'الصباح',
    afternoon: 'بعد الظهر',
    evening: 'المساء',
    night: 'الليل',
  },
} as const;

const panelClass =
  'rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.9),rgba(24,24,27,0.7))] dark:shadow-none sm:p-4';
const metricClass =
  'rounded-2xl border border-border/60 bg-background/75 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:bg-background/30';

function parseDate(value: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function MetricBox({
  label,
  value,
  hint,
  toneClass,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  toneClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={metricClass}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/70 dark:bg-white/[0.06]">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-2 text-sm font-black tabular-nums text-foreground sm:text-base', toneClass)}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function AdvancedAnalytics({ goalId, language = 'en' }: AdvancedAnalyticsProps) {
  const isArabic = language === 'ar';
  const text = copy[language] ?? copy.en;
  const locale = isArabic ? 'ar-IQ' : 'en-US';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
        }

        if (json.data) setData(json.data);
      } catch {
        // Keep analytics quiet when unavailable.
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [goalId]);

  const integerFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );

  const derived = useMemo(() => {
    if (!data) return null;

    const consistencyScore = Math.round((data.totalActiveDays / 7) * 100);
    const efficiency = Math.min(5, data.averagePointsPerLog / 2);
    const activeDaysPct = Math.round((data.totalActiveDays / 7) * 100);

    const momentum: MomentumKey =
      data.weekComparison > 20
        ? 'rising'
        : data.weekComparison > 0
          ? 'steady'
          : data.weekComparison === 0
            ? 'neutral'
            : data.weekComparison > -20
              ? 'slowing'
              : 'declining';

    const rhythm = text.dayShort.map((day, index) => ({
      day,
      active: index < data.totalActiveDays,
    }));

    return { consistencyScore, efficiency, activeDaysPct, momentum, rhythm };
  }, [data, text.dayShort]);

  if (loading) {
    return (
      <div className="space-y-2.5" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3 animate-pulse">
          <div className="h-4 w-28 rounded bg-muted/40" />
          <div className="mt-2 h-3 w-2/3 rounded bg-muted/30" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-16 rounded-xl bg-muted/25" />
            <div className="h-16 rounded-xl bg-muted/25" />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="h-28 rounded-2xl border border-border/70 bg-background/60 animate-pulse" />
          <div className="h-28 rounded-2xl border border-border/70 bg-background/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data || !derived) return null;

  const compUp = data.weekComparison > 0;
  const compZero = data.weekComparison === 0;
  const comparisonLabel = compZero
    ? '0%'
    : `${compUp ? '+' : ''}${integerFormatter.format(Math.round(data.weekComparison))}%`;

  const projectedDate = parseDate(data.projectedCompletionDate);
  const mostProductiveDate = parseDate(data.mostProductiveDay);

  const projectedLabel = projectedDate
    ? projectedDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : text.noDate;

  const bestDayLabel = mostProductiveDate
    ? mostProductiveDate.toLocaleDateString(locale, { weekday: 'short' })
    : text.noBestDay;

  const formatBestTime = (value: string | null) => {
    if (!value) return text.pendingTime;

    const normalized = value.toLowerCase();
    if (normalized.includes('morning')) return text.morning;
    if (normalized.includes('afternoon')) return text.afternoon;
    if (normalized.includes('evening')) return text.evening;
    if (normalized.includes('night')) return text.night;

    return value;
  };

  const scheduleText =
    data.daysAheadOrBehind === 0
      ? text.exactlyOnTime
      : data.daysAheadOrBehind > 0
        ? `${text.aheadBy} ${integerFormatter.format(Math.abs(data.daysAheadOrBehind))} ${text.days}`
        : `${text.behindBy} ${integerFormatter.format(Math.abs(data.daysAheadOrBehind))} ${text.days}`;

  const momentumConfig: Record<
    MomentumKey,
    {
      label: string;
      chipClass: string;
      Icon: typeof Rocket;
    }
  > = {
    rising: {
      label: isArabic ? 'صاعد' : 'Rising',
      chipClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
      Icon: Rocket,
    },
    steady: {
      label: isArabic ? 'ثابت' : 'Steady',
      chipClass: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
      Icon: TrendingUp,
    },
    neutral: {
      label: isArabic ? 'محايد' : 'Neutral',
      chipClass: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
      Icon: Minus,
    },
    slowing: {
      label: isArabic ? 'أبطأ' : 'Slowing',
      chipClass: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
      Icon: Activity,
    },
    declining: {
      label: isArabic ? 'متراجع' : 'Declining',
      chipClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
      Icon: TrendingDown,
    },
  };

  const statusTone = data.onTrack
    ? {
        iconWrap: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
        line: 'from-emerald-500 to-teal-400',
        accent: 'text-emerald-700 dark:text-emerald-300',
        halo: 'shadow-[0_0_0_6px_rgba(16,185,129,0.08)]',
      }
    : {
        iconWrap: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
        line: 'from-amber-500 to-orange-400',
        accent: 'text-amber-700 dark:text-amber-300',
        halo: 'shadow-[0_0_0_6px_rgba(245,158,11,0.08)]',
      };

  const statusSummary = data.onTrack ? text.onTrackSummary : text.needsAttentionSummary;
  const statusLabel = data.onTrack ? text.onTrack : text.needsAttention;
  const MomentumIcon = momentumConfig[derived.momentum].Icon;
  const progressWidth = Math.max(10, derived.activeDaysPct);
  const trendIcon = compZero ? (
    <Minus className="h-3.5 w-3.5" />
  ) : compUp ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );

  return (
    <section className="space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className={panelClass}>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/40',
                  statusTone.iconWrap,
                  statusTone.halo,
                )}
              >
                {data.onTrack ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-foreground sm:text-base">{statusLabel}</div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-black',
                      momentumConfig[derived.momentum].chipClass,
                    )}
                  >
                    <MomentumIcon className="h-3.5 w-3.5" />
                    {momentumConfig[derived.momentum].label}
                  </span>
                </div>
                <div className={cn('mt-1 text-[13px] font-black', statusTone.accent)}>{scheduleText}</div>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{statusSummary}</p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[220px]">
              <div className={metricClass}>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{text.projected}</div>
                <div className="mt-2 text-sm font-black text-foreground">{projectedLabel}</div>
              </div>
              <div className={metricClass}>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{text.activeDays}</div>
                <div className="mt-2 text-sm font-black text-foreground">
                  {integerFormatter.format(data.totalActiveDays)}/7
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{derived.activeDaysPct}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-border/60 bg-background/70 p-3 dark:bg-background/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {text.weekRhythm}
                </div>
                <div className="mt-1 text-xl font-black tabular-nums text-foreground">{derived.activeDaysPct}%</div>
              </div>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black',
                  compZero
                    ? 'border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                    : compUp
                      ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/15 bg-rose-500/10 text-rose-700 dark:text-rose-300',
                )}
              >
                {trendIcon}
                {comparisonLabel}
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border/70 dark:bg-white/10">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', statusTone.line)}
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {derived.rhythm.map((item, index) => (
                <div key={`${item.day}-${index}`} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'h-8 w-full rounded-xl border transition-colors',
                      item.active
                        ? 'border-transparent bg-foreground/[0.88] dark:bg-white/90'
                        : 'border-border/70 bg-background/80 dark:bg-white/[0.04]',
                    )}
                  />
                  <div className={cn('text-[10px] font-bold', item.active ? 'text-foreground' : 'text-muted-foreground')}>
                    {item.day}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-black text-foreground">{text.metricsTitle}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricBox
            label={text.thisWeek}
            value={integerFormatter.format(data.currentWeekPoints)}
            hint={text.points}
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <MetricBox
            label={text.weekDelta}
            value={comparisonLabel}
            toneClass={compZero ? '' : compUp ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}
            icon={compUp ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          />
          <MetricBox
            label={text.avgSession}
            value={`${decimalFormatter.format(data.averagePointsPerLog)} XP`}
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <MetricBox
            label={text.consistency}
            value={`${derived.consistencyScore}%`}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
          <MetricBox
            label={text.efficiency}
            value={`${decimalFormatter.format(derived.efficiency)}/5`}
            icon={<Flame className="h-3.5 w-3.5" />}
          />
          <MetricBox
            label={text.bestDay}
            value={bestDayLabel}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="mt-2">
          <MetricBox
            label={text.bestTime}
            value={formatBestTime(data.bestTimeOfDay)}
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        </div>
      </section>
    </section>
  );
}
