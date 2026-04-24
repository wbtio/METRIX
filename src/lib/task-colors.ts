export type TaskColorKey =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'orange'
  | 'pink'
  | 'violet'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'fuchsia'
  | 'rose'
  | 'lime'
  | 'teal'
  | 'zinc';

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
  {
    key: 'cyan',
    labelEn: 'Cyan',
    labelAr: 'Cyan',
    fill: '#06b6d4',
    swatchClass: 'bg-cyan-500',
    softClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-cyan-500/25',
  },
  {
    key: 'blue',
    labelEn: 'Blue',
    labelAr: 'Blue',
    fill: '#3b82f6',
    swatchClass: 'bg-blue-500',
    softClass: 'bg-blue-500/10',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500/25',
  },
  {
    key: 'indigo',
    labelEn: 'Indigo',
    labelAr: 'Indigo',
    fill: '#6366f1',
    swatchClass: 'bg-indigo-500',
    softClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-500/25',
  },
  {
    key: 'fuchsia',
    labelEn: 'Fuchsia',
    labelAr: 'Fuchsia',
    fill: '#d946ef',
    swatchClass: 'bg-fuchsia-500',
    softClass: 'bg-fuchsia-500/10',
    textClass: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderClass: 'border-fuchsia-500/25',
  },
  {
    key: 'rose',
    labelEn: 'Rose',
    labelAr: 'Rose',
    fill: '#f43f5e',
    swatchClass: 'bg-rose-500',
    softClass: 'bg-rose-500/10',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-500/25',
  },
  {
    key: 'lime',
    labelEn: 'Lime',
    labelAr: 'Lime',
    fill: '#84cc16',
    swatchClass: 'bg-lime-500',
    softClass: 'bg-lime-500/10',
    textClass: 'text-lime-700 dark:text-lime-300',
    borderClass: 'border-lime-500/25',
  },
  {
    key: 'teal',
    labelEn: 'Teal',
    labelAr: 'Teal',
    fill: '#14b8a6',
    swatchClass: 'bg-teal-500',
    softClass: 'bg-teal-500/10',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/25',
  },
  {
    key: 'zinc',
    labelEn: 'Zinc',
    labelAr: 'Zinc',
    fill: '#71717a',
    swatchClass: 'bg-zinc-500',
    softClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-700 dark:text-zinc-300',
    borderClass: 'border-zinc-500/25',
  },
];

const taskAccentMap = new Map(TASK_COLOR_OPTIONS.map((accent) => [accent.key, accent]));
const AUTO_TASK_COLOR_OPTIONS = TASK_COLOR_OPTIONS.slice(0, 6);

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
  return AUTO_TASK_COLOR_OPTIONS[hashSeed(normalized) % AUTO_TASK_COLOR_OPTIONS.length]!;
}
