"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, BarChart3, ListTodo, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations, type Language } from "@/lib/translations";
import { createClient } from "@/utils/supabase/client";
import { getPeriodStart, getPeriodTypeFromFrequency, getLocalDateKey } from "@/lib/task-periods";
import {
  buildDailyFocusHistory,
  buildDailyFocusSessionFromRow,
  compactDailyFocusLogs,
  normalizeDailyFocusEntryRow,
  normalizeDailyFocusResult,
  DAILY_FOCUS_REQUIRED_DAYS,
  type DailyFocusEntryRow,
  type DailyFocusGoalContext,
  type DailyFocusSession,
} from "@/lib/daily-focus";
import {
  buildTaskHierarchy,
  type MainTask,
  type TaskRow,
} from "@/lib/task-hierarchy";
import { getTaskAccent, type TaskColorKey } from "@/lib/task-colors";
import { parseDailyLogBreakdown } from "@/lib/daily-log-feedback";
import ProgressLogDialog from "../progress/ProgressLogDialog";
import GrowthChart from "./GrowthChart";
import DayCalendarGrid from "./DayCalendarGrid";
import ChallengeTab from "../challenge";
import ConfirmModal from "../shared/ConfirmModal";
import GoalEditDialog from "../goal/GoalEditDialog";
import TaskInsights from "./TaskInsights";
import DashboardHeader from "./DashboardHeader";
import FocusTab from "./FocusTab";
import ToastNotification from "./ToastNotification";
import DailyFocusQuestionDialog from "./DailyFocusQuestionDialog";

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

interface ActivityLog {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  ai_feedback: string;
  breakdown: unknown;
}

interface DailyLogBreakdownRow {
  created_at: string;
  breakdown: unknown;
}

interface BreakdownRow {
  task_id: string;
  points?: number;
  status?: string;
}

interface DashboardProps {
  goal: Goal;
  language?: Language;
  onGoalUpdated?: () => void;
}

type DashboardTab = "focus" | "chart" | "challenge";

