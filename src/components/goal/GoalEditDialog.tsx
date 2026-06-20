'use client';

import { type ElementType, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { Calendar, CalendarDays, Loader2, Sparkles, Target } from 'lucide-react';
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
import { IconPicker, getGoalIcon } from './IconPicker';

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
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
        <Icon className="size-3.5 text-primary/60" />
        <span>{label}</span>
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 w-full rounded-xl border-border/60 bg-background/50 px-3.5 font-normal shadow-sm',
              isArabic ? 'justify-end text-right' : 'justify-start text-left',
              !value && 'text-muted-foreground',
            )}
          >
            <Calendar className="size-4 shrink-0 text-primary/50 mr-2 rtl:mr-0 rtl:ml-2" />
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

  // AI Edit States
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

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
    setAiSuccessMessage(null);
    setActiveTab('manual');
    setAiInstruction('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, open]);

  const totalDays = getGoalDays(startDate, endDate);
  const parsedTargetPoints = Number(targetPoints);

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

  const aiLabels = {
    tabManual: isArabic ? 'تعديل يدوي' : 'Manual Edit',
    tabAi: isArabic ? 'تعديل بالذكاء الاصطناعي' : 'AI Edit',
    aiTitle: isArabic ? 'التعديل الذكي بالذكاء الاصطناعي' : 'Smart AI Editing',
    aiSubtitle: isArabic 
      ? 'اكتب التغييرات التي تريدها (مثل: "مدد الهدف لنهاية السنة" أو "غير النقاط إلى 5000") وسيقوم الذكاء الاصطناعي بتحديث الحقول فوراً.'
      : 'Describe the changes you want (e.g. "Extend goal to end of year" or "Change points to 5,000") and the AI will update the details instantly.',
    aiTextareaPlaceholder: isArabic
      ? 'مثال: غير العنوان إلى "تعلم البرمجة المتقدمة" ومدد تاريخ الانتهاء لشهر سبتمبر القادم...'
      : 'Example: Change title to "Advanced Programming" and extend the end date to next September...',
    aiButton: isArabic ? 'معالجة بالذكاء الاصطناعي' : 'Process with AI',
    aiProcessing: isArabic ? 'جاري التحليل والمعالجة...' : 'Analyzing and processing...',
    aiSuccess: isArabic ? 'تم تحديث الحقول بنجاح! راجع التعديلات أدناه ثم احفظ التغييرات.' : 'Fields updated successfully! Review the adjustments below and save.',
    aiSuccessPreviewTitle: isArabic ? 'معاينة الخطة المحدثة' : 'Updated Plan Preview',
    aiPromptLabel: isArabic ? 'ما الذي ترغب في تعديله؟' : 'What would you like to edit?',
  };

  const handleClose = () => {
    if (isSaving || isAiProcessing) {
      return;
    }

    onOpenChange(false);
    setErrorMessage(null);
    setAiSuccessMessage(null);
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

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) {
      setErrorMessage(isArabic ? 'يرجى كتابة تعليمات التعديل أولاً.' : 'Please enter edit instructions first.');
      return;
    }

    setIsAiProcessing(true);
    setErrorMessage(null);
    setAiSuccessMessage(null);

    try {
      const response = await fetch('/api/goal/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: {
            title,
            ai_summary: description,
            created_at: startDate,
            estimated_completion_date: endDate,
            current_points: Number(currentPoints),
            target_points: Number(targetPoints),
            icon,
          },
          instruction: aiInstruction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'quota_exceeded') {
          throw new Error(isArabic ? errorData.message_ar : errorData.message_en);
        }
        throw new Error(isArabic ? 'فشلت معالجة الطلب بواسطة الذكاء الاصطناعي.' : 'AI processing failed.');
      }

      const result = await response.json();
      if (result.status === 'refused') {
        throw new Error(result.explanation || (isArabic ? 'تم رفض الطلب لدواعي الأمان.' : 'Request was refused due to safety policies.'));
      }

      if (result.goal) {
        const g = result.goal;
        
        // Update state variables to sync preview and form
        if (g.title) setTitle(g.title);
        if (g.ai_summary !== undefined) setDescription(g.ai_summary);
        if (g.created_at) setStartDate(getDateInputValue(g.created_at));
        if (g.estimated_completion_date) setEndDate(getDateInputValue(g.estimated_completion_date));
        if (g.current_points !== undefined) setCurrentPoints(String(g.current_points));
        if (g.target_points !== undefined) setTargetPoints(String(g.target_points));
        if (g.icon) setIcon(g.icon);

        setAiSuccessMessage(result.explanation || (isArabic ? 'تم تعديل الخطة بنجاح بالذكاء الاصطناعي!' : 'Plan updated successfully with AI!'));
        setAiInstruction('');
      } else {
        throw new Error(isArabic ? 'لم يتم استلام بيانات صالحة من الذكاء الاصطناعي.' : 'No valid data received from AI.');
      }
    } catch (err: unknown) {
      console.error('AI Edit error:', err);
      const message = err instanceof Error ? err.message : '';
      setErrorMessage(message || (isArabic ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred during processing.'));
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent
        dir={isArabic ? 'rtl' : 'ltr'}
        className="inset-x-2 inset-y-2 left-2 right-2 top-2 bottom-2 flex flex-col h-auto w-auto max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-[1.75rem] border border-border/40 bg-background/95 backdrop-blur-xl p-0 shadow-2xl shadow-black/20 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(calc(100vw-2rem),56rem)] sm:h-[85dvh] sm:max-h-[720px] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2.25rem] transition-all duration-300"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-12 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/25 hover:[&::-webkit-scrollbar-thumb]:bg-muted/45">
          {errorMessage && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold shadow-sm animate-shake">
              {errorMessage}
            </div>
          )}

          {aiSuccessMessage && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-600 dark:text-violet-400 font-semibold shadow-sm flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-violet-500 animate-pulse" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {/* Premium Impeccable Tabs */}
          <div className="flex justify-center border-b border-border/30 pb-4">
            <div className="inline-flex rounded-2xl bg-muted/40 p-1.5 shadow-inner border border-border/30 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-250",
                  activeTab === 'manual'
                    ? "bg-background text-foreground shadow-sm scale-102 border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Target className={cn("size-4", activeTab === 'manual' ? "text-primary animate-pulse" : "text-muted-foreground")} />
                <span>{aiLabels.tabManual}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai');
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-250 relative overflow-hidden group",
                  activeTab === 'ai'
                    ? "bg-background text-foreground shadow-sm scale-102 border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {activeTab === 'ai' && (
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-primary/5 to-violet-500/5 opacity-50 animate-pulse pointer-events-none" />
                )}
                <Sparkles className={cn("size-4", activeTab === 'ai' ? "text-violet-500 animate-bounce" : "text-muted-foreground group-hover:animate-pulse")} />
                <span>{aiLabels.tabAi}</span>
              </button>
            </div>
          </div>

        {activeTab === 'manual' ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] pt-2">
              {/* Left Column (Core info) */}
              <div className="space-y-4">
                {/* Icon & Title Row */}
                <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                  <div className="space-y-1.5 flex flex-col items-center sm:items-start">
                    <Label className="text-xs font-bold text-muted-foreground/80">
                      {t.selectIcon}
                    </Label>
                    <div className="rounded-xl border border-border/50 bg-background/50 p-2 shadow-sm hover:border-border transition-colors">
                      <IconPicker selectedIcon={icon} onSelectIcon={setIcon} className="h-12 w-12 rounded-lg hover:scale-105 transition-transform duration-200" />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="goal-edit-title" className="text-xs font-bold text-muted-foreground/80">
                      {t.goalTitle}
                    </Label>
                    <Input
                      id="goal-edit-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={isArabic ? 'مثال: تعلم البرمجة العملية' : 'Example: Learn practical programming'}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className="h-11 rounded-xl border-border/60 bg-background/50 px-3.5 text-sm shadow-sm focus:border-primary/50 focus:bg-background transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="goal-edit-description" className="text-xs font-bold text-muted-foreground/80">
                    {t.goalDescription}
                  </Label>
                  <Textarea
                    id="goal-edit-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={isArabic ? 'اكتب وصفاً مختصراً يوضح نتيجة الهدف ولماذا هو مهم لك.' : 'Write a short description that explains the outcome and why it matters.'}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className="min-h-36 rounded-xl border-border/60 bg-background/50 px-3.5 py-2.5 text-sm leading-6 shadow-sm focus:border-primary/50 focus:bg-background transition-all"
                  />
                </div>
              </div>

              {/* Right Column (Dates, targets & metrics) */}
              <div className="space-y-4">
                {/* Start & End Dates */}
                <div className="grid gap-3 sm:grid-cols-2">
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

                {/* Points configuration */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-edit-current-points" className="text-xs font-bold text-muted-foreground/80">
                      {labels.currentPoints}
                    </Label>
                    <Input
                      id="goal-edit-current-points"
                      type="number"
                      min={0}
                      step={100}
                      value={currentPoints}
                      onChange={(event) => setCurrentPoints(event.target.value)}
                      className="h-11 rounded-xl border-border/60 bg-background/50 px-3.5 text-sm shadow-sm focus:border-primary/50 focus:bg-background transition-all"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="goal-edit-target-points" className="text-xs font-bold text-muted-foreground/80">
                      {labels.targetPoints}
                    </Label>
                    <Input
                      id="goal-edit-target-points"
                      type="number"
                      min={1000}
                      step={100}
                      value={targetPoints}
                      onChange={(event) => setTargetPoints(event.target.value)}
                      className="h-11 rounded-xl border-border/60 bg-background/50 px-3.5 text-sm shadow-sm focus:border-primary/50 focus:bg-background transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Plan stats bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary/70" />
                    <span className="text-muted-foreground">{labels.duration}:</span>
                    <span className="font-extrabold text-foreground">{totalDays} {isArabic ? 'يوم' : 'days'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary/70" />
                    <span className="text-muted-foreground">{labels.dailyPace}:</span>
                    <span className="font-extrabold text-foreground" dir="ltr">{suggestedDailyPoints.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SMART PREMIUM AI EDIT TAB */
            <div className="space-y-6 animate-fadeIn pt-2">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/[0.08] text-violet-500">
                  <Sparkles className="size-5 text-violet-500 animate-pulse" />
                </div>
                <div className="space-y-1 text-center sm:text-start rtl:sm:text-right">
                  <h3 className="text-base font-bold text-foreground">
                    {aiLabels.aiTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground/85 leading-relaxed max-w-2xl">
                    {aiLabels.aiSubtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="ai-instructions" className="text-xs font-bold text-muted-foreground/80">
                  {aiLabels.aiPromptLabel}
                </Label>
                <div className="relative">
                  <Textarea
                    id="ai-instructions"
                    value={aiInstruction}
                    onChange={(event) => setAiInstruction(event.target.value)}
                    placeholder={aiLabels.aiTextareaPlaceholder}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className={cn(
                      'min-h-[110px] w-full rounded-2xl border-border/50 bg-background/50 px-4 py-3 text-sm leading-relaxed shadow-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/45 focus:bg-background/85 transition-all',
                      isArabic ? 'text-right pl-10' : 'text-left pr-10',
                    )}
                  />
                  <div className={cn("absolute bottom-3 pointer-events-none", isArabic ? "left-3" : "right-3")}>
                    <Sparkles className={cn("size-5 transition-all duration-300", isAiProcessing ? "text-violet-500 animate-spin" : "text-muted-foreground/45")} />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={handleAiEdit}
                    disabled={isAiProcessing || !aiInstruction.trim()}
                    className="font-bold rounded-xl h-11 w-full sm:w-auto px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 transition-all border border-violet-500/20"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0 rtl:mr-0 rtl:ml-2" />
                        <span>{aiLabels.aiProcessing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 shrink-0 rtl:mr-0 rtl:ml-2 text-violet-200" />
                        <span>{aiLabels.aiButton}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* COMPACT PLAN PREVIEW CARD */}
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                    <Target className="size-3.5 text-primary/70" />
                    <span>{aiLabels.aiSuccessPreviewTitle}</span>
                  </h4>
                  {aiSuccessMessage && (
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/15">
                      {isArabic ? 'تلقائي' : 'AI Sync'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Goal Identity */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.08] p-2.5 text-primary">
                      {getGoalIcon(icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-sm text-foreground line-clamp-1">
                        {title || (isArabic ? 'بدون عنوان' : 'Untitled')}
                      </h5>
                      <p className="text-xs text-muted-foreground/75 line-clamp-1 mt-0.5">
                        {description || (isArabic ? 'لا يوجد وصف متاح.' : 'No description available.')}
                      </p>
                    </div>
                  </div>

                  {/* Key Plan Metrics */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:shrink-0">
                    <div className="flex flex-col gap-0.5 bg-background/40 px-3 py-1 rounded-xl border border-border/30">
                      <span className="text-[9px] text-muted-foreground/85 font-bold uppercase">{labels.duration}</span>
                      <span className="font-extrabold text-foreground">{totalDays} {isArabic ? 'يوم' : 'days'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-background/40 px-3 py-1 rounded-xl border border-border/30">
                      <span className="text-[9px] text-muted-foreground/85 font-bold uppercase">{labels.targetPoints}</span>
                      <span className="font-extrabold text-primary">{safePreviewTargetPoints.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-background/40 px-3 py-1 rounded-xl border border-border/30">
                      <span className="text-[9px] text-muted-foreground/85 font-bold uppercase">{labels.dailyPace}</span>
                      <span className="font-extrabold text-foreground" dir="ltr">{suggestedDailyPoints.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter
          className={cn(
            'shrink-0 border-t border-border/30 bg-background/95 backdrop-blur-md px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-5',
            isArabic && 'sm:flex-row-reverse sm:space-x-reverse',
          )}
        >
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving || isAiProcessing} className="h-11 w-full sm:w-auto rounded-xl font-bold border-border/60 hover:bg-muted/40">
            {t.cancel}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isAiProcessing} className="h-11 w-full sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-md">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
            {t.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
