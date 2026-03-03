'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Loader2, Send, Trophy, AlertCircle, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';
import VoiceRecorder from './VoiceRecorder';

interface DailyLogModalProps {
    goal: { id: string; title: string; ai_summary?: string; created_at?: string; current_points?: number; target_points?: number };
    tasks: any[];
    onClose: () => void;
    onSuccess: () => void;
    language?: Language;
}

export default function DailyLogModal({ goal, tasks, onClose, onSuccess, language = 'en' }: DailyLogModalProps) {
    const t = translations[language];
    const supabase = createClient();
    const [logText, setLogText] = useState('');
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState<any>(null);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning', message: string } | null>(null);
    const submittedRef = useRef(false);

    const handleVoiceTranscript = useCallback((transcript: string) => {
        setLogText(prev => prev ? prev + ' ' + transcript : transcript);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!logText.trim() || submittedRef.current) return;
        submittedRef.current = true;
        setLoading(true);
        try {
            // 1. Fetch previous logs for context
            const { data: previousLogs } = await supabase
                .from('daily_logs')
                .select('created_at, ai_score, user_input')
                .eq('goal_id', goal.id)
                .order('created_at', { ascending: false })
                .limit(5);

            // 1b. Fetch journey stats for full context
            const { count: totalLogCount } = await supabase
                .from('daily_logs')
                .select('*', { count: 'exact', head: true })
                .eq('goal_id', goal.id);

            const daysSinceStart = goal.created_at
                ? Math.ceil((Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            // 2. Get score from AI Judge API with full journey context
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
                    }
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

            // 3. Save log to database
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

            // 4. Atomic points increment — prevents race conditions
            const { error: updateError } = await supabase.rpc('increment_goal_points', {
                goal_uuid: goal.id,
                points_to_add: data.total_points_awarded
            });

            if (updateError) throw updateError;

            // 5. Invalidate analytics cache so dashboard shows fresh data
            await supabase
                .from('analytics_cache')
                .delete()
                .eq('goal_id', goal.id);

            // Notify challenge tab listeners to refresh immediately.
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
    }, [logText, goal.id, tasks, language, supabase, t]);

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
                            <p className="text-muted-foreground font-medium">{t.progressAdded}</p>
                        </div>

                        <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 text-start">
                            <p className="text-primary text-sm italic">"{evaluation.coach_message}"</p>
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
                                        </span>
                                    </div>
                                ))
                            )}
                            {evaluation.bonus?.points > 0 && (
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
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">{t.logProgress}</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase">{goal.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                </div>

                {/* IN-APP NOTIFICATION */}
                {notification && (
                    <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-chart-2/10 border border-chart-2/20 text-chart-2'
                        }`}>
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
                        onClick={handleSubmit}
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
