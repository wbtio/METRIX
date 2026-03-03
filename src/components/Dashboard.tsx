'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Weight,
  Flame,
  BarChart3,
  ListTodo,
  Swords,
  History,
  PieChart,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { getPeriodStart, getPeriodTypeFromFrequency } from '@/lib/task-periods';
import { buildTaskHierarchy, type MainTask, type TaskRow } from '@/lib/task-hierarchy';
import DailyLogModal from './DailyLogModal';
import GrowthChart from './GrowthChart';
import ActivityHistory from './ActivityHistory';
import ChallengeTab from './ChallengeTab';
import WeeklySummaryCard from './WeeklySummaryCard';
import AdvancedAnalytics from './AdvancedAnalytics';
import ConfirmModal from './ConfirmModal';
import FullEmojiPicker from './FullEmojiPicker';
import { getGoalIcon, GoalIconPicker } from './IconPicker';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date: string;
  total_days: number;
  ai_summary: string;
  icon?: string;
  is_pinned?: boolean;
}

interface TaskCheckin {
  id: string;
  goal_id: string;
  task_id: string;
  period_type: string;
  period_start: string;
  completed: boolean;
  completed_at: string | null;
}

interface DashboardProps {
  goal: Goal;
  language?: Language;
  onGoalUpdated?: () => void;
}

