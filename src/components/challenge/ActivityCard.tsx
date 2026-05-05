"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Trophy,
  Trash2,
  AlertTriangle,
  Loader2,
  MoreVertical,
  Pencil,
  FileText,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
  ImageIcon,
  Check,
  Upload,
  Copy,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChallengeEvent } from "./challenge-types";
import { cardClass } from "./challenge-types";
import { formatNumericDate, formatTime } from "./challenge-utils";

interface ActivityCardProps {
  goalId?: string;
  recentEvents: ChallengeEvent[];
  visibleEvents: ChallengeEvent[];
  canToggleEvents: boolean;
  showAllEvents: boolean;
  onToggleShowAll: () => void;
  meName: string;
  opponentName: string;
  locale: string;
  numberFormatter: Intl.NumberFormat;
  ui: {
    recentTitle: string;
    activityEmpty: string;
  };
  t: {
    challengeShowLess: string;
    challengeShowMore: string;
  };
}

type AccentColor = "emerald" | "violet" | "amber" | "rose" | "sky" | "slate";

const accentConfig: Record<
  AccentColor,
  {
    label: { ar: string; en: string };
    swatch: string;
    card: string;
    border: string;
    icon: string;
  }
> = {
  emerald: {
    label: { ar: "أخضر", en: "Emerald" },
    swatch: "bg-emerald-500",
    card: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20",
    border: "border-emerald-200/80 dark:border-emerald-500/25",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  violet: {
    label: { ar: "بنفسجي", en: "Violet" },
    swatch: "bg-violet-500",
    card: "from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20",
    border: "border-violet-200/80 dark:border-violet-500/25",
    icon: "text-violet-600 dark:text-violet-300",
  },
  amber: {
    label: { ar: "ذهبي", en: "Amber" },
    swatch: "bg-amber-500",
    card: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    border: "border-amber-200/80 dark:border-amber-500/25",
    icon: "text-amber-600 dark:text-amber-300",
  },
  rose: {
    label: { ar: "وردي", en: "Rose" },
    swatch: "bg-rose-500",
    card: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20",
    border: "border-rose-200/80 dark:border-rose-500/25",
    icon: "text-rose-600 dark:text-rose-300",
  },
  sky: {
    label: { ar: "سماوي", en: "Sky" },
    swatch: "bg-sky-500",
    card: "from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20",
    border: "border-sky-200/80 dark:border-sky-500/25",
    icon: "text-sky-600 dark:text-sky-300",
  },
  slate: {
    label: { ar: "رصاصي", en: "Slate" },
    swatch: "bg-slate-500",
    card: "from-slate-50 to-zinc-50 dark:from-slate-900/60 dark:to-zinc-950/30",
    border: "border-slate-200/80 dark:border-slate-500/25",
    icon: "text-slate-600 dark:text-slate-300",
  },
};

function normalizeAccentColor(value: unknown): AccentColor {
  return typeof value === "string" && value in accentConfig
    ? (value as AccentColor)
    : "violet";
}

type EditMode = null | {
  logId: string;
  field: "name" | "description";
  value: string;
};

type ImageDialogState = null | {
  logId: string;
  hasImage: boolean;
};

type PromptDialogState = null | {
  logId: string;
  prompt: string;
  style: PromptStyle;
  goalTitle: string;
  milestoneName: string;
  milestoneDescription: string;
};

type PromptStyle =
  | "cinematic"
  | "minimal"
  | "neon"
  | "realistic"
  | "anime"
  | "luxury";

const promptStyleOptions: Array<{
  value: PromptStyle;
  label: { ar: string; en: string };
  hint: { ar: string; en: string };
}> = [
  {
    value: "cinematic",
    label: { ar: "سينمائي", en: "Cinematic" },
    hint: { ar: "إضاءة درامية", en: "Dramatic lighting" },
  },
  {
    value: "minimal",
    label: { ar: "هادئ", en: "Minimal" },
    hint: { ar: "نظيف وبسيط", en: "Clean composition" },
  },
  {
    value: "neon",
    label: { ar: "نيون", en: "Neon" },
    hint: { ar: "ألوان قوية", en: "Vibrant colors" },
  },
  {
    value: "realistic",
    label: { ar: "واقعي", en: "Realistic" },
    hint: { ar: "مشهد واقعي", en: "Photoreal feel" },
  },
  {
    value: "anime",
    label: { ar: "أنمي", en: "Anime" },
    hint: { ar: "ستايل أنمي", en: "Anime key visual" },
  },
  {
    value: "luxury",
    label: { ar: "فاخر", en: "Luxury" },
    hint: { ar: "طابع فاخر", en: "Premium luxury mood" },
  },
];

function buildPromptFromStyle(params: {
  goalTitle: string;
  milestoneName: string;
  milestoneDescription: string;
  style: PromptStyle;
}) {
  const styleDescriptions: Record<PromptStyle, string> = {
    cinematic:
      "solid flat pastel blue background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
    minimal:
      "solid flat soft cream background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
    neon:
      "solid flat pastel mint background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
    realistic:
      "solid flat warm light gray background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
    anime:
      "solid flat pastel lavender background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
    luxury:
      "solid flat pastel champagne background only, no textures, no patterns, no gradients, no scenery, no environment, no details at all",
  };

  return [
    `Minimalist flat vector achievement illustration representing "${params.milestoneName}".`,
    `Context: ${params.goalTitle}.`,
    `Achievement: ${params.milestoneDescription}.`,
    "Visual concept: use extremely few, very simple and minimal connected elements that express achievement. For example, a single small trophy cup connected with one rising star, or one simple geometric symbol. Keep the objects tiny and connected together; do not scatter many items.",
    `Background: ${styleDescriptions[params.style]}. The background must remain a single flat color with absolutely nothing else in it.`,
    "Style rules: clean thin lines, muted limited colors, modern simple composition, generous negative space, no clutter, no extra objects, no people, no faces, no characters, no silhouettes, no hands, no bodies, no anatomy of any kind.",
    "Content rules: NO readable text, NO letters, NO numbers, NO logos, NO watermarks, NO UI elements, NO interface screenshots, NO charts, NO graphs, NO progress bars. Only the minimal connected achievement symbol on a solid flat background.",
    "Mood: calm, quiet triumph.",
    "Format: vector art style, 4:3 aspect ratio.",
  ].join(" ");
}

function normalizePromptStyle(value: unknown): PromptStyle {
  return promptStyleOptions.some((option) => option.value === value)
    ? (value as PromptStyle)
    : "cinematic";
}

export function ActivityCard({
  goalId,
  recentEvents,
  locale,
  numberFormatter,
  ui,
}: ActivityCardProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [imageDialog, setImageDialog] = useState<ImageDialogState>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const isArabic = locale === "ar" || locale?.startsWith("ar");
  const milestoneEvents = recentEvents.filter((e) => e.milestone);

  const refresh = () => {
    if (goalId) {
      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", { detail: { goalId } }),
      );
    }
  };

  const handleDelete = async (logId: string) => {
    if (!goalId) return;
    setBusyId(logId);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/goal/milestone", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, goalId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic ? "تعذر حذف الإنجاز" : "Could not delete milestone"),
        );
      }
      refresh();
      setConfirmDeleteId(null);
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر حذف الإنجاز"
            : "Could not delete milestone",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePatch = async (
    logId: string,
    payload: {
      name?: string;
      description?: string;
      accentColor?: AccentColor;
      imagePrompt?: string;
      imageStylePreference?: PromptStyle;
    },
  ) => {
    if (!goalId) return false;
    setBusyId(logId);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/goal/milestone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, goalId, ...payload }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic ? "تعذر تحديث الإنجاز" : "Could not update milestone"),
        );
      }
      refresh();
      setEditMode(null);
      return true;
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذر تحديث الإنجاز"
            : "Could not update milestone",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر نسخ البرومبت"
            : "Could not copy prompt",
      );
    }
  };

  const handleUploadImage = async (logId: string, file: File) => {
    if (!goalId) return;
    setBusyId(logId);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("logId", logId);
      formData.append("goalId", goalId);
      formData.append("image", file);

      const response = await fetch("/api/goal/milestone/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isArabic ? "تعذر رفع الصورة" : "Could not upload image"),
        );
      }

      refresh();
      setImageDialog(null);
    } catch (error) {
      console.warn("Milestone image upload failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر رفع الصورة"
            : "Could not upload image",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={cardClass}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25">
            <Trophy className="h-4 w-4" />
          </div>
          <span className="text-sm font-black text-foreground">
            {ui.recentTitle}
          </span>
          {milestoneEvents.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-400 ring-1 ring-amber-500/20">
              {milestoneEvents.length}/2
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 text-[11px] font-black text-muted-foreground transition-colors hover:bg-muted dark:bg-background/20"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {isArabic ? "إظهار" : "Show"}
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {isArabic ? "إخفاء" : "Hide"}
            </>
          )}
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-600 dark:text-rose-300">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-md p-0.5 hover:bg-rose-500/10"
            aria-label={isArabic ? "إخفاء الخطأ" : "Dismiss error"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {imageDialog && (
        <div className="fixed inset-0 z-90 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-w-lg rounded-t-3xl border border-border/70 bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-3xl"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  {imageDialog.hasImage
                    ? isArabic
                      ? "استبدال صورة الإنجاز"
                      : "Replace milestone image"
                    : isArabic
                      ? "رفع صورة الإنجاز"
                      : "Upload milestone image"}
                </h3>
                <p className="mt-1 text-xs font-medium leading-6 text-muted-foreground">
                  {isArabic
                    ? "أنشئ الصورة خارج التطبيق ثم ارفعها هنا."
                    : "Generate your image externally, then upload it here."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageDialog(null)}
                disabled={busyId === imageDialog.logId}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-black text-primary-foreground transition hover:opacity-90">
              {busyId === imageDialog.logId ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {busyId === imageDialog.logId
                ? isArabic
                  ? "جاري الرفع..."
                  : "Uploading..."
                : imageDialog.hasImage
                  ? isArabic
                    ? "استبدال الصورة"
                    : "Replace image"
                  : isArabic
                    ? "رفع الصورة"
                    : "Upload image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={busyId === imageDialog.logId}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  void handleUploadImage(imageDialog.logId, file);
                }}
              />
            </label>
          </div>
        </div>
      )}

      {promptDialog && (
        <div className="fixed inset-0 z-90 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-w-xl rounded-t-3xl border border-border/70 bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-3xl"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  {isArabic ? "برومبت الصورة" : "Image Prompt"}
                </h3>
                <p className="mt-1 text-xs font-medium leading-6 text-muted-foreground">
                  {isArabic
                    ? "عدّل البرومبت، غيّر الستايل، وانسخه بأي وقت."
                    : "Edit prompt, switch style, and copy anytime."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromptDialog(null)}
                disabled={busyId === promptDialog.logId}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {promptStyleOptions.map((styleOption) => (
                  <button
                    key={styleOption.value}
                    type="button"
                    onClick={() =>
                      setPromptDialog((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          style: styleOption.value,
                          prompt: buildPromptFromStyle({
                            goalTitle: prev.goalTitle,
                            milestoneName: prev.milestoneName,
                            milestoneDescription: prev.milestoneDescription,
                            style: styleOption.value,
                          }),
                        };
                      })
                    }
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-start transition",
                      promptDialog.style === styleOption.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <p className="text-xs font-black">
                      {isArabic ? styleOption.label.ar : styleOption.label.en}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium leading-4">
                      {isArabic ? styleOption.hint.ar : styleOption.hint.en}
                    </p>
                  </button>
                ))}
              </div>

              <textarea
                value={promptDialog.prompt}
                onChange={(event) =>
                  setPromptDialog((prev) =>
                    prev ? { ...prev, prompt: event.target.value } : prev,
                  )
                }
                className="h-44 w-full resize-none rounded-2xl border border-border/70 bg-background/70 p-3 text-xs leading-6 text-foreground focus:border-primary focus:outline-none"
                placeholder={isArabic ? "اكتب البرومبت..." : "Write prompt..."}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyPrompt(promptDialog.prompt)}
                  disabled={!promptDialog.prompt.trim()}
                  className="flex-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm font-black text-foreground transition hover:bg-muted disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Copy className="h-4 w-4" />
                    {promptCopied
                      ? isArabic
                        ? "تم النسخ"
                        : "Copied"
                      : isArabic
                        ? "نسخ"
                        : "Copy"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handlePatch(promptDialog.logId, {
                      imagePrompt: promptDialog.prompt.trim(),
                      imageStylePreference: promptDialog.style,
                    });
                    if (ok) setPromptDialog(null);
                  }}
                  disabled={
                    busyId === promptDialog.logId ||
                    !promptDialog.prompt.trim()
                  }
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {busyId === promptDialog.logId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <WandSparkles className="h-4 w-4" />
                    )}
                    {isArabic ? "حفظ البرومبت" : "Save prompt"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mt-3">
          {milestoneEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-3 py-8 text-center dark:bg-background/20">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {ui.activityEmpty}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {milestoneEvents.map((event, index) => {
                const actorIsMe = event.actor === "me";
                const logId =
                  event.logId || `${event.actor}-${event.createdAt}-${index}`;
                const accentKey = normalizeAccentColor(
                  event.milestone!.accentColor,
                );
                const accent = accentConfig[accentKey];
                const isConfirmDelete = confirmDeleteId === logId;
                const isBusy = busyId === logId;
                const displayDesc =
                  event.milestone!.short_description?.trim() ||
                  event.milestone!.description;
                const isEditingThisCard = editMode?.logId === logId;
                const milestoneActionsMenu =
                  actorIsMe && event.logId ? (
                    <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 shadow-sm backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
                          aria-label={
                            isArabic ? "خيارات الإنجاز" : "Milestone options"
                          }
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align={isArabic ? "start" : "end"}
                        side="bottom"
                        className={cn("w-52", isArabic && "text-right")}
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            setEditMode({
                              logId,
                              field: "name",
                              value: event.milestone!.name,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>{isArabic ? "تعديل الاسم" : "Edit name"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setEditMode({
                              logId,
                              field: "description",
                              value: event.milestone!.description,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          <span>{isArabic ? "تعديل الوصف" : "Edit text"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Palette className="h-4 w-4" />
                            <span>
                              {isArabic ? "تغيير اللون" : "Change color"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent
                            className={cn("w-44", isArabic && "text-right")}
                          >
                            {(Object.keys(accentConfig) as AccentColor[]).map(
                              (color) => {
                                const option = accentConfig[color];
                                return (
                                  <DropdownMenuItem
                                    key={color}
                                    onClick={() =>
                                      handlePatch(logId, { accentColor: color })
                                    }
                                    className="cursor-pointer"
                                  >
                                    <span
                                      className={cn(
                                        "h-3.5 w-3.5 rounded-full ring-1 ring-black/10",
                                        option.swatch,
                                      )}
                                    />
                                    <span>
                                      {isArabic
                                        ? option.label.ar
                                        : option.label.en}
                                    </span>
                                  </DropdownMenuItem>
                                );
                              },
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          onClick={() =>
                            setPromptDialog({
                              logId,
                              style: normalizePromptStyle(
                                event.milestone!.imageStylePreference,
                              ),
                              prompt:
                                event.milestone!.imagePrompt?.trim() ||
                                buildPromptFromStyle({
                                  goalTitle: isArabic
                                    ? "هدفي الحالي"
                                    : "My current goal",
                                  milestoneName: event.milestone!.name,
                                  milestoneDescription:
                                    event.milestone!.description || "",
                                  style: normalizePromptStyle(
                                    event.milestone!.imageStylePreference,
                                  ),
                                }),
                              goalTitle: isArabic
                                ? "هدفي الحالي"
                                : "My current goal",
                              milestoneName: event.milestone!.name,
                              milestoneDescription:
                                event.milestone!.description || "",
                            })
                          }
                          disabled={isBusy}
                          className="cursor-pointer"
                        >
                          <WandSparkles className="h-4 w-4" />
                          <span>
                            {isArabic ? "برومبت الصورة" : "Image prompt"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setImageDialog({
                              logId,
                              hasImage: Boolean(event.milestone!.imageUrl),
                            })
                          }
                          disabled={isBusy}
                          className="cursor-pointer"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          <span>
                            {event.milestone!.imageUrl
                              ? isArabic
                                ? "استبدال الصورة"
                                : "Replace image"
                              : isArabic
                                ? "رفع الصورة"
                                : "Upload image"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmDeleteId(logId)}
                          variant="destructive"
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{isArabic ? "حذف" : "Delete"}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null;

                return (
                  <div
                    key={logId}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-linear-to-br p-2 shadow-sm ring-1 ring-white/10 transition-colors duration-200 dark:ring-white/5",
                      accent.card,
                      accent.border,
                    )}
                  >
                    {/* Delete confirm overlay */}
                    {isConfirmDelete && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/95 p-4 text-center backdrop-blur-md animate-in fade-in duration-200">
                        <AlertTriangle className="h-6 w-6 text-rose-500" />
                        <p className="max-w-60 text-xs font-black leading-relaxed text-foreground">
                          {isArabic
                            ? "حذف هذا الإنجاز؟ سيتم خصم نقاطه من الهدف."
                            : "Delete this achievement? Its points will be deducted."}
                        </p>
                        <div className="flex w-full max-w-60 gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isBusy}
                            className="flex-1 rounded-xl border border-border/70 bg-background/80 py-2 text-xs font-black text-foreground transition hover:bg-muted"
                          >
                            {isArabic ? "إلغاء" : "Cancel"}
                          </button>
                          <button
                            onClick={() =>
                              event.logId && handleDelete(event.logId)
                            }
                            disabled={isBusy}
                            className="flex flex-1 items-center justify-center rounded-xl bg-rose-600 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isArabic ? (
                              "حذف"
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image — TOP */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-background/30 ring-1 ring-white/15">
                      {event.milestone!.imageUrl ? (
                        <Image
                          src={event.milestone!.imageUrl}
                          alt={event.milestone!.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-full w-full items-center justify-center",
                            accent.icon,
                          )}
                        >
                          <Trophy className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                      <div
                        className={cn(
                          "absolute top-2 flex items-center gap-1.5",
                          isArabic ? "left-2" : "right-2",
                        )}
                      >
                        {milestoneActionsMenu}
                        <div
                          className={cn(
                            "rounded-full px-3 py-1.5 text-sm font-black tabular-nums text-white shadow-md backdrop-blur-md",
                            actorIsMe
                              ? "bg-emerald-500/90 shadow-emerald-500/20"
                              : "bg-sky-500/90 shadow-sky-500/20",
                          )}
                        >
                          +{numberFormatter.format(event.points)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-md",
                          isArabic ? "right-2" : "left-2",
                        )}
                      >
                        <span>
                          {formatNumericDate(event.createdAt, locale)} ·{" "}
                          {formatTime(event.createdAt, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Content — BOTTOM */}
                    <div className="flex min-w-0 flex-col gap-1.5 px-0 pb-0">
                      {/* Inline editor */}
                      {isEditingThisCard ? (
                        <InlineEditor
                          mode={editMode!}
                          isArabic={isArabic}
                          onCancel={() => setEditMode(null)}
                          onSave={(value) =>
                            event.logId &&
                            handlePatch(event.logId, {
                              [editMode!.field]: value,
                            })
                          }
                          isBusy={isBusy}
                        />
                      ) : (
                        <>
                          <h4 className="line-clamp-2 text-xs font-black leading-tight text-foreground">
                            {event.milestone!.name}
                          </h4>
                          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                            {displayDesc}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InlineEditor({
  mode,
  isArabic,
  onCancel,
  onSave,
  isBusy,
}: {
  mode: NonNullable<EditMode>;
  isArabic: boolean;
  onCancel: () => void;
  onSave: (value: string) => void;
  isBusy: boolean;
}) {
  const [value, setValue] = useState(mode.value);
  const isMultiline = mode.field === "description";

  return (
    <div className="mt-1.5">
      {isMultiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full resize-none rounded-lg border border-border/70 bg-background/70 p-2 text-[11px] leading-relaxed text-foreground focus:border-primary focus:outline-none"
          rows={3}
          placeholder={isArabic ? "الوصف..." : "Description..."}
          autoFocus
        />
      ) : (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-border/70 bg-background/70 p-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
          placeholder={isArabic ? "اسم الإنجاز..." : "Milestone name..."}
          autoFocus
        />
      )}
      <div className="mt-1.5 flex gap-1.5">
        <button
          onClick={() => onSave(value.trim())}
          disabled={isBusy || !value.trim()}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isArabic ? "حفظ" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="rounded-lg bg-muted px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted/70"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