function getLocalDayWindow(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function normalizeBreakdown(value: unknown): BreakdownRow[] {
  return parseDailyLogBreakdown(value).items.map((item) => ({
    task_id: item.task_id,
    points: Number(item.points) || 0,
    status: item.status,
  }));
}

function hasMeaningfulProgress(item: BreakdownRow) {
  return (
    (item.points || 0) > 0 ||
    item.status === "done" ||
    item.status === "partial"
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard({
  goal,
  language = "en",
  onGoalUpdated,
}: DashboardProps) {
  const supabase = createClient();
  const t = translations[language];
  const isArabic = language === "ar";

  // --- State ---
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [checkins, setCheckins] = useState<TaskCheckin[]>([]);
  const [todayLoggedTaskIds, setTodayLoggedTaskIds] = useState<string[]>([]);
  const [expandedMains, setExpandedMains] = useState<Set<string>>(
    new Set<string>(),
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("focus");
  const [showLogModal, setShowLogModal] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // CRUD inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState("");
  const [newSubFreq, setNewSubFreq] = useState<"daily" | "weekly">("daily");
  const [newSubWeight, setNewSubWeight] = useState(3);
  const [addingMain, setAddingMain] = useState(false);
  const [newMainText, setNewMainText] = useState("");
  const [newMainFreq, setNewMainFreq] = useState<"daily" | "weekly">("weekly");
  const [newMainWeight, setNewMainWeight] = useState(6);
  const [newMainColor, setNewMainColor] = useState<TaskColorKey | null>(null);

  // Modals & UI State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);

  const previousCompletedTodayRef = useRef<Set<string>>(new Set<string>());
  const [freshlyCompletedTaskIds, setFreshlyCompletedTaskIds] = useState<
    Set<string>
  >(new Set<string>());
  const [streak, setStreak] = useState(0);
  const [chartData, setChartData] = useState<
    { date: string; points: number }[]
  >([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [dailyFocusRows, setDailyFocusRows] = useState<DailyFocusEntryRow[]>([]);
  const [dailyFocusRowsLoaded, setDailyFocusRowsLoaded] = useState(false);
  const [dailyFocus, setDailyFocus] = useState<DailyFocusSession | null>(null);
  const [dailyFocusAnswer, setDailyFocusAnswer] = useState("");
  const [dailyFocusLoading, setDailyFocusLoading] = useState(false);
  const [dailyFocusSubmitting, setDailyFocusSubmitting] = useState(false);
  const [dailyFocusError, setDailyFocusError] = useState<string | null>(null);
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(
    null,
  );
  const [showDailyFocusPrompt, setShowDailyFocusPrompt] = useState(false);
  const [dailyFocusPromptDismissed, setDailyFocusPromptDismissed] =
    useState(false);

  const isChecked = useCallback(
    (taskId: string, frequency: string): boolean => {
      const periodType = getPeriodTypeFromFrequency(frequency);
      const periodStart = getPeriodStart(frequency);
      const hasCheckin = checkins.some(
        (c) =>
          c.task_id === taskId &&
          c.period_type === periodType &&
          c.period_start === periodStart &&
          c.completed,
      );

      return hasCheckin || todayLoggedTaskIds.includes(taskId);
    },
    [checkins, todayLoggedTaskIds],
  );

  const completedTodayTaskIds = useMemo(() => {
    const completedIds = new Set<string>(todayLoggedTaskIds);
    const { start, end } = getLocalDayWindow();

    checkins.forEach((checkin) => {
      if (!checkin.completed || !checkin.completed_at) return;

      const completedAt = new Date(checkin.completed_at);
      if (completedAt >= start && completedAt < end) {
        completedIds.add(checkin.task_id);
      }
    });

    return completedIds;
  }, [checkins, todayLoggedTaskIds]);

  const isCompletedToday = useCallback(
    (taskId: string) => completedTodayTaskIds.has(taskId),
    [completedTodayTaskIds],
  );

  const shouldAnimateTask = useCallback(
    (taskId: string) => freshlyCompletedTaskIds.has(taskId),
    [freshlyCompletedTaskIds],
  );

  const todayDateKey = getLocalDateKey();
  const dailyFocusGoal = useMemo<DailyFocusGoalContext>(
    () => ({
      id: goal.id,
      title: goal.title,
      ai_summary: goal.ai_summary || "",
      created_at: goal.created_at,
      current_points: goal.current_points,
      target_points: goal.target_points,
    }),
    [
      goal.ai_summary,
      goal.created_at,
      goal.current_points,
      goal.id,
      goal.target_points,
      goal.title,
    ],
  );
  const recentFocusLogs = useMemo(
    () => compactDailyFocusLogs(logs),
    [logs],
  );
  const answeredDailyFocusRows = useMemo(
    () =>
      dailyFocusRows.filter((row) =>
        Boolean((row.answer || "").trim() && row.answered_at),
      ),
    [dailyFocusRows],
  );
  const answeredDailyFocusCount = answeredDailyFocusRows.length;
  const todayDailyFocusRow = useMemo(
    () =>
      dailyFocusRows.find((row) => row.prompt_date === todayDateKey) || null,
    [dailyFocusRows, todayDateKey],
  );
  const dailyFocusHistory = useMemo(
    () =>
      buildDailyFocusHistory(
        dailyFocusRows.filter((row) => row.prompt_date !== todayDateKey),
      ),
    [dailyFocusRows, todayDateKey],
  );

  // --- Derived ---
  const hierarchy: MainTask[] = useMemo(
    () => buildTaskHierarchy(tasks),
    [tasks],
  );
  const newMainAccent = useMemo(
    () =>
      getTaskAccent(newMainText.trim() || "main-task-preview", newMainColor),
    [newMainColor, newMainText],
  );
  const filteredHierarchy = useMemo(
    () => hierarchy,
    [hierarchy],
  );
  const focusStats = useMemo(() => {
    const allSubs = filteredHierarchy.flatMap((main) => main.subtasks);
    if (allSubs.length > 0) {
      return {
        totalSubtasks: allSubs.length,
        completedSubtasks: allSubs.filter((sub) => isChecked(sub.id, sub.frequency)).length,
      };
    }
    // Fallback: count main tasks when no subtasks exist
    return {
      totalSubtasks: filteredHierarchy.length,
      completedSubtasks: filteredHierarchy.filter((main) => isChecked(main.id, main.frequency)).length,
    };
  }, [filteredHierarchy, isChecked]);

  const progress =
    goal.target_points > 0
      ? Math.min(
          100,
          Math.round((goal.current_points / goal.target_points) * 100),
        )
      : 0;

  // --- Data Fetch ---
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from("sub_layers")
      .select("*")
      .eq("goal_id", goal.id)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setTasks(
        (data as TaskRow[]).map((row) => ({
          id: row.id,
          goal_id: row.goal_id,
          task_description: row.task_description,
          impact_weight: row.impact_weight,
          frequency: row.frequency,
          time_required_minutes: row.time_required_minutes,
          completion_criteria: row.completion_criteria,
          task_type: row.task_type || "main",
          parent_task_id: row.parent_task_id || null,
          sort_order: row.sort_order || 0,
          icon: row.icon || null,
          accent_color: row.accent_color || null,
        })),
      );
      // DO NOT auto-expand mains initially (User request)
      // setExpandedMains(new Set());
    }
    setLoadingTasks(false);
  }, [goal.id, supabase]);

  const fetchCheckins = useCallback(async () => {
    // Fetch current-period checkins for all tasks of this goal
    const todayKey = getPeriodStart("daily");
    const weekKey = getPeriodStart("weekly");

    const { data, error } = await supabase
      .from("task_checkins")
      .select("*")
      .eq("goal_id", goal.id)
      .in("period_start", [todayKey, weekKey]);

    if (!error && data) {
      setCheckins(data);
    }
  }, [goal.id, supabase]);

  const fetchTodayLoggedTasks = useCallback(async () => {
    const { start, end } = getLocalDayWindow();
    const { data, error } = await supabase
      .from("daily_logs")
      .select("created_at, breakdown")
      .eq("goal_id", goal.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .not("breakdown", "is", null)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setTodayLoggedTaskIds([]);
      return;
    }

    const taskIds = new Set<string>();

    (data as DailyLogBreakdownRow[]).forEach((log) => {
      normalizeBreakdown(log.breakdown).forEach((item) => {
        if (hasMeaningfulProgress(item)) {
          taskIds.add(item.task_id);
        }
      });
    });

    setTodayLoggedTaskIds(Array.from(taskIds));
  }, [goal.id, supabase]);

  const fetchStreak = useCallback(async () => {
    const { data } = await supabase
      .from("daily_logs")
      .select("created_at")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: false })
      .limit(365);

    if (data && data.length > 0) {
      // Build a set of local date keys so timezone is respected
      const loggedDateKeys = new Set<string>();
      for (const log of data) {
        if (log.created_at) {
          loggedDateKeys.add(getLocalDateKey(new Date(log.created_at)));
        }
      }

      let count = 0;
      const now = new Date();

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        if (loggedDateKeys.has(getLocalDateKey(checkDate))) {
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
      .from("daily_logs")
      .select("created_at, ai_score")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: true });

    if (data) {
      const grouped = new Map<string, number>();
      for (const log of data) {
        if (!log.created_at) continue;
        const dateKey = getLocalDateKey(new Date(log.created_at));
        grouped.set(dateKey, (grouped.get(dateKey) || 0) + (log.ai_score || 0));
      }
      setChartData(
        Array.from(grouped.entries()).map(([date, points]) => ({
          date,
          points,
        })),
      );
    }
  }, [goal.id, supabase]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("daily_logs")
      .select("id, created_at, user_input, ai_score, ai_feedback, breakdown")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: false });

    if (data) setLogs(data as ActivityLog[]);
    setLogsLoaded(true);
  }, [goal.id, supabase]);

  const fetchDailyFocusRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_focus_answers")
      .select(
        "id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at",
      )
      .eq("goal_id", goal.id)
      .order("prompt_date", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Failed to fetch daily focus history:", error);
      setDailyFocusRows([]);
      setDailyFocusRowsLoaded(true);
      return;
    }

    setDailyFocusRows(
      (data || [])
        .map((row) => normalizeDailyFocusEntryRow(row))
        .filter((row): row is DailyFocusEntryRow => Boolean(row)),
    );
    setDailyFocusRowsLoaded(true);
  }, [goal.id, supabase]);

  const upsertDailyFocusRow = useCallback(
    async (payload: {
      angle_label: string;
      question: string;
      question_why: string;
      answer?: string;
      answer_coaching?: string;
      suggestions?: unknown[];
      answered_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("daily_focus_answers")
        .upsert(
          {
            goal_id: goal.id,
            prompt_date: todayDateKey,
            angle_label: payload.angle_label,
            question: payload.question,
            question_why: payload.question_why,
            answer: payload.answer || null,
            answer_coaching: payload.answer_coaching || null,
            suggestions: payload.suggestions || [],
            answered_at: payload.answered_at || null,
          },
          { onConflict: "goal_id,prompt_date" },
        )
        .select(
          "id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at",
        )
        .single();

      if (error) throw error;

      const normalizedRow = normalizeDailyFocusEntryRow(data);
      if (!normalizedRow) {
        throw new Error(
          language === "ar"
            ? "تعذر حفظ سجل أسئلة الخطة."
            : "Could not save the plan feedback entry.",
        );
      }

      setDailyFocusRows((currentRows) => {
        const nextRows = currentRows.filter(
          (row) => row.prompt_date !== normalizedRow.prompt_date,
        );
        return [normalizedRow, ...nextRows].sort((a, b) =>
          b.prompt_date.localeCompare(a.prompt_date),
        );
      });

      return normalizedRow;
    },
    [goal.id, language, supabase, todayDateKey],
  );

  const generateDailyFocus = useCallback(
    async (options?: {
      answer?: string;
      existingQuestion?: string;
      force?: boolean;
    }) => {
      const submittedAnswer = options?.answer?.trim() || "";
      const isSubmittingAnswer = submittedAnswer.length > 0;

      setDailyFocusError(null);
      if (isSubmittingAnswer) {
        setDailyFocusSubmitting(true);
      } else {
        setDailyFocusLoading(true);
      }

      try {
        const answeredCountWithoutToday = dailyFocusRows.filter(
          (row) =>
            row.prompt_date !== todayDateKey &&
            Boolean((row.answer || "").trim() && row.answered_at),
        ).length;
        const response = await fetch("/api/goal/daily-focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: dailyFocusGoal,
            tasks,
            logs: recentFocusLogs,
            history: dailyFocusHistory,
            answer: submittedAnswer || undefined,
            existingQuestion:
              options?.existingQuestion ||
              todayDailyFocusRow?.question ||
              undefined,
            date: todayDateKey,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            data?.error === "quota_exceeded"
              ? language === "ar"
                ? data?.message_ar
                : data?.message_en
              : language === "ar"
                ? "تعذر توليد سؤال اليوم حالياً."
                : "Could not generate today's question right now.";
          throw new Error(message);
        }

        const normalized = normalizeDailyFocusResult(data, todayDateKey);
        if (!normalized) {
          throw new Error(
            language === "ar"
              ? "صيغة سؤال اليوم غير صالحة."
              : "Invalid daily focus response.",
          );
        }

        if (normalized.status === "refused") {
          throw new Error(
            normalized.safe_redirection?.message ||
              (language === "ar"
                ? "لا يمكن توليد هذا السؤال حالياً."
                : "This question cannot be generated right now."),
          );
        }

        const answeredAt = submittedAnswer
          ? new Date().toISOString()
          : todayDailyFocusRow?.answered_at || null;
        const savedRow = await upsertDailyFocusRow({
          angle_label: normalized.angle_label,
          question: normalized.question,
          question_why: normalized.question_why,
          answer: submittedAnswer || todayDailyFocusRow?.answer || "",
          answer_coaching: normalized.answer_coaching,
          suggestions: normalized.suggestions,
          answered_at: answeredAt,
        });

        const computedAnsweredDaysCount = submittedAnswer
          ? answeredCountWithoutToday + 1
          : answeredCountWithoutToday +
            (savedRow.answer && savedRow.answered_at ? 1 : 0);
        const nextSession = buildDailyFocusSessionFromRow(savedRow, {
          answeredDaysCount: computedAnsweredDaysCount,
          requiredAnswerDays: normalized.required_answer_days,
        });

        nextSession.answer_coaching = normalized.answer_coaching;
        nextSession.suggestions = normalized.suggestions;
        nextSession.suggestions_unlocked = normalized.suggestions_unlocked;
        nextSession.answered_days_count = normalized.answered_days_count;
        nextSession.required_answer_days = normalized.required_answer_days;

        setDailyFocus(nextSession);
        setDailyFocusAnswer(nextSession.answer || "");
        return nextSession;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : language === "ar"
              ? "تعذر توليد سؤال اليوم حالياً."
              : "Could not generate today's question right now.";
        setDailyFocusError(message);

        return null;
      } finally {
        setDailyFocusLoading(false);
        setDailyFocusSubmitting(false);
      }
    },
    [
      dailyFocusGoal,
      dailyFocusHistory,
      dailyFocusRows,
      language,
      recentFocusLogs,
      tasks,
      todayDailyFocusRow,
      todayDateKey,
      upsertDailyFocusRow,
    ],
  );

  useEffect(() => {
    setLogsLoaded(false);
    setDailyFocusRowsLoaded(false);
    setDailyFocusRows([]);
    setDailyFocus(null);
    setDailyFocusAnswer("");
    setDailyFocusError(null);
    setAddingSuggestionId(null);
    setShowDailyFocusPrompt(false);
    setDailyFocusPromptDismissed(false);
  }, [goal.id, todayDateKey]);

  useEffect(() => {
    fetchTasks();
    fetchCheckins();
    fetchTodayLoggedTasks();
    fetchStreak();
    fetchChartData();
    fetchLogs();
    fetchDailyFocusRows();
  }, [
    fetchTasks,
    fetchCheckins,
    fetchTodayLoggedTasks,
    fetchStreak,
    fetchChartData,
    fetchLogs,
    fetchDailyFocusRows,
  ]);

  useEffect(() => {
    if (loadingTasks || !logsLoaded || !dailyFocusRowsLoaded) return;

    if (todayDailyFocusRow) {
      const session = buildDailyFocusSessionFromRow(todayDailyFocusRow, {
        answeredDaysCount: answeredDailyFocusCount,
        requiredAnswerDays: DAILY_FOCUS_REQUIRED_DAYS,
      });
      setDailyFocus(session);
      setDailyFocusAnswer(session.answer || "");
      setDailyFocusError(null);
      return;
    }

    generateDailyFocus();
  }, [
    answeredDailyFocusCount,
    dailyFocusRowsLoaded,
    generateDailyFocus,
    loadingTasks,
    logsLoaded,
    todayDailyFocusRow,
  ]);

  useEffect(() => {
    if (!dailyFocus || dailyFocus.answered_at || dailyFocusPromptDismissed) return;
    setShowDailyFocusPrompt(true);
  }, [dailyFocus, dailyFocusPromptDismissed]);

  useEffect(() => {
    if (!dailyFocus?.answered_at) return;
    setShowDailyFocusPrompt(false);
    setDailyFocusPromptDismissed(true);
  }, [dailyFocus?.answered_at]);

  useEffect(() => {
    const nextFreshIds = Array.from(completedTodayTaskIds).filter(
      (taskId) => !previousCompletedTodayRef.current.has(taskId),
    );

    previousCompletedTodayRef.current = new Set(completedTodayTaskIds);

    if (nextFreshIds.length === 0) return;

    setFreshlyCompletedTaskIds((prev) => {
      const next = new Set(prev);
      nextFreshIds.forEach((taskId) => next.add(taskId));
      return next;
    });

    const timeout = window.setTimeout(() => {
      setFreshlyCompletedTaskIds((prev) => {
        const next = new Set(prev);
        nextFreshIds.forEach((taskId) => next.delete(taskId));
        return next;
      });
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [completedTodayTaskIds]);

  // --- Check-in Toggle ---
  const toggleCheckin = async (taskId: string, frequency: string) => {
    const periodType = getPeriodTypeFromFrequency(frequency);
    const periodStart = getPeriodStart(frequency);

    const existing = checkins.find(
      (c) =>
        c.task_id === taskId &&
        c.period_type === periodType &&
        c.period_start === periodStart,
    );

    if (existing) {
      if (existing.completed) {
        // Uncheck
        const { error } = await supabase.from("task_checkins").delete().eq("id", existing.id);
        if (error) {
          showSuccessToast(isArabic ? "تعذر حذف الإنجاز" : "Could not remove check-in");
          return;
        }
        setCheckins((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        // Mark complete
        const { error } = await supabase
          .from("task_checkins")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) {
          showSuccessToast(isArabic ? "تعذر حفظ الإنجاز" : "Could not save check-in");
          return;
        }
        setCheckins((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  completed: true,
                  completed_at: new Date().toISOString(),
                }
              : c,
          ),
        );
        showSuccessToast(isArabic ? "✓ تم إنجاز المهمة" : "✓ Task completed");
      }
    } else {
      // Create new checkin
      const { data, error } = await supabase
        .from("task_checkins")
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

      if (error || !data) {
        showSuccessToast(isArabic ? "تعذر حفظ الإنجاز" : "Could not save check-in");
        return;
      }

      setCheckins((prev) => [...prev, data]);
      showSuccessToast(isArabic ? "✓ تم إنجاز المهمة" : "✓ Task completed");
    }
  };

  // --- CRUD ---
  const handleAddMain = async () => {
    if (!newMainText.trim()) return;
    const maxSort = tasks.filter((t) => t.task_type === "main").length;
    const mainInsert = {
      goal_id: goal.id,
      task_description: newMainText.trim(),
      frequency: newMainFreq,
      impact_weight: Math.max(1, Math.min(10, newMainWeight)),
      task_type: "main" as const,
      parent_task_id: null,
      sort_order: maxSort,
      time_required_minutes: 0,
      completion_criteria: null,
      ...(newMainColor ? { accent_color: newMainColor } : {}),
    };
    const { data, error } = await supabase
      .from("sub_layers")
      .insert(mainInsert)
      .select()
      .single();

    if (error) {
      const needsColorMigration = error.message?.includes("accent_color");
      showSuccessToast(
        needsColorMigration
          ? isArabic
            ? "فعّل migration اللون أولًا ثم أعد المحاولة"
            : "Apply the color migration first, then try again"
          : isArabic
            ? "تعذر حفظ المهمة الرئيسية"
            : "Could not save main task",
      );
      return;
    }

    if (!error && data) {
      await fetchTasks();
      setNewMainText("");
      setNewMainWeight(6);
      setNewMainColor(null);
      setAddingMain(false);
    }
  };

  const handleAddSub = async (parentId: string) => {
    if (!newSubText.trim()) return;
    const siblingsCount = tasks.filter(
      (t) => t.parent_task_id === parentId,
    ).length;
    const { error } = await supabase.from("sub_layers").insert({
      goal_id: goal.id,
      task_description: newSubText.trim(),
      frequency: newSubFreq,
      impact_weight: Math.max(1, Math.min(5, newSubWeight)),
      task_type: "sub",
      parent_task_id: parentId,
      sort_order: siblingsCount,
      time_required_minutes: 0,
      completion_criteria: null,
    });

    if (!error) {
      await fetchTasks();
      setNewSubText("");
      setNewSubWeight(3);
      setAddingSubFor(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const isMain = tasks.find((t) => t.id === taskId)?.task_type === "main";
    const title = isArabic ? "حذف المهمة" : "Delete Task";
    const message = isArabic
      ? `هل أنت متأكد من حذف هذه المهمة${isMain ? " وجميع المهام الفرعية المرتبطة بها" : ""}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete this task${isMain ? " and all its subtasks" : ""}? This cannot be undone.`;

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await supabase.from("sub_layers").delete().eq("id", taskId);
        await fetchTasks();
        await fetchCheckins();
      },
    });
  };

  const handleRenameTask = async (taskId: string) => {
    if (!editingText.trim()) return;
    await supabase
      .from("sub_layers")
      .update({ task_description: editingText.trim() })
      .eq("id", taskId);
    setEditingTaskId(null);
    setEditingText("");
    await fetchTasks();
  };

  const handleUpdateTaskIcon = async (taskId: string, newIcon: string) => {
    await supabase
      .from("sub_layers")
      .update({ icon: newIcon })
      .eq("id", taskId);
    await fetchTasks();
  };

  const handleUpdateTaskColor = async (
    taskId: string,
    color: TaskColorKey | null,
  ) => {
    const { error } = await supabase
      .from("sub_layers")
      .update({ accent_color: color })
      .eq("id", taskId);
    if (error) {
      const needsColorMigration = error.message?.includes("accent_color");
      showSuccessToast(
        needsColorMigration
          ? isArabic
            ? "فعّل migration اللون أولًا ثم أعد المحاولة"
            : "Apply the color migration first, then try again"
          : isArabic
            ? "تعذر حفظ اللون"
            : "Could not save color",
      );
      return;
    }
    await fetchTasks();
    showSuccessToast(isArabic ? "تم تحديث اللون" : "Color updated");
  };

  const handleUpdateTaskWeight = async (taskId: string, newWeight: number) => {
    const { error } = await supabase
      .from("sub_layers")
      .update({ impact_weight: newWeight })
      .eq("id", taskId);
    if (error) {
      showSuccessToast(isArabic ? "تعذر حفظ الوزن" : "Could not save weight");
      return;
    }
    await fetchTasks();
    showSuccessToast(isArabic ? "تم تحديث الوزن" : "Weight updated");
  };

  const handleTogglePin = async () => {
    await supabase
      .from("goals")
      .update({ is_pinned: !goal.is_pinned })
      .eq("id", goal.id);
    if (onGoalUpdated) onGoalUpdated();
  };

  const handleDeleteGoal = () => {
    const title = isArabic ? "حذف الهدف" : "Delete Goal";
    const message = isArabic
      ? `هل أنت متأكد من حذف الهدف "${goal.title}"؟ سيتم حذف جميع المهام والسجلات المرتبطة به. لا يمكن التراجع.`
      : `Are you sure you want to delete "${goal.title}"? All associated tasks and logs will be deleted. This cannot be undone.`;

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("goals").delete().eq("id", goal.id);
          if (error) throw error;
          if (onGoalUpdated) onGoalUpdated();
          window.location.href = "/";
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : "";
          console.error("Error deleting goal:", err);
          showSuccessToast((isArabic ? "فشل حذف الهدف: " : "Failed to delete goal: ") + errMessage);
        }
      },
    });
  };

  const handleUpdateIcon = async (newIcon: string) => {
    await supabase.from("goals").update({ icon: newIcon }).eq("id", goal.id);
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

  const handleStartAddingSub = (mainId: string) => {
    setAddingSubFor(mainId);
    setNewSubText("");
    setNewSubWeight(3);
    setNewSubFreq("daily");
    setExpandedMains((prev) => {
      const next = new Set(prev);
      next.add(mainId);
      return next;
    });
  };

  const handleStartEditingTask = (taskId: string, taskDescription: string) => {
    setEditingTaskId(taskId);
    setEditingText(taskDescription);
  };

  const openNewMainComposer = () => {
    setAddingMain(true);
    setNewMainText("");
    setNewMainWeight(6);
    setNewMainFreq("weekly");
    setNewMainColor(null);
  };

  const closeNewMainComposer = () => {
    setAddingMain(false);
    setNewMainText("");
    setNewMainWeight(6);
    setNewMainFreq("weekly");
    setNewMainColor(null);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const updateDailyFocusSession = useCallback(
    (updater: (current: DailyFocusSession) => DailyFocusSession) => {
      setDailyFocus((current) => {
        if (!current) return current;
        return updater(current);
      });
    },
    [],
  );

  const handleDailyFocusAnswerChange = useCallback(
    (text: string) => {
      setDailyFocusAnswer(text);
      updateDailyFocusSession((current) => ({ ...current, answer: text }));
    },
    [updateDailyFocusSession],
  );

  const handleAppendDailyFocusTranscript = useCallback(
    (transcript: string) => {
      setDailyFocusAnswer((currentAnswer) => {
        const nextAnswer = currentAnswer
          ? `${currentAnswer} ${transcript}`.replace(/\s+/g, " ").trim()
          : transcript.trim();
        updateDailyFocusSession((current) => ({
          ...current,
          answer: nextAnswer,
        }));
        return nextAnswer;
      });
    },
    [updateDailyFocusSession],
  );

  const handleRetryDailyFocus = useCallback(() => {
    setDailyFocus(null);
    setDailyFocusAnswer("");
    setDailyFocusError(null);
    void generateDailyFocus({
      force: true,
      existingQuestion: "",
      answer: todayDailyFocusRow?.answer || "",
    });
  }, [generateDailyFocus, todayDailyFocusRow?.answer]);

  const handleSubmitDailyFocusAnswer = useCallback(async () => {
    if (!dailyFocus || !dailyFocusAnswer.trim()) return;

    const nextSession = await generateDailyFocus({
      answer: dailyFocusAnswer,
      existingQuestion: dailyFocus.question,
      force: true,
    });

    if (nextSession) {
      showSuccessToast(
        nextSession.suggestions_unlocked
          ? isArabic
            ? "تم حفظ تقييم اليوم وتحديث الاقتراحات"
            : "Today's plan feedback was saved and suggestions were updated"
          : isArabic
            ? "تم حفظ تقييم اليوم"
            : "Today's plan feedback was saved",
      );
    }
  }, [
    dailyFocus,
    dailyFocusAnswer,
    generateDailyFocus,
    isArabic,
  ]);

  const handleAddDailyFocusSuggestion = useCallback(
    async (suggestionId: string) => {
      const suggestion = dailyFocus?.suggestions.find(
        (item) => item.id === suggestionId,
      );
      if (!suggestion) return;
      if (dailyFocus?.addedSuggestionIds.includes(suggestionId)) return;
      if (
        tasks.some(
          (task) =>
            task.task_description.trim().toLowerCase() ===
            suggestion.title.trim().toLowerCase(),
        )
      ) {
        showSuccessToast(
          isArabic ? "هذه المهمة موجودة أصلًا" : "This task already exists",
        );
        return;
      }

      setAddingSuggestionId(suggestionId);

      try {
        const preferredParentId =
          suggestion.target_type === "sub" &&
          hierarchy.some((main) => main.id === suggestion.parent_task_id)
            ? suggestion.parent_task_id
            : hierarchy[0]?.id || null;

        if (suggestion.target_type === "sub" && preferredParentId) {
          const siblingsCount = tasks.filter(
            (task) => task.parent_task_id === preferredParentId,
          ).length;

          const { error } = await supabase.from("sub_layers").insert({
            goal_id: goal.id,
            task_description: suggestion.title.trim(),
            frequency: suggestion.frequency,
            impact_weight: Math.max(1, Math.min(5, suggestion.impact_weight)),
            task_type: "sub",
            parent_task_id: preferredParentId,
            sort_order: siblingsCount,
            time_required_minutes: 0,
            completion_criteria: suggestion.reason || null,
          });

          if (error) throw error;

          setExpandedMains((current) => {
            const next = new Set(current);
            next.add(preferredParentId);
            return next;
          });
        } else {
          const mainCount = tasks.filter(
            (task) => (task.task_type || "main") === "main",
          ).length;

          const { error } = await supabase.from("sub_layers").insert({
            goal_id: goal.id,
            task_description: suggestion.title.trim(),
            frequency: suggestion.frequency,
            impact_weight: Math.max(1, Math.min(10, suggestion.impact_weight)),
            task_type: "main",
            parent_task_id: null,
            sort_order: mainCount,
            time_required_minutes: 0,
            completion_criteria: suggestion.reason || null,
          });

          if (error) throw error;
        }

        await fetchTasks();
        updateDailyFocusSession((current) => ({
          ...current,
          addedSuggestionIds: current.addedSuggestionIds.includes(suggestionId)
            ? current.addedSuggestionIds
            : [...current.addedSuggestionIds, suggestionId],
        }));
        showSuccessToast(
          isArabic ? "تمت إضافة الاقتراح إلى مهامك" : "Suggestion added to your tasks",
        );
      } catch (error) {
        console.error("Failed to add daily focus suggestion:", error);
        showSuccessToast(
          isArabic ? "تعذر إضافة هذا الاقتراح" : "Could not add this suggestion",
        );
      } finally {
        setAddingSuggestionId(null);
      }
    },
    [
      dailyFocus,
      fetchTasks,
      goal.id,
      hierarchy,
      isArabic,
      supabase,
      tasks,
      updateDailyFocusSession,
    ],
  );

  // --- Tab Config ---
  const tabItems: {
    key: DashboardTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "focus",
      label: t.dailyFocus,
      icon: <ListTodo className="w-4 h-4" />,
    },
    {
      key: "chart",
      label: t.growthTrajectory,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "challenge",
      label: t.challengeTab,
      icon: <Swords className="w-4 h-4" />,
    },
  ];

  // --- Render ---
  const taskCount = useMemo(() => {
    const subs = hierarchy.flatMap((m) => m.subtasks);
    return subs.length > 0 ? subs.length : hierarchy.length;
  }, [hierarchy]);
  const completedTaskCount = useMemo(() => {
    const subs = hierarchy.flatMap((m) => m.subtasks);
    if (subs.length > 0)
      return subs.filter((sub) => isChecked(sub.id, sub.frequency)).length;
    return hierarchy.filter((m) => isChecked(m.id, m.frequency)).length;
  }, [hierarchy, isChecked]);

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-3 pb-2 sm:pb-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* ===== Header Card ===== */}
      <DashboardHeader
        goal={goal}
        progress={progress}
        streak={streak}
        taskCount={taskCount}
        completedTaskCount={completedTaskCount}
        language={language}
        showGoalDetails={showGoalDetails}
        onToggleDetails={() => setShowGoalDetails(!showGoalDetails)}
        onTogglePin={handleTogglePin}
        onEditGoal={() => setShowGoalEditDialog(true)}
        onDeleteGoal={handleDeleteGoal}
        onUpdateIcon={handleUpdateIcon}
      />

      <GoalEditDialog
        goal={goal}
        open={showGoalEditDialog}
        onOpenChange={setShowGoalEditDialog}
        language={language}
        onSaved={() => {
          if (onGoalUpdated) onGoalUpdated();
          showSuccessToast(isArabic ? "تم تحديث الهدف" : "Goal updated");
        }}
      />

      <DailyFocusQuestionDialog
        open={showDailyFocusPrompt}
        onOpenChange={(open) => {
          setShowDailyFocusPrompt(open);
          if (!open) setDailyFocusPromptDismissed(true);
        }}
        language={language}
        isArabic={isArabic}
        dailyFocus={dailyFocus}
        loading={dailyFocusLoading}
        submitting={dailyFocusSubmitting}
        answer={dailyFocusAnswer}
        onAnswerChange={handleDailyFocusAnswerChange}
        onAppendTranscript={handleAppendDailyFocusTranscript}
        onSubmit={handleSubmitDailyFocusAnswer}
      />

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
              "flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === tab.key
                ? "bg-white dark:bg-background text-foreground border border-border/70"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {activeTab === "focus" && (
        <FocusTab
          language={language}
          isArabic={isArabic}
          dailyFocus={dailyFocus}
          dailyFocusLoading={dailyFocusLoading}
          dailyFocusSubmitting={dailyFocusSubmitting}
          dailyFocusAddingSuggestionId={addingSuggestionId}
          dailyFocusError={dailyFocusError}
          dailyFocusAnswer={dailyFocusAnswer}
          filteredHierarchy={filteredHierarchy}
          hierarchy={hierarchy}
          loadingTasks={loadingTasks}
          focusStats={focusStats}
          expandedMains={expandedMains}
          addingMain={addingMain}
          addingSubFor={addingSubFor}
          newMainText={newMainText}
          newMainFreq={newMainFreq}
          newMainWeight={newMainWeight}
          newMainColor={newMainColor}
          newMainAccent={newMainAccent}
          newSubText={newSubText}
          newSubFreq={newSubFreq}
          newSubWeight={newSubWeight}
          editingTaskId={editingTaskId}
          editingText={editingText}
          isChecked={isChecked}
          isCompletedToday={isCompletedToday}
          shouldAnimateTask={shouldAnimateTask}
          onToggleExpand={toggleExpand}
          onToggleCheckin={toggleCheckin}
          onOpenNewMainComposer={openNewMainComposer}
          onCloseNewMainComposer={closeNewMainComposer}
          onAddMain={handleAddMain}
          onStartAddingSub={handleStartAddingSub}
          onCancelAddingSub={() => setAddingSubFor(null)}
          onAddSub={handleAddSub}
          onStartEditingTask={handleStartEditingTask}
          onCancelEditingTask={() => setEditingTaskId(null)}
          onRenameTask={handleRenameTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTaskIcon={handleUpdateTaskIcon}
          onUpdateTaskColor={handleUpdateTaskColor}
          onUpdateTaskWeight={handleUpdateTaskWeight}
          onSetDailyFocusAnswer={handleDailyFocusAnswerChange}
          onAppendDailyFocusTranscript={handleAppendDailyFocusTranscript}
          onSubmitDailyFocusAnswer={handleSubmitDailyFocusAnswer}
          onRetryDailyFocus={handleRetryDailyFocus}
          onAddDailyFocusSuggestion={handleAddDailyFocusSuggestion}
          onSetNewMainText={setNewMainText}
          onSetNewMainFreq={setNewMainFreq}
          onSetNewMainWeight={setNewMainWeight}
          onSetNewMainColor={setNewMainColor}
          onSetNewSubText={setNewSubText}
          onSetNewSubFreq={setNewSubFreq}
          onSetNewSubWeight={setNewSubWeight}
          onSetEditingText={setEditingText}
        />
      )}

      {activeTab === "chart" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="w-full min-w-0 sm:flex sm:flex-1 sm:min-h-0">
              <GrowthChart
                data={chartData}
                language={language}
                fillHeight
                className="w-full"
              />
            </div>
            <div className="w-full min-w-0 sm:flex sm:w-[18rem] sm:flex-none">
              <DayCalendarGrid
                logs={logs}
                goalStartDate={goal.created_at}
                language={language}
              />
            </div>
          </div>
          <TaskInsights goalId={goal.id} tasks={tasks} language={language} />
        </div>
      )}

      {activeTab === "challenge" && (
        <ChallengeTab
          goalId={goal.id}
          currentPoints={goal.current_points}
          targetPoints={goal.target_points}
          language={language}
        />
      )}

      {/* ===== Log Modal ===== */}
      {showLogModal && (
        <ProgressLogDialog
          goal={goal}
          tasks={tasks}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            fetchTasks();
            fetchCheckins();
            fetchTodayLoggedTasks();
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
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        language={language}
      />

      {/* ===== Toast Notification ===== */}
      <ToastNotification visible={showToast} message={toastMessage} />
    </div>
  );
}
