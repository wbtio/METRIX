import { type Language } from '@/lib/translations';

export type DailyPerformanceTier = 'weak' | 'average' | 'strong' | 'exceptional';
export type DailyPerformanceTrend = 'below_usual' | 'at_usual' | 'above_usual' | 'no_history';
export type DailyEvidenceLevel = 'thin' | 'solid' | 'detailed' | 'manual';
export type DailyWarningLevel = 'none' | 'watch' | 'high';

export interface DailyLogBreakdownItem {
  task_id: string;
  status?: 'done' | 'partial' | 'missed' | 'unknown';
  points?: number;
  reason?: string;
  time_bonus?: number;
  bonus?: number;
}

export interface DailyLogPerformanceMeta {
  performance_tier: DailyPerformanceTier;
  trend: DailyPerformanceTrend;
  badge: 'none' | 'strong' | 'exceptional';
  warning_level: DailyWarningLevel;
  evidence_level: DailyEvidenceLevel;
  total_points: number;
  base_points: number;
  bonus_points: number;
  daily_cap: number;
  max_base_points: number;
  score_ratio: number;
  completion_ratio: number;
  coverage_ratio: number;
  completed_tasks: number;
  partial_tasks: number;
  missed_tasks: number;
  total_tasks: number;
  recent_average: number | null;
  compared_days: number;
  delta_from_recent: number | null;
  session_state?: 'open' | 'final';
  entries_count?: number;
  last_update_at?: string | null;
  last_evaluated_score?: number | null;
  awarded_points_so_far?: number;
  delta_awarded?: number;
}

export interface DailyLogBreakdownPayload {
  version: number;
  items: DailyLogBreakdownItem[];
  meta?: DailyLogPerformanceMeta;
  milestone?: {
    tier: 'minor' | 'major' | 'legendary';
    imageUrl: string;
    name: string;
    description: string;
  };
}

export interface DailyPerformanceCopy {
  day_label: string;
  coach_message: string;
  comparison_message: string | null;
  warning_message: string | null;
  full_feedback: string;
}

interface AnalyzeDailyPerformanceParams {
  source: 'ai' | 'manual';
  language: Language;
  logText?: string;
  items: DailyLogBreakdownItem[];
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  dailyCap: number;
  maxBasePoints: number;
  totalTasks: number;
  previousLogs?: Array<{
    created_at?: string | null;
    ai_score?: number | null;
  }>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const roundToSingle = (value: number) => Math.round(value * 10) / 10;

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeBreakdownItem(value: unknown): DailyLogBreakdownItem | null {
  if (!value || typeof value !== 'object') return null;

  const row = value as Record<string, unknown>;
  const taskId = typeof row.task_id === 'string' ? row.task_id : '';
  if (!taskId) return null;

  const status = row.status;
  const normalizedStatus =
    status === 'done' || status === 'partial' || status === 'missed' || status === 'unknown'
      ? status
      : undefined;

  const timeBonus = Math.max(
    0,
    Number(
      row.time_bonus !== undefined
        ? row.time_bonus
        : row.bonus !== undefined
          ? row.bonus
          : 0,
    ) || 0,
  );

  return {
    task_id: taskId,
    status: normalizedStatus,
    points: Math.max(0, Number(row.points) || 0),
    reason: typeof row.reason === 'string' ? row.reason : undefined,
    time_bonus: timeBonus > 0 ? timeBonus : undefined,
  };
}

function normalizePerformanceMeta(value: unknown): DailyLogPerformanceMeta | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const row = value as Record<string, unknown>;
  const performanceTier = row.performance_tier;
  if (
    performanceTier !== 'weak' &&
    performanceTier !== 'average' &&
    performanceTier !== 'strong' &&
    performanceTier !== 'exceptional'
  ) {
    return undefined;
  }

  const trend = row.trend;
  const normalizedTrend: DailyPerformanceTrend =
    trend === 'below_usual' || trend === 'at_usual' || trend === 'above_usual' || trend === 'no_history'
      ? trend
      : 'no_history';

  const badge = row.badge;
  const normalizedBadge = badge === 'strong' || badge === 'exceptional' ? badge : 'none';

