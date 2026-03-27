'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, StopCircle, Loader2, Pin, Target, PenLine, Sparkles, CircleAlert, ListChecks } from 'lucide-react';
import { type Language } from '@/lib/translations';
import type { GoalTaskStats } from '@/app/page';
import Image from 'next/image';
import { getIconComponent } from './goal/IconPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getGoalEndDaysChip } from '@/lib/goal-dates';
import { useIsMobile } from '@/hooks/use-mobile';
import GoalProgressBar from '@/components/shared/GoalProgressBar';

interface Goal {
    id: string;
    title: string;
    current_points: number;
    target_points: number;
    status: string;
    created_at: string;
    estimated_completion_date?: string | null;
    icon?: string;
    is_pinned?: boolean;
}

interface HomePageProps {
    goals: Goal[];
    taskStatsMap?: Record<string, GoalTaskStats>;
    onSelectGoal: (id: string) => void;
    onNavigateToCreate?: (goalText: string, mode: 'ai' | 'manual') => void;
    language?: Language;
    recentGoalsLimit?: number;
}

export default function HomePage({
    goals,
    taskStatsMap = {},
    onSelectGoal,
    onNavigateToCreate,
    language = 'en',
    recentGoalsLimit = 4,
}: HomePageProps) {
    const [goalInput, setGoalInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAIDetailPrompt, setShowAIDetailPrompt] = useState(false);
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

    const minimumGoalWords = 15;

    const analyzeGoalInput = (value: string) => {
        const normalized = value.trim().replace(/\s+/g, ' ');
        const wordCount = normalized ? normalized.split(' ').length : 0;
        const needsMoreDetail = normalized.length > 0 && wordCount < minimumGoalWords;
        const detailProgress = normalized.length > 0
            ? Math.min(wordCount / minimumGoalWords, 1)
            : 0;

        return {
            normalized,
            wordCount,
            needsMoreDetail,
            detailProgress,
        };
    };

    const handleAICreate = () => {
        const trimmedGoal = normalizedGoalInput;
        if (!trimmedGoal) {
            return;
        }

        if (goalNeedsMoreDetail) {
            setShowAIDetailPrompt(true);
            return;
        }

        setShowAIDetailPrompt(false);
        onNavigateToCreate?.(trimmedGoal, 'ai');
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

    const { normalized: normalizedGoalInput, wordCount: goalWordCount, needsMoreDetail: goalNeedsMoreDetail } = analyzeGoalInput(goalInput);
    const hasGoalInput = normalizedGoalInput.length > 0;
    const aiPromptVisible = showAIDetailPrompt && goalNeedsMoreDetail;
    const promptColorStage = !goalNeedsMoreDetail
        ? 0
        : goalWordCount < 3
            ? 5
            : goalWordCount < 6
                ? 4
                : goalWordCount < 9
                    ? 3
                    : goalWordCount < 12
                        ? 2
                        : 1;
    const promptToneClasses = promptColorStage === 5
        ? "border-amber-500/45 bg-gradient-to-b from-amber-500/24 via-amber-300/30 to-background"
        : promptColorStage === 4
            ? "border-amber-400/40 bg-gradient-to-b from-amber-400/18 via-amber-200/24 to-background"
            : promptColorStage === 3
                ? "border-amber-300/35 bg-gradient-to-b from-amber-300/14 via-amber-100/20 to-background"
                : promptColorStage === 2
                    ? "border-amber-200/30 bg-gradient-to-b from-amber-200/10 via-amber-50/18 to-background"
                    : "border-amber-100/24 bg-gradient-to-b from-amber-100/10 via-background/96 to-background";
    const promptCardClasses = promptColorStage === 5
        ? "border-amber-500/60 bg-amber-500/[0.05]"
        : promptColorStage === 4
            ? "border-amber-400/55 bg-amber-500/[0.04]"
            : promptColorStage === 3
                ? "border-amber-300/45 bg-amber-500/[0.03]"
                : promptColorStage === 2
                    ? "border-amber-200/38 bg-amber-500/[0.022]"
                    : "border-amber-100/28 bg-amber-500/[0.015]";
    const promptMessages = {
        ar: {
            5: 'وضّح النتيجة التي تريد الوصول لها وما الذي تريد تغييره فعلاً.',
            4: 'أضف لماذا هذا الهدف مهم لك أو ما الأثر الذي تنتظره منه.',
            3: 'زد وقتاً أو ظرفاً مهماً حتى تصبح الخطة أقرب لواقعك.',
            2: 'الوصف صار أفضل، وأي تفصيل عن النتيجة سيجعل البداية أدق.',
            1: 'باقي توضيح صغير عن الهدف حتى نبدأ بخطة أوضح.',
        },
        en: {
            5: 'Clarify the result you want and what you want to change.',
            4: 'Add why this goal matters or the impact you expect from it.',
            3: 'Add timing or context so the plan feels closer to your reality.',
            2: 'This is clearer now, and one more outcome detail will sharpen the start.',
            1: 'One small clarification will help us start with a clearer plan.',
        },
    } as const;
    const goalPromptMessage = goalNeedsMoreDetail
        ? (isArabic ? promptMessages.ar[promptColorStage as 1 | 2 | 3 | 4 | 5] : promptMessages.en[promptColorStage as 1 | 2 | 3 | 4 | 5])
        : null;
    const goalInputPlaceholder = isProcessing
        ? (isArabic ? 'جارِ المعالجة...' : 'Processing...')
        : isRecording
            ? (isArabic ? 'جارِ الاستماع...' : 'Listening...')
            : (isArabic ? 'اكتب هدفك هنا\u200f...' : 'Write your goal here...');

    const handleManualCreate = () => {
        if (!hasGoalInput) {
            return;
        }

        setShowAIDetailPrompt(false);
        onNavigateToCreate?.(normalizedGoalInput, 'manual');
    };

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
            <div className="mb-4 flex flex-col items-center justify-center text-center sm:mb-8">
                <Image
                    src="/logo1.svg"
                    alt="METRIX Logo"
                    width={240}
                    height={96}
                    sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, 240px"
                    className="w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:hidden"
                    style={{ height: 'auto' }}
                    priority
                />
                <Image
                    src="/logo2.svg"
                    alt="METRIX Logo Dark"
                    width={240}
                    height={96}
                    sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, 240px"
                    className="hidden w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:block"
                    style={{ height: 'auto' }}
                    priority
                />
                <p
                    className="-mt-2 max-w-[19rem] text-sm font-medium leading-6 text-muted-foreground sm:-mt-1 sm:max-w-[24rem] sm:text-base"
                    dir={isArabic ? "rtl" : "ltr"}
                    lang={isArabic ? "ar" : "en"}
                >
                    {isArabic ? "اذا ما استمرت بهدفك راح تفشل يا غبي" : "If you don't stick to your goal, you'll fail, stupid"}
                </p>
            </div>

            <div
                className={cn(
                    "relative transition-all duration-300",
                    aiPromptVisible ? "pt-10 sm:pt-11" : "pt-0"
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden transition-all duration-300",
                        aiPromptVisible
                            ? "h-[5.5rem] opacity-100 sm:h-[5.75rem]"
                            : "h-0 opacity-0"
                    )}
                >
                    <div
                        className={cn(
                            "rounded-t-[24px] border border-b-0 px-4 pt-1 pb-8 sm:px-5 sm:pt-1.5 sm:pb-9",
                            promptToneClasses
                        )}
                    >
                        <div
                            role="status"
                            aria-live="polite"
                            className={cn(
                                "flex items-center gap-3 text-sm font-medium leading-6 text-amber-950 dark:text-amber-100",
                                isArabic ? "flex-row-reverse text-right" : "text-left"
                            )}
                        >
                            <div className="shrink-0 rounded-full border border-amber-500/25 bg-background/70 p-1.5 backdrop-blur">
                                <CircleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                            </div>
                            <p id="goal-ai-detail-prompt" className="flex-1 text-[13px] font-semibold leading-5 text-amber-900/95 dark:text-amber-100/90">
                                {goalPromptMessage}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "relative z-20 overflow-hidden rounded-[24px] border bg-background/92 backdrop-blur-xl",
                        "shadow-lg shadow-black/5 transition-all duration-300 dark:shadow-black/20",
                        "focus-within:border-primary/35 focus-within:shadow-xl focus-within:shadow-black/5",
                        isRecording
                            ? "border-red-400/40 bg-red-500/[0.03]"
                            : isProcessing
                                ? "border-amber-300/50 bg-amber-500/[0.03]"
                                : aiPromptVisible
                                    ? promptCardClasses
                                    : "border-border/70"
                    )}
                >
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
                            isRecording
                                ? "from-red-500/[0.08] via-red-500/[0.03]"
                            : isProcessing
                                ? "from-amber-500/[0.08] via-amber-500/[0.03]"
                                : aiPromptVisible
                                    ? "from-amber-500/[0.08] via-amber-500/[0.02]"
                                    : "from-primary/[0.07] via-primary/[0.02]"
                        )}
                    />

                    <div className="relative px-2 pt-1 pb-1 sm:px-3 sm:pt-2 sm:pb-2">
                        <Textarea
                            rows={1}
                            value={goalInput}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                const nextAnalysis = analyzeGoalInput(nextValue);

                                setGoalInput(nextValue);
                                if (!nextAnalysis.needsMoreDetail) {
                                    setShowAIDetailPrompt(false);
                                }
                                resizeGoalTextarea(e.currentTarget);
                            }}
                            onInput={(e) => resizeGoalTextarea(e.currentTarget)}
                            placeholder={goalInputPlaceholder}
                            aria-describedby={aiPromptVisible ? 'goal-ai-detail-prompt' : undefined}
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
                            dir={isArabic ? 'rtl' : 'auto'}
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
                                    "h-10 rounded-full px-4 text-sm font-semibold shadow-none transition-all duration-300",
                                    aiPromptVisible
                                        ? "border-amber-300/60 bg-amber-500/[0.12] text-amber-900 dark:text-amber-200"
                                        : hasGoalInput
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
                            const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                            const stats = taskStatsMap[goal.id];

                            return (
                                <div
                                    key={goal.id}
                                    className="w-full p-4 sm:p-5 rounded-3xl border transition-all relative group bg-card/40 border-border hover:bg-card/60 hover:border-primary/30 hover:shadow-md"
                                >
                                    {/* تثبيت + أيام حتى انتهاء الهدف + إحصائية المهام */}
                                    {(goal.is_pinned || daysChip || stats) && (
                                        <div
                                            className={cn(
                                                'absolute top-[5px] z-10 flex items-center gap-1',
                                                goalIsRTL ? 'left-[6px] flex-row' : 'right-[6px] flex-row-reverse'
                                            )}
                                        >
                                            {goal.is_pinned && (
                                                <div
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-chart-5/10"
                                                    title={isArabic ? 'هدف مثبّت' : 'Pinned goal'}
                                                >
                                                    <Pin className="w-3.5 h-3.5 text-chart-5 rotate-45" aria-hidden />
                                                </div>
                                            )}
                                            {daysChip && (
                                                <div
                                                    className={cn(
                                                        'h-7 min-w-7 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                                                        daysChip.tone === 'soon' &&
                                                            'bg-primary/10 text-primary border border-primary/20',
                                                        daysChip.tone === 'today' &&
                                                            'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25',
                                                        daysChip.tone === 'late' &&
                                                            'bg-destructive/15 text-destructive border border-destructive/25'
                                                    )}
                                                    title={daysChip.title}
                                                >
                                                    {daysChip.text}
                                                </div>
                                            )}
                                            {stats && stats.total > 0 && (
                                                <div
                                                    className="h-7 min-w-7 px-1.5 flex items-center justify-center gap-1 rounded-full text-[11px] font-bold tabular-nums bg-primary/10 text-primary border border-primary/20"
                                                    title={isArabic ? `${stats.completed} من ${stats.total} مهمة منجزة` : `${stats.completed} of ${stats.total} tasks done`}
                                                >
                                                    <ListChecks className="w-3 h-3 shrink-0" aria-hidden />
                                                    <span dir="ltr">{stats.completed}/{stats.total}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onSelectGoal(goal.id)}
                                        className="w-full text-start"
                                        dir={goalIsRTL ? 'rtl' : 'ltr'}
                                    >
                                        <div
                                            className={cn(
                                                'w-full flex flex-col gap-3',
                                                (goal.is_pinned || daysChip) && 'pt-2.5 sm:pt-3'
                                            )}
                                        >
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

                                            <GoalProgressBar
                                                currentPoints={currentPoints}
                                                targetPoints={targetPoints}
                                                progress={progress}
                                                className="mx-auto border-border/60 bg-muted/40 shadow-inner ring-1 ring-white/5"
                                                labelClassName="px-3 sm:px-5 text-xs sm:text-sm"
                                                percentClassName="text-sm sm:text-base"
                                            />
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
