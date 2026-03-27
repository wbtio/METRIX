'use client';

import { type ElementType, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { AlignLeft, Calendar, CalendarDays, Loader2, Sparkles, Target } from 'lucide-react';
import { translations, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPicker } from './IconPicker';

interface EditableGoal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  created_at: string;
  estimated_completion_date: string;
  total_days?: number;
  ai_summary?: string;
  icon?: string;
}

interface GoalEditDialogProps {
  goal: EditableGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  language?: Language;
}

interface DatePopoverFieldProps {
  icon: ElementType;
  isArabic: boolean;
  label: string;
  locale: typeof arSA | typeof enUS;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  minDate?: string;
}

const getDateInputValue = (value?: string | null) => {
  if (!value) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  const plainDate = value.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(plainDate)) {
    return plainDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  return format(parsed, 'yyyy-MM-dd');
};

const dateInputToDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const dateInputToStableIso = (value: string) => `${value}T12:00:00.000Z`;

const getGoalDays = (startDate: string, endDate: string) => {
  const start = dateInputToDate(startDate);
  const end = dateInputToDate(endDate);
  const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffInDays);
};

function DatePopoverField({
  icon: Icon,
  isArabic,
  label,
  locale,
  onChange,
  placeholder,
  value,
  minDate,
}: DatePopoverFieldProps) {
  const minimumDate = minDate ? dateInputToDate(minDate) : undefined;

  return (
    <div className="space-y-2">
      <Label className={cn('flex items-center gap-2 text-sm font-semibold', isArabic && 'flex-row-reverse justify-end')}>
        <span>{label}</span>
        <Icon className="size-3.5 text-primary/70" />
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-12 w-full rounded-2xl border-border/70 bg-background/90 px-4 font-normal shadow-sm',
              isArabic ? 'flex-row-reverse justify-end text-right' : 'justify-start text-left',
              !value && 'text-muted-foreground',
            )}
          >
            <Calendar className="size-4 shrink-0 text-primary/60" />
            <span className="truncate">
              {value ? format(dateInputToDate(value), 'PPP', { locale }) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto border-border/60 p-0 shadow-lg"
          align={isArabic ? 'end' : 'start'}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <ShadcnCalendar
            mode="single"
            selected={value ? dateInputToDate(value) : undefined}
            onSelect={(date: Date | undefined) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
            initialFocus
            captionLayout="dropdown"
            locale={locale}
            dir={isArabic ? 'rtl' : 'ltr'}
            fromYear={2020}
            toYear={2035}
            disabled={minimumDate ? (date) => date < minimumDate : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function GoalEditDialog({
  goal,
  open,
  onOpenChange,
  onSaved,
  language = 'en',
}: GoalEditDialogProps) {
  const supabase = createClient();
  const t = translations[language];
  const isArabic = language === 'ar';
  const locale = isArabic ? arSA : enUS;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Target');
  const [startDate, setStartDate] = useState(getDateInputValue());
  const [endDate, setEndDate] = useState(getDateInputValue());
  const [currentPoints, setCurrentPoints] = useState('0');
  const [targetPoints, setTargetPoints] = useState('10000');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!goal || !open) {
      return;
    }

    setTitle(goal.title || '');
    setDescription(goal.ai_summary || '');
    setIcon(goal.icon || 'Target');
    setStartDate(getDateInputValue(goal.created_at));
    setEndDate(getDateInputValue(goal.estimated_completion_date));
    setCurrentPoints(String(goal.current_points || 0));
    setTargetPoints(String(goal.target_points || 10000));
    setErrorMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, open]);

  const totalDays = getGoalDays(startDate, endDate);
  const parsedCurrentPoints = Number(currentPoints);
  const parsedTargetPoints = Number(targetPoints);
  const safePreviewCurrentPoints = Number.isFinite(parsedCurrentPoints) && parsedCurrentPoints >= 0
    ? Math.max(0, Math.round(parsedCurrentPoints))
    : 0;
  const safePreviewTargetPoints = Number.isFinite(parsedTargetPoints) && parsedTargetPoints > 0
    ? Math.max(1000, Math.round(parsedTargetPoints))
    : 10000;
  const suggestedDailyPoints = Math.max(1, Math.round(safePreviewTargetPoints / totalDays));

  const labels = {
    title: isArabic ? 'تعديل معلومات الهدف' : 'Edit goal details',
    subtitle: isArabic
      ? 'حدّث الاسم والوصف والتواريخ والنقاط من مكان واحد، بنفس أسلوب الواجهة الرئيسي.'
      : 'Update the title, description, dates, and points from one place with the same interface style.',
    startDate: isArabic ? 'تاريخ البدء' : 'Start date',
    endDate: isArabic ? 'تاريخ الانتهاء' : 'End date',
    selectDate: isArabic ? 'اختر تاريخاً' : 'Select date',
    currentProgress: isArabic ? 'التقدم الحالي' : 'Current progress',
    currentPoints: isArabic ? 'النقاط الحالية' : 'Current points',
    targetPoints: isArabic ? 'النقاط المستهدفة' : 'Target points',
    duration: isArabic ? 'مدة الخطة' : 'Plan duration',
    dailyPace: isArabic ? 'المعدل اليومي التقريبي' : 'Approx. daily pace',
    finalTarget: isArabic ? 'الهدف النهائي' : 'Final target',
    currentHint: isArabic ? 'يمكنك تعديل النقاط الحالية إذا كنت تريد تصحيح التقدم اليدوي.' : 'You can edit the current points if you need to correct progress manually.',
    targetHint: isArabic ? 'الحد الأدنى للنقاط المستهدفة هو 1000 نقطة.' : 'The minimum target is 1000 points.',
    titleRequired: isArabic ? 'اكتب اسم الهدف أولاً.' : 'Enter a goal title first.',
    dateRequired: isArabic ? 'حدد تاريخ البدء وتاريخ الانتهاء.' : 'Select both a start date and end date.',
    endDateError: isArabic ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.' : 'The end date must be after the start date.',
    currentPointsError: isArabic ? 'النقاط الحالية يجب أن تكون صفر أو أكثر.' : 'Current points must be zero or more.',
    pointsError: isArabic ? 'النقاط المستهدفة يجب أن تكون 1000 أو أكثر.' : 'Target points must be 1000 or more.',
    saveError: isArabic ? 'تعذر حفظ التعديلات. حاول مرة ثانية.' : 'Could not save your changes. Please try again.',
  };

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onOpenChange(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!goal) {
      return;
    }

    const trimmedTitle = title.trim();
    const sanitizedDescription = description.trim();
    const numericCurrentPoints = Number(currentPoints);
    const numericTargetPoints = Number(targetPoints);

    if (!trimmedTitle) {
      setErrorMessage(labels.titleRequired);
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage(labels.dateRequired);
      return;
    }

    if (dateInputToDate(endDate) < dateInputToDate(startDate)) {
      setErrorMessage(labels.endDateError);
      return;
    }

    if (!Number.isFinite(numericCurrentPoints) || numericCurrentPoints < 0) {
      setErrorMessage(labels.currentPointsError);
      return;
    }

    if (!Number.isFinite(numericTargetPoints) || numericTargetPoints < 1000) {
      setErrorMessage(labels.pointsError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: trimmedTitle,
          icon,
          ai_summary: sanitizedDescription,
          current_points: Math.max(0, Math.round(numericCurrentPoints)),
          target_points: Math.max(1000, Math.round(numericTargetPoints)),
          created_at: dateInputToStableIso(startDate),
          estimated_completion_date: dateInputToStableIso(endDate),
          total_days: getGoalDays(startDate, endDate),
        })
        .eq('id', goal.id);

      if (error) {
        throw error;
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      console.error('Error updating goal:', error);
      const message = error instanceof Error && error.message ? error.message : labels.saveError;
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent
        dir={isArabic ? 'rtl' : 'ltr'}
        className="inset-x-2 inset-y-2 left-2 right-2 top-2 bottom-2 grid h-auto w-auto max-w-none translate-x-0 translate-y-0 grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[1.5rem] border-border/60 bg-background p-0 shadow-xl sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(calc(100vw-2rem),56rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-12 sm:space-y-4 sm:px-6 sm:pb-6 sm:pt-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/25 hover:[&::-webkit-scrollbar-thumb]:bg-muted/45">
          {errorMessage && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-card via-card to-muted/25 p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="space-y-2">
                  <Label className={cn('text-sm font-semibold', isArabic ? 'block text-right' : 'block text-left')}>
                    {t.selectIcon}
                  </Label>
                  <div className="flex justify-start sm:justify-center">
                    <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-3 shadow-sm">
                      <IconPicker selectedIcon={icon} onSelectIcon={setIcon} className="h-16 w-16 rounded-2xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-edit-title" className={cn('text-sm font-semibold', isArabic ? 'block text-right' : 'block text-left')}>
                      {t.goalTitle}
                    </Label>
                    <Input
                      id="goal-edit-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={isArabic ? 'مثال: تعلم البرمجة العملية' : 'Example: Learn practical programming'}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className={cn(
                        'h-12 rounded-2xl border-border/70 bg-background/90 px-4 text-sm shadow-sm',
                        isArabic ? 'text-right' : 'text-left',
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal-edit-description" className={cn('text-sm font-semibold', isArabic ? 'block text-right' : 'block text-left')}>
                      {t.goalDescription}
                    </Label>
                    <Textarea
                      id="goal-edit-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={isArabic ? 'اكتب وصفاً مختصراً يوضح نتيجة الهدف ولماذا هو مهم لك.' : 'Write a short description that explains the outcome and why it matters.'}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className={cn(
                        'min-h-40 rounded-2xl border-border/70 bg-background/90 px-4 py-3 text-sm leading-7 shadow-sm',
                        isArabic ? 'text-right' : 'text-left',
                      )}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-3 sm:space-y-4">
              <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-card via-card to-muted/25 p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DatePopoverField
                    icon={CalendarDays}
                    isArabic={isArabic}
                    label={labels.startDate}
                    locale={locale}
                    onChange={setStartDate}
                    placeholder={labels.selectDate}
                    value={startDate}
                  />
                  <DatePopoverField
                    icon={Target}
                    isArabic={isArabic}
                    label={labels.endDate}
                    locale={locale}
                    onChange={setEndDate}
                    placeholder={labels.selectDate}
                    value={endDate}
                    minDate={startDate}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{labels.duration}</p>
                    <p className="mt-1 text-lg font-black text-foreground">
                      {totalDays} <span className="text-xs font-semibold text-muted-foreground">{isArabic ? 'يوم' : 'days'}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{labels.dailyPace}</p>
                    <p className="mt-1 text-lg font-black text-foreground" dir="ltr">
                      {suggestedDailyPoints.toLocaleString()}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-card via-card to-muted/25 p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="goal-edit-current-points" className={cn('text-sm font-semibold', isArabic ? 'block text-right' : 'block text-left')}>
                      {labels.currentPoints}
                    </Label>
                    <Input
                      id="goal-edit-current-points"
                      type="number"
                      min={0}
                      step={100}
                      value={currentPoints}
                      onChange={(event) => setCurrentPoints(event.target.value)}
                      className="h-12 rounded-2xl border-border/70 bg-background/90 px-4 text-sm shadow-sm"
                      dir="ltr"
                    />
                    <p className={cn('text-xs text-muted-foreground', isArabic ? 'text-right' : 'text-left')}>
                      {labels.currentHint}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal-edit-target-points" className={cn('text-sm font-semibold', isArabic ? 'block text-right' : 'block text-left')}>
                      {labels.targetPoints}
                    </Label>
                    <Input
                      id="goal-edit-target-points"
                      type="number"
                      min={1000}
                      step={100}
                      value={targetPoints}
                      onChange={(event) => setTargetPoints(event.target.value)}
                      className="h-12 rounded-2xl border-border/70 bg-background/90 px-4 text-sm shadow-sm"
                      dir="ltr"
                    />
                    <p className={cn('text-xs text-muted-foreground', isArabic ? 'text-right' : 'text-left')}>
                      {labels.targetHint}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <AlignLeft className="size-3.5" />
                      <span>{labels.currentProgress}</span>
                    </div>
                    <p className="text-lg font-black text-foreground" dir="ltr">
                      {safePreviewCurrentPoints.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="size-3.5" />
                      <span>{labels.finalTarget}</span>
                    </div>
                    <p className="text-lg font-black text-foreground" dir="ltr">
                      {safePreviewTargetPoints.toLocaleString()}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <DialogFooter
          className={cn(
            'shrink-0 border-t border-border/60 bg-background/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4',
            isArabic && 'sm:flex-row-reverse sm:space-x-reverse',
          )}
        >
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving} className="h-11 w-full sm:w-auto">
            {t.cancel}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving} className="h-11 w-full sm:w-auto">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