type DashboardTab = 'focus' | 'chart' | 'analytics' | 'challenge' | 'history';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard({ goal, language = 'en', onGoalUpdated }: DashboardProps) {
  const supabase = createClient();
  const t = translations[language];
  const isArabic = language === 'ar';

  // --- State ---
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [checkins, setCheckins] = useState<TaskCheckin[]>([]);
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set<string>());
  const [activeTab, setActiveTab] = useState<DashboardTab>('focus');
  const [showLogModal, setShowLogModal] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'daily' | 'weekly'>('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // CRUD inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState('');
  const [newSubFreq, setNewSubFreq] = useState<'daily' | 'weekly'>('daily');
  const [newSubWeight, setNewSubWeight] = useState(3);
  const [addingMain, setAddingMain] = useState(false);
  const [newMainText, setNewMainText] = useState('');
  const [newMainFreq, setNewMainFreq] = useState<'daily' | 'weekly'>('weekly');
  const [newMainWeight, setNewMainWeight] = useState(6);

  // Modals & UI State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [showDetailsFor, setShowDetailsFor] = useState<string | null>(null);

  // --- Derived ---
  const hierarchy: MainTask[] = useMemo(() => buildTaskHierarchy(tasks), [tasks]);

  const progress = goal.target_points > 0
    ? Math.min(100, Math.round((goal.current_points / goal.target_points) * 100))
    : 0;

  // Streak calculation
  const [streak, setStreak] = useState(0);

  // Data for child components
  const [chartData, setChartData] = useState<{ date: string; points: number }[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // --- Data Fetch ---
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from('sub_layers')
      .select('*')
      .eq('goal_id', goal.id)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTasks(data.map((row: any) => ({
        id: row.id,
        goal_id: row.goal_id,
        task_description: row.task_description,
        impact_weight: row.impact_weight,
        frequency: row.frequency,
        time_required_minutes: row.time_required_minutes,
        completion_criteria: row.completion_criteria,
        task_type: row.task_type || 'main',
        parent_task_id: row.parent_task_id || null,
        sort_order: row.sort_order || 0,
        icon: row.icon || null,
      })));
      // DO NOT auto-expand mains initially (User request)
      // setExpandedMains(new Set()); 
    }
    setLoadingTasks(false);
  }, [goal.id, supabase]);

  const fetchCheckins = useCallback(async () => {
    // Fetch current-period checkins for all tasks of this goal
    const todayKey = getPeriodStart('daily');
    const weekKey = getPeriodStart('weekly');

    const { data, error } = await supabase
      .from('task_checkins')
      .select('*')
      .eq('goal_id', goal.id)
      .in('period_start', [todayKey, weekKey]);

    if (!error && data) {
      setCheckins(data);
    }
  }, [goal.id, supabase]);

  const fetchStreak = useCallback(async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('created_at')
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: false })
      .limit(60);

    if (data && data.length > 0) {
      let count = 0;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasLog = data.some((log: any) => log.created_at?.startsWith(dateStr));
        if (hasLog) {
          count++;
        } else if (i > 0) {
          break;
        }
      }
      setStreak(count);
    }
  }, [goal.id, supabase]);

  const fetchChartData = useCallback(async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('created_at, ai_score')
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: true });

    if (data) {
      const grouped = new Map<string, number>();
      for (const log of data) {
        const dateKey = log.created_at?.split('T')[0] || '';
        grouped.set(dateKey, (grouped.get(dateKey) || 0) + (log.ai_score || 0));
      }
      setChartData(Array.from(grouped.entries()).map(([date, points]) => ({ date, points })));
    }
  }, [goal.id, supabase]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('id, created_at, user_input, ai_score, ai_feedback')
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: false });

    if (data) setLogs(data);
  }, [goal.id, supabase]);

  useEffect(() => {
    fetchTasks();
    fetchCheckins();
    fetchStreak();
    fetchChartData();
    fetchLogs();
  }, [fetchTasks, fetchCheckins, fetchStreak, fetchChartData, fetchLogs]);

  // --- Check-in Toggle ---
  const toggleCheckin = async (taskId: string, frequency: string) => {
    const periodType = getPeriodTypeFromFrequency(frequency);
    const periodStart = getPeriodStart(frequency);

    const existing = checkins.find(
      (c) => c.task_id === taskId && c.period_type === periodType && c.period_start === periodStart,
    );

    if (existing) {
      if (existing.completed) {
        // Uncheck
        await supabase.from('task_checkins').delete().eq('id', existing.id);
        setCheckins((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        // Mark complete
        await supabase
          .from('task_checkins')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        setCheckins((prev) =>
          prev.map((c) => (c.id === existing.id ? { ...c, completed: true, completed_at: new Date().toISOString() } : c)),
        );
        showSuccessToast(isArabic ? '✓ تم إنجاز المهمة' : '✓ Task completed');
      }
    } else {
      // Create new checkin
      const { data } = await supabase
        .from('task_checkins')
        .insert({
          goal_id: goal.id,
          task_id: taskId,
          period_type: periodType,
          period_start: periodStart,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (data) {
        setCheckins((prev) => [...prev, data]);
        showSuccessToast(isArabic ? '✓ تم إنجاز المهمة' : '✓ Task completed');
      }
    }
  };

  const isChecked = (taskId: string, frequency: string): boolean => {
    const periodType = getPeriodTypeFromFrequency(frequency);
    const periodStart = getPeriodStart(frequency);
    return checkins.some(
      (c) => c.task_id === taskId && c.period_type === periodType && c.period_start === periodStart && c.completed,
    );
  };

  // --- CRUD ---
  const handleAddMain = async () => {
    if (!newMainText.trim()) return;
    const maxSort = tasks.filter((t) => t.task_type === 'main').length;
    const { data, error } = await supabase
      .from('sub_layers')
      .insert({
        goal_id: goal.id,
        task_description: newMainText.trim(),
        frequency: newMainFreq,
        impact_weight: Math.max(1, Math.min(10, newMainWeight)),
        task_type: 'main',
        parent_task_id: null,
        sort_order: maxSort,
        time_required_minutes: 0,
        completion_criteria: null,
      })
      .select()
      .single();

    if (!error && data) {
      await fetchTasks();
      setNewMainText('');
      setNewMainWeight(6);
      setAddingMain(false);
    }
  };

  const handleAddSub = async (parentId: string) => {
    if (!newSubText.trim()) return;
    const siblingsCount = tasks.filter((t) => t.parent_task_id === parentId).length;
    const { error } = await supabase.from('sub_layers').insert({
      goal_id: goal.id,
      task_description: newSubText.trim(),
      frequency: newSubFreq,
      impact_weight: Math.max(1, Math.min(5, newSubWeight)),
      task_type: 'sub',
      parent_task_id: parentId,
      sort_order: siblingsCount,
      time_required_minutes: 0,
      completion_criteria: null,
    });

    if (!error) {
      await fetchTasks();
      setNewSubText('');
      setNewSubWeight(3);
      setAddingSubFor(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const isMain = tasks.find(t => t.id === taskId)?.task_type === 'main';
    const title = isArabic ? 'حذف المهمة' : 'Delete Task';
    const message = isArabic 
      ? `هل أنت متأكد من حذف هذه المهمة${isMain ? ' وجميع المهام الفرعية المرتبطة بها' : ''}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete this task${isMain ? ' and all its subtasks' : ''}? This cannot be undone.`;
      
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await supabase.from('sub_layers').delete().eq('id', taskId);
        await fetchTasks();
        await fetchCheckins();
      }
    });
  };

  const handleRenameTask = async (taskId: string) => {
    if (!editingText.trim()) return;
    await supabase.from('sub_layers').update({ task_description: editingText.trim() }).eq('id', taskId);
    setEditingTaskId(null);
    setEditingText('');
    await fetchTasks();
  };

  const handleUpdateTaskIcon = async (taskId: string, newIcon: string) => {
    await supabase.from('sub_layers').update({ icon: newIcon }).eq('id', taskId);
    await fetchTasks();
  };

  const handleTogglePin = async () => {
    await supabase.from('goals').update({ is_pinned: !goal.is_pinned }).eq('id', goal.id);
    if (onGoalUpdated) onGoalUpdated();
  };

  const handleUpdateIcon = async (newIcon: string) => {
    await supabase.from('goals').update({ icon: newIcon }).eq('id', goal.id);
    if (onGoalUpdated) onGoalUpdated();
  };

  const toggleExpand = (mainId: string) => {
    setExpandedMains((prev) => {
      const next = new Set(prev);
      if (next.has(mainId)) next.delete(mainId);
      else next.add(mainId);
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedMains(new Set());
  };

  const expandAll = () => {
    setExpandedMains(new Set(hierarchy.map(m => m.id)));
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- Tab Config ---
  const tabItems: { key: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { key: 'focus', label: t.dailyFocus, icon: <ListTodo className="w-4 h-4" /> },
    { key: 'chart', label: t.growthTrajectory, icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'analytics', label: isArabic ? 'التحليلات' : 'Analytics', icon: <PieChart className="w-4 h-4" /> },
    { key: 'challenge', label: t.challengeTab, icon: <Swords className="w-4 h-4" /> },
    { key: 'history', label: t.activityHistory, icon: <History className="w-4 h-4" /> },
  ];

  // --- Render ---
  const taskCount = tasks.filter((tk) => tk.task_type === 'sub').length || tasks.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ===== Header Card ===== */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GoalIconPicker currentIconName={goal.icon || 'Target'} onSelect={handleUpdateIcon}>
              <button className="h-10 w-10 p-2.5 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-xl flex items-center justify-center cursor-pointer border border-primary/10">
                {getGoalIcon(goal.icon)}
              </button>
            </GoalIconPicker>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-black text-foreground truncate">{goal.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-chart-5/10 text-chart-5 dark:bg-chart-3/10 dark:text-chart-3">
                    <Flame className="w-3 h-3" /> {streak}
                  </span>
                )}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                  {taskCount} {isArabic ? 'مهمة' : 'tasks'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleTogglePin}
              className={cn(
                "p-2 rounded-xl transition-all border",
                goal.is_pinned 
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
              )}
              title={isArabic ? 'تثبيت / إلغاء التثبيت' : 'Pin / Unpin'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={goal.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
            </button>
          </div>
        </div>

        {/* Tube Progress Bar */}
        <div className="relative h-10 w-full bg-muted/30 rounded-2xl overflow-hidden border border-border/70">
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none" />
          <div
            className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
            style={{ width: `${Math.min(100, progress)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-5 z-20 font-bold text-[10px] sm:text-sm tracking-wide" dir="ltr">
            <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1 truncate max-w-[30%]">
              {goal.current_points.toLocaleString()}
            </span>
            <span className="text-foreground/90 mix-blend-screen drop-shadow-sm font-black text-xs sm:text-base shrink-0">
              {progress}%
            </span>
            <span className="text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-0.5 truncate max-w-[30%]">
              <span className="text-[9px] sm:text-[10px] opacity-60">/</span>
              {goal.target_points.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Log Progress Button ===== */}
      <button
        onClick={() => setShowLogModal(true)}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"
      >
        <Flame className="w-4 h-4" />
        {t.logProgressButton}
      </button>

      {/* ===== Tabs ===== */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/20 border border-border/60 overflow-x-auto">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-white dark:bg-background text-foreground border border-border/70'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {activeTab === 'focus' && (
        <div className="space-y-2 pb-4">
          {/* Filter & Controls Bar */}
          {!loadingTasks && hierarchy.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Task Filter */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted/20 border border-border/60">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition-all',
                    taskFilter === 'all'
                      ? 'bg-white dark:bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isArabic ? 'الكل' : 'All'}
                </button>
                <button
                  onClick={() => setTaskFilter('daily')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition-all',
                    taskFilter === 'daily'
                      ? 'bg-white dark:bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isArabic ? 'يومي' : 'Daily'}
                </button>
                <button
                  onClick={() => setTaskFilter('weekly')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition-all',
                    taskFilter === 'weekly'
                      ? 'bg-white dark:bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isArabic ? 'أسبوعي' : 'Weekly'}
                </button>
              </div>

              {/* Collapse/Expand All */}
              <div className="flex gap-1">
                <button
                  onClick={expandAll}
                  className="p-2 rounded-lg text-xs font-semibold bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-all border border-border/60"
                  title={isArabic ? 'توسيع الكل' : 'Expand All'}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={collapseAll}
                  className="p-2 rounded-lg text-xs font-semibold bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-all border border-border/60"
                  title={isArabic ? 'طي الكل' : 'Collapse All'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {loadingTasks ? (
            <div className="text-center py-6 text-muted-foreground text-xs">{isArabic ? 'جارِ التحميل...' : 'Loading tasks...'}</div>
          ) : hierarchy.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              {t.noTasksFound}
            </div>
          ) : (
            <div
              className={cn(
                "max-h-[52vh] overflow-y-auto space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 transition-colors",
                isArabic ? 'pl-1' : 'pr-1',
              )}
            >
              {hierarchy
                .filter(main => taskFilter === 'all' || main.frequency === taskFilter)
                .map((main) => {
                const isExpanded = expandedMains.has(main.id);
                const completedSubs = main.subtasks.filter((s) => isChecked(s.id, s.frequency)).length;
                const totalSubs = main.subtasks.length;

                return (
                  <div key={main.id} className="rounded-xl border border-border/80 bg-white dark:bg-card/40 overflow-hidden">
                  {/* Main Task Header */}
                  <div className="flex items-center gap-2 p-3 hover:bg-muted/10 transition-colors">
                    <button onClick={() => toggleExpand(main.id)} className="shrink-0 p-1 rounded hover:bg-muted/40 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingTaskId === main.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 p-1.5 rounded-lg border border-border bg-background text-sm"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTask(main.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                          />
                          <button onClick={() => handleRenameTask(main.id)} className="p-1 text-primary"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingTaskId(null)} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FullEmojiPicker onSelect={(icon) => handleUpdateTaskIcon(main.id, icon)}>
                            <button className="shrink-0 w-6 h-6 flex items-center justify-center text-sm hover:bg-muted/50 rounded transition-colors" title={isArabic ? 'تغيير الأيقونة' : 'Change Icon'}>
                              {main.icon || '📝'}
                            </button>
                          </FullEmojiPicker>
                          <span className="font-bold text-sm text-foreground line-clamp-2">{main.task_description}</span>
                          {totalSubs > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold shrink-0">
                              {completedSubs}/{totalSubs}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Badges & Actions - Desktop */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                        main.frequency === 'daily'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                      )}>
                        {main.frequency === 'daily' ? (isArabic ? 'يومي' : 'Daily') : (isArabic ? 'أسبوعي' : 'Weekly')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                        <Weight className="w-3 h-3" /> {main.impact_weight}
                      </span>

                      {editingTaskId !== main.id && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => { setAddingSubFor(main.id); setNewSubText(''); setNewSubWeight(3); setNewSubFreq('daily'); }}
                            className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
                            title={isArabic ? 'إضافة فرعية' : 'Add Subtask'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingTaskId(main.id); setEditingText(main.task_description); }}
                            className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
                            title={t.renameTask}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(main.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:bg-destructive/20 transition-colors"
                            title={t.deleteTask}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* More Button - Mobile */}
                    {editingTaskId !== main.id && (
                      <button
                        onClick={() => setShowDetailsFor(showDetailsFor === main.id ? null : main.id)}
                        className="md:hidden p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground active:bg-muted transition-colors shrink-0"
                        title={isArabic ? 'المزيد' : 'More'}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    )}
                  </div>


                  {/* Subtasks (expanded) */}
                  {isExpanded && main.subtasks.length > 0 && (
                    <div className="border-t border-border/60 bg-muted/5 dark:bg-transparent">
                      {main.subtasks.map((sub) => {
                        const checked = isChecked(sub.id, sub.frequency);
                        return (
                            <div
                              key={sub.id}
                              className={cn(
                                'flex items-center gap-2 px-4 py-2.5 border-b border-border/40 last:border-0 transition-colors group/subtask',
                                checked && 'bg-primary/5 opacity-75',
                              )}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleCheckin(sub.id, sub.frequency)}
                                className="shrink-0 p-0.5 rounded transition-colors"
                              >
                                {checked ? (
                                  <CheckSquare className="w-5 h-5 text-primary" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground/50 hover:text-muted-foreground" />
                                )}
                              </button>

                              {/* Description */}
                              <div className="flex-1 min-w-0">
                                {editingTaskId === sub.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="flex-1 p-1 rounded border border-border bg-background text-xs"
                                      autoFocus
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTask(sub.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                                    />
                                    <button onClick={() => handleRenameTask(sub.id)} className="p-1 text-primary"><Save className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setEditingTaskId(null)} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <FullEmojiPicker onSelect={(icon) => handleUpdateTaskIcon(sub.id, icon)}>
                                      <button className="shrink-0 w-5 h-5 flex items-center justify-center text-xs hover:bg-muted/50 rounded transition-colors" title={isArabic ? 'تغيير الأيقونة' : 'Change Icon'}>
                                        {sub.icon || '🔹'}
                                      </button>
                                    </FullEmojiPicker>
                                    <span className={cn('text-sm', checked && 'line-through text-muted-foreground')}>
                                      {sub.task_description}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Sub Badges */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={cn(
                                  'text-[9px] px-1 py-0.5 rounded-full font-bold',
                                  sub.frequency === 'daily'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                                )}>
                                  {sub.frequency === 'daily' ? (isArabic ? 'يومي' : 'D') : (isArabic ? 'أسبوعي' : 'W')}
                                </span>
                                <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                                  {sub.impact_weight}
                                </span>
                                {sub.time_required_minutes ? (
                                  <span className="text-[9px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {sub.time_required_minutes}m
                                  </span>
                                ) : null}

                                {editingTaskId !== sub.id && (
                                  <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/subtask:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => { setEditingTaskId(sub.id); setEditingText(sub.task_description); }}
                                      className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
                                      title={t.renameTask}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(sub.id)}
                                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:bg-destructive/20 transition-colors"
                                      title={t.deleteTask}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      }

                      {/* Add Subtask Inline */}
                      {addingSubFor === main.id && (
                        <div className="px-3 sm:px-4 py-2.5 border-t border-dashed border-border/50 space-y-2">
                          <input
                            value={newSubText}
                            onChange={(e) => setNewSubText(e.target.value)}
                            placeholder={isArabic ? 'مهمة فرعية جديدة...' : 'New subtask...'}
                            className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(main.id); if (e.key === 'Escape') setAddingSubFor(null); }}
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={newSubFreq}
                              onChange={(e) => setNewSubFreq(e.target.value as 'daily' | 'weekly')}
                              className="flex-1 p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm"
                            >
                              <option value="daily">{isArabic ? 'يومي' : 'Daily'}</option>
                              <option value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={newSubWeight}
                              onChange={(e) => setNewSubWeight(Number(e.target.value) || 1)}
                              className="w-16 sm:w-20 p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm text-center"
                              title={isArabic ? 'الوزن' : 'Weight'}
                            />
                            <button onClick={() => handleAddSub(main.id)} className="p-2.5 rounded-lg bg-primary text-primary-foreground font-bold shrink-0">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setAddingSubFor(null)} className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Subtask form for empty mains (no subtasks yet) */}
                  {main.subtasks.length === 0 && addingSubFor === main.id && (
                    <div className="border-t border-border/50">
                      <div className="px-3 sm:px-4 py-2.5 space-y-2">
                        <input
                          value={newSubText}
                          onChange={(e) => setNewSubText(e.target.value)}
                          placeholder={isArabic ? 'مهمة فرعية جديدة...' : 'New subtask...'}
                          className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(main.id); if (e.key === 'Escape') setAddingSubFor(null); }}
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newSubFreq}
                            onChange={(e) => setNewSubFreq(e.target.value as 'daily' | 'weekly')}
                            className="flex-1 p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm"
                          >
                            <option value="daily">{isArabic ? 'يومي' : 'Daily'}</option>
                            <option value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={newSubWeight}
                            onChange={(e) => setNewSubWeight(Number(e.target.value) || 1)}
                            className="w-16 sm:w-20 p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm text-center"
                            title={isArabic ? 'الوزن' : 'Weight'}
                          />
                          <button onClick={() => handleAddSub(main.id)} className="p-2.5 rounded-lg bg-primary text-primary-foreground font-bold shrink-0">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setAddingSubFor(null)} className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Main Task */}
          {addingMain ? (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/8 p-3 sm:p-4 space-y-2">
              <input
                value={newMainText}
                onChange={(e) => setNewMainText(e.target.value)}
                placeholder={isArabic ? 'مهمة رئيسية جديدة...' : 'New main task...'}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMain(); if (e.key === 'Escape') setAddingMain(false); }}
              />
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={newMainFreq}
                  onChange={(e) => setNewMainFreq(e.target.value as 'daily' | 'weekly')}
                  className="flex-1 min-w-[100px] p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm"
                >
                  <option value="daily">{isArabic ? 'يومي' : 'Daily'}</option>
                  <option value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newMainWeight}
                  onChange={(e) => setNewMainWeight(Number(e.target.value) || 1)}
                  className="w-20 sm:w-24 p-2.5 rounded-lg border border-border bg-background text-xs sm:text-sm text-center"
                  title={isArabic ? 'الوزن (1-10)' : 'Weight (1-10)'}
                />
                <button onClick={handleAddMain} className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
                <button onClick={() => setAddingMain(false)} className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm">
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingMain(true); setNewMainText(''); setNewMainWeight(6); setNewMainFreq('weekly'); }}
              className="w-full py-2.5 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/8 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isArabic ? 'إضافة مهمة رئيسية' : 'Add Main Task'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-3 sm:p-4">
          <GrowthChart data={chartData} language={language} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-3 sm:p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {isArabic ? 'الملخص الأسبوعي' : 'Weekly Summary'}
            </h3>
            <WeeklySummaryCard goalId={goal.id} language={language} />
          </div>
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-card/50 p-3 sm:p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-5" />
              {isArabic ? 'تحليلات متقدمة' : 'Advanced Analytics'}
            </h3>
            <AdvancedAnalytics goalId={goal.id} language={language} />
          </div>
        </div>
      )}

      {activeTab === 'challenge' && (
        <ChallengeTab goalId={goal.id} language={language} />
      )}

      {activeTab === 'history' && (
        <ActivityHistory
          logs={logs}
          language={language}
          onLogDeleted={() => { fetchLogs(); fetchChartData(); fetchStreak(); if (onGoalUpdated) onGoalUpdated(); }}
          onLogProgress={() => setShowLogModal(true)}
        />
      )}

      {/* ===== Log Modal ===== */}
      {showLogModal && (
        <DailyLogModal
          goal={goal}
          tasks={tasks}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            fetchTasks();
            fetchCheckins();
            fetchStreak();
            fetchChartData();
            fetchLogs();
            if (onGoalUpdated) onGoalUpdated();
          }}
          language={language}
        />
      )}

      {/* ===== Confirm Modal ===== */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        language={language}
      />

      {/* ===== Task Details Popover - Mobile Only ===== */}
      {showDetailsFor && (
        <>
          {/* Invisible backdrop for closing */}
          <div 
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setShowDetailsFor(null)}
          />
          
          {/* Popover */}
          <div className="md:hidden fixed top-0 left-0 right-0 bottom-0 z-50 pointer-events-none">
            <div className="relative w-full h-full">
              {(() => {
                const taskData = hierarchy.find(m => m.id === showDetailsFor);
                if (!taskData) return null;
                
                return (
                  <div 
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[90%] max-w-sm pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
                    dir={isArabic ? 'rtl' : 'ltr'}
                  >
                    <div className="bg-white dark:bg-card rounded-xl shadow-xl border border-border/80 p-2.5 space-y-2">
                      {/* Task Info */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground font-semibold">{isArabic ? 'التكرار' : 'Frequency'}</span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                            taskData.frequency === 'daily'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                          )}>
                            {taskData.frequency === 'daily' ? (isArabic ? 'يومي' : 'Daily') : (isArabic ? 'أسبوعي' : 'Weekly')}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground font-semibold">{isArabic ? 'الوزن' : 'Weight'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                            <Weight className="w-2.5 h-2.5" /> {taskData.impact_weight}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => { setAddingSubFor(taskData.id); setNewSubText(''); setNewSubWeight(3); setNewSubFreq('daily'); setShowDetailsFor(null); }}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[9px] font-bold leading-tight">{isArabic ? 'إضافة فرعية' : 'Add Sub'}</span>
                        </button>
                        <button
                          onClick={() => { setEditingTaskId(taskData.id); setEditingText(taskData.task_description); setShowDetailsFor(null); }}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/80 text-foreground transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-[9px] font-bold leading-tight">{isArabic ? 'تعديل' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => { handleDeleteTask(taskData.id); setShowDetailsFor(null); }}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 active:bg-destructive/30 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[9px] font-bold leading-tight">{isArabic ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ===== Toast Notification ===== */}
      {showToast && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 px-4">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-lg border border-primary/20 font-semibold text-sm flex items-center gap-2 max-w-[90vw]">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
