'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Loader2, Send, Trophy, AlertCircle, ArrowUpRight, Bot, Hand, Check, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import VoiceRecorder from '../shared/VoiceRecorder';
import { buildTaskHierarchy, type TaskRow } from '@/lib/task-hierarchy';
import { getPeriodStart, getPeriodTypeFromFrequency } from '@/lib/task-periods';
import GoalCompletionCelebration from '../goal/GoalCompletionCelebration';

interface ProgressLogDialogProps {
    goal: { id: string; title: string; ai_summary?: string; created_at?: string; current_points?: number; target_points?: number };
    tasks: TaskRow[];
    onClose: () => void;
    onSuccess: () => void;
    language?: Language;
}

type LogMode = 'select' | 'ai' | 'manual';

interface SelectedTask {
    taskId: string;
    timeSpentMinutes?: number;
}

interface EvaluationResult {
    total_points_awarded: number;
    base_points: number;
    bonus_points: number;
    coach_message: string;
    main_breakdown?: any[];
    subtask_breakdown?: any[];
    task_breakdown?: any[];
    bonus?: {
        points: number;
        reason: string;
    };
}

interface TaskCheckinRow {
    id: string;
    task_id: string;
    period_type: string;
    period_start: string;
    completed: boolean;
    completed_at: string | null;
}

