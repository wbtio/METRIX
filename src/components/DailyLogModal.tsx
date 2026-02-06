'use client';

import { useState, useRef } from 'react';
import { X, Loader2, Send, Mic, MicOff, Trophy, AlertCircle, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { translations, type Language } from '@/lib/translations';

interface DailyLogModalProps {
    goal: { id: string; title: string };
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
    const [isRecording, setIsRecording] = useState(false);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning', message: string } | null>(null);
    const recognitionRef = useRef<any>(null);

    const startRecording = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setNotification({ type: 'error', message: 'التعرف على الصوت غير مدعوم. استخدم Chrome أو Edge.' });
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'ar-SA';

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) {
                setLogText(prev => prev + transcript);
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

    const handleSubmit = async () => {
        if (!logText.trim()) return;
        setLoading(true);
        try {
            // 1. Fetch previous logs for context
            const { data: previousLogs } = await supabase
                .from('daily_logs')
                .select('created_at, ai_score, user_input')
                .eq('goal_id', goal.id)
                .order('created_at', { ascending: false })
                .limit(5);

            // 2. Get score from AI Judge API with previous logs context
            const res = await fetch('/api/goal/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tasks, 
                    log: logText,
                    previousLogs: previousLogs || []
                }),
            });
            const data = await res.json();

            if (data.status === 'refused') {
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

            // 4. Update goal points
            const { data: currentGoal } = await supabase
                .from('goals')
                .select('current_points')
                .eq('id', goal.id)
                .single();

            const newPoints = (currentGoal?.current_points || 0) + data.total_points_awarded;

            const { error: updateError } = await supabase
                .from('goals')
                .update({ current_points: newPoints })
                .eq('id', goal.id);

            if (updateError) throw updateError;

        } catch (e: any) {
            console.error(e);
            const errorMsg = language === 'ar' 
                ? `فشل في تقييم السجل: ${e.message}`
                : `Failed to evaluate log: ${e.message}`;
            setNotification({ type: 'error', message: errorMsg });
        } finally {
            setLoading(false);
        }
    };

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
                            {evaluation.task_breakdown?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                                    <span className="text-foreground/80 font-medium truncate flex-1 text-start">
                                        {tasks.find(t => t.id === item.task_id)?.task_description || t.generalProgress}
                                    </span>
                                    <span className={`font-bold ms-4 ${item.points > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
                                        +{item.points}
                                    </span>
                                </div>
                            ))}
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
                                className={`w-full h-48 p-4 border-2 rounded-2xl resize-none transition-all placeholder:text-muted-foreground bg-muted/30 text-foreground ${isRecording ? 'bg-destructive/10 border-destructive/40' : 'border-transparent focus:border-primary'}`}
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                            />
                            {isRecording && (
                                <div className="absolute top-2 left-4 text-xs text-destructive font-medium animate-pulse">{t.listening}</div>
                            )}
                            <button
                                onClick={toggleRecording}
                                className={`absolute bottom-4 end-4 p-3 shadow-sm border rounded-full transition-all ${isRecording ? 'bg-destructive border-destructive text-destructive-foreground animate-pulse' : 'bg-background border-border text-muted-foreground hover:text-primary'}`}
                            >
                                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
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
