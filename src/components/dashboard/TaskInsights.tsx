'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type Language } from '@/lib/translations';
import { parseDailyLogBreakdown } from '@/lib/daily-log-feedback';
import { getScorableTasks, type TaskRow } from '@/lib/task-hierarchy';
import { getTaskAccent, type TaskAccent } from '@/lib/task-colors';
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
  points?: number;
}

interface DailyLogRow {
  created_at: string;
  breakdown: unknown;
}

interface BreakdownRow {
  task_id: string;
  points?: number;
  status?: string;
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

interface TopTaskDatum {
  id: string;
  rankLabel: string;
  fullName: string;
  icon: string;
  completions: number;
  points: number;
  mainTaskLabel: string | null;
  accent: TaskAccent;
}

const copy = {
        en: {
          title: 'Task Radar',
          loading: 'Loading task insights...',
          empty: 'Complete a few tasks and this panel will start mapping your strongest patterns.',
          topTasks: 'Top tasks by completions',
          weeklyPulse: 'Weekly Summary',
          activeDays: 'active days',
          chartHint: 'Tap a task to view details.',
          completions: 'completions',
          points: 'pts',
          last7Days: 'last 7 days',
          completedTimes: 'times',
          rank: 'Rank',
          mainTask: 'Main task',
          dialogHint: 'The bar color follows the same main-task lane shown in the tasks tab.',
        },
  ar: {
    title: 'رادار المهام',
    loading: 'جارِ تحميل إحصائيات المهام...',
    empty: 'أنجز كم مهمة بالبداية، وهنا راح يظهر نمط المهام الأقوى عندك.',
    topTasks: 'أقوى المهام حسب التكرار',
    weeklyPulse: 'نشاط الأسبوع',
    activeDays: 'أيام نشطة',
    chartHint: 'اضغط على أي مهمة لعرض التفاصيل.',
    completions: 'إنجازات',
    points: 'نقطة',
    last7Days: 'آخر 7 أيام',
    completedTimes: 'مرات',
    rank: 'الترتيب',
    mainTask: 'المهمة الرئيسية',
    dialogHint: 'لون العمود يطابق نفس مسار المهمة الرئيسية الظاهر في تبويب المهام.',
  },
} as const;

export default function TaskInsights({ goalId, tasks, language = 'en' }: TaskInsightsProps) {
  const supabase = createClient();
  const isArabic = language === 'ar';
  const text = copy[language];
  const [history, setHistory] = useState<TaskCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TopTaskDatum | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      const [{ data: checkinData }, { data: logData }] = await Promise.all([
        supabase
          .from('task_checkins')
          .select('task_id, completed_at, period_start')
          .eq('goal_id', goalId)
          .eq('completed', true)
          .order('completed_at', { ascending: false }),
        supabase
          .from('daily_logs')
          .select('created_at, breakdown')
          .eq('goal_id', goalId)
          .not('breakdown', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      const mergedHistory = new Map<string, TaskCheckinRow>();

      for (const row of ((checkinData as TaskCheckinRow[] | null) || [])) {
        const stamp = row.completed_at || `${row.period_start}T00:00:00.000Z`;
        const key = `${row.task_id}:${row.period_start}:${stamp}`;
        mergedHistory.set(key, row);
      }

      for (const log of ((logData as DailyLogRow[] | null) || [])) {
        const periodStart = log.created_at?.split('T')[0];
        if (!periodStart) continue;

        for (const item of parseDailyLogBreakdown(log.breakdown).items.map((entry) => ({
          task_id: entry.task_id,
          points: Number(entry.points) || 0,
          status: entry.status,
        } satisfies BreakdownRow))) {
          const hasProgress = (item.points || 0) > 0 || item.status === 'done' || item.status === 'partial';
          if (!hasProgress) continue;

          const key = `${item.task_id}:${periodStart}:${log.created_at}`;
          const existing = mergedHistory.get(key);
          if (existing && (existing.points || 0) >= (item.points || 0)) continue;

          mergedHistory.set(key, {
            task_id: item.task_id,
            completed_at: log.created_at,
            period_start: periodStart,
            points: item.points || 0,
          });
        }
      }

      if (mounted) {
        setHistory(
          Array.from(mergedHistory.values()).sort(
            (a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''),
          ),
        );
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
    const mainTaskMap = new Map(
      tasks
        .filter((task) => task.task_type !== 'sub')
        .map((task) => [
          task.id,
          {
            label: task.task_description,
            accentColor: task.accent_color || null,
          },
        ]),
    );
    const taskMap = new Map(
      tasks.map((task) => [
        task.id,
        {
          label: task.task_description,
          icon: task.icon || (task.task_type === 'sub' ? '🔹' : '🧭'),
          impactWeight: Number(task.impact_weight) || 1,
          frequency: task.frequency || 'daily',
          parentTaskId: task.parent_task_id || null,
          accentColor: task.accent_color || null,
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
      aggregate.totalPoints += row.points ?? aggregate.impactWeight;

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
    const topTasks = [...completedTasks]
      .sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)
      .slice(0, 6)
      .map((item, index) => {
        const source = taskMap.get(item.id);
        const accentSeed = source?.parentTaskId || item.id;
        const mainTaskMeta = source?.parentTaskId
          ? mainTaskMap.get(source.parentTaskId) || null
          : mainTaskMap.get(item.id) || null;
        const mainTaskLabel = source?.parentTaskId
          ? mainTaskMeta?.label || null
          : mainTaskMeta?.label || null;
        const accentColor = source?.parentTaskId
          ? mainTaskMeta?.accentColor || source?.accentColor || null
          : source?.accentColor || mainTaskMeta?.accentColor || null;

        return {
          id: item.id,
          rankLabel: `#${new Intl.NumberFormat(isArabic ? 'ar-IQ' : 'en-US').format(index + 1)}`,
          fullName: item.label,
          icon: item.icon,
          completions: item.completionCount,
          points: item.totalPoints,
          mainTaskLabel,
          accent: getTaskAccent(accentSeed, accentColor),
        };
      });

    return {
      aggregates,
      topTasks,
      pulseDays,
      activeDays: pulseDays.filter((day) => day.total > 0).length,
      totalPoints: completedTasks.reduce((sum, item) => sum + item.totalPoints, 0),
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

  const pulsePeak = analytics.pulseDays.reduce((peak, day) => Math.max(peak, day.total), 0) || 1;
  const highlightedTaskId = selectedTask?.id ?? analytics.topTasks[0]?.id ?? null;
  const topTaskPeak = analytics.topTasks.reduce((peak, item) => Math.max(peak, item.completions), 0) || 1;

  return (
    <section className="space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="grid gap-3 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-border/80 bg-white/85 p-4 shadow-sm ring-1 ring-border/5 dark:bg-card/55">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-chart-5/10 blur-3xl dark:bg-chart-3/10" />

          <div className="relative mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-foreground">{text.weeklyPulse}</h3>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-chart-5/15 px-1.5 text-[10px] font-black text-chart-5 dark:bg-chart-3/15 dark:text-chart-3">
                {analytics.activeDays}/7
              </span>
            </div>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-chart-5 dark:text-chart-3" />
          </div>

          <div className="relative mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 backdrop-blur-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{text.completions}</div>
              <div className="mt-0.5 text-base font-black text-foreground">{analytics.totalCompleted}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 backdrop-blur-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{text.activeDays}</div>
              <div className="mt-0.5 text-base font-black text-foreground">{analytics.activeDays}</div>
            </div>
            <div className="col-span-2 rounded-2xl border border-border/60 bg-background/75 px-3 py-2 backdrop-blur-sm sm:col-span-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{text.points}</div>
              <div className="mt-0.5 text-base font-black text-foreground">
                {analytics.totalPoints}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {analytics.pulseDays.map((day) => (
              <div
                key={day.key}
                className="rounded-[18px] border border-border/60 bg-background/75 px-3 py-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-bold text-muted-foreground">{day.label}</div>
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full border border-border/60 bg-background text-[11px] font-black text-foreground">
                    {day.total}
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted/45">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      day.total > 0
                        ? day.total >= 3
                          ? 'bg-gradient-to-r from-primary to-chart-1 shadow-[0_6px_18px_rgba(59,130,246,0.18)]'
                          : 'bg-primary/75'
                        : 'bg-transparent'
                    )}
                    style={{
                      width: day.total > 0 ? `${Math.max(14, (day.total / pulsePeak) * 100)}%` : '0%',
                      opacity: day.total > 0 ? Math.min(1, 0.4 + day.total * 0.18) : 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-border/80 bg-white/85 p-4 shadow-sm ring-1 ring-border/5 dark:bg-card/55">
          <div className="pointer-events-none absolute -top-8 right-6 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-black text-foreground">{text.topTasks}</h3>
            <Activity className="h-4 w-4 shrink-0 text-primary" />
          </div>

          <div className="grid min-h-[11.25rem] grid-cols-2 grid-rows-3 gap-2">
            {analytics.topTasks.map((item) => {
              const isActive = highlightedTaskId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTask(item)}
                  className={cn(
                    'flex min-h-[5.25rem] flex-col justify-between rounded-[22px] border px-3 py-2.5 text-start transition-all',
                    isActive
                      ? cn(item.accent.softClass, item.accent.borderClass, 'shadow-sm')
                      : 'border-border/60 bg-background/65 hover:bg-background/80',
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            'inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black',
                            isActive
                              ? cn(item.accent.softClass, item.accent.borderClass, item.accent.textClass)
                              : 'border-border/60 bg-background text-muted-foreground',
                          )}
                        >
                          {item.rankLabel}
                        </span>

                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-sm',
                            isActive
                              ? cn(item.accent.softClass, item.accent.borderClass)
                              : 'border-border/60 bg-background/80',
                          )}
                        >
                          {item.icon}
                        </span>

                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[13px] font-black leading-4.5 text-foreground">
                            {item.fullName}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="shrink-0">{item.points} {text.points}</span>
                            {item.mainTaskLabel ? (
                              <span className="truncate">{item.mainTaskLabel}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-end">
                      <div className="text-base font-black text-foreground">{item.completions}</div>
                      <div className="text-[10px] font-bold text-muted-foreground">{text.completedTimes}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/45">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(16, (item.completions / topTaskPeak) * 100)}%`,
                          backgroundColor: item.accent.fill,
                          opacity: isActive ? 1 : 0.82,
                        }}
                      />
                    </div>
                    <div className="text-[10px] font-black text-muted-foreground">{item.rankLabel}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[420px]" dir={isArabic ? 'rtl' : 'ltr'}>
          {selectedTask ? (
            <>
              <DialogHeader className={isArabic ? 'sm:text-right' : undefined}>
                <div
                  className={cn(
                    'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black',
                    selectedTask.accent.softClass,
                    selectedTask.accent.borderClass,
                    selectedTask.accent.textClass,
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full', selectedTask.accent.swatchClass)} />
                  {text.rank} {selectedTask.rankLabel}
                </div>
                <DialogTitle className="mt-3 flex items-start gap-3 text-base">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg',
                      selectedTask.accent.softClass,
                      selectedTask.accent.borderClass,
                    )}
                  >
                    {selectedTask.icon}
                  </span>
                  <span className="pt-1">{selectedTask.fullName}</span>
                </DialogTitle>
                <DialogDescription className="pt-1 text-xs leading-5">
                  {text.dialogHint}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/10 px-3 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {text.completions}
                  </div>
                  <div className="mt-1 text-lg font-black text-foreground">{selectedTask.completions}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/10 px-3 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {text.points}
                  </div>
                  <div className="mt-1 text-lg font-black text-foreground">{selectedTask.points}</div>
                </div>
              </div>

              {selectedTask.mainTaskLabel ? (
                <div
                  className={cn(
                    'rounded-2xl border px-3 py-3',
                    selectedTask.accent.softClass,
                    selectedTask.accent.borderClass,
                  )}
                >
                  <div className={cn('text-[10px] font-black uppercase tracking-[0.18em]', selectedTask.accent.textClass)}>
                    {text.mainTask}
                  </div>
                  <div className="mt-1 text-sm font-black text-foreground">{selectedTask.mainTaskLabel}</div>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