  const warningLevel = row.warning_level;
  const normalizedWarningLevel: DailyWarningLevel =
    warningLevel === 'watch' || warningLevel === 'high' ? warningLevel : 'none';

  const evidenceLevel = row.evidence_level;
  const normalizedEvidenceLevel: DailyEvidenceLevel =
    evidenceLevel === 'thin' ||
    evidenceLevel === 'solid' ||
    evidenceLevel === 'detailed' ||
    evidenceLevel === 'manual'
      ? evidenceLevel
      : 'solid';

  return {
    performance_tier: performanceTier,
    trend: normalizedTrend,
    badge: normalizedBadge,
    warning_level: normalizedWarningLevel,
    evidence_level: normalizedEvidenceLevel,
    total_points: Math.max(0, Number(row.total_points) || 0),
    base_points: Math.max(0, Number(row.base_points) || 0),
    bonus_points: Math.max(0, Number(row.bonus_points) || 0),
    daily_cap: Math.max(1, Number(row.daily_cap) || 1),
    max_base_points: Math.max(1, Number(row.max_base_points) || 1),
    score_ratio: clamp(Number(row.score_ratio) || 0, 0, 1.5),
    completion_ratio: clamp(Number(row.completion_ratio) || 0, 0, 1.5),
    coverage_ratio: clamp(Number(row.coverage_ratio) || 0, 0, 1.5),
    completed_tasks: Math.max(0, Number(row.completed_tasks) || 0),
    partial_tasks: Math.max(0, Number(row.partial_tasks) || 0),
    missed_tasks: Math.max(0, Number(row.missed_tasks) || 0),
    total_tasks: Math.max(0, Number(row.total_tasks) || 0),
    recent_average: row.recent_average === null ? null : Number(row.recent_average) || 0,
    compared_days: Math.max(0, Number(row.compared_days) || 0),
    delta_from_recent: row.delta_from_recent === null ? null : Number(row.delta_from_recent) || 0,
    session_state: row.session_state === 'final' ? 'final' : row.session_state === 'open' ? 'open' : undefined,
    entries_count: row.entries_count === undefined ? undefined : Math.max(0, Number(row.entries_count) || 0),
    last_update_at: typeof row.last_update_at === 'string' ? row.last_update_at : null,
    last_evaluated_score: row.last_evaluated_score === undefined ? null : Math.max(0, Number(row.last_evaluated_score) || 0),
    awarded_points_so_far: row.awarded_points_so_far === undefined ? undefined : Math.max(0, Number(row.awarded_points_so_far) || 0),
    delta_awarded: row.delta_awarded === undefined ? undefined : Math.max(0, Number(row.delta_awarded) || 0),
  };
}

export function parseDailyLogBreakdown(value: unknown): DailyLogBreakdownPayload {
  const parsed = typeof value === 'string' ? safeJsonParse(value) : value;

  if (Array.isArray(parsed)) {
    return {
      version: 1,
      items: parsed
        .map(normalizeBreakdownItem)
        .filter((item): item is DailyLogBreakdownItem => Boolean(item)),
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { version: 1, items: [] };
  }

  const row = parsed as Record<string, unknown>;
  const itemsSource = Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.task_breakdown)
      ? row.task_breakdown
      : [];

  return {
    version: Math.max(1, Number(row.version) || 2),
    items: itemsSource
      .map(normalizeBreakdownItem)
      .filter((item): item is DailyLogBreakdownItem => Boolean(item)),
    meta: normalizePerformanceMeta(row.meta),
    milestone: row.milestone as DailyLogBreakdownPayload['milestone'],
  };
}

export function buildDailyLogBreakdown(
  items: DailyLogBreakdownItem[],
  meta?: DailyLogPerformanceMeta,
  milestone?: DailyLogBreakdownPayload['milestone'],
): DailyLogBreakdownPayload {
  return {
    version: 2,
    items: items
      .map(normalizeBreakdownItem)
      .filter((item): item is DailyLogBreakdownItem => Boolean(item)),
    meta,
    milestone,
  };
}

export function getAwardedPointsSoFar(meta: DailyLogPerformanceMeta | undefined, fallbackScore = 0) {
  return Math.max(0, Number(meta?.awarded_points_so_far) || fallbackScore || 0);
}

