'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { type Language } from '@/lib/translations';
import { parseDailyLogBreakdown } from '@/lib/daily-log-feedback';
import { getScorableTasks, type TaskRow } from '@/lib/task-hierarchy';
import { getTaskAccent } from '@/lib/task-colors';
import { cn, formatNumberEn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getLocalDateKey } from '@/lib/task-periods';

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

const copy = {
  en: {
    title: 'Task Radar',
    loading: 'Loading task insights...',
    empty: 'Complete a few tasks and this panel will start mapping your strongest patterns.',
  },
  ar: {
    title: 'رادار المهام',
    loading: 'جارِ تحميل إحصائيات المهام...',
    empty: 'أنجز كم مهمة بالبداية، وهنا راح يظهر نمط المهام الأقوى عندك.',
  },
} as const;

export default function TaskInsights({ goalId, tasks, language = 'en' }: TaskInsightsProps) {
  const supabase = useMemo(() => createClient(), []);
  const isArabic = language === 'ar';
  const text = copy[language];
  const [history, setHistory] = useState<TaskCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskNameDialog, setTaskNameDialog] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    return getLocalDateKey();
  }, []);

  const completedTodayTasks = useMemo(() => {
    return tasks.filter((task) =>
      history.some((h) => h.task_id === task.id && h.period_start === todayStr)
    );
  }, [tasks, history, todayStr]);

  const dailyTasks = useMemo(() => tasks.filter((t) => t.frequency === 'daily'), [tasks]);

  const currentHour = useMemo(() => new Date().getHours(), []);
  const isEndOfDay = currentHour >= 17; // After 5:00 PM

  const getSummaryTextAr = () => {
    const header = isEndOfDay ? '📝 حصاد نهاية اليوم' : '☀️ ملخص المهام اليومية';
    if (completedTodayTasks.length === 0) {
      return {
        header,
        body: `لم تقم بإكمال أي مهام اليوم بعد. لا يزال لديك المتسع من الوقت لإنجاز مهامك اليومية والمحافظة على تقدمك المستمر!`,
      };
    }

    const taskNames = completedTodayTasks.map((t) => `«${t.task_description}»`).join('، ');
    const totalDaily = dailyTasks.length;
    const completedDaily = dailyTasks.filter((t) => completedTodayTasks.some((ct) => ct.id === t.id)).length;

    return {
      header,
      body: `أنت تسير بقوة! لقد أنجزت اليوم ${completedTodayTasks.length} مهمة بنجاح (منها ${completedDaily} من أصل ${totalDaily} من مهامك اليومية المكررة). المهام التي تم إكمالها اليوم هي: ${taskNames}. استمر في هذا العطاء والالتزام الرائع!`,
    };
  };

  const getSummaryTextEn = () => {
    const header = isEndOfDay ? '📝 End of Day Summary' : '☀️ Daily Task Summary';
    if (completedTodayTasks.length === 0) {
      return {
        header,
        body: `You haven't completed any tasks today yet. There is still time to check off your tasks and keep your streak going!`,
      };
    }

    const taskNames = completedTodayTasks.map((t) => `"${t.task_description}"`).join(', ');
    const totalDaily = dailyTasks.length;
    const completedDaily = dailyTasks.filter((t) => completedTodayTasks.some((ct) => ct.id === t.id)).length;

    return {
      header,
      body: `You're crushing it! Today you successfully completed ${completedTodayTasks.length} tasks (including ${completedDaily} out of ${totalDaily} daily recurring tasks). The tasks checked off today: ${taskNames}. Keep up this excellent momentum!`,
    };
  };

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

    for (const row of history) {
      const aggregate = baseAggregates.get(row.task_id);
      if (!aggregate) continue;

      const stamp = row.completed_at || `${row.period_start}T00:00:00.000Z`;
      aggregate.completionCount += 1;
      aggregate.totalPoints += row.points ?? aggregate.impactWeight;

      if (!aggregate.lastCompletedAt || stamp > aggregate.lastCompletedAt) {
        aggregate.lastCompletedAt = stamp;
      }
    }

    const aggregates = Array.from(baseAggregates.values());
    const completedTasks = aggregates.filter((item) => item.completionCount > 0);

    const topTasks = [...completedTasks]
      .sort((a, b) => b.completionCount - a.completionCount || b.totalPoints - a.totalPoints)
      .slice(0, 6)
      .map((item) => {
        const source = taskMap.get(item.id);
        const accentSeed = source?.parentTaskId || item.id;
        const mainTaskMeta = source?.parentTaskId
          ? mainTaskMap.get(source.parentTaskId) || null
          : mainTaskMap.get(item.id) || null;
        const accentColor = source?.parentTaskId
          ? mainTaskMeta?.accentColor || source?.accentColor || null
          : source?.accentColor || mainTaskMeta?.accentColor || null;

        return {
          id: item.id,
          fullName: item.label,
          icon: item.icon,
          completions: item.completionCount,
          accent: getTaskAccent(accentSeed, accentColor),
        };
      });

    return {
      aggregates,
      topTasks,
      totalCompleted: completedTasks.reduce((sum, item) => sum + item.completionCount, 0),
    };
  }, [history, tasks]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-3 shadow-sm dark:bg-card/45">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-border/30 bg-muted/20 px-2.5 py-2.5"
            >
              <div className="h-6 w-6 shrink-0 rounded-lg bg-muted/50 animate-pulse" />
              <div className="h-5 w-10 rounded-lg bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics.aggregates.length || analytics.totalCompleted === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/50 bg-muted/[0.03] p-6"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/70 ring-1 ring-border/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-foreground">{text.title}</div>
            <p className="mt-1.5 text-sm text-muted-foreground/80 leading-relaxed">{text.empty}</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = isArabic ? getSummaryTextAr() : getSummaryTextEn();

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-3">
      <Dialog
        open={taskNameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setTaskNameDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start text-base font-bold leading-snug sm:text-lg">
              {taskNameDialog}
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Daily Progress Box Card (Only displays at the end of the day, after 5 PM) */}
      {isEndOfDay && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm dark:bg-card/45">
          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-extrabold text-foreground flex items-center gap-1.5">
              {summary.header}
            </div>
            <p className="text-sm text-muted-foreground/95 leading-relaxed font-medium">
              {summary.body}
            </p>
          </div>
        </div>
      )}

      {/* Top Tasks Grid Container */}
      <style>{`
        /* Color registrations for task accent roles */
        .metrix-task-card[data-color="sky"] { --c-brand: #0ea5e9; }
        .metrix-task-card[data-color="emerald"] { --c-brand: #10b981; }
        .metrix-task-card[data-color="amber"] { --c-brand: #f59e0b; }
        .metrix-task-card[data-color="orange"] { --c-brand: #f97316; }
        .metrix-task-card[data-color="pink"] { --c-brand: #ec4899; }
        .metrix-task-card[data-color="violet"] { --c-brand: #8b5cf6; }
        .metrix-task-card[data-color="cyan"] { --c-brand: #06b6d4; }
        .metrix-task-card[data-color="blue"] { --c-brand: #3b82f6; }
        .metrix-task-card[data-color="indigo"] { --c-brand: #6366f1; }
        .metrix-task-card[data-color="fuchsia"] { --c-brand: #d946ef; }
        .metrix-task-card[data-color="rose"] { --c-brand: #f43f5e; }
        .metrix-task-card[data-color="lime"] { --c-brand: #84cc16; }
        .metrix-task-card[data-color="teal"] { --c-brand: #14b8a6; }
        .metrix-task-card[data-color="zinc"] { --c-brand: #71717a; }

        .metrix-tasks-container {
          background-color: color-mix(in oklab, var(--primary) 0.5%, var(--card)) !important;
          border: 1px solid var(--border) !important;
          border-radius: 16px !important;
          padding: 12px !important;
        }

        .metrix-task-card {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 8px !important;
          padding: 8px 10px !important;
          border-radius: 12px !important;
          background-color: color-mix(in oklab, var(--c-brand) 3%, transparent) !important;
          border: 1px solid color-mix(in oklab, var(--c-brand) 10%, var(--border)) !important;
          transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
        }

        .metrix-task-card:hover {
          border-color: color-mix(in oklab, var(--c-brand) 50%, transparent) !important;
          background-color: color-mix(in oklab, var(--c-brand) 100%, var(--background)) !important;
          transform: translateY(-1px) scale(1.02) !important;
          box-shadow: 0 4px 12px -3px color-mix(in oklab, var(--c-brand) 15%, transparent) !important;
        }

        .metrix-task-card:hover * {
          color: var(--background) !important;
        }

        .metrix-task-icon {
          font-size: 1.15rem !important;
        }

        .metrix-task-badge {
          font-size: 11px !important;
          font-weight: 800 !important;
          padding: 3px 6px !important;
          border-radius: 6px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02) !important;
          transition: all 0.2s ease !important;
          background-color: color-mix(in oklab, var(--c-brand) 12%, var(--background)) !important;
          color: color-mix(in oklab, var(--c-brand) 80%, var(--foreground)) !important;
        }
      `}</style>

      <div className="metrix-tasks-container relative overflow-hidden transition-all duration-300">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 transition-all duration-300">
          {analytics.topTasks.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.fullName}
              data-color={item.accent.key}
              onClick={() => setTaskNameDialog(item.fullName)}
              className="metrix-task-card group relative flex min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="metrix-task-icon shrink-0">
                {item.icon}
              </span>

              <span className="metrix-task-badge shrink-0 tabular-nums" dir="ltr">
                <span className="text-[10px] font-bold transition-colors">×</span>
                {formatNumberEn(item.completions)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
