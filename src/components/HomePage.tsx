"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
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
  Clock,
} from "lucide-react";
import { type Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import Image from "next/image";
import { getIconComponent } from "./goal/IconPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import { createClient } from "@/utils/supabase/client";
import { getLocalDateKey } from "@/lib/task-periods";
import {
  useNotifications,
  type UserGoalContext,
} from "@/hooks/useNotifications";
import NotificationsSection from "@/components/notifications/NotificationsSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

/* ------------------------------------------------------------------ */
/*  HomePage component                                                 */
/* ------------------------------------------------------------------ */

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
  const [selectedCreationMode, setSelectedCreationMode] =
    useState<"ai" | "manual">("ai");
  const goalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isArabic = language === "ar";
  const safeRecentGoalsLimit = Math.max(1, recentGoalsLimit);
  const recentGoals = goals.slice(0, safeRecentGoalsLimit);

  /* ---- Pick primary goal for notifications ---- */
  const primaryGoal = useMemo(() => {
    const pinned = goals.find((g) => g.is_pinned);
    return pinned || goals[0] || null;
  }, [goals]);

  /* ---- Fetch notification context ---- */
  const supabase = createClient();
  const [contextReady, setContextReady] = useState(false);
  const [notifContext, setNotifContext] = useState<UserGoalContext | null>(null);

  const fetchNotifContext = useCallback(async () => {
    if (!primaryGoal) {
      setContextReady(true);
      return;
    }
    const goal = primaryGoal;
    const todayKey = getLocalDateKey();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("created_at, ai_score")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: false })
      .limit(365);

    let streak = 0;
    let loggedToday = false;
    let todayPts = 0;

    if (logs && logs.length > 0) {
      const loggedDateKeys = new Set<string>();
      for (const log of logs) {
        if (log.created_at) {
          loggedDateKeys.add(getLocalDateKey(new Date(log.created_at)));
        }
      }
      const now = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = getLocalDateKey(checkDate);
        if (loggedDateKeys.has(key)) {
          if (i === 0) loggedToday = true;
          streak++;
        } else if (i > 0) {
          break;
        }
      }
    }

    const { data: todayLogs } = await supabase
      .from("daily_logs")
      .select("ai_score")
      .eq("goal_id", goal.id)
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString());

    todayPts = (todayLogs || []).reduce((sum, log) => sum + (log.ai_score || 0), 0);
    loggedToday = (todayLogs || []).length > 0;

    let sStatus: "safe" | "at_risk" | "broken" = "safe";
    if (!loggedToday && streak > 0) sStatus = "at_risk";
    else if (!loggedToday && streak === 0) sStatus = "broken";

    const { data: challengeRoom } = await supabase
      .from("challenge_rooms")
      .select("id, ended_at")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cStatus: "none" | "pending" | "active" | "ended" = "none";
    if (challengeRoom) {
      if (challengeRoom.ended_at) {
        cStatus = "ended";
      } else {
        const { count: participantCount } = await supabase
          .from("challenge_participants")
          .select("id", { count: "exact", head: true })
          .eq("room_id", challengeRoom.id);
        cStatus = (participantCount ?? 0) >= 2 ? "active" : "pending";
      }
    }

    const { data: focusRow } = await supabase
      .from("daily_focus_answers")
      .select("answer, answered_at")
      .eq("goal_id", goal.id)
      .eq("prompt_date", todayKey)
      .maybeSingle();

    let fStatus: "none" | "unanswered" | "answered" = "none";
    if (focusRow) {
      fStatus = focusRow.answer && focusRow.answered_at ? "answered" : "unanswered";
    }

    setNotifContext({
      goalId: goal.id,
      goalTitle: goal.title,
      goalIcon: goal.icon || "Target",
      streakStatus: sStatus,
      streakDays: streak,
      hasLoggedToday: loggedToday,
      challengeStatus: cStatus,
      dailyFocusStatus: fStatus,
      todaysPoints: todayPts,
    });
    setContextReady(true);
  }, [primaryGoal, supabase]);

  useEffect(() => {
    fetchNotifContext();
  }, [fetchNotifContext]);

  const {
    notifications,
    loading: notifLoading,
    error: notifError,
    refresh,
  } = useNotifications(notifContext ?? { goalId: "", goalTitle: "", goalIcon: "Target", streakStatus: "safe", streakDays: 0, hasLoggedToday: false, challengeStatus: "none", dailyFocusStatus: "none" }, isArabic ? "ar" : "en");

  const handleRefreshNotifs = useCallback(async () => {
    await fetchNotifContext();
    refresh();
  }, [fetchNotifContext, refresh]);

  /* ---- RTL helper ---- */
  const isRTLText = (text: string) => {
    const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    const ltrChar = /[A-Za-z\u00C0-\u024F]/;
    for (const char of text.trim()) {
      if (rtlChar.test(char)) return true;
      if (ltrChar.test(char)) return false;
    }
    return isArabic;
  };

  /* ---- Goal input helpers ---- */
  const minimumGoalWords = 15;

  const analyzeGoalInput = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    const wordCount = normalized ? normalized.split(" ").length : 0;
    const needsMoreDetail =
      normalized.length > 0 && wordCount < minimumGoalWords;
    const detailProgress =
      normalized.length > 0 ? Math.min(wordCount / minimumGoalWords, 1) : 0;
    return { normalized, wordCount, needsMoreDetail, detailProgress };
  };

  const handleAICreate = () => {
    setSelectedCreationMode("ai");
    const trimmedGoal = normalizedGoalInput;
    if (!trimmedGoal) {
      goalTextareaRef.current?.focus();
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
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
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
          formData.append("audio", audioBlob, `recording.${mimeType.split("/")[1]}`);
          formData.append("language", language === "ar" ? "ar" : "en");
          const response = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await response.json();
          if (response.ok && !data.fallback && data.text) {
            setGoalInput((prev) => (prev ? prev + " " + data.text : data.text));
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
          : "Failed to access microphone. Please allow access in browser settings."
      );
      setIsRecording(false);
    }
  }, [language, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
    setSelectedCreationMode("manual");
    if (!hasGoalInput) {
      goalTextareaRef.current?.focus();
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
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  /* ------------------------------------------------------------------ */
  /*  JSX                                                                */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-3 overflow-hidden px-4 animate-in fade-in slide-in-from-bottom-8 duration-500 sm:gap-4 sm:px-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Logo */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2.5 text-center sm:gap-3">
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
          className="max-w-[19rem] text-sm font-medium leading-6 text-muted-foreground sm:max-w-[24rem] sm:text-base sm:leading-7"
          dir={isArabic ? "rtl" : "ltr"}
          lang={isArabic ? "ar" : "en"}
        >
          {isArabic
            ? "اذا ما استمرت بهدفك راح تفشل يا غبي"
            : "If you don't stick to your goal, you'll fail, stupid"}
        </p>
      </div>

      {/* Goal Input */}
      <div
        className={cn(
          "relative shrink-0 transition-all duration-300",
          aiPromptVisible ? "pt-10 sm:pt-11" : "pt-0"
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden transition-all duration-300",
            aiPromptVisible ? "h-[4.75rem] opacity-100 sm:h-[5.75rem]" : "h-0 opacity-0"
          )}
        >
          <div className={cn("rounded-t-[22px] border border-b-0 px-4 pt-1 pb-6 sm:px-5 sm:pt-1.5 sm:pb-9", promptToneClasses)}>
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
            isRecording ? "border-red-400/40 bg-red-500/[0.03]" : isProcessing ? "border-amber-300/50 bg-amber-500/[0.03]" : aiPromptVisible ? promptCardClasses : "border-border/70"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
              isRecording ? "from-red-500/[0.08] via-red-500/[0.03]" : isProcessing ? "from-amber-500/[0.08] via-amber-500/[0.03]" : aiPromptVisible ? "from-amber-500/[0.08] via-amber-500/[0.02]" : "from-primary/[0.07] via-primary/[0.02]"
            )}
          />
          <div className="relative px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5">
            <Textarea
              ref={goalTextareaRef}
              rows={1}
              value={goalInput}
              onChange={(e) => {
                setGoalInput(e.target.value);
                if (!analyzeGoalInput(e.target.value).needsMoreDetail) setShowAIDetailPrompt(false);
                resizeGoalTextarea(e.currentTarget);
              }}
              onInput={(e) => resizeGoalTextarea(e.currentTarget)}
              placeholder={goalInputPlaceholder}
              aria-describedby={aiPromptVisible ? "goal-ai-detail-prompt" : undefined}
              className={cn(
                "min-h-[44px] max-h-[132px] resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2 shadow-none scrollbar-thin",
                "text-sm font-medium leading-6 text-foreground sm:text-base sm:leading-7 md:text-base",
                "placeholder:text-muted-foreground/50",
                "focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "dark:bg-transparent",
                isArabic ? "text-right" : "text-left",
                isRecording && "placeholder:text-red-500/60 caret-red-500"
              )}
              dir={isArabic ? "rtl" : "auto"}
            />
          </div>
          <div
            className={cn(
              "flex flex-row-reverse items-center gap-2 px-2 pb-2 pt-0 sm:items-center sm:justify-between sm:px-3 sm:pb-3",
              isArabic ? "sm:flex-row-reverse" : "sm:flex-row"
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleRecording}
              disabled={isProcessing}
              aria-pressed={isRecording}
              className={cn(
                "h-9 w-9 shrink-0 rounded-full px-0 shadow-none sm:w-9 sm:px-0",
                isProcessing
                  ? "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : isRecording
                    ? "border-red-300/70 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : isRecording ? <StopCircle className="size-4" /> : <Mic className="size-4" />}
            </Button>
            <div
              className={cn(
                "grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:w-auto sm:flex-none sm:gap-2 sm:min-w-[280px]"
              )}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleManualCreate}
                aria-pressed={selectedCreationMode === "manual"}
                className={cn(
                  "w-full h-9 min-w-0 rounded-full border px-2 text-xs font-semibold shadow-none transition-all duration-200 sm:h-10 sm:px-4 sm:text-sm",
                  selectedCreationMode === "manual"
                    ? "border-foreground/20 bg-foreground/[0.06] text-foreground ring-1 ring-foreground/10"
                    : "border-border/70 bg-background/70 text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <PenLine className="size-4 shrink-0" />
                <span className="truncate">{isArabic ? "يدوي" : "Manual"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleAICreate}
                aria-pressed={selectedCreationMode === "ai"}
                className={cn(
                  "w-full h-9 min-w-0 rounded-full border px-2 text-xs font-semibold shadow-none transition-all duration-300 sm:h-10 sm:px-4 sm:text-sm",
                  aiPromptVisible
                    ? "border-amber-300/60 bg-amber-500/[0.12] text-amber-900 dark:text-amber-200"
                    : selectedCreationMode === "ai"
                      ? "border-primary/35 bg-primary/10 text-primary ring-1 ring-primary/15 hover:bg-primary/15"
                      : "border-border/70 bg-background/70 text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Sparkles className="size-4 shrink-0" />
                <span className="truncate">{isArabic ? "ذكاء اصطناعي" : "AI Plan"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="goals"
        className="flex-1 min-h-0 flex flex-col"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <TabsList className="w-full shrink-0 mb-2">
          <TabsTrigger value="goals" className={cn("flex-1 gap-1.5", !primaryGoal && "w-full")}>
            <Target className="h-4 w-4" />
            {isArabic ? "الأهداف الأخيرة" : "Recent Goals"}
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
              {recentGoals.length}
            </span>
          </TabsTrigger>
          {primaryGoal && (
            <TabsTrigger value="notifications" className="flex-1 gap-1.5">
              <Bell className="h-4 w-4" />
              {isArabic ? "الإشعارات" : "Notifications"}
              {notifications.length > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                  {notifications.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="goals" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-0">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/30 p-3 pt-3.5 scrollbar-thin sm:rounded-3xl sm:p-4 sm:pt-4">
          {recentGoals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {recentGoals.map((goal) => {
                const currentPoints = goal.current_points ?? 0;
                const targetPoints = goal.target_points ?? 0;
                const progress = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                const Icon = getIconComponent(goal.icon || "Target");
                const goalIsRTL = isArabic || isRTLText(goal.title);
                const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                const stats = taskStatsMap[goal.id];
                const hasStatsBadge = !!stats && stats.total > 0;
                const hasGoalBadges = goal.is_pinned || !!daysChip || hasStatsBadge;

                return (
                  <div
                    key={goal.id}
                    className="group relative w-full rounded-2xl border border-border/80 bg-white p-3 shadow-sm transition-all hover:border-primary/35 hover:shadow-md dark:bg-card/50 sm:p-4"
                  >
                    <button
                      onClick={() => onSelectGoal(goal.id)}
                      className="flex w-full cursor-pointer flex-col gap-3 rounded-2xl text-start outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      dir={goalIsRTL ? "rtl" : "ltr"}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm transition-colors group-hover:bg-primary/15 sm:h-12 sm:w-12 sm:rounded-2xl">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={cn("line-clamp-2 text-base font-black text-foreground transition-colors sm:text-lg", goalIsRTL ? "text-right" : "text-left")}>
                              {goal.title}
                            </h3>
                            {hasGoalBadges && (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {goal.is_pinned && (
                                  <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    <Pin className="h-3 w-3" />
                                    {isArabic ? "مثبت" : "Pinned"}
                                  </span>
                                )}
                                {daysChip && (
                                  <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums", daysChip.tone === "soon" && "bg-primary/10 text-primary", daysChip.tone === "today" && "bg-amber-500/10 text-amber-700 dark:text-amber-400", daysChip.tone === "late" && "bg-destructive/10 text-destructive")} title={daysChip.title}>
                                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                    {daysChip.text}
                                  </span>
                                )}
                                {hasStatsBadge && (
                                  <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums" title={isArabic ? `${stats.completed} من ${stats.total} مهمة منجزة` : `${stats.completed} of ${stats.total} tasks done`}>
                                    <ListChecks className="h-3 w-3 shrink-0" aria-hidden />
                                    <span dir="ltr">{stats.completed}/{stats.total}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <GoalProgressBar currentPoints={currentPoints} targetPoints={targetPoints} progress={progress} />
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
                {isArabic ? "ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا." : "Create your first goal and its progress will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>
      </TabsContent>

      {primaryGoal && (
        <TabsContent value="notifications" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-0">
          <NotificationsSection
            primaryGoal={primaryGoal}
            isArabic={isArabic}
            notifications={notifications}
            notifLoading={notifLoading}
            notifError={notifError}
            contextReady={contextReady}
            onRefresh={handleRefreshNotifs}
          />
        </TabsContent>
      )}
    </Tabs>


    </div>
  );
}