function getRecentDailyScores(
  previousLogs: AnalyzeDailyPerformanceParams['previousLogs'] = [],
) {
  const grouped = new Map<string, number>();

  previousLogs.forEach((log) => {
    const dateKey = typeof log.created_at === 'string' ? log.created_at.split('T')[0] : '';
    if (!dateKey) return;

    grouped.set(dateKey, (grouped.get(dateKey) || 0) + (Number(log.ai_score) || 0));
  });

  const recentScores = Array.from(grouped.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .slice(0, 7)
    .map(([, score]) => score);

  if (recentScores.length === 0) {
    return {
      average: null as number | null,
      comparedDays: 0,
    };
  }

  const average = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

  return {
    average: roundToSingle(average),
    comparedDays: recentScores.length,
  };
}

function getEvidenceLevel(source: 'ai' | 'manual', logText?: string): DailyEvidenceLevel {
  if (source === 'manual') {
    return 'manual';
  }

  const normalized = (logText || '').trim();
  if (!normalized) {
    return 'thin';
  }

  const wordCount = normalized.split(/\s+/).length;
  const numericMentions = normalized.match(/\d+/g)?.length || 0;
  const mentionsTime =
    /\b(min|mins|minute|minutes|hour|hours|hr|hrs)\b/i.test(normalized) ||
    /دقيقة|دقائق|ساعة|ساعات/.test(normalized);

  if (wordCount >= 18 && (numericMentions >= 2 || mentionsTime)) {
    return 'detailed';
  }

  if (wordCount >= 10 || numericMentions >= 1 || mentionsTime) {
    return 'solid';
  }

  return 'thin';
}

function getPerformanceLabel(tier: DailyPerformanceTier, language: Language) {
  if (language === 'ar') {
    switch (tier) {
      case 'exceptional':
        return 'يوم استثنائي';
      case 'strong':
        return 'يوم قوي';
      case 'average':
        return 'يوم متوسط';
      case 'weak':
      default:
        return 'يوم ضعيف';
    }
  }

  switch (tier) {
    case 'exceptional':
      return 'Exceptional Day';
    case 'strong':
      return 'Strong Day';
    case 'average':
      return 'Average Day';
    case 'weak':
    default:
      return 'Weak Day';
  }
}

function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function buildCoachMessage(
  meta: DailyLogPerformanceMeta,
  language: Language,
  source: 'ai' | 'manual',
) {
  const completionPercent = Math.round(clamp(meta.completion_ratio, 0, 1) * 100);

  const baseMessage =
    language === 'ar'
      ? meta.performance_tier === 'exceptional'
        ? `هذا يوم استثنائي. غطيت ${formatNumber(completionPercent, language)}% من الحمل المخطط له ودفعت الهدف للأمام بقوة واضحة.`
        : meta.performance_tier === 'strong'
          ? `هذا يوم قوي. غطيت ${formatNumber(completionPercent, language)}% من الحمل المخطط له وأنجزت ما له وزن فعلي على الهدف.`
          : meta.performance_tier === 'average'
            ? `هذا يوم متوسط. غطيت ${formatNumber(completionPercent, language)}% من الحمل المخطط له، وهذا مقبول لكنه لا يزال يحتاج رفعاً.`
            : `هذا يوم ضعيف. غطيت فقط ${formatNumber(completionPercent, language)}% من الحمل المخطط له، وهذا أقل من المطلوب لهدفك.`
      : meta.performance_tier === 'exceptional'
        ? `Exceptional Day. You covered ${formatNumber(completionPercent, language)}% of the planned workload and pushed the goal forward with real force.`
        : meta.performance_tier === 'strong'
          ? `Strong Day. You covered ${formatNumber(completionPercent, language)}% of the planned workload and moved the goal forward with real weight.`
          : meta.performance_tier === 'average'
            ? `Average Day. You covered ${formatNumber(completionPercent, language)}% of the planned workload. Acceptable, but it still needs to go higher.`
            : `Weak Day. You only covered ${formatNumber(completionPercent, language)}% of the planned workload. That is below what your goal requires.`;

  if (source === 'manual' || meta.evidence_level !== 'thin' || meta.performance_tier === 'strong' || meta.performance_tier === 'exceptional') {
    return baseMessage;
  }

  return language === 'ar'
    ? `${baseMessage} والوصف كان عاماً أكثر من اللازم ليبرر تقييماً أعلى.`
    : `${baseMessage} The log was too vague to justify a higher score.`;
}

function buildComparisonMessage(meta: DailyLogPerformanceMeta, language: Language) {
  if (meta.compared_days === 0 || meta.recent_average === null || meta.delta_from_recent === null) {
    return language === 'ar'
      ? 'هذا اليوم ما يزال يبني خط الأساس لمستواك في هذا الهدف.'
      : 'This day is still helping build your baseline for this goal.';
  }

  const delta = roundToSingle(Math.abs(meta.delta_from_recent));

  if (meta.trend === 'above_usual') {
    return language === 'ar'
      ? `أنت اليوم أفضل من مستواك المعتاد بحوالي ${formatNumber(delta, language)} نقطة مقارنة بآخر ${formatNumber(meta.compared_days, language)} أيام مسجلة.`
      : `You performed above your usual level today by about ${formatNumber(delta, language)} points versus the last ${formatNumber(meta.compared_days, language)} logged days.`;
  }

  if (meta.trend === 'below_usual') {
    return language === 'ar'
      ? `أنت اليوم أضعف من مستواك المعتاد بحوالي ${formatNumber(delta, language)} نقطة مقارنة بآخر ${formatNumber(meta.compared_days, language)} أيام مسجلة.`
      : `You were below your usual level today by about ${formatNumber(delta, language)} points versus the last ${formatNumber(meta.compared_days, language)} logged days.`;
  }

  return language === 'ar'
    ? `أنت اليوم قريب من مستواك المعتاد عبر آخر ${formatNumber(meta.compared_days, language)} أيام مسجلة.`
    : `You were close to your usual level today across the last ${formatNumber(meta.compared_days, language)} logged days.`;
}

function buildWarningMessage(meta: DailyLogPerformanceMeta, language: Language) {
  if (meta.warning_level === 'none') {
    return null;
  }

  if (meta.warning_level === 'high') {
    return language === 'ar'
      ? 'إذا تكرر هذا المستوى، فأنت تخسر الزخم وسيتباطأ تقدم الهدف بشكل واضح.'
      : 'If this level repeats, you lose momentum and the goal will slow down in a visible way.';
  }

  return language === 'ar'
    ? 'هذا المستوى ليس ضعيفاً جداً، لكنه لا يكفي إذا كنت تريد رفع سرعتك نحو الهدف.'
    : 'This level is not a collapse, but it is not enough if you expect faster progress toward the goal.';
}

export function buildFeedbackSnapshot(copy: {
  coach_message: string;
  comparison_message?: string | null;
  warning_message?: string | null;
}) {
  return [copy.coach_message, copy.comparison_message, copy.warning_message]
    .filter((item): item is string => Boolean(item))
    .join(' ');
}

export function analyzeDailyPerformance({
  source,
  language,
  logText,
  items,
  totalPoints,
  basePoints,
  bonusPoints,
  dailyCap,
  maxBasePoints,
  totalTasks,
  previousLogs = [],
}: AnalyzeDailyPerformanceParams): {
  meta: DailyLogPerformanceMeta;
  copy: DailyPerformanceCopy;
} {
  const normalizedItems = items
    .map(normalizeBreakdownItem)
    .filter((item): item is DailyLogBreakdownItem => Boolean(item));

  const completedTasks = normalizedItems.filter((item) => item.status === 'done').length;
  const partialTasks = normalizedItems.filter((item) => item.status === 'partial').length;
  const engagedTasks = completedTasks + partialTasks;
  const safeTotalTasks = Math.max(
    totalTasks,
    normalizedItems.length,
    engagedTasks,
    1,
  );
  const missedTasks = Math.max(0, safeTotalTasks - engagedTasks);

  const scoreRatio = clamp(totalPoints / Math.max(dailyCap, 1), 0, 1.5);
  const completionRatio = clamp(basePoints / Math.max(maxBasePoints, 1), 0, 1.5);
  const coverageRatio = clamp((completedTasks + partialTasks * 0.5) / safeTotalTasks, 0, 1);
  const evidenceLevel = getEvidenceLevel(source, logText);
  const evidenceScore =
    evidenceLevel === 'detailed'
      ? 1
      : evidenceLevel === 'solid'
        ? 0.72
        : evidenceLevel === 'manual'
          ? 0.7
          : 0.38;
  const bonusRatio = clamp(bonusPoints / Math.max(1, dailyCap - maxBasePoints || 5), 0, 1);
  const accountabilityIndex = clamp(
    completionRatio * 0.65 + coverageRatio * 0.2 + evidenceScore * 0.1 + bonusRatio * 0.05,
    0,
    1,
  );

  const recent = getRecentDailyScores(previousLogs);
  const recentAverage = recent.average;
  const deltaFromRecent = recentAverage === null ? null : roundToSingle(totalPoints - recentAverage);

  let trend: DailyPerformanceTrend = 'no_history';
  if (recentAverage !== null) {
    const aboveThreshold = Math.max(recentAverage * 1.2, recentAverage + 2);
    const belowThreshold = recentAverage <= 2 ? 0 : Math.min(recentAverage * 0.75, recentAverage - 2);

    if (totalPoints >= aboveThreshold) {
      trend = 'above_usual';
    } else if (totalPoints <= belowThreshold) {
      trend = 'below_usual';
    } else {
      trend = 'at_usual';
    }
  }

  let performanceTier: DailyPerformanceTier = 'weak';
  if (
    accountabilityIndex >= 0.82 ||
    (accountabilityIndex >= 0.72 &&
      trend === 'above_usual' &&
      totalPoints >= Math.max((recentAverage || 0) + 4, 8))
  ) {
    performanceTier = 'exceptional';
  } else if (
    accountabilityIndex >= 0.62 ||
    (completionRatio >= 0.55 && trend === 'above_usual')
  ) {
    performanceTier = 'strong';
  } else if (
    accountabilityIndex >= 0.36 ||
    totalPoints >= Math.max(3, Math.round(maxBasePoints * 0.25))
  ) {
    performanceTier = 'average';
  }

  const warningLevel: DailyWarningLevel =
    performanceTier === 'weak'
      ? 'high'
      : trend === 'below_usual' || (performanceTier === 'average' && scoreRatio < 0.45)
        ? 'watch'
        : 'none';

  const meta: DailyLogPerformanceMeta = {
    performance_tier: performanceTier,
    trend,
    badge:
      performanceTier === 'exceptional'
        ? 'exceptional'
        : performanceTier === 'strong'
          ? 'strong'
          : 'none',
    warning_level: warningLevel,
    evidence_level: evidenceLevel,
    total_points: totalPoints,
    base_points: basePoints,
    bonus_points: bonusPoints,
    daily_cap: Math.max(dailyCap, 1),
    max_base_points: Math.max(maxBasePoints, 1),
    score_ratio: roundToSingle(scoreRatio),
    completion_ratio: roundToSingle(completionRatio),
    coverage_ratio: roundToSingle(coverageRatio),
    completed_tasks: completedTasks,
    partial_tasks: partialTasks,
    missed_tasks: missedTasks,
    total_tasks: safeTotalTasks,
    recent_average: recentAverage,
    compared_days: recent.comparedDays,
    delta_from_recent: deltaFromRecent,
  };

  const copy = {
    day_label: getPerformanceLabel(performanceTier, language),
    coach_message: buildCoachMessage(meta, language, source),
    comparison_message: buildComparisonMessage(meta, language),
    warning_message: buildWarningMessage(meta, language),
    full_feedback: '',
  } satisfies Omit<DailyPerformanceCopy, 'full_feedback'> & { full_feedback: string };

  copy.full_feedback = buildFeedbackSnapshot(copy);

  return {
    meta,
    copy,
  };
}

export function getDailyPerformanceLabel(
  meta: DailyLogPerformanceMeta | undefined,
  language: Language,
) {
  if (!meta) return null;
  return getPerformanceLabel(meta.performance_tier, language);
}
