'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { type Language } from '@/lib/translations';
import { getScorableTasks, type TaskRow } from '@/lib/task-hierarchy';
import { cn } from '@/lib/utils';

interface TaskInsightsProps {
  goalId: string;
  tasks: TaskRow[];
  language?: Language;
}

interface TaskCheckinRow {
  task_id: string;
  completed_at: string | null;
  period_start: string;
}

interface TaskAggregate {
  id: string;
  label: string;
  icon: string;
  impactWeight: number;
  frequency: string;
  completionCount: number;
  totalPoints: number;
  lastCompletedAt: string | null;
  recentCount: number;
}

const copy = {
  en: {
    title: 'Task Radar',
    subtitle: 'Which tasks are carrying the goal, which ones are quiet, and where the points are really coming from.',
    loading: 'Loading task insights...',
    empty: 'Complete a few tasks and this panel will start mapping your strongest patterns.',
    champion: 'Most repeated task',
    pointsLeader: 'Highest point task',
    neglected: 'Needs attention',
    lastWin: 'Latest completion',
    recentBurst: 'Last 7 days',
    neverDone: 'Never completed yet',
    topTasks: 'Top tasks by completions',
    weeklyPulse: 'Weekly pulse',
    completions: 'completions',
    points: 'pts',
    completedTimes: 'times',
    lastDone: 'Last done',
    noDate: 'No history',
    noTask: 'No task yet',
    today: 'Today',
    yesterday: 'Yesterday',
  },
  ar: {
    title: 'رادار المهام',
    subtitle: 'يوضح شنو المهام اللي شايلة الهدف، شنو المهام الهادية، ومنين ديجي أغلب النقاط.',
    loading: 'جارِ تحميل إحصائيات المهام...',
    empty: 'أنجز كم مهمة بالبداية، وهنا راح يظهر نمط المهام الأقوى عندك.',
    champion: 'أكثر مهمة متكررة',
    pointsLeader: 'أعلى مهمة بالنقاط',
    neglected: 'تحتاج انتباه',
    lastWin: 'آخر إنجاز',
    recentBurst: 'آخر 7 أيام',
    neverDone: 'ما انعملت لحد الآن',
    topTasks: 'أقوى المهام حسب التكرار',
    weeklyPulse: 'نبض الأسبوع',
    completions: 'إنجازات',
    points: 'نقطة',
    completedTimes: 'مرات',
    lastDone: 'آخر مرة',
    noDate: 'بدون سجل',
    noTask: 'ماكو مهمة',
    today: 'اليوم',
    yesterday: 'أمس',
  },
} as const;

function formatRelativeDate(value: string | null, language: Language) {
  if (!value) return copy[language].noDate;
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startValue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday.getTime() - startValue.getTime()) / 86400000);

  if (diffDays === 0) return copy[language].today;
  if (diffDays === 1) return copy[language].yesterday;

  return date.toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
  accent: string;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-white/80 dark:bg-card/55 p-3 shadow-sm ring-1 ring-border/5">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-sm', accent)}>
          {icon}
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="line-clamp-2 text-sm font-black text-foreground">{value}</div>
      <div className="mt-2 text-[11px] font-medium text-muted-foreground">{meta}</div>
    </div>
  );
}

