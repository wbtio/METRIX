'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Loader2,
    CheckCircle,
    AlertTriangle,
    X,
    Plus,
    Trash2,
    Clock,
    Target,
    ListChecks,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import GoalInput from './GoalInput';
import { createClient } from '@/utils/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

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

    const cleanupStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
            });
            streamRef.current = stream;
            audioChunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                setIsProcessingAudio(true);
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);
                    formData.append('language', resolvedLanguage === 'ar' ? 'ar' : 'en');

                    const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
                    const data = await response.json();
                    console.log('Transcribe response:', response.status, data);

                    if (response.ok && !data.fallback && data.text) {
                        setGoalText(prev => prev ? prev + ' ' + data.text : data.text);
                    } else {
                        console.warn('Transcription failed or empty:', data);
                    }
                } catch (err) {
                    console.error('Transcription error:', err);
                } finally {
                    setIsProcessingAudio(false);
                    cleanupStream();
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Microphone access error:', err);
            setNotification({ type: 'error', message: resolvedLanguage === 'ar' ? 'فشل الوصول إلى الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.' : 'Failed to access microphone. Please allow access in browser settings.' });
            setIsRecording(false);
        }
    }, [resolvedLanguage, cleanupStream]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const toggleRecording = useCallback(() => {
        if (isProcessingAudio) return;
        if (isRecording) stopRecording();
        else startRecording();
    }, [isRecording, isProcessingAudio, startRecording, stopRecording]);

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
            <Alert
                variant={notification.type === 'error' ? 'destructive' : 'default'}
                className={cn(
                    "mb-4",
                    notification.type === 'warning' && 'border-amber-500/30 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500',
                    notification.type === 'info' && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 [&>svg]:text-emerald-500',
                )}
            >
                {notification.type === 'error' ? <AlertTriangle /> : <CheckCircle />}
                <AlertDescription className="flex items-center justify-between gap-2">
                    <span>{notification.message}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => setNotification(null)}>
                        <X />
                    </Button>
                </AlertDescription>
            </Alert>
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

                <Collapsible open={isStructuredOpen} onOpenChange={setIsStructuredOpen}>
                    <Card className="py-0 overflow-hidden">
                        <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <ListChecks className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-semibold">
                                        {resolvedLanguage === 'ar' ? 'تفاصيل منظمة (اختياري)' : 'Structured details (optional)'}
                                    </span>
                                </div>
                                <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-200", isStructuredOpen && "rotate-90")} />
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <Separator />
                            <CardContent className="pt-5 pb-5 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="goal-title">
                                            <Target className="size-3.5" />
                                            {resolvedLanguage === 'ar' ? 'عنوان الهدف' : 'Goal title'}
                                        </Label>
                                        <Input
                                            id="goal-title"
                                            value={structuredInput.title}
                                            onChange={(e) => setStructuredInput(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder={resolvedLanguage === 'ar' ? 'عنوان الهدف' : 'Goal title'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="target-points">
                                            {resolvedLanguage === 'ar' ? 'النقاط المستهدفة' : 'Target points'}
                                        </Label>
                                        <Input
                                            id="target-points"
                                            type="number"
                                            value={structuredInput.target_points}
                                            onChange={(e) => setStructuredInput(prev => ({ ...prev, target_points: Number(e.target.value) || 10000 }))}
                                            placeholder={resolvedLanguage === 'ar' ? 'النقاط المستهدفة' : 'Target points'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="goal-desc">
                                        {resolvedLanguage === 'ar' ? 'وصف الهدف' : 'Goal description'}
                                    </Label>
                                    <Textarea
                                        id="goal-desc"
                                        value={structuredInput.description}
                                        onChange={(e) => setStructuredInput(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder={resolvedLanguage === 'ar' ? 'وصف الهدف' : 'Goal description'}
                                        className="min-h-[80px]"
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">
                                            <ListChecks className="size-3.5" />
                                            {resolvedLanguage === 'ar' ? 'المهام الرئيسية والفرعية' : 'Main tasks & subtasks'}
                                        </Label>
                                        <Button size="sm" onClick={addMainTask}>
                                            <Plus className="size-3.5" />
                                            {resolvedLanguage === 'ar' ? 'إضافة مهمة رئيسية' : 'Add Main Task'}
                                        </Button>
                                    </div>

                                    {structuredInput.main_tasks.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                                            {resolvedLanguage === 'ar' ? 'لا توجد مهام بعد. أضف مهمة رئيسية للبدء.' : 'No tasks yet. Add a main task to get started.'}
                                        </div>
                                    )}

                                    <Accordion type="multiple" className="space-y-2">
                                        {structuredInput.main_tasks.map((main, mainIdx) => (
                                            <AccordionItem key={main.id} value={main.id} className="border rounded-lg px-3 last:border-b">
                                                <AccordionTrigger className="py-3 hover:no-underline">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                                            {resolvedLanguage === 'ar' ? `رئيسية ${mainIdx + 1}` : `Main ${mainIdx + 1}`}
                                                        </Badge>
                                                        <span className="truncate text-sm">
                                                            {main.task || (resolvedLanguage === 'ar' ? 'مهمة جديدة' : 'New task')}
                                                        </span>
                                                        <Badge variant="outline" className="shrink-0 text-[10px]">
                                                            {main.frequency === 'daily' ? (resolvedLanguage === 'ar' ? 'يومي' : 'Daily') : (resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly')}
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="space-y-4 pb-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                                                        <div className="space-y-2">
                                                            <Label>{resolvedLanguage === 'ar' ? 'اسم المهمة' : 'Task name'}</Label>
                                                            <Input
                                                                value={main.task}
                                                                onChange={(e) => updateMainTask(main.id, { task: e.target.value })}
                                                                placeholder={resolvedLanguage === 'ar' ? 'اسم المهمة الرئيسية' : 'Main task name'}
                                                            />
                                                        </div>
                                                        <Button variant="destructive" size="sm" onClick={() => removeMainTask(main.id)}>
                                                            <Trash2 className="size-3.5" />
                                                            {resolvedLanguage === 'ar' ? 'حذف' : 'Remove'}
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-2">
                                                            <Label>{resolvedLanguage === 'ar' ? 'التكرار' : 'Frequency'}</Label>
                                                            <Select
                                                                value={main.frequency}
                                                                onValueChange={(val) => updateMainTask(main.id, { frequency: val as 'daily' | 'weekly' })}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                                                                    <SelectItem value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>
                                                                {resolvedLanguage === 'ar' ? 'الوزن' : 'Impact weight'}
                                                                <Badge variant="outline" className="text-[10px] ms-1">{main.impact_weight}</Badge>
                                                            </Label>
                                                            <Slider
                                                                min={1}
                                                                max={10}
                                                                step={1}
                                                                value={[main.impact_weight]}
                                                                onValueChange={([val]) => updateMainTask(main.id, { impact_weight: val })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>{resolvedLanguage === 'ar' ? 'معيار الإنجاز' : 'Completion criteria'}</Label>
                                                        <Input
                                                            value={main.completion_criteria}
                                                            onChange={(e) => updateMainTask(main.id, { completion_criteria: e.target.value })}
                                                            placeholder={resolvedLanguage === 'ar' ? 'معيار الإنجاز (اختياري)' : 'Completion criteria (optional)'}
                                                        />
                                                    </div>

                                                    <Separator />

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs text-muted-foreground">
                                                                {resolvedLanguage === 'ar' ? 'المهام الفرعية' : 'Subtasks'}
                                                                <Badge variant="secondary" className="text-[10px] ms-1.5">{main.subtasks.length}</Badge>
                                                            </Label>
                                                            <Button variant="outline" size="xs" onClick={() => addSubtask(main.id)}>
                                                                <Plus className="size-3" />
                                                                {resolvedLanguage === 'ar' ? 'إضافة فرعية' : 'Add subtask'}
                                                            </Button>
                                                        </div>

                                                        {main.subtasks.map((sub) => (
                                                            <Card key={sub.id} className="py-0 gap-0 bg-muted/30">
                                                                <CardContent className="p-3 space-y-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            value={sub.task}
                                                                            onChange={(e) => updateSubtask(main.id, sub.id, { task: e.target.value })}
                                                                            placeholder={resolvedLanguage === 'ar' ? 'المهمة الفرعية' : 'Subtask name'}
                                                                            className="flex-1 h-8 text-sm"
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon-xs"
                                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => removeSubtask(main.id, sub.id)}
                                                                        >
                                                                            <Trash2 />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                        <Select
                                                                            value={sub.frequency}
                                                                            onValueChange={(val) => updateSubtask(main.id, sub.id, { frequency: val as 'daily' | 'weekly' })}
                                                                        >
                                                                            <SelectTrigger className="h-8 text-xs">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                                                                                <SelectItem value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[10px] text-muted-foreground">{resolvedLanguage === 'ar' ? 'الوزن' : 'Weight'}</span>
                                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">{sub.impact_weight}</Badge>
                                                                            </div>
                                                                            <Slider
                                                                                min={1}
                                                                                max={5}
                                                                                step={1}
                                                                                value={[sub.impact_weight]}
                                                                                onValueChange={([val]) => updateSubtask(main.id, sub.id, { impact_weight: val })}
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Clock className="size-3 text-muted-foreground shrink-0" />
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                value={sub.time_required_minutes}
                                                                                onChange={(e) => updateSubtask(main.id, sub.id, { time_required_minutes: Number(e.target.value) || 0 })}
                                                                                className="h-8 text-xs"
                                                                                placeholder="min"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>

                <div className="flex items-center justify-between gap-2">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel}>
                            {t.cancel}
                        </Button>
                    )}
                    <Button
                        className="ms-auto"
                        onClick={() => handleInvestigate()}
                        disabled={!goalText.trim() || loading}
                    >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : t.generatePlanButton}
                    </Button>
                </div>
            </div>
        );
    }

    if (step === 'QUESTIONS' && investigationResult) {
        return (
            <div className="space-y-5">
                {renderNotification()}

                <Alert className="border-primary/20 bg-primary/5">
                    <Target className="size-4 text-primary" />
                    <AlertDescription className="text-sm">
                        {investigationResult.goal_understanding?.goal_summary || (resolvedLanguage === 'ar' ? 'أجب على هذه الأسئلة لإكمال التخطيط.' : 'Answer these questions to complete planning.')}
                    </AlertDescription>
                </Alert>

                <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                                {resolvedLanguage === 'ar' ? 'أسئلة' : 'Questions'}
                            </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <Target className="size-4" />
                            </span>
                            {resolvedLanguage === 'ar' ? 'أسئلة إضافية' : 'Additional questions'}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {resolvedLanguage === 'ar' ? 'أجب لنتمكن من إنشاء خطة أفضل' : 'Answer to help us build a better plan'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {investigationResult.questions?.map((q: any, idx: number) => (
                            <div key={q.id} className="space-y-2.5">
                                <Label className="text-sm">
                                    <Badge variant="secondary" className="text-[10px] me-1.5">{idx + 1}</Badge>
                                    {q.question}
                                </Label>
                                {q.type === 'single_choice' || q.type === 'choice' ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(q.options || []).map((opt: string) => (
                                            <Button
                                                key={opt}
                                                variant={answers[q.id] === opt ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        type={q.type === 'number' ? 'number' : 'text'}
                                        value={answers[q.id] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        placeholder={t.answerPlaceholder}
                                    />
                                )}
                                {idx < (investigationResult.questions?.length || 0) - 1 && <Separator className="mt-3" />}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="justify-between">
                        <Button variant="outline" onClick={() => setStep('INPUT')}>
                            {resolvedLanguage === 'ar' ? 'رجوع' : 'Back'}
                        </Button>
                        <Button onClick={submitAnswers}>
                            {t.generatePlanButton}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const mainTasksForReview = Array.isArray(planResult?.main_tasks) ? planResult.main_tasks : [];
    return (
        <div className="space-y-5">
            {renderNotification()}

            <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-md">
                <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                            {resolvedLanguage === 'ar' ? 'ملخص' : 'Summary'}
                        </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg mb-1">
                        {planResult?.plan?.goal_summary}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        {planResult?.ai_summary}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                            {resolvedLanguage === 'ar' ? 'المدة التقديرية' : 'Estimated duration'}:
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            {planResult?.plan?.estimated_total_days || '-'} {resolvedLanguage === 'ar' ? 'يوم' : 'days'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={mainTasksForReview.map((_: any, i: number) => `review-${i}`)} className="space-y-2">
                {mainTasksForReview.map((main: any, mainIdx: number) => (
                    <AccordionItem key={main.id || mainIdx} value={`review-${mainIdx}`} className="border rounded-lg px-3 last:border-b">
                        <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="secondary" className="shrink-0 text-[10px]">
                                    {resolvedLanguage === 'ar' ? `رئيسية ${mainIdx + 1}` : `Main ${mainIdx + 1}`}
                                </Badge>
                                <span className="truncate text-sm">{main.task || '...'}</span>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                    {(main.frequency || 'weekly') === 'daily' ? (resolvedLanguage === 'ar' ? 'يومي' : 'Daily') : (resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly')}
                                </Badge>
                                {(main.subtasks || []).length > 0 && (
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                        {(main.subtasks || []).length} {resolvedLanguage === 'ar' ? 'فرعية' : 'sub'}
                                    </Badge>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                                <div className="space-y-2">
                                    <Label>{resolvedLanguage === 'ar' ? 'اسم المهمة' : 'Task name'}</Label>
                                    <Input
                                        value={main.task}
                                        onChange={(e) => updatePlanMain(mainIdx, { task: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{resolvedLanguage === 'ar' ? 'التكرار' : 'Frequency'}</Label>
                                    <Select
                                        value={main.frequency || 'weekly'}
                                        onValueChange={(val) => updatePlanMain(mainIdx, { frequency: val })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                                            <SelectItem value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        {resolvedLanguage === 'ar' ? 'الوزن' : 'Weight'}
                                        <Badge variant="outline" className="text-[10px] ms-1">{main.impact_weight || 5}</Badge>
                                    </Label>
                                    <Slider
                                        min={1}
                                        max={10}
                                        step={1}
                                        value={[main.impact_weight || 5]}
                                        onValueChange={([val]) => updatePlanMain(mainIdx, { impact_weight: val })}
                                        className="w-24"
                                    />
                                </div>
                            </div>

                            {(main.subtasks || []).length > 0 && (
                                <>
                                    <Separator />
                                    <Label className="text-xs text-muted-foreground">
                                        {resolvedLanguage === 'ar' ? 'المهام الفرعية' : 'Subtasks'}
                                    </Label>
                                    <div className="space-y-2">
                                        {(main.subtasks || []).map((sub: any, subIdx: number) => (
                                            <Card key={sub.id || `${mainIdx}-${subIdx}`} className="py-0 gap-0 bg-muted/30">
                                                <CardContent className="p-3 space-y-3">
                                                    <Input
                                                        value={sub.task}
                                                        onChange={(e) => updatePlanSub(mainIdx, subIdx, { task: e.target.value })}
                                                        className="h-8 text-sm"
                                                    />
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        <Select
                                                            value={sub.frequency || 'daily'}
                                                            onValueChange={(val) => updatePlanSub(mainIdx, subIdx, { frequency: val })}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="daily">{resolvedLanguage === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                                                                <SelectItem value="weekly">{resolvedLanguage === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-muted-foreground">{resolvedLanguage === 'ar' ? 'الوزن' : 'Weight'}</span>
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">{sub.impact_weight || 1}</Badge>
                                                            </div>
                                                            <Slider
                                                                min={1}
                                                                max={5}
                                                                step={1}
                                                                value={[sub.impact_weight || 1]}
                                                                onValueChange={([val]) => updatePlanSub(mainIdx, subIdx, { impact_weight: val })}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="size-3 text-muted-foreground shrink-0" />
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={sub.time_required_minutes || 0}
                                                                onChange={(e) => updatePlanSub(mainIdx, subIdx, { time_required_minutes: Number(e.target.value) || 0 })}
                                                                className="h-8 text-xs"
                                                                placeholder="min"
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <div className="flex items-center justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('INPUT')} disabled={saving}>
                    {resolvedLanguage === 'ar' ? 'تعديل الإدخال' : 'Edit Input'}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {t.acceptStartJourney}
                </Button>
            </div>
        </div>
    );
}
