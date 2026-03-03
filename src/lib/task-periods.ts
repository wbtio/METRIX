export type PeriodType = 'daily' | 'weekly';

function toLocalDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getLocalDateKey(date = new Date()): string {
  const local = toLocalDate(date);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalWeekStartMonday(date = new Date()): string {
  const local = toLocalDate(date);
  const jsDay = local.getDay(); // Sunday=0 ... Saturday=6
  const diffToMonday = (jsDay + 6) % 7; // Monday=0
  local.setDate(local.getDate() - diffToMonday);
  return getLocalDateKey(local);
}

export function getPeriodStart(frequency: string, date = new Date()): string {
  return frequency === 'weekly'
    ? getLocalWeekStartMonday(date)
    : getLocalDateKey(date);
}

export function getPeriodTypeFromFrequency(frequency: string): PeriodType {
  return frequency === 'weekly' ? 'weekly' : 'daily';
}
