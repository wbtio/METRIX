import type { TaskRow } from '@/lib/task-hierarchy';

export type DailyFocusSuggestionTarget = 'main' | 'sub';

export interface DailyFocusGoalContext {
  id: string;
  title: string;
  ai_summary?: string;
  created_at?: string;
  current_points?: number;
  target_points?: number;
}

export interface DailyFocusLogContext {
  created_at: string;
  user_input?: string | null;
  ai_score?: number | null;
  ai_feedback?: string | null;
  breakdown?: unknown;
}

export interface DailyFocusHistoryItem {
  prompt_date: string;
  question: string;
  answer: string;
  answer_coaching?: string | null;
  answered_at?: string | null;
}

export interface DailyFocusEntryRow {
  id: string;
  goal_id: string;
  user_id?: string;
  prompt_date: string;
  angle_label?: string | null;
  question: string;
  question_why?: string | null;
  answer?: string | null;
  answer_coaching?: string | null;
  suggestions?: unknown;
  created_at?: string;
  updated_at?: string;
  answered_at?: string | null;
}

export type DailyFocusSupportType = 'goal_task' | 'external_booster';

export interface DailyFocusSuggestion {
  id: string;
  title: string;
  reason: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  impact_weight: number;
  target_type: DailyFocusSuggestionTarget;
  parent_task_id: string | null;
  support_type: DailyFocusSupportType;
}

export interface DailyFocusResult {
  status: 'ok' | 'refused';
  date: string;
  angle_label: string;
  question: string;
  question_why: string;
  answer_coaching: string;
  suggestions: DailyFocusSuggestion[];
  suggestions_unlocked: boolean;
  answered_days_count: number;
  required_answer_days: number;
  safe_redirection?: {
    message?: string;
    alternatives?: string[];
  };
}

export interface DailyFocusSession extends DailyFocusResult {
  id?: string;
  answer: string;
  answered_at: string | null;
  addedSuggestionIds: string[];
}

export interface DailyFocusRequestPayload {
  goal: DailyFocusGoalContext;
  tasks: TaskRow[];
  logs?: DailyFocusLogContext[];
  history?: DailyFocusHistoryItem[];
  answer?: string;
  existingQuestion?: string;
  date?: string;
}

const DAILY_FOCUS_ID_PREFIX = 'daily-focus';
export const DAILY_FOCUS_REQUIRED_DAYS = 1;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeFrequency(value: unknown): 'daily' | 'weekly' {
  return value === 'weekly' ? 'weekly' : 'daily';
}

function normalizeSuggestion(
  value: unknown,
  index: number,
): DailyFocusSuggestion | null {
  if (!isRecord(value)) return null;

  const rawTargetType = value.target_type;
  const targetType: DailyFocusSuggestionTarget =
    rawTargetType === 'sub' ? 'sub' : 'main';

  const title =
    typeof value.title === 'string'
      ? value.title.trim()
      : typeof value.task === 'string'
        ? value.task.trim()
        : '';

  if (!title) return null;

  const rawWeight = Number(value.impact_weight) || Number(value.weight) || 1;
  const maxWeight = targetType === 'sub' ? 5 : 10;

  const rawSupport = value.support_type;
  const supportType: DailyFocusSupportType =
    rawSupport === 'external_booster' ? 'external_booster' : 'goal_task';

  return {
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id.trim()
        : `${DAILY_FOCUS_ID_PREFIX}-${index + 1}`,
    title,
    reason:
      typeof value.reason === 'string'
        ? value.reason.trim()
        : typeof value.why === 'string'
          ? value.why.trim()
          : '',
    emoji:
      typeof value.emoji === 'string' && value.emoji.trim()
        ? value.emoji.trim()
        : supportType === 'external_booster' ? '⚡' : '🎯',
    frequency: normalizeFrequency(value.frequency),
    impact_weight: clamp(rawWeight, 1, maxWeight),
    target_type: supportType === 'external_booster' ? 'main' : targetType,
    parent_task_id:
      supportType === 'external_booster'
        ? null
        : targetType === 'sub' && typeof value.parent_task_id === 'string'
          ? value.parent_task_id
          : null,
    support_type: supportType,
  };
}

