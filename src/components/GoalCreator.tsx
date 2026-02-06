'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Clock, Target, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';

import GoalInput from './GoalInput';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface GoalCreatorProps {
    onComplete: () => void;
    onCancel?: () => void;
    language?: Language;
}

export default function GoalCreator({ onComplete, onCancel, language = 'en' }: GoalCreatorProps) {
    const supabase = createClient();
    const router = useRouter();
    const [step, setStep] = useState<'INPUT' | 'QUESTIONS' | 'REVIEW'>('INPUT');
    const [goalText, setGoalText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const hasArabic = /[\u0600-\u06FF]/.test(goalText);
    const resolvedLanguage: Language = hasArabic ? 'ar' : language;
    const t = translations[resolvedLanguage];

    // Phase 1 Data
    const [investigationResult, setInvestigationResult] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Phase 2 Data
    const [planResult, setPlanResult] = useState<any>(null);
    const [customDays, setCustomDays] = useState<number | null>(null);
    const [customDailyMinutes, setCustomDailyMinutes] = useState<number | null>(null);

    // In-app notifications
    const [notification, setNotification] = useState<{ type: 'error' | 'warning' | 'info', message: string } | null>(null);

    // Speech Recognition
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    const baselineDays = Math.max(1, Number(planResult?.plan?.estimated_total_days) || 1);
    const baselineDailyMinutes = Math.max(
        5,
        Number(planResult?.plan?.recommended_daily_time_minutes) ||
        Number(planResult?.plan?.baseline_daily_time_minutes) ||
        60
    );
    const totalEffortMinutes = baselineDays * baselineDailyMinutes;
    const minDays = Math.max(1, Math.round(baselineDays * 0.5));
    const maxDays = Math.max(minDays + 1, Math.round(baselineDays * 2));
    const minDailyMinutes = 10;
    const maxDailyMinutes = Math.max(60, Math.round(baselineDailyMinutes * 3));
    const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const effectiveDays = clampValue(customDays ?? baselineDays, minDays, maxDays);
    const effectiveDailyMinutes = clampValue(customDailyMinutes ?? baselineDailyMinutes, minDailyMinutes, maxDailyMinutes);
    const dailyScale = baselineDailyMinutes > 0 ? effectiveDailyMinutes / baselineDailyMinutes : 1;
    const isRTL = resolvedLanguage === 'ar';

    const formatMinutes = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const hLabel = t.hoursShort || 'h';
        const mLabel = t.minutesShort || 'm';
        if (hours <= 0) return `${minutes}${mLabel}`;
        if (mins === 0) return `${hours}${hLabel}`;
        return `${hours}${hLabel} ${mins}${mLabel}`;
    };

    const adjustedTasks = (planResult?.tasks || []).map((task: any) => {
        const baseMinutes = Number(task.time_required_minutes) || 0;
        const adjustedMinutes = Math.max(5, Math.round(baseMinutes * dailyScale));
        return { ...task, adjusted_minutes: adjustedMinutes };
    });

    useEffect(() => {
        if (!planResult?.plan) return;
        setCustomDays(baselineDays);
        setCustomDailyMinutes(baselineDailyMinutes);
    }, [planResult?.plan?.estimated_total_days, planResult?.plan?.recommended_daily_time_minutes, planResult?.plan?.baseline_daily_time_minutes]);

    const startRecording = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setNotification({ type: 'error', message: 'التعرف على الصوت غير مدعوم. استخدم Chrome أو Edge.' });
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false; // Only final results
        recognition.lang = 'ar-SA';

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) {
                setGoalText(prev => prev + transcript);
            }
        };

        recognition.onerror = (e: any) => {
            console.error('Speech error:', e.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

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
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleDaysChange = (value: number) => {
        const nextDays = clampValue(value, minDays, maxDays);
        const nextDaily = clampValue(Math.round(totalEffortMinutes / nextDays), minDailyMinutes, maxDailyMinutes);
        setCustomDays(nextDays);
        setCustomDailyMinutes(nextDaily);
    };

    const handleDailyMinutesChange = (value: number) => {
        const nextMinutes = clampValue(value, minDailyMinutes, maxDailyMinutes);
        const nextDays = clampValue(Math.round(totalEffortMinutes / nextMinutes), minDays, maxDays);
        setCustomDailyMinutes(nextMinutes);
        setCustomDays(nextDays);
    };

    const handleSave = async () => {
        if (!planResult) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const adjustedCompletionDate = new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000).toISOString();

            const { data: goalData, error: goalError } = await supabase.from('goals').insert({
                user_id: user?.id,
                title: planResult.plan.goal_summary,
                domain: investigationResult?.goal_understanding?.domain || 'other',
                target_points: 10000,
                current_points: 0,
                estimated_completion_date: adjustedCompletionDate,
                total_days: effectiveDays,
                ai_summary: planResult.ai_summary,
                status: 'active'
            }).select().single();

            if (goalError) throw goalError;

            const tasksToInsert = adjustedTasks.map((t: any) => ({
                goal_id: goalData.id,
                task_description: t.task,
                impact_weight: t.impact_weight || 1,
                frequency: t.frequency || 'daily',
                time_required_minutes: t.adjusted_minutes,
                completion_criteria: t.completion_criteria
            }));

            const { error: tasksError } = await supabase.from('sub_layers').insert(tasksToInsert);
            if (tasksError) throw tasksError;

            setNotification({ type: 'info', message: '🚀 تم بدء رحلتك بنجاح!' });
            setTimeout(() => onComplete(), 1500);
        } catch (e: any) {
            console.error(e);
            setNotification({ type: 'error', message: 'فشل في الحفظ: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleInvestigate = async (currentAnswers?: any) => {
        if (!goalText.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/goal/investigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalText,
                    context: currentAnswers || {}
                }),
            });
            const data = await res.json();
            setInvestigationResult(data);

            if (data.status === 'refused') {
                setStep('INPUT');
                setNotification({ type: 'error', message: data.safe_redirection?.message || 'This goal cannot be processed.' });
            } else if (data.status === 'unrealistic') {
                setNotification({ type: 'warning', message: data.realism_check?.suggested_adjustments?.[0] || 'Consider adjusting your timeline.' });
                setStep('QUESTIONS');
            } else if (data.goal_understanding?.readiness === 'ready_for_plan') {
                handleCreatePlan(currentAnswers);
            } else {
                setStep('QUESTIONS');
            }
        } catch (e) {
            console.error(e);
            setNotification({ type: 'error', message: 'حدث خطأ في تحليل الهدف. حاول مرة أخرى.' });
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
                    targetDeadline
                }),
            });
            const data = await res.json();
            if (data.status === 'unrealistic') {
                setNotification({ type: 'warning', message: data.realism_check?.suggested_adjustments?.[0] || 'This plan might need adjustments.' });
            }
            setPlanResult(data);
            setStep('REVIEW');
        } catch (e) {
            console.error(e);
            setNotification({ type: 'error', message: 'حدث خطأ في إنشاء الخطة. حاول مرة أخرى.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (id: string, value: string) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
    };

    const submitAnswers = () => {
        // Pass answers directly as an object map { [question_id]: answer }
        handleInvestigate(answers);
    };

    if (loading && step !== 'INPUT') { // Only show full loader if not in input (input handles its own loading state usually, or we can keep it simple)
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">AI is thinking...</p>
            </div>
        );
    }

    // STEP 1: INPUT VIEW (Clean, no card wrapper)
    if (step === 'INPUT') {
        return (
            <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500">
                {/* IN-APP NOTIFICATION */}
                {notification && (
                    <div className={cn(
                        "mb-6 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300 shadow-sm border",
                        notification.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                        notification.type === 'warning' ? 'bg-chart-5/10 border-chart-5/20 text-chart-5 dark:bg-chart-3/10 dark:border-chart-3/20 dark:text-chart-3' :
                        'bg-chart-2/10 border-chart-2/20 text-chart-2'
                    )}>
                        {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
                            notification.type === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
                                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                        <p className="text-sm flex-1">{notification.message}</p>
                        <button onClick={() => setNotification(null)} className="p-1 hover:bg-muted rounded-full">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <GoalInput
                    value={goalText}
                    onChange={setGoalText}
                    onSubmit={() => handleInvestigate()}
                    isRecording={isRecording}
                    onToggleRecording={toggleRecording}
                    isLoading={loading}
                    placeholder={t.goalInputPlaceholder}
                />
            </div>
        );
    }

    return (
        <div
            className="max-w-2xl mx-auto bg-gradient-to-b from-card/80 via-card/60 to-card/80 backdrop-blur-2xl rounded-[32px] shadow-[0_30px_120px_rgba(0,0,0,0.16)] overflow-hidden min-h-[500px] border border-border/60 ring-1 ring-border/10"
            dir={isRTL ? 'rtl' : 'ltr'}
        >

            {/* HEADER */}
            <div className="bg-gradient-to-r from-primary/10 via-chart-1/10 to-transparent p-8 text-foreground relative border-b border-border/60">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="absolute left-4 top-4 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                <h2 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                    <Target className="w-8 h-8 text-primary" />
                    {step === 'QUESTIONS' ? t.clarifyDetailsTitle : t.masterPlanTitle}
                </h2>
                <p className="opacity-70 mt-2 text-lg font-light text-muted-foreground">
                    {step === 'QUESTIONS' ? t.clarifyDetailsSubtitle : t.masterPlanSubtitle}
                </p>
            </div>

            {/* IN-APP NOTIFICATION */}
            {notification && (
                <div className={cn(
                    "mx-8 mt-6 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300 border",
                    notification.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                    notification.type === 'warning' ? 'bg-chart-5/10 border-chart-5/20 text-chart-5 dark:bg-chart-3/10 dark:border-chart-3/20 dark:text-chart-3' :
                    'bg-chart-2/10 border-chart-2/20 text-chart-2'
                )}>
                    {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
                        notification.type === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <p className="text-sm flex-1">{notification.message}</p>
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-muted rounded-full">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="p-8">

                {/* STEP 2: QUESTIONS */}
                {step === 'QUESTIONS' && investigationResult && (
                    <div className="space-y-8">
                        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-primary text-base leading-relaxed">
                            AI: {investigationResult.goal_understanding?.goal_summary || "Please answer these questions so I can build a realistic plan."}
                        </div>

                        <div className="space-y-6">
                            {investigationResult.questions?.map((q: any) => (
                                <div key={q.id} className="space-y-3">
                                    <label className="block text-lg font-medium text-foreground">{q.question}</label>
                                    {q.type === 'choice' || q.type === 'single_choice' ? (
                                        <div className="flex flex-wrap gap-2">
                                            {q.options?.map((opt: string) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleAnswerChange(q.id, opt)}
                                                    className={cn(
                                                        "px-5 py-3 rounded-xl text-sm transition-all border",
                                                        answers[q.id] === opt
                                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
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
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            className="w-full p-4 bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                            placeholder={t.answerPlaceholder}
                                            dir={resolvedLanguage === 'ar' ? 'rtl' : 'ltr'}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={submitAnswers}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/20"
                        >
                            {t.generatePlanButton}
                        </button>
                    </div>
                )}

                {/* STEP 3: REVIEW */}
                {step === 'REVIEW' && planResult && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Summary Card */}
                        <div className="bg-card/80 p-6 rounded-2xl border border-border/70 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-chart-2/40 to-transparent" />
                            <h3 className="text-xl font-bold text-foreground mb-2">{planResult.plan?.goal_summary}</h3>
                            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{planResult.ai_summary}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-muted/50 px-4 py-3 rounded-xl border border-border/70 shadow-sm">
                                    <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">{t.durationLabel}</span>
                                    <span className="font-bold text-primary text-xl">{effectiveDays} {t.days}</span>
                                </div>
                                <div className="bg-muted/50 px-4 py-3 rounded-xl border border-border/70 shadow-sm">
                                    <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">{t.dailyEffortLabel}</span>
                                    <span className="font-bold text-primary text-xl">{formatMinutes(effectiveDailyMinutes)}</span>
                                    <span className="block text-xs text-muted-foreground mt-1">{t.perDay}</span>
                                </div>
                            </div>
                        </div>

                        {/* Plan Tuner */}
                        <div className="bg-gradient-to-br from-muted/25 to-muted/10 p-6 rounded-2xl border border-border/70 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="text-lg font-bold text-foreground">{t.planTunerTitle}</h4>
                                    <p className="text-sm text-muted-foreground">{t.planTunerSubtitle}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-foreground">{t.durationLabel}</span>
                                        <span className="font-bold text-foreground">{effectiveDays} {t.days}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={minDays}
                                        max={maxDays}
                                        step={1}
                                        value={effectiveDays}
                                        onChange={(e) => handleDaysChange(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{minDays}</span>
                                        <span>{maxDays}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-foreground">{t.dailyEffortLabel}</span>
                                        <span className="font-bold text-foreground">{formatMinutes(effectiveDailyMinutes)} {t.perDay}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={minDailyMinutes}
                                        max={maxDailyMinutes}
                                        step={5}
                                        value={effectiveDailyMinutes}
                                        onChange={(e) => handleDailyMinutesChange(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{formatMinutes(minDailyMinutes)}</span>
                                        <span>{formatMinutes(maxDailyMinutes)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div>
                            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-chart-2" /> {t.dailyHabitsSubLayers}
                            </h4>
                            <div className="space-y-3">
                                {adjustedTasks.map((task: any, idx: number) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-card/70 border border-border/70 rounded-2xl hover:bg-card/90 hover:border-primary/30 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 border border-primary/20">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-foreground">{task.task}</h5>
                                            <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                                                <span className="bg-muted px-2 py-1 rounded flex items-center gap-1 border border-border">
                                                    <Clock className="w-3 h-3" /> {formatMinutes(task.adjusted_minutes)}
                                                </span>
                                                <span className="bg-muted px-2 py-1 rounded border border-border">
                                                    {t.weight}: {task.impact_weight || 1}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Speed Up Option */}
                        {planResult.speedup?.supported && (
                            <div className="mt-6 p-6 bg-chart-5/10 border border-chart-5/20 rounded-2xl dark:bg-chart-3/10 dark:border-chart-3/20">
                                <h4 className="font-bold text-chart-5 dark:text-chart-3 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5" /> {t.wantItFasterTitle}
                                </h4>
                                <p className="text-sm text-chart-5/80 dark:text-chart-3/80 mb-4">
                                    {planResult.speedup?.options?.[0]?.tradeoffs?.join(', ') || t.wantItFasterFallback}
                                </p>
                                <button
                                    onClick={() => handleCreatePlan(undefined, `${planResult.speedup.options[0].target_days} ${resolvedLanguage === 'ar' ? 'يوم' : 'days'}`)}
                                    className="w-full py-3 bg-chart-5/20 text-chart-5 dark:text-chart-3 font-bold rounded-xl hover:bg-chart-5/30 dark:hover:bg-chart-3/30 transition-colors border border-chart-5/20 dark:border-chart-3/20"
                                >
                                    {planResult.speedup?.options?.[0]?.label || t.switchToFastTrack}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-5 bg-foreground text-background rounded-[20px] font-bold text-xl hover:opacity-90 transition-all shadow-xl shadow-foreground/10 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin w-6 h-6" /> : t.acceptStartJourney}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
