'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Loader2,
    CheckCircle,
    AlertTriangle,
    X,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Zap,
    ListTodo,
    ChevronDown,
    ChevronUp,
    Clock,
    Repeat,
    Sparkles,
    Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';

interface GoalCreatorPageProps {
    initialGoalText: string;
    onComplete: () => void;
    onCancel: () => void;
    onGuardStateChange?: (active: boolean) => void;
    language?: Language;
}

interface StructuredSubtask {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

interface StructuredMainTask {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    completion_criteria: string;
    subtasks: StructuredSubtask[];
}

type GoalCreatorStep = 'INVESTIGATING' | 'QUESTIONS' | 'GENERATING_PLAN' | 'REVIEW';

interface InvestigationQuestion {
    id: string;
    question: string;
    type?: 'single_choice' | 'choice' | 'number' | 'text' | string;
    options?: string[];
    unit?: string;
}

interface GoalUnderstanding {
    readiness?: string;
    goal_summary?: string;
    domain?: string;
}

interface InvestigationResult {
    status?: string;
    questions?: InvestigationQuestion[];
    goal_understanding?: GoalUnderstanding;
    safe_redirection?: {
        message?: string;
    };
}

interface LegacyTask {
    id?: string;
    task?: string;
    frequency?: 'daily' | 'weekly' | string;
    impact_weight?: number | string;
    time_required_minutes?: number | string;
    completion_criteria?: string;
}

interface PlanSummary {
    goal_summary?: string;
    estimated_total_days?: number;
}

interface PlanResult {
    plan?: PlanSummary;
    ai_summary?: string;
    main_tasks?: StructuredMainTask[];
    tasks?: LegacyTask[];
}

interface ApiErrorResponse {
    error?: string;
    message_ar?: string;
    message_en?: string;
}

const isArabicText = (text: string) => /[\u0600-\u06FF]/.test(text);

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
    typeof value === 'object' &&
    value !== null &&
    ('error' in value || 'message_ar' in value || 'message_en' in value);

const isPlanResult = (value: unknown): value is PlanResult =>
    typeof value === 'object' &&
    value !== null &&
    ('plan' in value || 'ai_summary' in value || 'main_tasks' in value || 'tasks' in value);

const isInvestigationResult = (value: unknown): value is InvestigationResult =>
    typeof value === 'object' &&
    value !== null &&
    ('status' in value || 'questions' in value || 'goal_understanding' in value || 'safe_redirection' in value);

export default function GoalCreatorPage({
    initialGoalText,
    onComplete,
    onCancel,
    onGuardStateChange,
    language = 'en',
}: GoalCreatorPageProps) {
    const supabase = createClient();
    const hasArabic = isArabicText(initialGoalText);
    const resolvedLanguage: Language = hasArabic ? 'ar' : language;
    const isArabic = resolvedLanguage === 'ar';
    const t = translations[resolvedLanguage];

    const [step, setStep] = useState<GoalCreatorStep>('INVESTIGATING');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [guardDismissed, setGuardDismissed] = useState(false);

    const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [planResult, setPlanResult] = useState<PlanResult | null>(null);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
    const [refusedMessage, setRefusedMessage] = useState<string | null>(null);

    const [expandedMainTasks, setExpandedMainTasks] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const shouldGuard = !guardDismissed && (
            step === 'QUESTIONS' ||
            step === 'GENERATING_PLAN' ||
            step === 'REVIEW'
        );

        onGuardStateChange?.(shouldGuard);
    }, [guardDismissed, onGuardStateChange, step]);

    useEffect(() => {
        return () => {
            onGuardStateChange?.(false);
        };
    }, [onGuardStateChange]);

    const handleCreatePlan = useCallback(async (
        finalAnswers?: Record<string, string>,
        options?: { setGeneratingStep?: boolean }
    ) => {
        if (options?.setGeneratingStep) {
            setStep('GENERATING_PLAN');
        }

        setLoading(true);
        setNotification(null);

        try {
            const res = await fetch('/api/goal/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: initialGoalText,
                    answers: finalAnswers || answers,
                    structured_input: {},
                }),
            });

            const data: PlanResult | ApiErrorResponse | null = await res.json().catch(() => null);
            if (!res.ok) {
                if (isApiErrorResponse(data) && data.error === 'quota_exceeded') {
                    setNotification({
                        type: 'warning',
                        message: (isArabic ? data.message_ar : data.message_en) || data.error || `HTTP ${res.status}`,
                    });
                    setStep('QUESTIONS');
                    return;
                }
                throw new Error(isApiErrorResponse(data) ? data.error || `HTTP ${res.status}` : `HTTP ${res.status}`);
            }

            if (!isPlanResult(data) || !data.plan) throw new Error('Invalid plan response');

            setPlanResult(data);
            setStep('REVIEW');
        } catch (error: unknown) {
            console.error(error);
            setNotification({ type: 'error', message: isArabic ? 'فشل إنشاء الخطة.' : 'Failed to create plan.' });
            setStep('QUESTIONS');
        } finally {
            setLoading(false);
        }
    }, [initialGoalText, answers, isArabic]);

    const handleInvestigate = useCallback(async (
        currentAnswers?: Record<string, string>,
        pendingStep: GoalCreatorStep = 'INVESTIGATING'
    ) => {
        setStep(pendingStep);
        setLoading(true);
        setNotification(null);

        try {
            const res = await fetch('/api/goal/investigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: initialGoalText,
                    context: currentAnswers || {},
                    structured_input: {},
                }),
            });

            const data: InvestigationResult | ApiErrorResponse | null = await res.json().catch(() => null);
            if (!res.ok) {
                if (isApiErrorResponse(data) && data.error === 'quota_exceeded') {
                    setNotification({
                        type: 'warning',
                        message: (isArabic ? data.message_ar : data.message_en) || data.error || `HTTP ${res.status}`,
                    });
                    setStep('QUESTIONS');
                    return;
                }
                throw new Error(isApiErrorResponse(data) ? data.error || `HTTP ${res.status}` : `HTTP ${res.status}`);
            }

            if (!isInvestigationResult(data)) {
                throw new Error('Invalid investigation response');
            }

            setInvestigationResult(data);

            if (data.status === 'refused') {
                setGuardDismissed(true);
                setRefusedMessage(data.safe_redirection?.message || (isArabic ? 'تم رفض الهدف لأسباب تتعلق بالسلامة.' : 'Goal refused for safety reasons.'));
                return;
            }

            const ready = data.goal_understanding?.readiness === 'ready_for_plan';
            if (ready) {
                await handleCreatePlan(currentAnswers, { setGeneratingStep: true });
                return;
            }

            setStep('QUESTIONS');
        } catch (error: unknown) {
            console.error(error);
            setNotification({ type: 'error', message: isArabic ? 'فشل تحليل الهدف.' : 'Failed to analyze goal.' });
            setStep('QUESTIONS');
        } finally {
            setLoading(false);
        }
    }, [handleCreatePlan, initialGoalText, isArabic, onCancel]);

    // Auto-start on mount
    useEffect(() => {
        void handleInvestigate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitAnswers = () => {
        const contextWithQuestions: Record<string, string> = {};
        if (investigationResult?.questions) {
            for (const q of investigationResult.questions) {
                if (answers[q.id]) contextWithQuestions[q.question] = answers[q.id];
            }
        }
        void handleInvestigate(contextWithQuestions, 'GENERATING_PLAN');
    };

    const ensurePlanHasMainTasks = (rawPlan: PlanResult): StructuredMainTask[] => {
        const cloned = { ...rawPlan };
        const mainTasks = Array.isArray(cloned.main_tasks) ? cloned.main_tasks : [];
        if (mainTasks.length > 0) return mainTasks;

        const legacyTasks = Array.isArray(cloned.tasks) ? cloned.tasks : [];
        if (legacyTasks.length > 0) {
            return [{
                id: 'm1',
                task: cloned.plan?.goal_summary || initialGoalText || 'Main Goal',
                frequency: 'weekly',
                impact_weight: 6,
                completion_criteria: '',
                subtasks: legacyTasks.map((task: LegacyTask, idx: number) => ({
                    id: task.id || `s${idx + 1}`,
                    task: task.task || `Task ${idx + 1}`,
                    frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
                    impact_weight: Math.max(1, Math.min(5, Number(task.impact_weight) || 1)),
                    time_required_minutes: Math.max(0, Number(task.time_required_minutes) || 0),
                    completion_criteria: task.completion_criteria || '',
                })),
            }];
        }
        return [];
    };

    const updatePlanMain = (mainIndex: number, patch: Partial<StructuredMainTask>) => {
        setPlanResult((prev) => {
            if (!prev?.main_tasks) return prev;
            const updated = [...prev.main_tasks];
            updated[mainIndex] = { ...updated[mainIndex], ...patch };
            return { ...prev, main_tasks: updated };
        });
    };

    const updatePlanSub = (mainIndex: number, subIndex: number, patch: Partial<StructuredSubtask>) => {
        setPlanResult((prev) => {
            if (!prev?.main_tasks) return prev;
            const mains = [...prev.main_tasks];
            const subs = [...(mains[mainIndex]?.subtasks || [])];
            subs[subIndex] = { ...subs[subIndex], ...patch };
            mains[mainIndex] = { ...mains[mainIndex], subtasks: subs };
            return { ...prev, main_tasks: mains };
        });
    };

    const handleSave = async () => {
        if (!planResult) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const targetPoints = 10000;
            const totalDays = Math.max(1, Number(planResult.plan?.estimated_total_days) || 90);
            const adjustedCompletionDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();

            const goalTitle = planResult.plan?.goal_summary || initialGoalText.trim();
            const goalSummary = planResult.ai_summary || '';

            const { data: goalData, error: goalError } = await supabase
                .from('goals')
                .insert({
                    user_id: user.id,
                    title: goalTitle,
                    domain: investigationResult?.goal_understanding?.domain || 'other',
                    target_points: targetPoints,
                    current_points: 0,
                    estimated_completion_date: adjustedCompletionDate,
                    total_days: totalDays,
                    ai_summary: goalSummary,
                    status: 'active',
                })
                .select()
                .single();

            if (goalError) throw goalError;

            const mainTasks = ensurePlanHasMainTasks(planResult);

            for (let mainIndex = 0; mainIndex < mainTasks.length; mainIndex++) {
                const main = mainTasks[mainIndex];
                const { data: insertedMain, error: mainError } = await supabase
                    .from('sub_layers')
                    .insert({
                        goal_id: goalData.id,
                        task_description: main.task || `Main Task ${mainIndex + 1}`,
                        frequency: main.frequency === 'weekly' ? 'weekly' : 'daily',
                        impact_weight: Math.max(1, Math.min(10, Number(main.impact_weight) || 5)),
                        completion_criteria: main.completion_criteria || '',
                        time_required_minutes: 0,
                        task_type: 'main',
                        parent_task_id: null,
                        sort_order: mainIndex,
                    })
                    .select('id')
                    .single();

                if (mainError) throw mainError;

                const subtasks = Array.isArray(main.subtasks) ? main.subtasks : [];
                if (subtasks.length === 0) continue;

                const subRows = subtasks.map((sub: StructuredSubtask, subIndex: number) => ({
                    goal_id: goalData.id,
                    task_description: sub.task || `Subtask ${subIndex + 1}`,
                    frequency: sub.frequency === 'weekly' ? 'weekly' : 'daily',
                    impact_weight: Math.max(1, Math.min(5, Number(sub.impact_weight) || 1)),
                    completion_criteria: sub.completion_criteria || '',
                    time_required_minutes: Math.max(0, Number(sub.time_required_minutes) || 0),
                    task_type: 'sub',
                    parent_task_id: insertedMain.id,
                    sort_order: subIndex,
                }));

                const { error: subError } = await supabase.from('sub_layers').insert(subRows);
                if (subError) throw subError;
            }

            setNotification({ type: 'info', message: isArabic ? 'تم إنشاء الهدف بنجاح.' : 'Goal created successfully.' });
            setGuardDismissed(true);
            setTimeout(() => onComplete(), 600);
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : (isArabic ? 'خطأ غير معروف.' : 'Unknown error.');
            setNotification({ type: 'error', message: `${isArabic ? 'فشل الحفظ' : 'Save failed'}: ${message}` });
        } finally {
            setSaving(false);
        }
    };

    // ─── Render helpers ───────────────────────────────────────────────

    const renderNotification = () =>
        notification ? (
            <div className={cn(
                "mb-4 p-3 rounded-xl flex items-start gap-3 border",
                notification.type === 'error'
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : notification.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            )}>
                {notification.type === 'error'
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                }
                <p className="text-sm flex-1">{notification.message}</p>
                <button onClick={() => setNotification(null)} className="shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ) : null;

    const renderLoadingState = (title: string, subtitle: string) => (
        <div
            className="w-full max-w-2xl mx-auto animate-in fade-in duration-300"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div className="rounded-2xl border border-border bg-card/40 px-5 py-4 mb-6">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                    {isArabic ? 'هدفك' : 'Your goal'}
                </p>
                <p className="text-base font-semibold text-foreground leading-snug">
                    {initialGoalText}
                </p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
            </div>
        </div>
    );

    // ─── Refused state ────────────────────────────────────────────────

    if (refusedMessage) {
        return (
            <div
                className="w-full max-w-2xl mx-auto animate-in fade-in duration-300"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <div className="rounded-2xl border border-border bg-card/40 px-5 py-4 mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        {isArabic ? 'هدفك' : 'Your goal'}
                    </p>
                    <p className="text-base font-semibold text-foreground leading-snug">
                        {initialGoalText}
                    </p>
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-8 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <p className="font-semibold text-foreground text-lg">
                            {isArabic ? 'تعذّر إنشاء الهدف' : 'Goal could not be created'}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                            {refusedMessage}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        {isArabic ? 'العودة للرئيسية' : 'Back to home'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Loading states ───────────────────────────────────────────────

    if (step === 'INVESTIGATING') {
        return renderLoadingState(
            isArabic ? 'الذكاء الاصطناعي يحلل هدفك...' : 'AI is analyzing your goal...',
            isArabic ? 'جارِ بناء خطتك الشخصية' : 'Building your personalized plan'
        );
    }

    if (step === 'GENERATING_PLAN') {
        return renderLoadingState(t.generatingPlanTitle, t.generatingPlanSubtitle);
    }

    if (loading && step !== 'QUESTIONS' && step !== 'REVIEW') {
        return (
            renderLoadingState(
                isArabic ? 'الذكاء الاصطناعي يحلل هدفك...' : 'AI is analyzing your goal...',
                isArabic ? 'جارِ بناء خطتك الشخصية' : 'Building your personalized plan'
            )
        );
    }

    // ─── QUESTIONS step ───────────────────────────────────────────────

    if (step === 'QUESTIONS' && investigationResult) {
        const questions = investigationResult.questions || [];
        const goalSummary = investigationResult.goal_understanding?.goal_summary;

        return (
            <div
                className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {renderNotification()}

                {/* Goal echo */}
                <div className="rounded-2xl border border-border bg-card/40 px-5 py-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        {isArabic ? 'هدفك' : 'Your goal'}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                        {initialGoalText}
                    </p>
                </div>

                {/* AI understanding */}
                {goalSummary && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex gap-3">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/80 leading-relaxed">{goalSummary}</p>
                    </div>
                )}

                {/* Questions */}
                {questions.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-muted-foreground px-1">
                            {isArabic
                                ? 'أجب على هذه الأسئلة لبناء خطة دقيقة:'
                                : 'Answer these questions to build a precise plan:'}
                        </p>
                        {questions.map((q: InvestigationQuestion, idx: number) => (
                            <div key={q.id} className="rounded-2xl border border-border bg-card/30 px-5 py-4 space-y-3">
                                <label className="text-sm font-semibold text-foreground leading-snug">
                                    {idx + 1}. {q.question}
                                </label>

                                {/* Choice questions */}
                                {(q.type === 'single_choice' || q.type === 'choice') ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(q.options || []).map((opt: string) => (
                                            <button
                                                key={opt}
                                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                                                    answers[q.id] === opt
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-muted/40 border-border hover:border-primary/40 hover:bg-muted/60"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                /* Number questions → custom stepper */
                                ) : q.type === 'number' ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                const cur = Number(answers[q.id] || 0);
                                                if (cur > 0) setAnswers(prev => ({ ...prev, [q.id]: String(cur - 1) }));
                                            }}
                                            className="w-9 h-9 rounded-xl border border-border bg-muted/40 flex items-center justify-center text-lg font-bold hover:bg-muted/60 transition-colors"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            value={answers[q.id] || ''}
                                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            className="w-24 text-center p-2.5 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:border-primary/40"
                                            placeholder="0"
                                        />
                                        <button
                                            onClick={() => {
                                                const cur = Number(answers[q.id] || 0);
                                                setAnswers(prev => ({ ...prev, [q.id]: String(cur + 1) }));
                                            }}
                                            className="w-9 h-9 rounded-xl border border-border bg-muted/40 flex items-center justify-center text-lg font-bold hover:bg-muted/60 transition-colors"
                                        >
                                            +
                                        </button>
                                        {q.unit && (
                                            <span className="text-sm text-muted-foreground">{q.unit}</span>
                                        )}
                                    </div>

                                /* Text questions */
                                ) : (
                                    <textarea
                                        rows={2}
                                        value={answers[q.id] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        className="w-full p-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary/40 resize-none"
                                        placeholder={isArabic ? 'اكتب إجابتك...' : 'Type your answer...'}
                                        dir="auto"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className={cn("flex items-center justify-end gap-3 pt-2", isArabic ? "flex-row-reverse" : "flex-row")}>
                    <button
                        onClick={submitAnswers}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isArabic ? 'إنشاء الخطة' : 'Generate Plan'}
                        {!loading && (isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
                    </button>
                </div>
            </div>
        );
    }

    // ─── REVIEW step ──────────────────────────────────────────────────

    if (step === 'REVIEW' && planResult) {
        const mainTasks: StructuredMainTask[] = Array.isArray(planResult?.main_tasks)
            ? planResult.main_tasks
            : ensurePlanHasMainTasks(planResult);

        const totalDays = planResult?.plan?.estimated_total_days || 90;
        const dailyTasks = mainTasks.flatMap(m =>
            (m.subtasks || []).filter(s => s.frequency === 'daily')
        );
        const weeklyTasks = mainTasks.flatMap(m => [
            ...(m.frequency === 'weekly' ? [m] : []),
            ...(m.subtasks || []).filter(s => s.frequency === 'weekly'),
        ]);

        return (
            <div
                className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {renderNotification()}

                {/* Plan header */}
                <div className="rounded-2xl border border-border bg-card/40 px-5 py-5 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-bold text-lg text-foreground leading-snug">
                                {planResult?.plan?.goal_summary || initialGoalText}
                            </h2>
                            {planResult?.ai_summary && (
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                    {planResult.ai_summary}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-bold text-base text-foreground">{totalDays}</p>
                            <p className="text-[10px] text-muted-foreground">{isArabic ? 'يوم' : 'days'}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                                <Repeat className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-bold text-base text-foreground">{dailyTasks.length}</p>
                            <p className="text-[10px] text-muted-foreground">{isArabic ? 'يومي' : 'daily'}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-violet-600 dark:text-violet-400 mb-1">
                                <ListTodo className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-bold text-base text-foreground">{weeklyTasks.length}</p>
                            <p className="text-[10px] text-muted-foreground">{isArabic ? 'أسبوعي' : 'weekly'}</p>
                        </div>
                    </div>
                </div>

                {/* Main tasks with subtasks */}
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground px-1">
                        {isArabic ? 'المهام والخطوات:' : 'Tasks & Steps:'}
                    </p>

                    {mainTasks.map((main: StructuredMainTask, mainIdx: number) => {
                        const isExpanded = expandedMainTasks[mainIdx] !== false;
                        const subCount = (main.subtasks || []).length;

                        return (
                            <div key={main.id || mainIdx} className="rounded-2xl border border-border bg-card/30 overflow-hidden">
                                {/* Main task header */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        main.frequency === 'daily' ? "bg-emerald-500" : "bg-violet-500"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <input
                                            value={main.task}
                                            onChange={(e) => updatePlanMain(mainIdx, { task: e.target.value })}
                                            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground/50"
                                            dir="auto"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                            main.frequency === 'daily'
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                        )}>
                                            {main.frequency === 'daily'
                                                ? (isArabic ? 'يومي' : 'Daily')
                                                : (isArabic ? 'أسبوعي' : 'Weekly')
                                            }
                                        </span>
                                        {subCount > 0 && (
                                            <button
                                                onClick={() => setExpandedMainTasks(prev => ({
                                                    ...prev,
                                                    [mainIdx]: !isExpanded
                                                }))}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Subtasks */}
                                {isExpanded && subCount > 0 && (
                                    <div className="border-t border-border/60 divide-y divide-border/40">
                                        {(main.subtasks || []).map((sub: StructuredSubtask, subIdx: number) => (
                                            <div key={sub.id || `${mainIdx}-${subIdx}`} className="flex items-center gap-3 px-4 py-2.5 bg-muted/10">
                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0 ms-2" />
                                                <input
                                                    value={sub.task}
                                                    onChange={(e) => updatePlanSub(mainIdx, subIdx, { task: e.target.value })}
                                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-foreground/90 placeholder:text-muted-foreground/40"
                                                    dir="auto"
                                                />
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {sub.time_required_minutes > 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            {sub.time_required_minutes}{isArabic ? 'د' : 'm'}
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                                        sub.frequency === 'daily'
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                            : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                                    )}>
                                                        {sub.frequency === 'daily'
                                                            ? (isArabic ? 'يومي' : 'D')
                                                            : (isArabic ? 'أسبوعي' : 'W')
                                                        }
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        value={sub.impact_weight || 1}
                                                        onChange={(e) => updatePlanSub(mainIdx, subIdx, { impact_weight: Number(e.target.value) || 1 })}
                                                        className="w-10 text-center bg-muted/40 border border-border/60 rounded-lg text-[10px] py-1 outline-none focus:border-primary/40"
                                                        title={isArabic ? 'الوزن' : 'Weight'}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Action buttons */}
                <div className={cn("flex items-center gap-3 pt-2", isArabic ? "flex-row-reverse" : "flex-row")}>
                    <button
                        onClick={() => setStep('QUESTIONS')}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                        {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        {isArabic ? 'تعديل' : 'Edit'}
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Zap className="w-4 h-4" />
                        {t.acceptStartJourney}
                    </button>
                </div>
            </div>
        );
    }

    // Fallback loading
    return (
        <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
}
