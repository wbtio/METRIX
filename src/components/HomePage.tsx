"use client";

import { useRef, useState, useCallback } from "react";
import {
  Mic,
  StopCircle,
  Loader2,
  Pin,
  Target,
  PenLine,
  Sparkles,
  CircleAlert,
  ListChecks,
  Bell,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { type Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import Image from "next/image";
import { getIconComponent } from "./goal/IconPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import { useIsMobile } from "@/hooks/use-mobile";
import GoalProgressBar from "@/components/shared/GoalProgressBar";

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
  onNavigateToCreate?: (goalText: string, mode: "ai" | "manual") => void;
  language?: Language;
  recentGoalsLimit?: number;
}

export default function HomePage({
  goals,
  taskStatsMap = {},
  onSelectGoal,
  onNavigateToCreate,
  language = "en",
  recentGoalsLimit = 4,
}: HomePageProps) {
  const [goalInput, setGoalInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIDetailPrompt, setShowAIDetailPrompt] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isMobile = useIsMobile();

  const isArabic = language === "ar";
  const safeRecentGoalsLimit = Math.max(
    1,
    isMobile ? Math.min(recentGoalsLimit, 2) : recentGoalsLimit,
  );
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
    const normalized = value.trim().replace(/\s+/g, " ");
    const wordCount = normalized ? normalized.split(" ").length : 0;
    const needsMoreDetail =
      normalized.length > 0 && wordCount < minimumGoalWords;
    const detailProgress =
      normalized.length > 0 ? Math.min(wordCount / minimumGoalWords, 1) : 0;

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
    onNavigateToCreate?.(trimmedGoal, "ai");
  };

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });
          const formData = new FormData();
          formData.append(
            "audio",
            audioBlob,
            `recording.${mimeType.split("/")[1]}`,
          );
          formData.append("language", language === "ar" ? "ar" : "en");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          console.log("Transcribe response:", response.status, data);

          if (response.ok && !data.fallback && data.text) {
            setGoalInput((prev) => (prev ? prev + " " + data.text : data.text));
          } else {
            console.warn("Transcription failed or empty:", data);
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setIsProcessing(false);
          cleanupStream();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(
        language === "ar"
          ? "فشل الوصول إلى الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح."
          : "Failed to access microphone. Please allow access in browser settings.",
      );
      setIsRecording(false);
    }
  }, [language, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  const {
    normalized: normalizedGoalInput,
    wordCount: goalWordCount,
    needsMoreDetail: goalNeedsMoreDetail,
  } = analyzeGoalInput(goalInput);
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
  const promptToneClasses =
    promptColorStage === 5
      ? "border-amber-500/45 bg-gradient-to-b from-amber-500/24 via-amber-300/30 to-background"
      : promptColorStage === 4
        ? "border-amber-400/40 bg-gradient-to-b from-amber-400/18 via-amber-200/24 to-background"
        : promptColorStage === 3
          ? "border-amber-300/35 bg-gradient-to-b from-amber-300/14 via-amber-100/20 to-background"
          : promptColorStage === 2
            ? "border-amber-200/30 bg-gradient-to-b from-amber-200/10 via-amber-50/18 to-background"
            : "border-amber-100/24 bg-gradient-to-b from-amber-100/10 via-background/96 to-background";
  const promptCardClasses =
    promptColorStage === 5
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
      5: "وضّح النتيجة التي تريد الوصول لها وما الذي تريد تغييره فعلاً.",
      4: "أضف لماذا هذا الهدف مهم لك أو ما الأثر الذي تنتظره منه.",
      3: "زد وقتاً أو ظرفاً مهماً حتى تصبح الخطة أقرب لواقعك.",
      2: "الوصف صار أفضل، وأي تفصيل عن النتيجة سيجعل البداية أدق.",
      1: "باقي توضيح صغير عن الهدف حتى نبدأ بخطة أوضح.",
    },
    en: {
      5: "Clarify the result you want and what you want to change.",
      4: "Add why this goal matters or the impact you expect from it.",
      3: "Add timing or context so the plan feels closer to your reality.",
      2: "This is clearer now, and one more outcome detail will sharpen the start.",
      1: "One small clarification will help us start with a clearer plan.",
    },
  } as const;
  const goalPromptMessage = goalNeedsMoreDetail
    ? isArabic
      ? promptMessages.ar[promptColorStage as 1 | 2 | 3 | 4 | 5]
      : promptMessages.en[promptColorStage as 1 | 2 | 3 | 4 | 5]
    : null;
  const goalInputPlaceholder = isProcessing
    ? isArabic
      ? "جارِ المعالجة..."
      : "Processing..."
    : isRecording
      ? isArabic
        ? "جارِ الاستماع..."
        : "Listening..."
      : isArabic
        ? "اكتب هدفك هنا\u200f..."
        : "Write your goal here...";

  const handleManualCreate = () => {
    if (!hasGoalInput) {
      return;
    }

    setShowAIDetailPrompt(false);
    onNavigateToCreate?.(normalizedGoalInput, "manual");
  };

  const resizeGoalTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "0px";

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 28;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;

    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom;
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-5 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500 sm:space-y-8 sm:px-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="mb-3 flex flex-col items-center justify-center text-center sm:mb-8">
        <Image
          src="/logo1.svg"
          alt="METRIX Logo"
          width={240}
          height={96}
          sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, 240px"
          className="w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:hidden"
          style={{ height: "auto" }}
          priority
        />
        <Image
          src="/logo2.svg"
          alt="METRIX Logo Dark"
          width={240}
          height={96}
          sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, 240px"
          className="hidden w-[170px] sm:w-[220px] md:w-[240px] h-auto object-contain dark:block"
          style={{ height: "auto" }}
          priority
        />
        <p
          className="-mt-2 max-w-[19rem] text-sm font-medium leading-6 text-muted-foreground sm:-mt-1 sm:max-w-[24rem] sm:text-base"
          dir={isArabic ? "rtl" : "ltr"}
          lang={isArabic ? "ar" : "en"}
        >
          {isArabic
            ? "اذا ما استمرت بهدفك راح تفشل يا غبي"
            : "If you don't stick to your goal, you'll fail, stupid"}
        </p>
      </div>

      <div
        className={cn(
          "relative transition-all duration-300",
          aiPromptVisible ? "pt-10 sm:pt-11" : "pt-0",
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden transition-all duration-300",
            aiPromptVisible
              ? "h-[4.75rem] opacity-100 sm:h-[5.75rem]"
              : "h-0 opacity-0",
          )}
        >
          <div
            className={cn(
              "rounded-t-[22px] border border-b-0 px-4 pt-1 pb-6 sm:px-5 sm:pt-1.5 sm:pb-9",
              promptToneClasses,
            )}
          >
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "flex items-center gap-3 text-sm font-medium leading-6 text-amber-950 dark:text-amber-100",
                isArabic ? "flex-row-reverse text-right" : "text-left",
              )}
            >
              <div className="shrink-0 rounded-full border border-amber-500/25 bg-background/70 p-1.5 backdrop-blur">
                <CircleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
              </div>
              <p
                id="goal-ai-detail-prompt"
                className="flex-1 text-[13px] font-semibold leading-5 text-amber-900/95 dark:text-amber-100/90"
              >
                {goalPromptMessage}
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "relative z-20 overflow-hidden rounded-[22px] border bg-background/92 backdrop-blur-xl",
            "shadow-lg shadow-black/5 transition-all duration-300 dark:shadow-black/20",
            "focus-within:border-primary/35 focus-within:shadow-xl focus-within:shadow-black/5",
            isRecording
              ? "border-red-400/40 bg-red-500/[0.03]"
              : isProcessing
                ? "border-amber-300/50 bg-amber-500/[0.03]"
                : aiPromptVisible
                  ? promptCardClasses
                  : "border-border/70",
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
                    : "from-primary/[0.07] via-primary/[0.02]",
            )}
          />

          <div className="relative px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5">
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
              aria-describedby={
                aiPromptVisible ? "goal-ai-detail-prompt" : undefined
              }
              className={cn(
                "min-h-[44px] max-h-[132px] resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2 shadow-none",
                "scrollbar-thin",
                "text-sm font-medium leading-6 text-foreground sm:text-base sm:leading-7 md:text-base",
                "placeholder:text-muted-foreground/50",
                "focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "dark:bg-transparent",
                isArabic ? "text-right" : "text-left",
                isRecording && "placeholder:text-red-500/60 caret-red-500",
              )}
              dir={isArabic ? "rtl" : "auto"}
            />
          </div>

          <div
            className={cn(
              // Mobile: single row, reversed so Voice sits at the visual end
              // (right in LTR/EN, left in RTL/AR). Desktop keeps existing behavior.
              "flex flex-row-reverse items-center gap-2 px-2 pb-2 pt-0 sm:items-center sm:justify-between sm:px-3 sm:pb-3",
              isArabic ? "sm:flex-row-reverse" : "sm:flex-row",
            )}
          >
            {/* Voice button — icon-only on mobile, icon + label on sm+ */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleRecording}
              disabled={isProcessing}
              aria-pressed={isRecording}
              aria-label={
                isProcessing
                  ? isArabic
                    ? "جارِ معالجة التسجيل الصوتي"
                    : "Processing voice recording"
                  : isRecording
                    ? isArabic
                      ? "إيقاف التسجيل الصوتي"
                      : "Stop voice recording"
                    : isArabic
                      ? "بدء التسجيل الصوتي"
                      : "Start voice recording"
              }
              className={cn(
                // icon-only button (no text label)
                "h-9 w-9 shrink-0 rounded-full px-0 shadow-none sm:w-9 sm:px-0",
                isProcessing
                  ? "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : isRecording
                    ? "border-red-300/70 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {isProcessing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecording ? (
                <StopCircle className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>

            {/* Manual + AI — fill remaining width equally on mobile */}
            <div
              className={cn(
                // Mobile: take remaining space next to Voice (flex-1). Desktop: keep fixed width.
                "grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:w-auto sm:flex-none sm:gap-2 sm:min-w-[280px]",
              )}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleManualCreate}
                disabled={!hasGoalInput}
                className={cn(
                  "w-full h-9 min-w-0 rounded-full px-2 text-xs font-semibold shadow-none sm:h-10 sm:px-4 sm:text-sm",
                  hasGoalInput
                    ? "border-border/70 bg-background/70 text-foreground hover:bg-muted/60"
                    : "border border-border/70 bg-muted/40 text-muted-foreground",
                )}
              >
                <PenLine className="size-4 shrink-0" />
                <span className="truncate">{isArabic ? "يدوي" : "Manual"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleAICreate}
                disabled={!hasGoalInput}
                className={cn(
                  "w-full h-9 min-w-0 rounded-full px-2 text-xs font-semibold shadow-none transition-all duration-300 sm:h-10 sm:px-4 sm:text-sm",
                  aiPromptVisible
                    ? "border-amber-300/60 bg-amber-500/[0.12] text-amber-900 dark:text-amber-200"
                    : hasGoalInput
                      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                      : "border border-border/70 bg-muted/40 text-muted-foreground",
                )}
              >
                <Sparkles className="size-4 shrink-0" />
                <span className="truncate">{isArabic ? "ذكاء اصطناعي" : "AI Plan"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="goals" dir={isArabic ? "rtl" : "ltr"} className="relative">
        {/* Tab bar — overlaps the content box below */}
        <TabsList className="relative z-10 mx-auto w-full max-w-[calc(100%-1rem)] rounded-2xl border border-border/50 bg-muted/50 backdrop-blur-sm px-2.5 py-3 gap-1.5 sm:max-w-[calc(100%-2rem)]">
          <TabsTrigger
            value="goals"
            className={cn(
              "gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all flex-1",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/70",
              "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50",
            )}
          >
            <Target className="size-5" />
            {isArabic ? "الأهداف الأخيرة" : "Recent Goals"}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
              {recentGoals.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={cn(
              "gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all flex-1",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/70",
              "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50",
            )}
          >
            <Bell className="size-5" />
            {isArabic ? "الإشعارات" : "Notifications"}
          </TabsTrigger>
        </TabsList>

        {/* Content box — fixed height with scroll, sits under the tab bar */}
        <TabsContent value="goals" className="-mt-5 pt-5">
          <div className="overflow-y-auto h-[340px] sm:h-[440px] rounded-2xl border border-border/60 bg-card/30 p-3 sm:rounded-3xl sm:p-4 scrollbar-thin">
            {recentGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {recentGoals.map((goal) => {
                  const currentPoints = goal.current_points ?? 0;
                  const targetPoints = goal.target_points ?? 0;
                  const progress =
                    targetPoints > 0
                      ? Math.round((currentPoints / targetPoints) * 100)
                      : 0;
                  const Icon = getIconComponent(goal.icon || "Target");
                  const goalIsRTL = isArabic || isRTL(goal.title);
                  const daysChip = getGoalEndDaysChip(
                    goal.estimated_completion_date,
                    isArabic,
                  );
                  const stats = taskStatsMap[goal.id];

                  return (
                    <div
                      key={goal.id}
                      className="group relative w-full overflow-hidden rounded-2xl border border-border/70 bg-card/45 p-3 transition-all hover:border-primary/30 hover:bg-card/60 hover:shadow-md sm:rounded-3xl sm:p-5"
                    >
                      {(goal.is_pinned || daysChip || stats) && (
                        <div
                          className={cn(
                            "absolute top-3 z-10 flex items-center gap-1.5",
                            goalIsRTL
                              ? "left-3 flex-row"
                              : "right-3 flex-row-reverse",
                          )}
                        >
                          {goal.is_pinned && (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-chart-5/10"
                              title={isArabic ? "هدف مثبّت" : "Pinned goal"}
                            >
                              <Pin
                                className="h-3.5 w-3.5 rotate-45 text-chart-5"
                                aria-hidden
                              />
                            </div>
                          )}
                          {daysChip && (
                            <div
                              className={cn(
                                "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                                daysChip.tone === "soon" &&
                                  "bg-primary/10 text-primary border border-primary/20",
                                daysChip.tone === "today" &&
                                  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25",
                                daysChip.tone === "late" &&
                                  "bg-destructive/15 text-destructive border border-destructive/25",
                              )}
                              title={daysChip.title}
                            >
                              {daysChip.text}
                            </div>
                          )}
                          {stats && stats.total > 0 && (
                            <div
                              className="flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-bold tabular-nums bg-primary/10 text-primary border border-primary/20"
                              title={
                                isArabic
                                  ? `${stats.completed} من ${stats.total} مهمة منجزة`
                                  : `${stats.completed} of ${stats.total} tasks done`
                              }
                            >
                              <ListChecks
                                className="w-3 h-3 shrink-0"
                                aria-hidden
                              />
                              <span dir="ltr">
                                {stats.completed}/{stats.total}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => onSelectGoal(goal.id)}
                        className="w-full text-start"
                        dir={goalIsRTL ? "rtl" : "ltr"}
                      >
                        <div
                          className={cn(
                            "flex w-full flex-col gap-2.5",
                            (goal.is_pinned || daysChip) && "pt-2.5 sm:pt-3",
                          )}
                        >
                          <div className="flex w-full items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:h-12 sm:w-12">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <h3 className="truncate text-base font-bold leading-snug text-foreground sm:text-lg">
                                {goal.title}
                              </h3>
                            </div>
                          </div>

                          <GoalProgressBar
                            currentPoints={currentPoints}
                            targetPoints={targetPoints}
                            progress={progress}
                            className="mx-auto border-border/60 bg-muted/40 shadow-inner ring-1 ring-white/5"
                            labelClassName="px-2.5 sm:px-5 text-[11px] sm:text-sm"
                            percentClassName="text-sm sm:text-base"
                          />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-card/20 p-6 sm:p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Target className="h-7 w-7" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {isArabic ? "لا توجد أهداف بعد" : "No goals yet"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isArabic
                    ? "ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا."
                    : "Create your first goal and its progress will appear here."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="-mt-5 pt-5">
          <div className="overflow-y-auto h-[340px] sm:h-[440px] rounded-2xl border border-border/60 bg-card/30 p-3 sm:rounded-3xl sm:p-4 scrollbar-thin">
            <div className="space-y-3">
              {/* Example notification items - UI only */}
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/45 p-4 transition-all hover:bg-card/60 sm:rounded-3xl sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isArabic ? "تم إنجاز مهمة" : "Task completed"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isArabic
                      ? "أحسنت! تم إكمال مهمة بنجاح في أحد أهدافك."
                      : "Great job! A task in one of your goals has been completed successfully."}
                  </p>
                  <span className="mt-1 text-[11px] text-muted-foreground/60">
                    {isArabic ? "منذ ٥ دقائق" : "5 min ago"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/45 p-4 transition-all hover:bg-card/60 sm:rounded-3xl sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isArabic ? "موعد قريب" : "Deadline approaching"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isArabic
                      ? "لديك هدف يقترب موعد انتهائه، حافظ على وتيرتك!"
                      : "You have a goal with an approaching deadline, keep up the pace!"}
                  </p>
                  <span className="mt-1 text-[11px] text-muted-foreground/60">
                    {isArabic ? "منذ ساعة" : "1 hour ago"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/45 p-4 transition-all hover:bg-card/60 sm:rounded-3xl sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isArabic ? "تقدم ملحوظ" : "Progress milestone"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isArabic
                      ? "وصلت إلى ٥٠٪ من أحد أهدافك، استمر!"
                      : "You've reached 50% on one of your goals, keep going!"}
                  </p>
                  <span className="mt-1 text-[11px] text-muted-foreground/60">
                    {isArabic ? "منذ ٣ ساعات" : "3 hours ago"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
