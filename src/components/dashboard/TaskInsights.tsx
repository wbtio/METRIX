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

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'}>
      <Dialog
        open={taskNameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setTaskNameDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start text-base font-semibold leading-snug sm:text-lg">
              {taskNameDialog}
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-white/80 p-1.5 shadow-sm ring-1 ring-border/5 dark:bg-card/45">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {analytics.topTasks.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                title={item.fullName}
                onClick={() => setTaskNameDialog(item.fullName)}
                className={cn(
                  'flex min-w-0 cursor-pointer items-center justify-between gap-1 rounded-lg border px-1 py-1 text-start transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  item.accent.softClass,
                  item.accent.borderClass,
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/70 text-sm shadow-sm">
                  {item.icon}
                </span>
                <span
                  className="min-w-[2.5rem] rounded-md bg-background/80 px-1.5 py-0.5 text-center text-xs font-black leading-none text-foreground shadow-sm tabular-nums"
                  dir="ltr"
                >
                  {formatNumberEn(item.completions)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
