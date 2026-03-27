export type TaskType = 'main' | 'sub';
export type TaskFrequency = 'daily' | 'weekly';

export interface TaskRow {
  id: string;
  goal_id: string;
  task_description: string;
  impact_weight: number;
  accent_color?: string | null;
  frequency: string;
  time_required_minutes?: number | null;
  completion_criteria?: string | null;
  task_type?: string | null;
  parent_task_id?: string | null;
  sort_order?: number | null;
  icon?: string | null;
}

export interface SubTask extends TaskRow {
  task_type: 'sub';
  parent_task_id: string;
  frequency: TaskFrequency;
  impact_weight: number;
}

export interface MainTask extends TaskRow {
  task_type: 'main';
  parent_task_id: null;
  impact_weight: number;
  subtasks: SubTask[];
}

export interface ScorableTask {
  id: string;
  task_description: string;
  impact_weight: number;
  frequency: TaskFrequency;
  parent_task_id?: string | null;
}

export interface SubtaskBreakdownItem {
  task_id: string;
  status: 'done' | 'partial' | 'missed' | 'unknown';
  points: number;
  reason?: string;
}

export interface MainBreakdownItem {
  main_task_id: string;
  main_task: string;
  total_points: number;
  max_points: number;
  status: 'done' | 'partial' | 'missed';
  completed_subtasks: number;
  total_subtasks: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeFrequency = (value?: string | null): TaskFrequency =>
  value === 'weekly' ? 'weekly' : 'daily';

const normalizeTaskType = (value?: string | null): TaskType =>
  value === 'sub' ? 'sub' : 'main';

export function normalizeTaskRow(task: TaskRow): TaskRow {
  const taskType = normalizeTaskType(task.task_type);
  const maxWeight = taskType === 'sub' ? 5 : 10;
  return {
    ...task,
    task_type: taskType,
    accent_color: task.accent_color || null,
    frequency: normalizeFrequency(task.frequency),
    impact_weight: clamp(Number(task.impact_weight) || 1, 1, maxWeight),
    sort_order: Number(task.sort_order) || 0,
    parent_task_id: taskType === 'sub' ? task.parent_task_id || null : null,
  };
}

export function buildTaskHierarchy(taskRows: TaskRow[]): MainTask[] {
  const normalized = taskRows.map(normalizeTaskRow);
  const mainMap = new Map<string, MainTask>();
  const subTasks: SubTask[] = [];

  for (const task of normalized) {
    if (task.task_type === 'sub') {
      if (!task.parent_task_id) continue;
      subTasks.push({
        ...task,
        task_type: 'sub',
        parent_task_id: task.parent_task_id,
        frequency: normalizeFrequency(task.frequency),
        impact_weight: clamp(Number(task.impact_weight) || 1, 1, 5),
      });
      continue;
    }

    mainMap.set(task.id, {
      ...task,
      task_type: 'main',
      parent_task_id: null,
      impact_weight: clamp(Number(task.impact_weight) || 1, 1, 10),
      subtasks: [],
    });
  }

  for (const sub of subTasks) {
    const parent = mainMap.get(sub.parent_task_id);
    if (parent) {
      parent.subtasks.push(sub);
      continue;
    }

    // Fallback for orphan sub-tasks in legacy/inconsistent data.
    const fallbackId = `orphan-${sub.goal_id}`;
    if (!mainMap.has(fallbackId)) {
      mainMap.set(fallbackId, {
        id: fallbackId,
        goal_id: sub.goal_id,
        task_description: 'General',
        impact_weight: 5,
        frequency: sub.frequency,
        time_required_minutes: null,
        completion_criteria: null,
        task_type: 'main',
        parent_task_id: null,
        sort_order: 999999,
        subtasks: [],
      });
    }
    mainMap.get(fallbackId)?.subtasks.push(sub);
  }

  const mains = Array.from(mainMap.values()).sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
  );

  for (const main of mains) {
    main.subtasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  return mains;
}

export function getScorableTasks(taskRows: TaskRow[]): ScorableTask[] {
  const mains = buildTaskHierarchy(taskRows);
  const subtasks = mains.flatMap((main) =>
    main.subtasks.map((sub) => ({
      id: sub.id,
      task_description: sub.task_description,
      impact_weight: clamp(Number(sub.impact_weight) || 1, 1, 5),
      frequency: normalizeFrequency(sub.frequency),
      parent_task_id: main.id,
    })),
  );

  if (subtasks.length > 0) {
    return subtasks;
  }

  // Legacy fallback: if no subtasks yet, score mains as if they were subtasks.
  return mains.map((main) => ({
    id: main.id,
    task_description: main.task_description,
    impact_weight: clamp(Math.round((Number(main.impact_weight) || 1) / 2), 1, 5),
    frequency: normalizeFrequency(main.frequency),
    parent_task_id: null,
  }));
}

export function calculateDailyCap(taskRows: TaskRow[]): number {
  const subtaskWeightSum = getScorableTasks(taskRows).reduce(
    (sum, task) => sum + (Number(task.impact_weight) || 0),
    0,
  );
  return Math.max(5, subtaskWeightSum + 5);
}

export function deriveMainBreakdown(
  mainTasks: MainTask[],
  subtaskBreakdown: SubtaskBreakdownItem[],
): MainBreakdownItem[] {
  const breakdownMap = new Map(
    subtaskBreakdown.map((item) => [item.task_id, item]),
  );

  return mainTasks
    .map((main) => {
      const scopedSubtasks = main.subtasks;
      if (scopedSubtasks.length === 0) {
        return {
          main_task_id: main.id,
          main_task: main.task_description,
          total_points: 0,
          max_points: 0,
          status: 'missed' as const,
          completed_subtasks: 0,
          total_subtasks: 0,
        };
      }

      const maxPoints = scopedSubtasks.reduce(
        (sum, sub) => sum + (Number(sub.impact_weight) || 0),
        0,
      );

      let points = 0;
      let doneCount = 0;
      let partialCount = 0;

      for (const sub of scopedSubtasks) {
        const item = breakdownMap.get(sub.id);
        if (!item) continue;
        points += Number(item.points) || 0;
        if (item.status === 'done') doneCount += 1;
        if (item.status === 'partial') partialCount += 1;
      }

      let status: 'done' | 'partial' | 'missed' = 'missed';
      if (doneCount === scopedSubtasks.length && scopedSubtasks.length > 0) {
        status = 'done';
      } else if (doneCount > 0 || partialCount > 0 || points > 0) {
        status = 'partial';
      }

      return {
        main_task_id: main.id,
        main_task: main.task_description,
        total_points: points,
        max_points: maxPoints,
        status,
        completed_subtasks: doneCount,
        total_subtasks: scopedSubtasks.length,
      };
    })
    .filter((item) => item.total_subtasks > 0 || item.max_points > 0);
}