export default function ProgressLogDialog({ goal, tasks, onClose, onSuccess, language = 'en' }: ProgressLogDialogProps) {
    const t = translations[language];
    const supabase = createClient();
    const [mode, setMode] = useState<LogMode>('select');
    const [logText, setLogText] = useState('');
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning', message: string } | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<Map<string, SelectedTask>>(new Map());
    const submittedRef = useRef(false);
    const [showCelebration, setShowCelebration] = useState(false);

    const mainTasks = buildTaskHierarchy(tasks);

    const handleVoiceTranscript = useCallback((transcript: string) => {
        setLogText(prev => prev ? prev + ' ' + transcript : transcript);
    }, []);

    const syncTaskCheckins = useCallback(async (taskIds: string[]) => {
        const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
        if (uniqueTaskIds.length === 0) return;

        const nowIso = new Date().toISOString();
        const todayKey = getPeriodStart('daily');
        const weekKey = getPeriodStart('weekly');

        const { data: existingRows, error: existingError } = await supabase
            .from('task_checkins')
            .select('id, task_id, period_type, period_start, completed, completed_at')
            .eq('goal_id', goal.id)
            .in('task_id', uniqueTaskIds)
            .in('period_start', [todayKey, weekKey]);

        if (existingError) throw existingError;

        const existingMap = new Map(
            ((existingRows as TaskCheckinRow[] | null) || []).map((row) => [
                `${row.task_id}:${row.period_type}:${row.period_start}`,
                row,
            ]),
        );

        const rowsToInsert: Array<{
            goal_id: string;
            task_id: string;
            period_type: string;
            period_start: string;
            completed: boolean;
            completed_at: string;
        }> = [];
        const rowIdsToUpdate: string[] = [];

        uniqueTaskIds.forEach((taskId) => {
            const task = tasks.find((item) => item.id === taskId);
            if (!task) return;

            const periodType = getPeriodTypeFromFrequency(task.frequency);
            const periodStart = getPeriodStart(task.frequency);
            const key = `${taskId}:${periodType}:${periodStart}`;
            const existing = existingMap.get(key);

            if (existing) {
                rowIdsToUpdate.push(existing.id);
                return;
            }

            rowsToInsert.push({
                goal_id: goal.id,
                task_id: taskId,
                period_type: periodType,
                period_start: periodStart,
                completed: true,
                completed_at: nowIso,
            });
        });

        if (rowsToInsert.length > 0) {
            const { error } = await supabase.from('task_checkins').insert(rowsToInsert);
            if (error) throw error;
        }

        if (rowIdsToUpdate.length > 0) {
            const updateResults = await Promise.all(
                rowIdsToUpdate.map((id) =>
                    supabase
                        .from('task_checkins')
                        .update({ completed: true, completed_at: nowIso })
                        .eq('id', id),
                ),
            );

            const failedUpdate = updateResults.find((result) => result.error);
            if (failedUpdate?.error) throw failedUpdate.error;
        }
    }, [goal.id, supabase, tasks]);

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTasks(prev => {
            const newMap = new Map(prev);
            if (newMap.has(taskId)) {
                newMap.delete(taskId);
            } else {
                newMap.set(taskId, { taskId });
            }
            return newMap;
        });
    };

    const updateTaskTime = (taskId: string, minutes: number) => {
        setSelectedTasks(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(taskId);
            if (existing) {
                newMap.set(taskId, { ...existing, timeSpentMinutes: minutes });
            }
            return newMap;
        });
    };

    const handleManualSubmit = useCallback(async () => {
        if (selectedTasks.size === 0 || submittedRef.current) return;
        submittedRef.current = true;
        setLoading(true);

        try {
            let totalPoints = 0;
            let bonusPoints = 0;
            const breakdown: any[] = [];

            // Calculate points for each selected task
            selectedTasks.forEach((selected, taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (!task) return;

                const basePoints = task.impact_weight || 0;
                let taskBonus = 0;

                // Calculate bonus if time exceeded expected time
                if (selected.timeSpentMinutes && task.time_required_minutes) {
                    if (selected.timeSpentMinutes > task.time_required_minutes) {
                        const ratio = selected.timeSpentMinutes / task.time_required_minutes;
                        taskBonus = Math.floor(basePoints * (ratio - 1) * 0.5); // 50% bonus for extra time
                    }
                }

                totalPoints += basePoints + taskBonus;
                bonusPoints += taskBonus;

                breakdown.push({
                    task_id: taskId,
                    points: basePoints,
                    bonus: taskBonus,
                    status: 'done',
                    time_spent: selected.timeSpentMinutes
                });
            });

            const result: EvaluationResult = {
                total_points_awarded: totalPoints,
                base_points: totalPoints - bonusPoints,
                bonus_points: bonusPoints,
                coach_message: language === 'ar' 
                    ? 'رائع! تم تسجيل تقدمك بنجاح.'
                    : 'Great! Your progress has been logged successfully.',
                task_breakdown: breakdown,
                bonus: bonusPoints > 0 ? {
                    points: bonusPoints,
                    reason: t.exceededTimeBonus
                } : undefined
            };

            setEvaluation(result);

            // Save to database
            const { error: logError } = await supabase
                .from('daily_logs')
                .insert({
                    goal_id: goal.id,
                    user_input: `Manual log: ${selectedTasks.size} task(s) completed`,
                    ai_score: totalPoints,
                    ai_feedback: result.coach_message,
                    breakdown: breakdown
                });

            if (logError) throw logError;

            // Update goal points
            const { error: updateError } = await supabase.rpc('increment_goal_points', {
                goal_uuid: goal.id,
                points_to_add: totalPoints
            });

            if (updateError) throw updateError;

            try {
                await syncTaskCheckins(Array.from(selectedTasks.keys()));
            } catch (syncError) {
                console.error('Failed to sync task checkins after manual log:', syncError);
            }

            // Check if goal is now complete
            const newPoints = (goal.current_points ?? 0) + totalPoints;
            if (goal.target_points && newPoints >= goal.target_points) {
                setShowCelebration(true);
            }

            // Notify challenge listeners
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('challenge-log-updated', {
                        detail: { goalId: goal.id, createdAt: new Date().toISOString() },
                    })
                );
            }

        } catch (e: any) {
            console.error(e);
            submittedRef.current = false;
            const errorMsg = language === 'ar' 
                ? `فشل في حفظ السجل: ${e.message}`
                : `Failed to save log: ${e.message}`;
            setNotification({ type: 'error', message: errorMsg });
        } finally {
            setLoading(false);
        }
    }, [selectedTasks, tasks, goal.id, language, supabase, t, goal.current_points, goal.target_points, syncTaskCheckins]);

    const handleAISubmit = useCallback(async () => {
        if (!logText.trim() || submittedRef.current) return;
        submittedRef.current = true;
        setLoading(true);

        try {
            // Fetch previous logs for context
            const { data: previousLogs } = await supabase
                .from('daily_logs')
                .select('created_at, ai_score, user_input')
                .eq('goal_id', goal.id)
                .order('created_at', { ascending: false })
                .limit(5);

            const { count: totalLogCount } = await supabase
                .from('daily_logs')
                .select('*', { count: 'exact', head: true })
                .eq('goal_id', goal.id);

            const daysSinceStart = goal.created_at
                ? Math.ceil((Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            // Get AI evaluation with time-based bonus calculation
            const res = await fetch('/api/goal/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tasks, 
                    log: logText,
                    previousLogs: previousLogs || [],
                    goalContext: {
                        title: goal.title,
                        ai_summary: goal.ai_summary || '',
                        current_points: goal.current_points || 0,
                        target_points: goal.target_points || 0,
                        total_logs: totalLogCount || 0,
                        days_since_start: daysSinceStart,
                    },
                    calculateTimeBonus: true // New flag for time-based bonus
                }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                if (data?.error === 'quota_exceeded') {
                    submittedRef.current = false;
                    setNotification({ type: 'warning', message: language === 'ar' ? data.message_ar : data.message_en });
                    return;
                }
                throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            }

            if (data.error === 'quota_exceeded') {
                submittedRef.current = false;
                setNotification({ type: 'warning', message: language === 'ar' ? data.message_ar : data.message_en });
                return;
            }

            if (data.status === 'refused') {
                submittedRef.current = false;
                setNotification({ type: 'error', message: data.safe_redirection?.message || 'لا يمكن معالجة هذا الطلب.' });
                return;
            }

            setEvaluation(data);

            // Save log
            const { error: logError } = await supabase
                .from('daily_logs')
                .insert({
                    goal_id: goal.id,
                    user_input: logText,
                    ai_score: data.total_points_awarded,
                    ai_feedback: data.coach_message,
                    breakdown: data.task_breakdown
                });

            if (logError) throw logError;

            // Update points
            const { error: updateError } = await supabase.rpc('increment_goal_points', {
                goal_uuid: goal.id,
                points_to_add: data.total_points_awarded
            });

            if (updateError) throw updateError;

            try {
                const completedTaskIds = (data.subtask_breakdown || data.task_breakdown || [])
                    .filter((item: any) => (Number(item?.points) || 0) > 0 || item?.status === 'done' || item?.status === 'partial')
                    .map((item: any) => String(item.task_id || ''))
                    .filter(Boolean);

                await syncTaskCheckins(completedTaskIds);
            } catch (syncError) {
                console.error('Failed to sync task checkins after AI log:', syncError);
            }

            // Check if goal is now complete
            const newPoints = (goal.current_points ?? 0) + data.total_points_awarded;
            if (goal.target_points && newPoints >= goal.target_points) {
                setShowCelebration(true);
            }

            // Notify listeners
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('challenge-log-updated', {
                        detail: { goalId: goal.id, createdAt: new Date().toISOString() },
                    })
                );
            }

        } catch (e: any) {
            console.error(e);
            submittedRef.current = false;
            const errorMsg = language === 'ar' 
                ? `فشل في تقييم السجل: ${e.message}`
                : `Failed to evaluate log: ${e.message}`;
            setNotification({ type: 'error', message: errorMsg });
        } finally {
            setLoading(false);
        }
    }, [logText, goal, tasks, language, supabase, syncTaskCheckins]);

    // Results screen
    if (evaluation) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-border">
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-chart-5/10 text-chart-5 dark:bg-chart-3/10 dark:text-chart-3 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce border border-chart-5/20 dark:border-chart-3/20">
                            <Trophy className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-foreground">+{evaluation.total_points_awarded} {t.pointsAwarded}</h3>
                            {evaluation.bonus_points > 0 && (
                                <p className="text-sm text-chart-1 font-bold mt-1">
                                    {t.bonusPoints}: +{evaluation.bonus_points}
                                </p>
                            )}
                            <p className="text-muted-foreground font-medium">{t.progressAdded}</p>
                        </div>

                        <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 text-start">
                            <p className="text-primary text-sm italic" dir={language === 'ar' ? 'rtl' : 'ltr'}>"{evaluation.coach_message}"</p>
                        </div>

                        <div className="space-y-3">
                            {Array.isArray(evaluation.main_breakdown) && evaluation.main_breakdown.length > 0 ? (
                                evaluation.main_breakdown.map((mb: any, mbIdx: number) => (
                                    <div key={mbIdx} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm py-1.5">
                                            <span className="font-bold text-foreground/90 truncate flex-1 text-start flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${mb.status === 'done' ? 'bg-chart-2' : mb.status === 'partial' ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                                                {mb.main_task}
                                            </span>
                                            <span className="text-xs text-muted-foreground ms-3 shrink-0">
                                                {mb.completed_subtasks}/{mb.total_subtasks} &middot; +{mb.total_points}
                                            </span>
                                        </div>
                                        {(evaluation.subtask_breakdown || evaluation.task_breakdown || [])
                                            .filter((item: any) => {
                                                const taskRow = tasks.find((tk: any) => tk.id === item.task_id);
                                                return taskRow?.parent_task_id === mb.main_task_id;
                                            })
                                            .map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-xs py-1 ps-4 border-s-2 border-border/40">
                                                    <span className="text-foreground/70 truncate flex-1 text-start">
                                                        {tasks.find((tk: any) => tk.id === item.task_id)?.task_description || t.generalProgress}
                                                    </span>
                                                    <span className={`font-bold ms-3 ${item.points > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
                                                        +{item.points}
                                                        {item.bonus > 0 && <span className="text-chart-1"> (+{item.bonus})</span>}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                ))
                            ) : (
                                (evaluation.subtask_breakdown || evaluation.task_breakdown || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                                        <span className="text-foreground/80 font-medium truncate flex-1 text-start">
                                            {tasks.find((tk: any) => tk.id === item.task_id)?.task_description || t.generalProgress}
                                        </span>
                                        <span className={`font-bold ms-4 ${item.points > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
                                            +{item.points}
                                            {item.bonus > 0 && <span className="text-chart-1"> (+{item.bonus})</span>}
                                        </span>
                                    </div>
                                ))
                            )}
                            {evaluation.bonus && evaluation.bonus.points > 0 && (
                                <div className="flex justify-between items-center text-sm py-2 border-t border-dashed border-border">
                                    <span className="text-chart-1 font-bold flex-1 text-start flex items-center gap-1">
                                        <ArrowUpRight className="w-4 h-4" /> {t.bonus}: {evaluation.bonus.reason}
                                    </span>
                                    <span className="text-chart-1 font-bold ms-4">+{evaluation.bonus.points}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => { onSuccess(); onClose(); }}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 transition-all"
                        >
                            {t.continueJourney}
                        </button>

                        {showCelebration && (
                            <GoalCompletionCelebration
                                goalTitle={goal.title}
                                language={language}
                                onClose={() => {
                                    setShowCelebration(false);
                                    onSuccess();
                                    onClose();
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Mode selection screen
    if (mode === 'select') {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <div className="flex-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <h3 className="text-xl font-bold text-foreground">{t.logProgress}</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">{goal.title}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
                            <X className="w-6 h-6 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="p-6 space-y-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <p className="text-sm text-muted-foreground font-medium mb-4">{t.logProgressMode}</p>
                        
                        <button
                            onClick={() => setMode('ai')}
                            className="w-full p-5 bg-primary/5 border-2 border-primary/20 rounded-xl hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/15 rounded-lg flex items-center justify-center shrink-0">
                                    <Bot className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 text-start">
                                    <h4 className="font-bold text-foreground text-base mb-0.5">{t.aiMode}</h4>
                                    <p className="text-sm text-muted-foreground">{t.aiModeDesc}</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('manual')}
                            className="w-full p-5 bg-chart-2/5 border-2 border-chart-2/20 rounded-xl hover:bg-chart-2/10 hover:border-chart-2/40 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-chart-2/15 rounded-lg flex items-center justify-center shrink-0">
                                    <Hand className="w-6 h-6 text-chart-2" />
                                </div>
                                <div className="flex-1 text-start">
                                    <h4 className="font-bold text-foreground text-base mb-0.5">{t.manualMode}</h4>
                                    <p className="text-sm text-muted-foreground">{t.manualModeDesc}</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // AI mode screen
    if (mode === 'ai') {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">{t.aiMode}</h3>
                            <p className="text-xs text-muted-foreground font-bold uppercase">{goal.title}</p>
                        </div>
                        <button onClick={() => setMode('select')} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-6 h-6 text-muted-foreground" />
                        </button>
                    </div>

                    {notification && (
                        <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-chart-2/10 border border-chart-2/20 text-chart-2'}`}>
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm flex-1">{notification.message}</p>
                            <button onClick={() => setNotification(null)} className="p-1 hover:bg-muted rounded-full">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">{t.describeWhatYouDid}</label>
                            <div className="relative">
                                <textarea
                                    value={logText}
                                    onChange={(e) => setLogText(e.target.value)}
                                    placeholder={t.progressPlaceholder}
                                    className="w-full h-48 p-4 border-2 rounded-2xl resize-none transition-all placeholder:text-muted-foreground bg-muted/30 text-foreground border-transparent focus:border-primary"
                                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                                />
                                <div className="absolute bottom-4 end-4">
                                    <VoiceRecorder 
                                        onTranscript={handleVoiceTranscript}
                                        language={language === 'ar' ? 'ar' : 'en'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/10 rounded-2xl flex gap-3 text-primary text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p dir={language === 'ar' ? 'rtl' : 'ltr'}>{t.aiJudgeNote}</p>
                        </div>

                        <button
                            onClick={handleAISubmit}
                            disabled={loading || !logText.trim()}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-5 h-5" /> {t.submitLog}</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Manual mode screen
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">{t.manualMode}</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase">{goal.title}</p>
                    </div>
                    <button onClick={() => setMode('select')} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                </div>

                {notification && (
                    <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-chart-2/10 border border-chart-2/20 text-chart-2'}`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm flex-1">{notification.message}</p>
                        <button onClick={() => setNotification(null)} className="p-1 hover:bg-muted rounded-full">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-muted-foreground font-medium">{t.selectCompletedTasks}</p>
                    
                    {mainTasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t.noTasksToSelect}
                        </div>
                    ) : (
                        mainTasks.map((main) => {
                            // If main task has subtasks, show them
                            if (main.subtasks && main.subtasks.length > 0) {
                                return (
                                    <div key={main.id} className="space-y-2">
                                        <div className="font-bold text-sm text-foreground/80 px-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>{main.task_description}</div>
                                        {main.subtasks.map((sub) => {
                                            const isSelected = selectedTasks.has(sub.id);
                                            const selectedData = selectedTasks.get(sub.id);
                                            
                                            return (
                                                <div 
                                                    key={sub.id} 
                                                    className={`rounded-xl p-4 space-y-3 transition-all cursor-pointer select-none ${isSelected ? 'bg-chart-2/10 border-2 border-chart-2 shadow-sm' : 'bg-muted/30 border-2 border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'}`}
                                                    onClick={() => toggleTaskSelection(sub.id)}
                                                >
                                                    <div className="w-full flex items-center gap-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-chart-2 border-chart-2 scale-105' : 'border-muted-foreground/50 bg-background hover:border-muted-foreground'}`}>
                                                            {isSelected && <Check className="w-5 h-5 text-white stroke-[3]" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>{sub.task_description}</p>
                                                            <p className="text-xs text-muted-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                                {t.weight}: {sub.impact_weight}
                                                                {sub.time_required_minutes && ` • ${sub.time_required_minutes} ${t.minutes}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {isSelected && sub.time_required_minutes && (
                                                        <div className={`space-y-2 ${language === 'ar' ? 'pe-8' : 'ps-8'}`} onClick={(e) => e.stopPropagation()}>
                                                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                                <Clock className="w-3 h-3" />
                                                                {t.timeSpent}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder={`${t.expectedTime}: ${sub.time_required_minutes} ${t.minutes}`}
                                                                value={selectedData?.timeSpentMinutes || ''}
                                                                onChange={(e) => updateTaskTime(sub.id, parseInt(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-sm focus:border-chart-2 transition-colors"
                                                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                                            />
                                                            {selectedData?.timeSpentMinutes && selectedData.timeSpentMinutes > sub.time_required_minutes && (
                                                                <p className="text-xs text-chart-1 font-bold flex items-center gap-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                                    <ArrowUpRight className="w-3 h-3" />
                                                                    +{Math.floor((sub.impact_weight || 0) * ((selectedData.timeSpentMinutes / sub.time_required_minutes) - 1) * 0.5)} {t.bonusPoints}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }
                            
                            // If no subtasks, show the main task itself as selectable
                            const isSelected = selectedTasks.has(main.id);
                            const selectedData = selectedTasks.get(main.id);
                            
                            return (
                                <div 
                                    key={main.id} 
                                    className={`rounded-xl p-4 space-y-3 transition-all cursor-pointer select-none ${isSelected ? 'bg-chart-2/10 border-2 border-chart-2 shadow-sm' : 'bg-muted/30 border-2 border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'}`}
                                    onClick={() => toggleTaskSelection(main.id)}
                                >
                                    <div className="w-full flex items-center gap-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-chart-2 border-chart-2 scale-105' : 'border-muted-foreground/50 bg-background hover:border-muted-foreground'}`}>
                                            {isSelected && <Check className="w-5 h-5 text-white stroke-[3]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>{main.task_description}</p>
                                            <p className="text-xs text-muted-foreground" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                {t.weight}: {main.impact_weight}
                                                {main.time_required_minutes && ` • ${main.time_required_minutes} ${t.minutes}`}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isSelected && main.time_required_minutes && (
                                        <div className={`space-y-2 ${language === 'ar' ? 'pe-8' : 'ps-8'}`} onClick={(e) => e.stopPropagation()}>
                                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                <Clock className="w-3 h-3" />
                                                {t.timeSpent}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={`${t.expectedTime}: ${main.time_required_minutes} ${t.minutes}`}
                                                value={selectedData?.timeSpentMinutes || ''}
                                                onChange={(e) => updateTaskTime(main.id, parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-sm focus:border-chart-2 transition-colors"
                                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                            />
                                            {selectedData?.timeSpentMinutes && selectedData.timeSpentMinutes > main.time_required_minutes && (
                                                <p className="text-xs text-chart-1 font-bold flex items-center gap-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    +{Math.floor((main.impact_weight || 0) * ((selectedData.timeSpentMinutes / main.time_required_minutes) - 1) * 0.5)} {t.bonusPoints}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 border-t border-border shrink-0">
                    <button
                        onClick={handleManualSubmit}
                        disabled={loading || selectedTasks.size === 0}
                        className="w-full py-4 bg-chart-2 text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-chart-2/20"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-5 h-5" /> {t.submitLog} ({selectedTasks.size})</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