export default function TaskInsights({ goalId, tasks, language = 'en' }: TaskInsightsProps) {
  const supabase = createClient();
  const isArabic = language === 'ar';
  const text = copy[language];
  const [history, setHistory] = useState<TaskCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      const { data } = await supabase
        .from('task_checkins')
        .select('task_id, completed_at, period_start')
        .eq('goal_id', goalId)
        .eq('completed', true)
        .order('completed_at', { ascending: false });

      if (mounted) {
        setHistory((data as TaskCheckinRow[]) || []);
        setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [goalId, supabase]);

  const analytics = useMemo(() => {
    const scorableTasks = getScorableTasks(tasks);
    const taskMap = new Map(
      tasks.map((task) => [
        task.id,
        {
          label: task.task_description,
          icon: task.icon || (task.task_type === 'sub' ? '🔹' : '🧭'),
          impactWeight: Number(task.impact_weight) || 1,
          frequency: task.frequency || 'daily',
        },
      ]),
    );

    const baseAggregates = new Map<string, TaskAggregate>();
    for (const task of scorableTasks) {
      const source = taskMap.get(task.id);
      baseAggregates.set(task.id, {
        id: task.id,
        label: source?.label || task.task_description,
        icon: source?.icon || '✨',
        impactWeight: Number(task.impact_weight) || source?.impactWeight || 1,
        frequency: task.frequency,
        completionCount: 0,
        totalPoints: 0,
        lastCompletedAt: null,
        recentCount: 0,
      });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 6 * 86400000);
    const pulseDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getTime() - (6 - index) * 86400000);
      const key = date.toISOString().split('T')[0];
      return {
        key,
        label: date.toLocaleDateString(isArabic ? 'ar-IQ' : 'en-US', { weekday: 'short' }),
        total: 0,
      };
    });
    const pulseMap = new Map(pulseDays.map((day) => [day.key, day]));

    for (const row of history) {
      const aggregate = baseAggregates.get(row.task_id);
      if (!aggregate) continue;

      const stamp = row.completed_at || `${row.period_start}T00:00:00.000Z`;
      const completedDate = new Date(stamp);
      aggregate.completionCount += 1;
      aggregate.totalPoints += aggregate.impactWeight;

      if (!aggregate.lastCompletedAt || stamp > aggregate.lastCompletedAt) {
        aggregate.lastCompletedAt = stamp;
      }

      if (completedDate >= weekAgo) {
        aggregate.recentCount += 1;
      }

      const pulseKey = completedDate.toISOString().split('T')[0];
      if (pulseMap.has(pulseKey)) {
        pulseMap.get(pulseKey)!.total += 1;
      }
    }

    const aggregates = Array.from(baseAggregates.values());
    const completedTasks = aggregates.filter((item) => item.completionCount > 0);
    const champion = [...completedTasks].sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)[0] || null;
    const pointsLeader = [...completedTasks].sort((a, b) => b.totalPoints - a.totalPoints || b.completionCount - a.completionCount)[0] || null;
    const recentBurst = [...completedTasks].sort((a, b) => b.recentCount - a.recentCount || b.completionCount - a.completionCount)[0] || null;
    const lastWin = [...completedTasks].sort((a, b) => (b.lastCompletedAt || '').localeCompare(a.lastCompletedAt || ''))[0] || null;
    const neglected = [...aggregates]
      .filter((item) => item.completionCount === 0)
      .sort((a, b) => b.impactWeight - a.impactWeight)[0] || null;

    const topTasks = [...completedTasks]
      .sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)
      .slice(0, 5)
      .map((item) => ({
        name: item.label.length > 18 ? `${item.label.slice(0, 18)}…` : item.label,
        fullName: item.label,
        completions: item.completionCount,
        points: item.totalPoints,
      }));

    return {
      aggregates,
      champion,
      pointsLeader,
      recentBurst,
      lastWin,
      neglected,
      topTasks,
      pulseDays,
      totalCompleted: completedTasks.reduce((sum, item) => sum + item.completionCount, 0),
    };
  }, [history, isArabic, tasks]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-border/80 bg-card/30 p-4 text-sm text-muted-foreground">
        {text.loading}
      </div>
    );
  }

  if (!analytics.aggregates.length || analytics.totalCompleted === 0) {
    return (
      <div
        className="rounded-[28px] border border-dashed border-border/80 bg-card/20 p-5"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-foreground">{text.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{text.empty}</p>
          </div>
        </div>
      </div>
    );
  }

  const heroTask = analytics.champion || analytics.pointsLeader || analytics.lastWin;

  return (
    <section className="space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-4 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%),linear-gradient(135deg,rgba(24,24,27,0.9),rgba(24,24,27,0.72))]">
        <div className="absolute inset-y-0 end-0 w-40 bg-[radial-gradient(circle,rgba(250,204,21,0.12),transparent_65%)] pointer-events-none" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {text.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text.subtitle}</p>
          </div>

          {heroTask && (
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-card/65">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">
                  <span>{heroTask.icon}</span>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {text.champion}
                  </div>
                  <div className="mt-1 text-sm font-black text-foreground">{heroTask.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {heroTask.completionCount} {text.completedTimes} • {heroTask.totalPoints} {text.points}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label={text.champion}
          value={analytics.champion ? `${analytics.champion.icon} ${analytics.champion.label}` : text.noTask}
          meta={analytics.champion ? `${analytics.champion.completionCount} ${text.completedTimes}` : text.noDate}
          accent="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label={text.pointsLeader}
          value={analytics.pointsLeader ? `${analytics.pointsLeader.icon} ${analytics.pointsLeader.label}` : text.noTask}
          meta={analytics.pointsLeader ? `${analytics.pointsLeader.totalPoints} ${text.points}` : text.noDate}
          accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
        />
        <StatCard
          icon={<Swords className="h-4 w-4" />}
          label={text.recentBurst}
          value={analytics.recentBurst ? `${analytics.recentBurst.icon} ${analytics.recentBurst.label}` : text.noTask}
          meta={analytics.recentBurst ? `${analytics.recentBurst.recentCount} ${text.completions}` : text.noDate}
          accent="bg-gradient-to-br from-sky-500 to-cyan-500"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={text.neglected}
          value={analytics.neglected ? `${analytics.neglected.icon} ${analytics.neglected.label}` : text.noTask}
          meta={analytics.neglected ? text.neverDone : text.noDate}
          accent="bg-gradient-to-br from-rose-500 to-pink-500"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[26px] border border-border/80 bg-white/80 p-4 shadow-sm ring-1 ring-border/5 dark:bg-card/55">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-foreground">{text.topTasks}</h3>
              <p className="text-xs text-muted-foreground">{analytics.totalCompleted} {text.completions}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topTasks} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={58}
                  className="text-[11px] fill-muted-foreground"
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-[11px] fill-muted-foreground" />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as {
                      fullName?: string;
                      name?: string;
                      completions?: number;
                      points?: number;
                    };
                    return (
                      <div className="rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
                        <div className="text-xs font-black text-foreground">{item.fullName || item.name}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {item.completions || 0} {text.completedTimes} • {item.points || 0} {text.points}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="completions" radius={[10, 10, 0, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[26px] border border-border/80 bg-white/80 p-4 shadow-sm ring-1 ring-border/5 dark:bg-card/55">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-foreground">{text.weeklyPulse}</h3>
              <p className="text-xs text-muted-foreground">{text.lastWin}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-chart-5/10 text-chart-5 dark:bg-chart-3/10 dark:text-chart-3">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {analytics.pulseDays.map((day) => (
              <div key={day.key} className="rounded-2xl border border-border/60 bg-muted/20 p-2 text-center">
                <div className="text-[10px] font-bold text-muted-foreground">{day.label}</div>
                <div
                  className={cn(
                    'mx-auto my-2 h-16 w-full rounded-xl transition-all',
                    day.total > 0
                      ? day.total >= 3
                        ? 'bg-gradient-to-t from-primary to-chart-1 shadow-[0_8px_20px_rgba(59,130,246,0.18)]'
                        : 'bg-gradient-to-t from-primary/40 to-primary/80'
                      : 'bg-muted/40'
                  )}
                  style={{ opacity: day.total > 0 ? Math.min(1, 0.35 + day.total * 0.22) : 1 }}
                />
                <div className="text-xs font-black text-foreground">{day.total}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {text.lastWin}
                </div>
                <div className="mt-1 text-sm font-black text-foreground">
                  {analytics.lastWin ? `${analytics.lastWin.icon} ${analytics.lastWin.label}` : text.noTask}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-muted-foreground">{text.lastDone}</div>
                <div className="text-sm font-black text-foreground">
                  {formatRelativeDate(analytics.lastWin?.lastCompletedAt || null, language)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
