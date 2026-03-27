'use client';

import { useMemo, useState } from 'react';
import {
    Plus,
    Trash2,
    Loader2,
    Calendar,
    Target,
    AlignLeft,
    Clock,
    ListChecks,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ManualGoalCreatorProps {
    onComplete: () => void;
    onCancel: () => void;
    language?: Language;
    initialData?: {
        title?: string;
        description?: string;
        targetPoints?: string;
    };
}

interface ManualSubtask {
    id: string;
    description: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

interface ManualMainTask {
    id: string;
    title: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    completion_criteria: string;
    subtasks: ManualSubtask[];
}

type ManualStep = 'DETAILS' | 'TIMELINE' | 'TASKS' | 'REVIEW';

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const createSubtask = (): ManualSubtask => ({
    id: makeId('sub'),
    description: '',
    frequency: 'daily',
    impact_weight: 3,
    time_required_minutes: 20,
    completion_criteria: '',
});

const createMainTask = (): ManualMainTask => ({
    id: makeId('main'),
    title: '',
    frequency: 'weekly',
    impact_weight: 6,
    completion_criteria: '',
    subtasks: [createSubtask()],
});

const stepOrder: ManualStep[] = ['DETAILS', 'TIMELINE', 'TASKS', 'REVIEW'];

export default function ManualGoalCreator({
    onComplete,
    onCancel,
    language = 'en',
    initialData,
}: ManualGoalCreatorProps) {
    const supabase = createClient();
    const isArabic = language === 'ar';
    const t = translations[language];

    const [step, setStep] = useState<ManualStep>('DETAILS');
    const [stepError, setStepError] = useState<string | null>(null);
    const [goalTitle, setGoalTitle] = useState(initialData?.title || '');
    const [goalDescription, setGoalDescription] = useState(initialData?.description || '');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [targetPoints, setTargetPoints] = useState(initialData?.targetPoints || '10000');
    const [mainTasks, setMainTasks] = useState<ManualMainTask[]>([createMainTask()]);
    const [loading, setLoading] = useState(false);

    const currentStepIndex = stepOrder.indexOf(step);
    const safeTargetPoints = Math.max(1000, Number(targetPoints) || 10000);

    const goalDays = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    }, [startDate, endDate]);

    const validMainTasks = useMemo(
        () => mainTasks.filter((main) => main.title.trim()),
        [mainTasks]
    );

    const validSubtasksCount = useMemo(
        () =>
            mainTasks.reduce(
                (total, main) => total + main.subtasks.filter((sub) => sub.description.trim()).length,
                0
            ),
        [mainTasks]
    );

    const averageDailyPoints = Math.max(1, Math.round(safeTargetPoints / goalDays));

    const updateMain = (id: string, patch: Partial<ManualMainTask>) => {
        setMainTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    };

    const removeMain = (id: string) => {
        setMainTasks((prev) => prev.filter((task) => task.id !== id));
    };

    const addMain = () => {
        setMainTasks((prev) => [...prev, createMainTask()]);
    };

    const addSub = (mainId: string) => {
        setMainTasks((prev) =>
            prev.map((task) =>
                task.id === mainId ? { ...task, subtasks: [...task.subtasks, createSubtask()] } : task
            )
        );
    };

    const updateSub = (mainId: string, subId: string, patch: Partial<ManualSubtask>) => {
        setMainTasks((prev) =>
            prev.map((task) => {
                if (task.id !== mainId) return task;
                return {
                    ...task,
                    subtasks: task.subtasks.map((sub) => (sub.id === subId ? { ...sub, ...patch } : sub)),
                };
            })
        );
    };

    const removeSub = (mainId: string, subId: string) => {
        setMainTasks((prev) =>
            prev.map((task) => {
                if (task.id !== mainId) return task;
                return { ...task, subtasks: task.subtasks.filter((sub) => sub.id !== subId) };
            })
        );
    };

    const getStepValidationMessage = (currentStep: ManualStep): string | null => {
        if (currentStep === 'DETAILS' && !goalTitle.trim()) {
            return isArabic ? 'اكتب اسم الهدف أولاً حتى نكمل الخطوات.' : 'Add a goal title before continuing.';
        }

        if (currentStep === 'TIMELINE') {
            if (!startDate || !endDate) {
                return isArabic ? 'حدد تاريخ البدء وتاريخ الانتهاء.' : 'Select both start and end dates.';
            }

            if (new Date(endDate) < new Date(startDate)) {
                return isArabic
                    ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.'
                    : 'The end date must be after the start date.';
            }
        }

        if (currentStep === 'TASKS' && validMainTasks.length === 0) {
            return isArabic
                ? 'أضف مهمة رئيسية واحدة على الأقل حتى نقدر نبني الخطة اليدوية.'
                : 'Add at least one main task before continuing.';
        }

        return null;
    };

    const goToStep = (nextStep: ManualStep) => {
        setStep(nextStep);
        setStepError(null);
    };

    const handleNext = () => {
        const validationMessage = getStepValidationMessage(step);
        if (validationMessage) {
            setStepError(validationMessage);
            return;
        }

        const nextStep = stepOrder[currentStepIndex + 1];
        if (nextStep) {
            goToStep(nextStep);
        }
    };

    const handleBack = () => {
        if (currentStepIndex === 0) {
            onCancel();
            return;
        }

        const previousStep = stepOrder[currentStepIndex - 1];
        if (previousStep) {
            goToStep(previousStep);
        }
    };

    const handleSubmit = async () => {
        const detailsError = getStepValidationMessage('DETAILS');
        if (detailsError) {
            setStep('DETAILS');
            setStepError(detailsError);
            return;
        }

        const timelineError = getStepValidationMessage('TIMELINE');
        if (timelineError) {
            setStep('TIMELINE');
            setStepError(timelineError);
            return;
        }

        const tasksError = getStepValidationMessage('TASKS');
        if (tasksError) {
            setStep('TASKS');
            setStepError(tasksError);
            return;
        }

        setLoading(true);
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user?.id) {
                throw new Error(isArabic ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
            }

            const { data: goal, error: goalError } = await supabase
                .from('goals')
                .insert({
                    user_id: user.id,
                    title: goalTitle.trim(),
                    target_points: safeTargetPoints,
                    current_points: 0,
                    status: 'active',
                    created_at: new Date(startDate).toISOString(),
                    estimated_completion_date: new Date(endDate).toISOString(),
                    total_days: goalDays,
                    ai_summary: goalDescription.trim() || (isArabic ? 'هدف مُدخل يدوياً' : 'Manual goal'),
                })
                .select()
                .single();

            if (goalError) throw goalError;

            for (let mainIndex = 0; mainIndex < validMainTasks.length; mainIndex++) {
                const main = validMainTasks[mainIndex];

                const { data: insertedMain, error: mainError } = await supabase
                    .from('sub_layers')
                    .insert({
                        goal_id: goal.id,
                        task_description: main.title.trim(),
                        frequency: main.frequency,
                        impact_weight: Math.max(1, Math.min(10, Number(main.impact_weight) || 1)),
                        completion_criteria: main.completion_criteria.trim() || null,
                        time_required_minutes: 0,
                        task_type: 'main',
                        parent_task_id: null,
                        sort_order: mainIndex,
                    })
                    .select('id')
                    .single();

                if (mainError) throw mainError;

                const validSubtasks = main.subtasks.filter((sub) => sub.description.trim());
                if (validSubtasks.length === 0) continue;

                const subRows = validSubtasks.map((sub, subIndex) => ({
                    goal_id: goal.id,
                    task_description: sub.description.trim(),
                    frequency: sub.frequency,
                    impact_weight: Math.max(1, Math.min(5, Number(sub.impact_weight) || 1)),
                    completion_criteria: sub.completion_criteria.trim() || null,
                    time_required_minutes: Math.max(0, Number(sub.time_required_minutes) || 0),
                    task_type: 'sub',
                    parent_task_id: insertedMain.id,
                    sort_order: subIndex,
                }));

                const { error: subError } = await supabase.from('sub_layers').insert(subRows);
                if (subError) throw subError;
            }

            onComplete();
        } catch (error: unknown) {
            console.error('Error creating goal:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setStepError(
                isArabic
                    ? `فشل في إنشاء الهدف: ${errorMessage}`
                    : `Failed to create goal: ${errorMessage}`
            );
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        if (step === 'DETAILS') {
            return (
                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md p-0 gap-0">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {isArabic ? 'الخطوة 1 من 4' : 'Step 1 of 4'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                                {isArabic ? 'أساس الخطة' : 'Plan foundation'}
                            </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <Target className="size-4" />
                            </span>
                            {isArabic ? 'عرّف الهدف بشكل واضح ومقنع' : 'Define the goal clearly'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {isArabic
                                ? 'ابدأ بعنوان مباشر، ثم أضف وصفًا مختصرًا يوضح النتيجة التي تريد الوصول إليها.'
                                : 'Start with a direct title, then add a short description of the outcome you want.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 py-6">
                        <div className="space-y-5 rounded-3xl border border-border/60 bg-background/70 p-5 shadow-sm">
                            <div className="space-y-2">
                                <Label htmlFor="manual-goal-title" className="flex items-center gap-2 text-sm font-semibold">
                                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Target className="size-4" />
                                    </span>
                                    {isArabic ? 'اسم الهدف' : 'Goal title'}
                                </Label>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {isArabic
                                        ? 'اختر صياغة مختصرة تصف الهدف نفسه بدون تفاصيل تنفيذية.'
                                        : 'Use a concise title that names the goal without execution details.'}
                                </p>
                                <Input
                                    id="manual-goal-title"
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder={isArabic ? 'مثال: إتقان بايثون' : 'Example: Master Python'}
                                    dir={isArabic ? 'rtl' : 'ltr'}
                                    className={cn(
                                        'h-12 rounded-2xl border-border/70 bg-background px-4 text-sm shadow-sm',
                                        isArabic ? 'text-right' : 'text-left'
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="manual-goal-desc" className="flex items-center gap-2 text-sm font-semibold">
                                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <AlignLeft className="size-4" />
                                    </span>
                                    {isArabic ? 'وصف الهدف' : 'Goal description'}
                                </Label>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {isArabic
                                        ? 'اشرح ماذا تريد أن تحقق ولماذا هذا الهدف مهم لك، حتى تكون الخطة التالية أكثر دقة.'
                                        : 'Explain what you want to achieve and why it matters so the next steps can be more precise.'}
                                </p>
                                <Textarea
                                    id="manual-goal-desc"
                                    value={goalDescription}
                                    onChange={(e) => setGoalDescription(e.target.value)}
                                    placeholder={
                                        isArabic
                                            ? 'اكتب النتيجة التي تريد الوصول إليها ولماذا هذا الهدف مهم لك.'
                                            : 'Describe the result you want and why this goal matters.'
                                    }
                                    className={cn(
                                        'min-h-[160px] rounded-2xl border-border/70 bg-background px-4 py-3 text-sm leading-7 shadow-sm',
                                        isArabic ? 'text-right' : 'text-left'
                                    )}
                                    dir={isArabic ? 'rtl' : 'ltr'}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (step === 'TIMELINE') {
            return (
                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md p-0 gap-0">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {isArabic ? 'الخطوة 2 من 4' : 'Step 2 of 4'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                                {isArabic ? 'المدة والنقاط' : 'Timeline & Points'}
                            </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <Calendar className="size-4" />
                            </span>
                            {isArabic ? 'حدد الفترة الزمنية والنقاط المستهدفة' : 'Set the timeframe and target points'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {isArabic
                                ? 'حدد الفترة الزمنية وعدد النقاط المستهدفة حتى تصير الخطة قابلة للقياس.'
                                : 'Set the timeframe and target points so the plan becomes measurable.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 py-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className={cn("flex items-center gap-1.5", isArabic && "flex-row-reverse justify-end")}>
                                    <Calendar className="size-3.5 text-primary/70" />
                                    <span>{isArabic ? 'تاريخ البدء' : 'Start date'}</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full font-normal gap-2 h-9",
                                                isArabic ? "justify-end text-right flex-row-reverse" : "justify-start text-left",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="size-4 text-primary/60 shrink-0" />
                                            <span>
                                                {startDate
                                                    ? format(new Date(startDate), 'PPP', { locale: isArabic ? arSA : enUS })
                                                    : isArabic
                                                        ? 'اختر تاريخاً'
                                                        : 'Select date'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0 shadow-lg border-border/60"
                                        align={isArabic ? "end" : "start"}
                                        dir={isArabic ? 'rtl' : 'ltr'}
                                    >
                                        <ShadcnCalendar
                                            mode="single"
                                            selected={startDate ? new Date(startDate) : undefined}
                                            onSelect={(date: Date | undefined) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                            initialFocus
                                            captionLayout="dropdown"
                                            locale={isArabic ? arSA : enUS}
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                            fromYear={2020}
                                            toYear={2035}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className={cn("flex items-center gap-1.5", isArabic && "flex-row-reverse justify-end")}>
                                    <Target className="size-3.5 text-primary/70" />
                                    <span>{isArabic ? 'تاريخ الانتهاء' : 'End date'}</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full font-normal gap-2 h-9",
                                                isArabic ? "justify-end text-right flex-row-reverse" : "justify-start text-left",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="size-4 text-primary/60 shrink-0" />
                                            <span>
                                                {endDate
                                                    ? format(new Date(endDate), 'PPP', { locale: isArabic ? arSA : enUS })
                                                    : isArabic
                                                        ? 'اختر تاريخاً'
                                                        : 'Select date'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0 shadow-lg border-border/60"
                                        align={isArabic ? "end" : "start"}
                                        dir={isArabic ? 'rtl' : 'ltr'}
                                    >
                                        <ShadcnCalendar
                                            mode="single"
                                            selected={endDate ? new Date(endDate) : undefined}
                                            onSelect={(date: Date | undefined) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                            initialFocus
                                            captionLayout="dropdown"
                                            locale={isArabic ? arSA : enUS}
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                            fromYear={2020}
                                            toYear={2035}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="manual-target-points">
                                    {isArabic ? 'النقاط المستهدفة' : 'Target points'}
                                </Label>
                                <Input
                                    id="manual-target-points"
                                    type="number"
                                    min={1000}
                                    step={500}
                                    value={targetPoints}
                                    onChange={(e) => setTargetPoints(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'مدة الخطة' : 'Plan duration'}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {goalDays} {isArabic ? 'يوم' : 'days'}
                                </p>
                            </div>
                            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'النقاط المعتمدة' : 'Effective target'}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {safeTargetPoints.toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'متوسط يومي تقريبي' : 'Approx. daily pace'}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {averageDailyPoints.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (step === 'TASKS') {
            return (
                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md p-0 gap-0">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {isArabic ? 'الخطوة 3 من 4' : 'Step 3 of 4'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                                {isArabic ? 'تقسيم الهدف' : 'Breakdown'}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                        <ListChecks className="size-4" />
                                    </span>
                                    {isArabic ? 'قسّم الهدف إلى مهام' : 'Break the goal into tasks'}
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground">
                                    {isArabic
                                        ? 'قسّم الهدف إلى مهام رئيسية، وتحت كل مهمة أضف مهام فرعية قابلة للتنفيذ.'
                                        : 'Split the goal into main tasks, then add actionable subtasks under each one.'}
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={addMain} className="shrink-0 mt-1 sm:mt-0">
                                <Plus className="size-3.5" />
                                {isArabic ? 'إضافة رئيسية' : 'Add main'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 px-6 py-6">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-border/60 bg-background/75 px-4 py-3 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'المهام الرئيسية' : 'Main tasks'}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{mainTasks.length}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-border/60 bg-background/75 px-4 py-3 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    {isArabic ? 'المهام الفرعية' : 'Subtasks'}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{validSubtasksCount}</p>
                            </div>
                        </div>

                        {mainTasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-2xl">
                                {isArabic
                                    ? 'لا توجد مهام بعد. أضف مهمة رئيسية حتى نبدأ.'
                                    : 'No tasks yet. Add a main task to get started.'}
                            </div>
                        )}

                        <Accordion
                            type="multiple"
                            defaultValue={mainTasks.map((main) => main.id)}
                            className="space-y-4"
                        >
                            {mainTasks.map((main, mainIdx) => {
                                const frequencyLabel = main.frequency === 'daily'
                                    ? isArabic ? 'يومي' : 'Daily'
                                    : isArabic ? 'أسبوعي' : 'Weekly';

                                return (
                                    <AccordionItem
                                        key={main.id}
                                        value={main.id}
                                        className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 px-0 shadow-[0_18px_40px_-32px_hsl(var(--foreground)/0.45)] transition-colors data-[state=open]:border-primary/30"
                                    >
                                        <AccordionTrigger
                                            className={cn(
                                                'items-center px-4 py-4 hover:no-underline sm:px-5',
                                                isArabic ? 'text-right' : 'text-left'
                                            )}
                                        >
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px]"
                                                    >
                                                        {isArabic ? `رئيسية ${mainIdx + 1}` : `Main ${mainIdx + 1}`}
                                                    </Badge>
                                                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                                                        {main.title || (isArabic ? 'مهمة جديدة' : 'New task')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {frequencyLabel}
                                                    {' / '}
                                                    {isArabic
                                                        ? `الوزن ${main.impact_weight}`
                                                        : `Weight ${main.impact_weight}`}
                                                    {' / '}
                                                    {isArabic
                                                        ? `${main.subtasks.length} فرعية`
                                                        : `${main.subtasks.length} subtasks`}
                                                </p>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="border-t border-border/60 bg-muted/10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                                            <div className="space-y-4">
                                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)]">
                                                    <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-background/80 p-4 shadow-sm">
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold">
                                                                {isArabic ? 'اسم المهمة' : 'Task name'}
                                                            </Label>
                                                            <Input
                                                                value={main.title}
                                                                onChange={(e) => updateMain(main.id, { title: e.target.value })}
                                                                placeholder={isArabic ? 'المهمة الرئيسية' : 'Main task name'}
                                                                dir={isArabic ? 'rtl' : 'ltr'}
                                                                className={cn(
                                                                    'h-11 rounded-2xl border-border/70 bg-background/90 px-4 shadow-sm',
                                                                    isArabic ? 'text-right' : 'text-left'
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold">
                                                                {isArabic ? 'معيار الإنجاز' : 'Completion criteria'}
                                                            </Label>
                                                            <Input
                                                                value={main.completion_criteria}
                                                                onChange={(e) =>
                                                                    updateMain(main.id, { completion_criteria: e.target.value })
                                                                }
                                                                placeholder={
                                                                    isArabic
                                                                        ? 'كيف تعرف أن هذه المهمة أُنجزت؟'
                                                                        : 'How will you know this task is complete?'
                                                                }
                                                                dir={isArabic ? 'rtl' : 'ltr'}
                                                                className={cn(
                                                                    'h-11 rounded-2xl border-border/70 bg-background/90 px-4 shadow-sm',
                                                                    isArabic ? 'text-right' : 'text-left'
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-semibold">
                                                                    {isArabic ? 'التكرار' : 'Frequency'}
                                                                </Label>
                                                                <Select
                                                                    value={main.frequency}
                                                                    onValueChange={(value) =>
                                                                        updateMain(main.id, {
                                                                            frequency: value as 'daily' | 'weekly',
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/90 px-4 text-sm shadow-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="daily">
                                                                            {isArabic ? 'يومي' : 'Daily'}
                                                                        </SelectItem>
                                                                        <SelectItem value="weekly">
                                                                            {isArabic ? 'أسبوعي' : 'Weekly'}
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <Label className="text-sm font-semibold">
                                                                        {isArabic ? 'الوزن' : 'Impact weight'}
                                                                    </Label>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="rounded-full px-2.5 py-0.5 text-[10px]"
                                                                    >
                                                                        {main.impact_weight}
                                                                    </Badge>
                                                                </div>
                                                                <div className="rounded-2xl border border-border/60 bg-background/90 px-4 py-4 shadow-sm">
                                                                    <Slider
                                                                        min={1}
                                                                        max={10}
                                                                        step={1}
                                                                        value={[main.impact_weight]}
                                                                        onValueChange={([value]) =>
                                                                            updateMain(main.id, {
                                                                                impact_weight: value,
                                                                            })
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="h-10 w-full rounded-xl"
                                                            onClick={() => removeMain(main.id)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                            {isArabic ? 'حذف المهمة الرئيسية' : 'Remove main task'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="rounded-[1.5rem] border border-border/60 bg-background/75 p-4 shadow-sm">
                                                    <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <Label className="text-sm font-semibold text-foreground">
                                                                {isArabic ? 'المهام الفرعية' : 'Subtasks'}
                                                            </Label>
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 rounded-xl"
                                                            onClick={() => addSub(main.id)}
                                                        >
                                                            <Plus className="size-3.5" />
                                                            {isArabic ? 'إضافة فرعية' : 'Add subtask'}
                                                        </Button>
                                                    </div>

                                                    <div className="mt-4 space-y-3">
                                                        {main.subtasks.length === 0 && (
                                                            <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/15 px-4 py-5 text-center text-sm text-muted-foreground">
                                                                {isArabic
                                                                    ? 'لا توجد مهام فرعية بعد. أضف أول خطوة تنفيذية لهذه المهمة.'
                                                                    : 'No subtasks yet. Add the first actionable step for this task.'}
                                                            </div>
                                                        )}

                                                        {main.subtasks.map((sub, subIdx) => (
                                                            <Card
                                                                key={sub.id}
                                                                className="gap-0 overflow-hidden rounded-[1.25rem] border border-border/60 bg-muted/15 py-0 shadow-none"
                                                            >
                                                                <CardContent className="px-4 py-4">
                                                                    <div className="flex flex-col gap-4">
                                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="rounded-full px-2 py-0.5 text-[10px]"
                                                                                    >
                                                                                        {isArabic
                                                                                            ? `فرعية ${subIdx + 1}`
                                                                                            : `Sub ${subIdx + 1}`}
                                                                                    </Badge>
                                                                                    <span className="text-[11px] text-muted-foreground">
                                                                                        {sub.frequency === 'daily'
                                                                                            ? isArabic ? 'تكرار يومي' : 'Daily cadence'
                                                                                            : isArabic ? 'تكرار أسبوعي' : 'Weekly cadence'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon-sm"
                                                                                className="self-end rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-start"
                                                                                onClick={() => removeSub(main.id, sub.id)}
                                                                            >
                                                                                <Trash2 className="size-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-xs font-semibold">
                                                                                    {isArabic ? 'اسم المهمة الفرعية' : 'Subtask name'}
                                                                                </Label>
                                                                                <Input
                                                                                    value={sub.description}
                                                                                    onChange={(e) =>
                                                                                        updateSub(main.id, sub.id, {
                                                                                            description: e.target.value,
                                                                                        })
                                                                                    }
                                                                                    placeholder={
                                                                                        isArabic ? 'المهمة الفرعية' : 'Subtask name'
                                                                                    }
                                                                                    className={cn(
                                                                                        'h-10 rounded-xl border-border/70 bg-background/90 px-3 text-sm shadow-sm',
                                                                                        isArabic ? 'text-right' : 'text-left'
                                                                                    )}
                                                                                    dir={isArabic ? 'rtl' : 'ltr'}
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <Label className="text-xs font-semibold">
                                                                                        {isArabic ? 'الوزن' : 'Weight'}
                                                                                    </Label>
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="rounded-full px-2 py-0.5 text-[10px]"
                                                                                    >
                                                                                        {sub.impact_weight}
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-3 shadow-sm">
                                                                                    <Slider
                                                                                        min={1}
                                                                                        max={5}
                                                                                        step={1}
                                                                                        value={[sub.impact_weight]}
                                                                                        onValueChange={([value]) =>
                                                                                            updateSub(main.id, sub.id, {
                                                                                                impact_weight: value,
                                                                                            })
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,0.55fr)_minmax(0,1fr)]">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-xs font-semibold">
                                                                                    {isArabic ? 'التكرار' : 'Frequency'}
                                                                                </Label>
                                                                                <Select
                                                                                    value={sub.frequency}
                                                                                    onValueChange={(value) =>
                                                                                        updateSub(main.id, sub.id, {
                                                                                            frequency: value as 'daily' | 'weekly',
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/90 px-3 text-xs shadow-sm">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="daily">
                                                                                            {isArabic ? 'يومي' : 'Daily'}
                                                                                        </SelectItem>
                                                                                        <SelectItem value="weekly">
                                                                                            {isArabic ? 'أسبوعي' : 'Weekly'}
                                                                                        </SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <Label
                                                                                    className={cn(
                                                                                        'flex items-center gap-1.5 text-xs font-semibold',
                                                                                        isArabic && 'flex-row-reverse justify-end'
                                                                                    )}
                                                                                >
                                                                                    <Clock className="size-3 text-muted-foreground" />
                                                                                    <span>{isArabic ? 'الوقت' : 'Time'}</span>
                                                                                </Label>
                                                                                <Input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    value={sub.time_required_minutes}
                                                                                    onChange={(e) =>
                                                                                        updateSub(main.id, sub.id, {
                                                                                            time_required_minutes: Number(e.target.value) || 0,
                                                                                        })
                                                                                    }
                                                                                    className={cn(
                                                                                        'h-10 rounded-xl border-border/70 bg-background/90 px-3 text-xs shadow-sm',
                                                                                        isArabic ? 'text-right' : 'text-left'
                                                                                    )}
                                                                                    placeholder={isArabic ? 'بالدقائق' : 'Minutes'}
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <Label className="text-xs font-semibold">
                                                                                    {isArabic ? 'معيار الإنجاز' : 'Completion criteria'}
                                                                                </Label>
                                                                                <Input
                                                                                    value={sub.completion_criteria}
                                                                                    onChange={(e) =>
                                                                                        updateSub(main.id, sub.id, {
                                                                                            completion_criteria: e.target.value,
                                                                                        })
                                                                                    }
                                                                                    placeholder={
                                                                                        isArabic
                                                                                            ? 'مثال: إنهاء 20 دقيقة تركيز'
                                                                                            : 'Example: complete 20 focused minutes'
                                                                                    }
                                                                                    className={cn(
                                                                                        'h-10 rounded-xl border-border/70 bg-background/90 px-3 text-xs shadow-sm',
                                                                                        isArabic ? 'text-right' : 'text-left'
                                                                                    )}
                                                                                    dir={isArabic ? 'rtl' : 'ltr'}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-5">
                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md p-0 gap-0">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {isArabic ? 'الخطوة 4 من 4' : 'Step 4 of 4'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                                {isArabic ? 'المراجعة النهائية' : 'Final Review'}
                            </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <CheckCircle2 className="size-4" />
                            </span>
                            {isArabic ? 'راجع الهدف قبل الحفظ' : 'Review the goal before saving'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {isArabic
                                ? 'راجع التفاصيل النهائية قبل حفظ الهدف وبدء العمل عليه.'
                                : 'Review the final details before saving the goal.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 py-6 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border bg-muted/20 px-4 py-4 space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {isArabic ? 'اسم الهدف' : 'Goal title'}
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-foreground">{goalTitle}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {isArabic ? 'وصف الهدف' : 'Description'}
                                    </p>
                                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">
                                        {goalDescription.trim()
                                            ? goalDescription
                                            : isArabic
                                                ? 'لا يوجد وصف إضافي.'
                                                : 'No extra description provided.'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border bg-muted/20 px-4 py-4 space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic ? 'تاريخ البدء' : 'Start date'}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {format(new Date(startDate), 'PPP', { locale: isArabic ? arSA : enUS })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic ? 'تاريخ الانتهاء' : 'End date'}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {format(new Date(endDate), 'PPP', { locale: isArabic ? arSA : enUS })}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic ? 'المدة' : 'Duration'}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {goalDays} {isArabic ? 'يوم' : 'days'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic ? 'النقاط' : 'Target points'}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {safeTargetPoints.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {isArabic ? 'الوتيرة' : 'Daily pace'}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {averageDailyPoints.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md p-0 gap-0">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {isArabic ? 'ملخص' : 'Summary'}
                            </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <ListChecks className="size-4" />
                            </span>
                            {isArabic ? 'المهام المعتمدة' : 'Confirmed task structure'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {isArabic
                                ? 'يمكنك الرجوع لأي خطوة وتعديل التفاصيل قبل الحفظ.'
                                : 'You can go back to any step and update details before saving.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 py-6 space-y-4">
                        {validMainTasks.map((main, index) => {
                            const subtasks = main.subtasks.filter((sub) => sub.description.trim());

                            return (
                                <div key={main.id} className="rounded-2xl border bg-muted/20 px-4 py-4 space-y-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{isArabic ? `رئيسية ${index + 1}` : `Main ${index + 1}`}</Badge>
                                                <Badge variant="outline">
                                                    {main.frequency === 'daily'
                                                        ? isArabic ? 'يومي' : 'Daily'
                                                        : isArabic ? 'أسبوعي' : 'Weekly'}
                                                </Badge>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-foreground break-words">
                                                {main.title}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{isArabic ? 'الوزن' : 'Weight'}</span>
                                            <Badge variant="outline">{main.impact_weight}</Badge>
                                        </div>
                                    </div>

                                    {main.completion_criteria.trim() && (
                                        <div className="rounded-xl bg-background/70 px-3 py-2 text-sm text-foreground/80">
                                            <span className="text-xs text-muted-foreground">
                                                {isArabic ? 'معيار الإنجاز:' : 'Completion criteria:'}
                                            </span>{' '}
                                            {main.completion_criteria}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {isArabic ? 'المهام الفرعية' : 'Subtasks'}
                                        </p>

                                        {subtasks.length === 0 ? (
                                            <div className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
                                                {isArabic
                                                    ? 'لا توجد مهام فرعية مضافة لهذه المهمة.'
                                                    : 'No subtasks were added for this task.'}
                                            </div>
                                        ) : (
                                            subtasks.map((sub, subIndex) => (
                                                <div
                                                    key={sub.id}
                                                    className="rounded-xl border bg-background/70 px-3 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground break-words">
                                                            {subIndex + 1}. {sub.description}
                                                        </p>
                                                        {sub.completion_criteria.trim() && (
                                                            <p className="mt-1 text-xs text-muted-foreground break-words">
                                                                {isArabic ? 'المعيار:' : 'Criteria:'} {sub.completion_criteria}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <Badge variant="outline">
                                                            {sub.frequency === 'daily'
                                                                ? isArabic ? 'يومي' : 'Daily'
                                                                : isArabic ? 'أسبوعي' : 'Weekly'}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {isArabic ? 'وزن' : 'Weight'} {sub.impact_weight}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {sub.time_required_minutes} {isArabic ? 'د' : 'min'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const BackIcon = isArabic ? ArrowRight : ArrowLeft;
    const NextIcon = isArabic ? ArrowLeft : ArrowRight;
    const isLastStep = step === 'REVIEW';

    return (
        <div className="space-y-5 max-w-full overflow-x-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
            {renderStepContent()}

            {stepError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {stepError}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button variant="outline" onClick={handleBack} className="sm:min-w-[130px]">
                    <BackIcon className="size-4" />
                    {currentStepIndex === 0
                        ? t.cancel
                        : isArabic ? 'رجوع' : 'Back'}
                </Button>

                <div className="flex-1" />

                {isLastStep ? (
                    <Button onClick={handleSubmit} disabled={loading} className="sm:min-w-[180px]">
                        {loading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                {isArabic ? 'جاري الإنشاء...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="size-4" />
                                {isArabic ? 'إنشاء الهدف' : 'Create goal'}
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={handleNext} className="sm:min-w-[160px]">
                        {isArabic ? 'التالي' : 'Next'}
                        <NextIcon className="size-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
