import { formatNumberEn } from '@/lib/utils';

export type GoalEndDaysTone = 'soon' | 'today' | 'late';

export interface GoalEndDaysChip {
  text: string;
  tone: GoalEndDaysTone;
  title: string;
}

/** Calendar-day difference: end date minus today (negative = past end). */
export function calendarDaysUntilGoalEnd(isoDate: string | undefined | null): number | null {
  if (!isoDate) return null;
  const end = new Date(isoDate);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/** Label + tooltip for “days until goal end” UI (Home, Dashboard, etc.). */
export function getGoalEndDaysChip(
  isoDate: string | undefined | null,
  isArabic: boolean
): GoalEndDaysChip | null {
  const daysToEnd = calendarDaysUntilGoalEnd(isoDate);
  if (daysToEnd === null) return null;

  const endDateLabel =
    isoDate && !Number.isNaN(new Date(isoDate).getTime())
      ? new Date(isoDate).toLocaleDateString(isArabic ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const daysLabel = formatNumberEn(daysToEnd);

  if (daysToEnd > 0) {
    return {
      text: daysLabel,
      tone: 'soon',
      title: isArabic
        ? `${daysLabel} يوم متبقٍ حتى انتهاء الهدف (${endDateLabel})`
        : `${daysLabel} day${daysToEnd === 1 ? '' : 's'} left until goal end (${endDateLabel})`,
    };
  }
  if (daysToEnd === 0) {
    return {
      text: '0',
      tone: 'today',
      title: isArabic
        ? `آخر يوم لموعد انتهاء الهدف (${endDateLabel})`
        : `Goal end date is today (${endDateLabel})`,
    };
  }
  const late = -daysToEnd;
  const lateLabel = formatNumberEn(late);
  return {
    text: lateLabel,
    tone: 'late',
    title: isArabic
      ? `متأخر ${lateLabel} يومًا عن موعد انتهاء الهدف (${endDateLabel})`
      : `${lateLabel} day${late === 1 ? '' : 's'} past goal end (${endDateLabel})`,
  };
}
