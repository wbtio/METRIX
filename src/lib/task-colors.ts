export type TaskColorKey = 'sky' | 'emerald' | 'amber' | 'orange' | 'pink' | 'violet';

export interface TaskAccent {
  key: TaskColorKey;
  labelEn: string;
  labelAr: string;
  fill: string;
  swatchClass: string;
  softClass: string;
  textClass: string;
  borderClass: string;
}

export const TASK_COLOR_OPTIONS: TaskAccent[] = [
  {
    key: 'sky',
    labelEn: 'Sky',
    labelAr: 'سماوي',
    fill: '#0ea5e9',
    swatchClass: 'bg-sky-500',
    softClass: 'bg-sky-500/10',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-500/25',
  },
  {
    key: 'emerald',
    labelEn: 'Emerald',
    labelAr: 'زمردي',
    fill: '#10b981',
    swatchClass: 'bg-emerald-500',
    softClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-500/25',
  },
  {
    key: 'amber',
    labelEn: 'Amber',
    labelAr: 'عنبر',
    fill: '#f59e0b',
    swatchClass: 'bg-amber-500',
    softClass: 'bg-amber-500/10',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/25',
  },
  {
    key: 'orange',
    labelEn: 'Orange',
    labelAr: 'برتقالي',
    fill: '#f97316',
    swatchClass: 'bg-orange-500',
    softClass: 'bg-orange-500/10',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-500/25',
  },
  {
    key: 'pink',
    labelEn: 'Pink',
    labelAr: 'وردي',
    fill: '#ec4899',
    swatchClass: 'bg-pink-500',
    softClass: 'bg-pink-500/10',
    textClass: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-500/25',
  },
  {
    key: 'violet',
    labelEn: 'Violet',
    labelAr: 'بنفسجي',
    fill: '#8b5cf6',
    swatchClass: 'bg-violet-500',
    softClass: 'bg-violet-500/10',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-500/25',
  },
];

const taskAccentMap = new Map(TASK_COLOR_OPTIONS.map((accent) => [accent.key, accent]));

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function normalizeTaskColorKey(value?: string | null): TaskColorKey | null {
  if (!value) return null;
  return taskAccentMap.has(value as TaskColorKey) ? (value as TaskColorKey) : null;
}

export function getTaskAccent(seed?: string | null, preferredColor?: string | null): TaskAccent {
  const explicitColor = normalizeTaskColorKey(preferredColor);
  if (explicitColor) {
    return taskAccentMap.get(explicitColor)!;
  }

  const normalized = (seed || 'task-accent').trim() || 'task-accent';
  return TASK_COLOR_OPTIONS[hashSeed(normalized) % TASK_COLOR_OPTIONS.length]!;
}
