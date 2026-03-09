'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, StopCircle, Loader2, Pin, Target, PenLine, Sparkles } from 'lucide-react';
import { type Language } from '@/lib/translations';
import Image from 'next/image';
import { getIconComponent } from './IconPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date: string;
    icon?: string;
    is_pinned?: boolean;
}

interface HomePageProps {
    goals: Goal[];
    onSelectGoal: (id: string) => void;
    onNavigateToCreate?: (goalText: string, mode: 'ai' | 'manual') => void;
    language?: Language;
    recentGoalsLimit?: number;
}

export default function HomePage({
    goals,
    onSelectGoal,
    onNavigateToCreate,
    language = 'en',
    recentGoalsLimit = 4,
}: HomePageProps) {
    const [goalInput, setGoalInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isMobile = useIsMobile();

    const isArabic = language === 'ar';
    const safeRecentGoalsLimit = Math.max(1, isMobile ? Math.min(recentGoalsLimit, 2) : recentGoalsLimit);
    const recentGoals = goals.slice(0, safeRecentGoalsLimit);

    const isRTL = (text: string) => {
        const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
        const ltrChar = /[A-Za-z\u00C0-\u024F]/;
        for (const char of text.trim()) {
            if (rtlChar.test(char)) return true;
            if (ltrChar.test(char)) return false;
        }
        return isArabic;
    };

    const handleAICreate = () => {
        if (goalInput.trim()) {
            onNavigateToCreate?.(goalInput.trim(), 'ai');
        }
    };

    const handleManualCreate = () => {
        if (goalInput.trim()) {
            onNavigateToCreate?.(goalInput.trim(), 'manual');
        }
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
                setIsProcessing(true);
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);
                    formData.append('language', language === 'ar' ? 'ar' : 'en');

                    const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
                    const data = await response.json();
                    console.log('Transcribe response:', response.status, data);

                    if (response.ok && !data.fallback && data.text) {
                        setGoalInput(prev => prev ? prev + ' ' + data.text : data.text);
                    } else {
                        console.warn('Transcription failed or empty:', data);
                    }
                } catch (err) {
                    console.error('Transcription error:', err);
                } finally {
                    setIsProcessing(false);
                    cleanupStream();
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Microphone access error:', err);
            alert(language === 'ar' ? 'فشل الوصول إلى الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.' : 'Failed to access microphone. Please allow access in browser settings.');
            setIsRecording(false);
        }
    }, [language, cleanupStream]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const toggleRecording = useCallback(() => {
        if (isProcessing) return;
        if (isRecording) stopRecording();
        else startRecording();
    }, [isRecording, isProcessing, startRecording, stopRecording]);

    const hasGoalInput = goalInput.trim().length > 0;
    const goalInputPlaceholder = isProcessing
        ? (isArabic ? 'جارِ المعالجة...' : 'Processing...')
        : isRecording
            ? (isArabic ? 'جارِ الاستماع...' : 'Listening...')
            : (isArabic ? 'اكتب هدفك هنا...' : 'Write your goal here...');

    const resizeGoalTextarea = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = '0px';

        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 28;
        const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;

        const minHeight = lineHeight + paddingTop + paddingBottom;
        const maxHeight = lineHeight * 4 + paddingTop + paddingBottom;
        const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    return (
        <div
            className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div className="flex justify-center items-center mb-4 sm:mb-8 text-center">
                <Image
                    src="/logo1.svg"
                    alt="METRIX Logo"
                    width={240}
                    height={96}
                    className="w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:hidden"
                    priority
                />
                <Image
                    src="/logo2.svg"
                    alt="METRIX Logo Dark"
                    width={240}
                    height={96}
                    className="hidden w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:block"
                    priority
                />
            </div>

            <div
                className={cn(
                    "relative overflow-hidden rounded-[24px] border bg-background/92 backdrop-blur-xl",
                    "shadow-lg shadow-black/5 transition-all duration-300 dark:shadow-black/20",
                    "focus-within:border-primary/35 focus-within:shadow-xl focus-within:shadow-black/5",
                    isRecording
                        ? "border-red-400/40 bg-red-500/[0.03]"
                        : isProcessing
                            ? "border-amber-300/50 bg-amber-500/[0.03]"
                            : "border-border/70"
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
                        isRecording
                            ? "from-red-500/[0.08] via-red-500/[0.03]"
                            : isProcessing
                                ? "from-amber-500/[0.08] via-amber-500/[0.03]"
                                : "from-primary/[0.07] via-primary/[0.02]"
                    )}
                />

                <div className="relative px-2 pt-1 pb-1 sm:px-3 sm:pt-2 sm:pb-2">
                    <Textarea
                        rows={1}
                        value={goalInput}
                        onChange={(e) => {
                            setGoalInput(e.target.value);
                            resizeGoalTextarea(e.currentTarget);
                        }}
                        onInput={(e) => resizeGoalTextarea(e.currentTarget)}
                        placeholder={goalInputPlaceholder}
                        className={cn(
                            "min-h-[44px] max-h-[140px] resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2 shadow-none",
                            "scrollbar-thin",
                            "text-sm font-medium leading-7 text-foreground sm:text-base md:text-base",
                            "placeholder:text-muted-foreground/50",
                            "focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                            "dark:bg-transparent",
                            isArabic ? "text-right" : "text-left",
                            isRecording && "placeholder:text-red-500/60 caret-red-500"
                        )}
                        dir="auto"
                    />
                </div>

                <div
                    className={cn(
                        "flex flex-col gap-2 px-2 pb-2 pt-0 sm:px-3 sm:pb-3 sm:pt-0",
                        isArabic ? "sm:flex-row-reverse sm:items-center sm:justify-between" : "sm:flex-row sm:items-center sm:justify-between"
                    )}
                >
                    <div className={cn("flex items-center gap-2", isArabic ? "flex-row-reverse" : "flex-row")}>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleRecording}
                            disabled={isProcessing}
                            aria-pressed={isRecording}
                            aria-label={isProcessing
                                ? (isArabic ? 'جارِ معالجة التسجيل الصوتي' : 'Processing voice recording')
                                : isRecording
                                    ? (isArabic ? 'إيقاف التسجيل الصوتي' : 'Stop voice recording')
                                    : (isArabic ? 'بدء التسجيل الصوتي' : 'Start voice recording')
                            }
                            className={cn(
                                "h-9 rounded-full px-3.5 text-sm shadow-none",
                                isProcessing
                                    ? "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : isRecording
                                        ? "border-red-300/70 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300"
                                        : "border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                        >
                            {isProcessing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : isRecording ? (
                                <StopCircle className="size-4" />
                            ) : (
                                <Mic className="size-4" />
                            )}
                            <span>
                                {isProcessing
                                    ? (isArabic ? 'معالجة' : 'Processing')
                                    : isRecording
                                        ? (isArabic ? 'إيقاف' : 'Stop')
                                        : (isArabic ? 'صوت' : 'Voice')}
                            </span>
                        </Button>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[280px]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleManualCreate}
                            disabled={!hasGoalInput}
                            className={cn(
                                "h-10 rounded-full px-4 text-sm font-semibold shadow-none",
                                hasGoalInput
                                    ? "border-border/70 bg-background/70 text-foreground hover:bg-muted/60"
                                    : "border border-border/70 bg-muted/40 text-muted-foreground"
                            )}
                        >
                            <PenLine className="size-4 shrink-0" />
                            <span>{isArabic ? 'يدوي' : 'Manual'}</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAICreate}
                            disabled={!hasGoalInput}
                            className={cn(
                                "h-10 rounded-full px-4 text-sm font-semibold shadow-none",
                                hasGoalInput
                                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                    : "border border-border/70 bg-muted/40 text-muted-foreground"
                            )}
                        >
                            <Sparkles className="size-4 shrink-0" />
                            <span>{isArabic ? 'ذكاء اصطناعي' : 'AI Plan'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {recentGoals.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-end justify-between px-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                            {language === 'ar' ? 'الأهداف الأخيرة' : 'Recent Goals'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {recentGoals.length} {language === 'ar' ? 'أهداف' : 'goals'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {recentGoals.map((goal) => {
                            const currentPoints = goal.current_points ?? 0;
                            const targetPoints = goal.target_points ?? 0;
                            const progress = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                            const Icon = getIconComponent(goal.icon || 'Target');
                            const goalIsRTL = isArabic || isRTL(goal.title);

                            return (
                                <div
                                    key={goal.id}
                                    className="w-full p-4 sm:p-5 rounded-3xl border transition-all relative group bg-card/40 border-border hover:bg-card/60 hover:border-primary/30 hover:shadow-md"
                                >
                                    {/* زر التثبيت: مرفوع للأعلى (top-2)، يسار في العربي (left-2)، ويمين في الإنجليزي (right-2) */}
                                    {goal.is_pinned && (
                                        <div className={cn(
                                            "absolute top-2 w-7 h-7 flex items-center justify-center rounded-full bg-chart-5/10 z-10",
                                            goalIsRTL ? "left-2" : "right-2"
                                        )}>
                                            <Pin className="w-3.5 h-3.5 text-chart-5 rotate-45" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onSelectGoal(goal.id)}
                                        className="w-full text-start"
                                        dir={goalIsRTL ? 'rtl' : 'ltr'}
                                    >
                                        <div className="w-full flex flex-col gap-3">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors shadow-sm">
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <h3 className="font-bold text-foreground text-base sm:text-lg leading-snug truncate">
                                                        {goal.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="relative h-10 w-full bg-muted/40 rounded-2xl overflow-hidden border border-border/60 shadow-inner ring-1 ring-white/5 mx-auto">
                                                <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                                                    <div className="absolute inset-0 opacity-30 bg-[url('/patterns/waves.svg')] animate-pulse"></div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                                </div>

                                                <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-5 z-20 font-bold text-xs sm:text-sm tracking-wide" dir="ltr">
                                                    <span className="text-foreground/70 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-1">
                                                        {currentPoints.toLocaleString()}
                                                        <span className="text-[9px] sm:text-[10px] opacity-70 font-medium">XP</span>
                                                    </span>
                                                    <span className="text-foreground/90 mix-blend-screen drop-shadow-sm font-black text-sm sm:text-base">
                                                        {progress}%
                                                    </span>
                                                    <span className="text-muted-foreground/80 mix-blend-screen drop-shadow-sm tabular-nums flex items-center gap-0.5">
                                                        <span className="text-[9px] sm:text-[10px] opacity-60">/</span>
                                                        {targetPoints.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-card/20 p-6 sm:p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Target className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {isArabic ? 'لا توجد أهداف بعد' : 'No goals yet'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isArabic ? 'ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا.' : 'Create your first goal and its progress will appear here.'}
                    </p>
                </div>
            )}

        </div>
    );
}