export function normalizeDailyFocusResult(
  value: unknown,
  fallbackDate: string,
): DailyFocusResult | null {
  if (!isRecord(value)) return null;

  const status = value.status === 'refused' ? 'refused' : 'ok';
  const question =
    typeof value.question === 'string' ? value.question.trim() : '';

  if (!question && status === 'ok') return null;

  const suggestionsSource = Array.isArray(value.suggestions)
    ? value.suggestions
    : Array.isArray(value.suggested_tasks)
      ? value.suggested_tasks
      : [];

  return {
    status,
    date:
      typeof value.date === 'string' && value.date.trim()
        ? value.date.trim()
        : fallbackDate,
    angle_label:
      typeof value.angle_label === 'string' ? value.angle_label.trim() : '',
    question,
    question_why:
      typeof value.question_why === 'string'
        ? value.question_why.trim()
        : typeof value.why_this_question === 'string'
          ? value.why_this_question.trim()
          : '',
    answer_coaching:
      typeof value.answer_coaching === 'string'
        ? value.answer_coaching.trim()
        : '',
    suggestions_unlocked: Boolean(value.suggestions_unlocked),
    answered_days_count: Math.max(0, Number(value.answered_days_count) || 0),
    required_answer_days: Math.max(
      1,
      Number(value.required_answer_days) || DAILY_FOCUS_REQUIRED_DAYS,
    ),
    suggestions: suggestionsSource
      .map((item, index) => normalizeSuggestion(item, index))
      .filter((item): item is DailyFocusSuggestion => Boolean(item)),
    safe_redirection: isRecord(value.safe_redirection)
      ? {
          message:
            typeof value.safe_redirection.message === 'string'
              ? value.safe_redirection.message
              : undefined,
          alternatives: Array.isArray(value.safe_redirection.alternatives)
            ? value.safe_redirection.alternatives.filter(
                (item): item is string => typeof item === 'string',
              )
            : undefined,
        }
      : undefined,
  };
}

export function normalizeDailyFocusSession(
  value: unknown,
): DailyFocusSession | null {
  if (!isRecord(value)) return null;

  const result = normalizeDailyFocusResult(value, '');
  if (!result) return null;

  return {
    ...result,
    id: typeof value.id === 'string' ? value.id : undefined,
    answer: typeof value.answer === 'string' ? value.answer : '',
    answered_at:
      typeof value.answered_at === 'string' ? value.answered_at : null,
    addedSuggestionIds: Array.isArray(value.addedSuggestionIds)
      ? value.addedSuggestionIds.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
  };
}

export function normalizeDailyFocusEntryRow(
  value: unknown,
): DailyFocusEntryRow | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.goal_id !== 'string') return null;
  if (typeof value.prompt_date !== 'string' || typeof value.question !== 'string') return null;

  return {
    id: value.id,
    goal_id: value.goal_id,
    user_id: typeof value.user_id === 'string' ? value.user_id : undefined,
    prompt_date: value.prompt_date,
    angle_label: typeof value.angle_label === 'string' ? value.angle_label : null,
    question: value.question,
    question_why: typeof value.question_why === 'string' ? value.question_why : null,
    answer: typeof value.answer === 'string' ? value.answer : null,
    answer_coaching:
      typeof value.answer_coaching === 'string' ? value.answer_coaching : null,
    suggestions: value.suggestions,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : undefined,
    answered_at: typeof value.answered_at === 'string' ? value.answered_at : null,
  };
}

export function buildDailyFocusSessionFromRow(
  row: DailyFocusEntryRow,
  options?: {
    answeredDaysCount?: number;
    requiredAnswerDays?: number;
  },
): DailyFocusSession {
  const normalizedSuggestions =
    (Array.isArray(row.suggestions) ? row.suggestions : []).map((item, index) =>
      normalizeSuggestion(item, index),
    ).filter((item): item is DailyFocusSuggestion => Boolean(item));

  const requiredAnswerDays = Math.max(
    1,
    options?.requiredAnswerDays || DAILY_FOCUS_REQUIRED_DAYS,
  );
  const answeredDaysCount = Math.max(0, options?.answeredDaysCount || 0);

  return {
    id: row.id,
    status: 'ok',
    date: row.prompt_date,
    angle_label: row.angle_label || '',
    question: row.question,
    question_why: row.question_why || '',
    answer_coaching: row.answer_coaching || '',
    suggestions: normalizedSuggestions,
    suggestions_unlocked: answeredDaysCount >= requiredAnswerDays,
    answered_days_count: answeredDaysCount,
    required_answer_days: requiredAnswerDays,
    answer: row.answer || '',
    answered_at: row.answered_at || null,
    addedSuggestionIds: [],
  };
}

export function buildDailyFocusHistory(
  rows: DailyFocusEntryRow[],
): DailyFocusHistoryItem[] {
  return rows
    .filter((row) => row.answer && row.answered_at)
    .map((row) => ({
      prompt_date: row.prompt_date,
      question: row.question,
      answer: row.answer || '',
      answer_coaching: row.answer_coaching || null,
      answered_at: row.answered_at || null,
    }));
}

export function compactDailyFocusLogs(logs: DailyFocusLogContext[]) {
  return logs.slice(0, 8).map((log) => ({
    created_at: log.created_at,
    ai_score: log.ai_score ?? null,
    ai_feedback: log.ai_feedback ?? null,
    user_input: typeof log.user_input === 'string' ? log.user_input.slice(0, 400) : '',
  }));
}
