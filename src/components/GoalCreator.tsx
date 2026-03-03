'use client';

import { useMemo, useRef, useState } from 'react';
import {
    Loader2,
    CheckCircle,
    AlertTriangle,
    X,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import GoalInput from './GoalInput';
import { createClient } from '@/utils/supabase/client';

interface GoalCreatorProps {
    onComplete: () => void;
    onCancel?: () => void;
    language?: Language;
    initialGoalText?: string;
}

interface StructuredSubtaskInput {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

interface StructuredMainTaskInput {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    impact_weight: number;
    completion_criteria: string;
    subtasks: StructuredSubtaskInput[];
}

interface StructuredGoalInput {
    title: string;
    description: string;
    target_points: number;
    main_tasks: StructuredMainTaskInput[];
}

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const createEmptySubtask = (): StructuredSubtaskInput => ({
    id: makeId('sub'),
    task: '',
    frequency: 'daily',
    impact_weight: 3,
    time_required_minutes: 15,
    completion_criteria: '',
});

const createEmptyMainTask = (): StructuredMainTaskInput => ({
    id: makeId('main'),
    task: '',
    frequency: 'weekly',
    impact_weight: 6,
    completion_criteria: '',
    subtasks: [createEmptySubtask()],
});

export default function GoalCreator({
    onComplete,
    onCancel,
    language = 'en',
    initialGoalText = '',
}: GoalCreatorProps) {
    const supabase = createClient();
    const [step, setStep] = useState<'INPUT' | 'QUESTIONS' | 'REVIEW'>('INPUT');
    const [goalText, setGoalText] = useState(initialGoalText);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isStructuredOpen, setIsStructuredOpen] = useState(false);

    const hasArabic = /[\u0600-\u06FF]/.test(goalText);
    const resolvedLanguage: Language = hasArabic ? 'ar' : language;
    const t = translations[resolvedLanguage];

    const [structuredInput, setStructuredInput] = useState<StructuredGoalInput>({
        title: initialGoalText || '',
        description: '',
        target_points: 10000,
        main_tasks: [],
    });

    const [investigationResult, setInvestigationResult] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [planResult, setPlanResult] = useState<any>(null);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning' | 'info', message: string } | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    const addMainTask = () => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: [...prev.main_tasks, createEmptyMainTask()],
        }));
    };

    const removeMainTask = (id: string) => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: prev.main_tasks.filter(m => m.id !== id),
        }));
    };

    const updateMainTask = (id: string, patch: Partial<StructuredMainTaskInput>) => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: prev.main_tasks.map(m => (m.id === id ? { ...m, ...patch } : m)),
        }));
    };

    const addSubtask = (mainId: string) => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: prev.main_tasks.map(m => {
                if (m.id !== mainId) return m;
                return { ...m, subtasks: [...m.subtasks, createEmptySubtask()] };
            }),
        }));
    };

    const removeSubtask = (mainId: string, subId: string) => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: prev.main_tasks.map(m => {
                if (m.id !== mainId) return m;
                return { ...m, subtasks: m.subtasks.filter(s => s.id !== subId) };
            }),
        }));
    };

    const updateSubtask = (mainId: string, subId: string, patch: Partial<StructuredSubtaskInput>) => {
        setStructuredInput(prev => ({
            ...prev,
            main_tasks: prev.main_tasks.map(m => {
                if (m.id !== mainId) return m;
                return {
                    ...m,
                    subtasks: m.subtasks.map(s => (s.id === subId ? { ...s, ...patch } : s)),
                };
            }),
        }));
    };

    const startRecording = () => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setNotification({ type: 'error', message: resolvedLanguage === 'ar' ? 'المتصفح لا يدعم الإدخال الصوتي.' : 'Speech input is not supported in this browser.' });
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = resolvedLanguage === 'ar' ? 'ar-SA' : 'en-US';

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) setGoalText(prev => prev + transcript);
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const toggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const structuredPayload = useMemo(() => ({
        title: structuredInput.title?.trim() || undefined,
        description: structuredInput.description?.trim() || undefined,
        target_points: Number(structuredInput.target_points) || 10000,
        main_tasks: structuredInput.main_tasks
            .filter(m => m.task.trim())
            .map(m => ({
                id: m.id,
                task: m.task.trim(),
                frequency: m.frequency,
                impact_weight: Math.max(1, Math.min(10, Number(m.impact_weight) || 1)),
                completion_criteria: m.completion_criteria?.trim() || '',
                subtasks: m.subtasks
                    .filter(s => s.task.trim())
                    .map(s => ({
                        id: s.id,
                        task: s.task.trim(),
                        frequency: s.frequency,
                        impact_weight: Math.max(1, Math.min(5, Number(s.impact_weight) || 1)),
                        time_required_minutes: Math.max(0, Number(s.time_required_minutes) || 0),
                        completion_criteria: s.completion_criteria?.trim() || '',
                    })),
            })),
    }), [structuredInput]);

    const handleInvestigate = async (currentAnswers?: any) => {
        if (!goalText.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/goal/investigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalText,
                    context: currentAnswers || {},
                    structured_input: structuredPayload,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                if (data?.error === 'quota_exceeded') {
                    setNotification({ type: 'warning', message: resolvedLanguage === 'ar' ? data.message_ar : data.message_en });
                    return;
                }
                throw new Error(data?.error || `HTTP ${res.status}`);
            }

            setInvestigationResult(data);

            if (data.status === 'refused') {
                setNotification({ type: 'error', message: data.safe_redirection?.message || 'Goal refused for safety reasons.' });
                setStep('INPUT');
                return;
            }

            const ready = data.goal_understanding?.readiness === 'ready_for_plan';
            if (ready) {
                await handleCreatePlan(currentAnswers);
                return;
            }
            setStep('QUESTIONS');
        } catch (error: any) {
            console.error(error);
            setNotification({ type: 'error', message: resolvedLanguage === 'ar' ? 'فشل تحليل الهدف.' : 'Failed to analyze goal.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlan = async (finalAnswers?: any, targetDeadline?: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/goal/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalText,
                    answers: finalAnswers || answers,
                    targetDeadline,
                    structured_input: structuredPayload,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                if (data?.error === 'quota_exceeded') {
                    setNotification({ type: 'warning', message: resolvedLanguage === 'ar' ? data.message_ar : data.message_en });
                    return;
                }
                throw new Error(data?.error || `HTTP ${res.status}`);
            }

            if (!data.plan) {
                throw new Error('Invalid plan response');
            }

            setPlanResult(data);
            setStep('REVIEW');
        } catch (error: any) {
            console.error(error);
            setNotification({ type: 'error', message: resolvedLanguage === 'ar' ? 'فشل إنشاء الخطة.' : 'Failed to create plan.' });
        } finally {
            setLoading(false);
        }
    };

    const submitAnswers = () => {
        const contextWithQuestions: Record<string, string> = {};
        if (investigationResult?.questions) {
            for (const q of investigationResult.questions) {
                if (answers[q.id]) contextWithQuestions[q.question] = answers[q.id];
            }
        }
        handleInvestigate(contextWithQuestions);
    };

    const ensurePlanHasMainTasks = (rawPlan: any) => {
        const cloned = { ...rawPlan };
        const mainTasks = Array.isArray(cloned.main_tasks) ? cloned.main_tasks : [];
        if (mainTasks.length > 0) return cloned.main_tasks;

        const legacyTasks = Array.isArray(cloned.tasks) ? cloned.tasks : [];
        if (legacyTasks.length > 0) {
            return [
                {
                    id: 'm1',
                    task: cloned.plan?.goal_summary || structuredInput.title || goalText || 'Main Goal',
                    frequency: 'weekly',
                    impact_weight: 6,
                    completion_criteria: '',
                    subtasks: legacyTasks.map((task: any, idx: number) => ({
                        id: task.id || `s${idx + 1}`,
                        task: task.task || `Task ${idx + 1}`,
                        frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
                        impact_weight: Math.max(1, Math.min(5, Number(task.impact_weight) || 1)),
                        time_required_minutes: Math.max(0, Number(task.time_required_minutes) || 0),
                        completion_criteria: task.completion_criteria || '',
                    })),
                },
            ];
        }
        return [];
    };

    const handleSave = async () => {
        if (!planResult) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const targetPoints = Math.max(1000, Number(structuredInput.target_points) || 10000);
            const totalDays = Math.max(1, Number(planResult.plan?.estimated_total_days) || 90);
            const adjustedCompletionDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();

            const goalTitle =
                structuredInput.title?.trim() ||
                planResult.plan?.goal_summary ||
                goalText.trim();

            const goalSummary = structuredInput.description?.trim() || planResult.ai_summary || '';

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

                const subRows = subtasks.map((sub: any, subIndex: number) => ({
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

            setNotification({ type: 'info', message: resolvedLanguage === 'ar' ? 'تم إنشاء الهدف بنجاح.' : 'Goal created successfully.' });
            setTimeout(() => onComplete(), 600);
        } catch (error: any) {
            console.error(error);
            setNotification({ type: 'error', message: `${resolvedLanguage === 'ar' ? 'فشل الحفظ' : 'Save failed'}: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    const updatePlanMain = (mainIndex: number, patch: any) => {
        setPlanResult((prev: any) => {
            if (!prev?.main_tasks) return prev;
            const updated = [...prev.main_tasks];
            updated[mainIndex] = { ...updated[mainIndex], ...patch };
            return { ...prev, main_tasks: updated };
        });
    };

    const updatePlanSub = (mainIndex: number, subIndex: number, patch: any) => {
        setPlanResult((prev: any) => {
            if (!prev?.main_tasks) return prev;
            const mains = [...prev.main_tasks];
            const subs = [...(mains[mainIndex]?.subtasks || [])];
            subs[subIndex] = { ...subs[subIndex], ...patch };
            mains[mainIndex] = { ...mains[mainIndex], subtasks: subs };
            return { ...prev, main_tasks: mains };
        });
    };

    const renderNotification = () => (
        notification ? (
            <div className={cn(
                "mb-4 p-3 rounded-xl flex items-start gap-3 border",
                notification.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                    notification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            )}>
                {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <p className="text-sm flex-1">{notification.message}</p>
                <button onClick={() => setNotification(null)} className="shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ) : null
    );

    if (loading && step !== 'INPUT') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground text-sm">AI is preparing your plan...</p>
            </div>
        );
    }

    if (step === 'INPUT') {
        return (
            <div className="space-y-4">
                {renderNotification()}

                <GoalInput
                    value={goalText}
                    onChange={setGoalText}
                    onSubmit={handleInvestigate}
                    isRecording={isRecording}
                    onToggleRecording={toggleRecording}
                    isLoading={loading}
                    placeholder={t.goalInputPlaceholder}
                    language={resolvedLanguage}
                />

                <div className="border border-border rounded-2xl p-4 bg-card/30">
                    <button
                        onClick={() => setIsStructuredOpen(v => !v)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
                    >
                        <span>{resolvedLanguage === 'ar' ? 'تفاصيل منظمة (اختياري)' : 'Structured details (optional)'}</span>
                        {isStructuredOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isStructuredOpen && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    value={structuredInput.title}
                                    onChange={(e) => setStructuredInput(prev => ({ ...prev, title: e.target.value }))}
                                    className="p-3 rounded-xl border border-border bg-background"
                                    placeholder={resolvedLanguage === 'ar' ? 'عنوان الهدف' : 'Goal title'}
                                />
                                <input
                                    type="number"
                                    value={structuredInput.target_points}
                                    onChange={(e) => setStructuredInput(prev => ({ ...prev, target_points: Number(e.target.value) || 10000 }))}
                                    className="p-3 rounded-xl border border-border bg-background"
                                    placeholder={resolvedLanguage === 'ar' ? 'النقاط المستهدفة' : 'Target points'}
                                />
                            </div>

                            <textarea
                                value={structuredInput.description}
                                onChange={(e) => setStructuredInput(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 rounded-xl border border-border bg-background min-h-[90px]"
                                placeholder={resolvedLanguage === 'ar' ? 'وصف الهدف' : 'Goal description'}
                            />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm">{resolvedLanguage === 'ar' ? 'المهام الرئيسية والفرعية' : 'Main tasks and subtasks'}</h4>
                                    <button
                                        onClick={addMainTask}
                                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {resolvedLanguage === 'ar' ? 'إضافة مهمة رئيسية' : 'Add Main Task'}
                                    </button>
                                </div>

                                {structuredInput.main_tasks.map((main) => (
                                    <div key={main.id} className="border border-border rounded-xl p-3 bg-background/70 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={main.task}
                                                onChange={(e) => updateMainTask(main.id, { task: e.target.value })}
                                                className="flex-1 p-2.5 rounded-lg border border-border bg-background"
                                                placeholder={resolvedLanguage === 'ar' ? 'اسم المهمة الرئيسية' : 'Main task'}
                                            />
                                            <select
                                                value={main.frequency}
                                                onChange={(e) => updateMainTask(main.id, { frequency: e.target.value as 'daily' | 'weekly' })}
                                                className="p-2.5 rounded-lg border border-border bg-background text-sm"
                                            >
                                                <option value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</option>
                                                <option value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                            </select>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={main.impact_weight}
                                                onChange={(e) => updateMainTask(main.id, { impact_weight: Number(e.target.value) || 1 })}
                                                className="w-20 p-2.5 rounded-lg border border-border bg-background"
                                            />
                                            <button onClick={() => removeMainTask(main.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <input
                                            value={main.completion_criteria}
                                            onChange={(e) => updateMainTask(main.id, { completion_criteria: e.target.value })}
                                            className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                                            placeholder={resolvedLanguage === 'ar' ? 'معيار الإنجاز (اختياري)' : 'Completion criteria (optional)'}
                                        />

                                        <div className="space-y-2">
                                            {main.subtasks.map((sub) => (
                                                <div key={sub.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                                                    <input
                                                        value={sub.task}
                                                        onChange={(e) => updateSubtask(main.id, sub.id, { task: e.target.value })}
                                                        className="p-2.5 rounded-lg border border-border bg-background text-sm"
                                                        placeholder={resolvedLanguage === 'ar' ? 'المهمة الفرعية' : 'Subtask'}
                                                    />
                                                    <select
                                                        value={sub.frequency}
                                                        onChange={(e) => updateSubtask(main.id, sub.id, { frequency: e.target.value as 'daily' | 'weekly' })}
                                                        className="p-2.5 rounded-lg border border-border bg-background text-sm"
                                                    >
                                                        <option value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</option>
                                                        <option value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={5}
                                                        value={sub.impact_weight}
                                                        onChange={(e) => updateSubtask(main.id, sub.id, { impact_weight: Number(e.target.value) || 1 })}
                                                        className="w-16 p-2.5 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={sub.time_required_minutes}
                                                        onChange={(e) => updateSubtask(main.id, sub.id, { time_required_minutes: Number(e.target.value) || 0 })}
                                                        className="w-20 p-2.5 rounded-lg border border-border bg-background text-sm"
                                                        placeholder="min"
                                                    />
                                                    <button
                                                        onClick={() => removeSubtask(main.id, sub.id)}
                                                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive justify-self-start"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => addSubtask(main.id)}
                                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {resolvedLanguage === 'ar' ? 'إضافة فرعية' : 'Add subtask'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold"
                        >
                            {t.cancel}
                        </button>
                    )}
                    <button
                        onClick={() => handleInvestigate()}
                        disabled={!goalText.trim() || loading}
                        className="ms-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.generatePlanButton}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'QUESTIONS' && investigationResult) {
        return (
            <div className="space-y-5">
                {renderNotification()}

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
                    {investigationResult.goal_understanding?.goal_summary || (resolvedLanguage === 'ar' ? 'أجب على هذه الأسئلة لإكمال التخطيط.' : 'Answer these questions to complete planning.')}
                </div>

                <div className="space-y-4">
                    {investigationResult.questions?.map((q: any) => (
                        <div key={q.id} className="space-y-2">
                            <label className="text-sm font-semibold">{q.question}</label>
                            {q.type === 'single_choice' || q.type === 'choice' ? (
                                <div className="flex flex-wrap gap-2">
                                    {(q.options || []).map((opt: string) => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg border text-xs",
                                                answers[q.id] === opt ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    type={q.type === 'number' ? 'number' : 'text'}
                                    value={answers[q.id] || ''}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-border bg-background"
                                    placeholder={t.answerPlaceholder}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setStep('INPUT')}
                        className="px-4 py-2 rounded-lg border border-border text-sm"
                    >
                        {resolvedLanguage === 'ar' ? 'رجوع' : 'Back'}
                    </button>
                    <button
                        onClick={submitAnswers}
                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
                    >
                        {t.generatePlanButton}
                    </button>
                </div>
            </div>
        );
    }

    const mainTasksForReview = Array.isArray(planResult?.main_tasks) ? planResult.main_tasks : [];
    return (
        <div className="space-y-5">
            {renderNotification()}

            <div className="rounded-2xl border border-border p-4 bg-card/30 space-y-2">
                <h3 className="font-bold text-lg">{planResult?.plan?.goal_summary}</h3>
                <p className="text-sm text-muted-foreground">{planResult?.ai_summary}</p>
                <div className="text-xs text-muted-foreground">
                    {resolvedLanguage === 'ar' ? 'المدة التقديرية' : 'Estimated duration'}: {planResult?.plan?.estimated_total_days || '-'} {resolvedLanguage === 'ar' ? 'يوم' : 'days'}
                </div>
            </div>

            <div className="space-y-3">
                {mainTasksForReview.map((main: any, mainIdx: number) => (
                    <div key={main.id || mainIdx} className="rounded-xl border border-border p-3 bg-background/70 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                            <input
                                value={main.task}
                                onChange={(e) => updatePlanMain(mainIdx, { task: e.target.value })}
                                className="p-2.5 rounded-lg border border-border bg-background text-sm"
                            />
                            <select
                                value={main.frequency || 'weekly'}
                                onChange={(e) => updatePlanMain(mainIdx, { frequency: e.target.value })}
                                className="p-2.5 rounded-lg border border-border bg-background text-sm"
                            >
                                <option value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</option>
                                <option value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                            </select>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={main.impact_weight || 5}
                                onChange={(e) => updatePlanMain(mainIdx, { impact_weight: Number(e.target.value) || 1 })}
                                className="w-20 p-2.5 rounded-lg border border-border bg-background text-sm"
                            />
                        </div>

                        {(main.subtasks || []).map((sub: any, subIdx: number) => (
                            <div key={sub.id || `${mainIdx}-${subIdx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 ps-3 border-s border-border">
                                <input
                                    value={sub.task}
                                    onChange={(e) => updatePlanSub(mainIdx, subIdx, { task: e.target.value })}
                                    className="p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                />
                                <select
                                    value={sub.frequency || 'daily'}
                                    onChange={(e) => updatePlanSub(mainIdx, subIdx, { frequency: e.target.value })}
                                    className="p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                >
                                    <option value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</option>
                                    <option value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                                </select>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={sub.impact_weight || 1}
                                    onChange={(e) => updatePlanSub(mainIdx, subIdx, { impact_weight: Number(e.target.value) || 1 })}
                                    className="w-16 p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    value={sub.time_required_minutes || 0}
                                    onChange={(e) => updatePlanSub(mainIdx, subIdx, { time_required_minutes: Number(e.target.value) || 0 })}
                                    className="w-20 p-2 rounded-lg border border-border bg-background text-xs sm:text-sm"
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between gap-2">
                <button
                    onClick={() => setStep('INPUT')}
                    className="px-4 py-2 rounded-lg border border-border text-sm"
                    disabled={saving}
                >
                    {resolvedLanguage === 'ar' ? 'تعديل الإدخال' : 'Edit Input'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-bold disabled:opacity-60 flex items-center gap-2"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t.acceptStartJourney}
                </button>
            </div>
        </div>
    );
}
