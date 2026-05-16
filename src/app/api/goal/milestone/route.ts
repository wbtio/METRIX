import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GeminiService, GeminiQuotaError } from "@/lib/gemini";
import { getErrorMessage } from "@/components/challenge/challenge-utils";
import {
  buildMilestoneImagePrompt,
  buildMilestonePromptContext,
} from "@/lib/milestone-image-prompt";

type MilestoneTier = "minor" | "major" | "legendary";

const ALLOWED_TIERS: MilestoneTier[] = ["minor", "major", "legendary"];
const ALLOWED_ASPECT_RATIOS = ["1:1", "4:3", "16:9", "9:16", "3:4"] as const;
const ALLOWED_ACCENT_COLORS = [
  "emerald",
  "violet",
  "amber",
  "rose",
  "sky",
  "slate",
] as const;
type MilestoneAspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number];
type Language = "ar" | "en";

const MAX_MILESTONE_NAME_LENGTH = 120;
const MAX_USER_INPUT_LENGTH = 6_000;
const MAX_TASK_DESCRIPTIONS = 80;
const MAX_TASK_DESCRIPTION_LENGTH = 500;
const MIN_TARGET_POINTS = 100;
const MAX_TARGET_POINTS = 10_000_000;
const MAX_DAILY_CAP = 100_000;

type CreateMilestonePayload = {
  goalId: string;
  userInput: string;
  milestoneName: string;
  targetPoints: number;
  dailyCap: number;
  aspectRatio: MilestoneAspectRatio;
  tasksDescriptions: string[];
  goalContext: Record<string, unknown>;
  language: Language;
};

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parsePositiveNumber(value: unknown, max: number, min = 0) {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!isFiniteNumber(parsed) || parsed <= min || parsed > max) return null;
  return parsed;
}

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function normalizeLanguage(value: unknown): Language {
  return value === "ar" ? "ar" : "en";
}

function normalizeAspectRatio(value: unknown): MilestoneAspectRatio {
  return typeof value === "string" &&
    ALLOWED_ASPECT_RATIOS.includes(value as MilestoneAspectRatio)
    ? (value as MilestoneAspectRatio)
    : "4:3";
}

function normalizeTaskDescriptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_TASK_DESCRIPTIONS)
    .map((item) => item.slice(0, MAX_TASK_DESCRIPTION_LENGTH));
}

function normalizeGoalContext(value: unknown) {
  if (!isRecord(value)) return {};

  const safeContext: Record<string, unknown> = {};
  const allowedKeys = [
    "title",
    "description",
    "ai_summary",
    "domain",
    "current_points",
    "target_points",
    "total_logs",
    "days_since_start",
  ];

  for (const key of allowedKeys) {
    const entry = value[key];
    if (typeof entry === "string") {
      safeContext[key] = entry.slice(0, 1_000);
    } else if (isFiniteNumber(entry)) {
      safeContext[key] = entry;
    }
  }

  return safeContext;
}

function validateCreatePayload(
  body: unknown,
):
  | { ok: true; value: CreateMilestonePayload }
  | { ok: false; response: NextResponse } {
  if (!isRecord(body)) {
    return { ok: false, response: badRequest("Invalid JSON payload") };
  }

  const goalId = trimString(body.goalId, 80);
  if (!goalId) {
    return { ok: false, response: badRequest("Missing or invalid goalId") };
  }

  const userInput = trimString(body.userInput, MAX_USER_INPUT_LENGTH);
  if (!userInput) {
    return { ok: false, response: badRequest("Missing or invalid userInput") };
  }

  const milestoneName = trimString(
    body.milestoneName,
    MAX_MILESTONE_NAME_LENGTH,
  );
  if (!milestoneName) {
    return {
      ok: false,
      response: badRequest("Missing or invalid milestoneName"),
    };
  }

  const targetPoints = parsePositiveNumber(
    body.targetPoints,
    MAX_TARGET_POINTS,
    MIN_TARGET_POINTS - 1,
  );
  if (targetPoints === null) {
    return {
      ok: false,
      response: badRequest(
        `targetPoints must be a finite number of at least ${MIN_TARGET_POINTS}`,
      ),
    };
  }

  const dailyCap = parsePositiveNumber(body.dailyCap, MAX_DAILY_CAP);
  if (dailyCap === null) {
    return {
      ok: false,
      response: badRequest("dailyCap must be a positive finite number"),
    };
  }

  return {
    ok: true,
    value: {
      goalId,
      userInput,
      milestoneName,
      targetPoints,
      dailyCap,
      aspectRatio: normalizeAspectRatio(body.aspectRatio),
      tasksDescriptions: normalizeTaskDescriptions(body.tasksDescriptions),
      goalContext: normalizeGoalContext(body.goalContext),
      language: normalizeLanguage(body.language),
    },
  };
}

function isRpcMissing(error: DbErrorLike) {
  return error.code === "PGRST202";
}

function getRpcHttpStatus(error: DbErrorLike) {
  if (isRpcMissing(error)) return 501;
  if (error.message?.includes("not_a_milestone")) return 400;
  if (error.message?.includes("goal_not_found_or_access_denied")) return 404;
  if (error.message?.includes("log_not_found_or_access_denied")) return 404;
  return 500;
}

function getRpcClientMessage(error: DbErrorLike, fallback: string) {
  if (isRpcMissing(error)) {
    return "Required milestone database migration is not installed.";
  }

  if (error.message?.includes("not_a_milestone")) {
    return "Log is not a milestone.";
  }

  if (error.message?.includes("goal_not_found_or_access_denied")) {
    return "Goal not found or access denied.";
  }

  if (error.message?.includes("log_not_found_or_access_denied")) {
    return "Log not found or access denied.";
  }

  return fallback;
}

function getTierScorePolicy(tier: unknown) {
  switch (tier) {
    case "minor":
      return {
        tier: "minor" as const,
        fallbackMultiplier: 3,
        minMultiplier: 3,
        maxMultiplier: 4,
        maxPercentage: 0.05,
      };
    case "major":
      return {
        tier: "major" as const,
        fallbackMultiplier: 5,
        minMultiplier: 5,
        maxMultiplier: 9,
        maxPercentage: 0.1,
      };
    case "legendary":
      return {
        tier: "legendary" as const,
        fallbackMultiplier: 10,
        minMultiplier: 10,
        maxMultiplier: 10,
        maxPercentage: 0.2,
      };
    default:
      return {
        tier: "minor" as const,
        fallbackMultiplier: 3,
        minMultiplier: 3,
        maxMultiplier: 4,
        maxPercentage: 0.05,
      };
  }
}

async function removeMilestoneImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageUrl: string | null,
) {
  if (!imageUrl) return;

  try {
    const urlObj = new URL(imageUrl);
    const filename = urlObj.pathname.split("/").pop();
    if (!filename) return;

    const { error } = await supabase.storage
      .from("milestones")
      .remove([filename]);
    if (error) {
      console.error("Failed to remove milestone image from storage:", error);
    }
  } catch (error) {
    console.error("Failed to parse or remove milestone image:", error);
  }
}

export async function POST(req: Request) {
  try {
    const parsedPayload = validateCreatePayload(await req.json());
    if (!parsedPayload.ok) return parsedPayload.response;

    const {
      goalId,
      userInput,
      milestoneName,
      targetPoints,
      dailyCap,
      aspectRatio,
      tasksDescriptions,
      goalContext,
      language,
    } = parsedPayload.value;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id, title")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    // 1. Evaluate Milestone
    const evaluation = await GeminiService.evaluateMilestone(
      { ...goalContext, title: goal.title },
      tasksDescriptions,
      userInput,
      language,
    );

    if (!evaluation.is_milestone_accepted) {
      return NextResponse.json(
        {
          success: false,
          status: "rejected",
          is_milestone_accepted: false,
          reason: evaluation.rejection_reason || evaluation.coaching_message,
          rejection_reason: evaluation.rejection_reason,
          message: evaluation.coaching_message,
          coaching_message: evaluation.coaching_message,
        },
        { status: 200 },
      );
    }

    // 2. Math Logic Capping
    const tierPolicy = getTierScorePolicy(evaluation.milestone_tier);
    const rawAiMultiplier = Number(evaluation.suggested_base_points_multiplier);
    const safeMultiplier = Number.isFinite(rawAiMultiplier)
      ? clamp(
          rawAiMultiplier,
          tierPolicy.minMultiplier,
          tierPolicy.maxMultiplier,
        )
      : tierPolicy.fallbackMultiplier;

    const finalMilestoneName =
      milestoneName.trim() !== ""
        ? milestoneName.trim()
        : evaluation.generated_name || "Milestone";
    const calculatedScore = Math.floor(safeMultiplier * dailyCap);
    const maxScore = Math.floor(tierPolicy.maxPercentage * targetPoints);
    const finalScore = Math.max(0, Math.min(calculatedScore, maxScore));

    if (finalScore <= 0) {
      return NextResponse.json(
        {
          error: "invalid_milestone_score",
          message: "Calculated milestone score must be greater than zero.",
        },
        { status: 400 },
      );
    }

    // Image is intentionally optional at creation.
    // Users can upload it later via `/api/goal/milestone/image`.
    const imageUrl: string | null = null;
    const imagePromptContext = buildMilestonePromptContext({
      goalTitle: goal.title,
      goalContext,
      tasksDescriptions,
    });
    const imagePrompt = buildMilestoneImagePrompt({
      ...imagePromptContext,
      milestoneName: finalMilestoneName,
      milestoneDescription: userInput,
      style: "cinematic",
      aspectRatio,
    });

    // 5. Atomically insert Daily Log and increment Goal Points via SQL RPC.
    // The migration in `supabase/migrations/*_milestone_atomic_rpc.sql` must be applied.
    const breakdownPayload = {
      version: 2,
      items: [],
      milestone: {
        tier: tierPolicy.tier,
        imageUrl: imageUrl,
        name: finalMilestoneName,
        description: userInput,
        imageStylePreference: "cinematic",
        imageAspectRatio: aspectRatio,
        imagePrompt,
        imagePromptContext,
        short_description:
          typeof evaluation.short_description === "string"
            ? evaluation.short_description.slice(0, 240)
            : "",
      },
    };

    const { data: rpcData, error: recordError } = await supabase.rpc(
      "record_goal_milestone",
      {
        p_goal_id: goalId,
        p_user_input: userInput,
        p_ai_score: finalScore,
        p_ai_feedback:
          typeof evaluation.coaching_message === "string"
            ? evaluation.coaching_message
            : "",
        p_breakdown: breakdownPayload,
      },
    );

    let logId =
      isRecord(rpcData) && typeof rpcData.log_id === "string"
        ? rpcData.log_id
        : null;

    if (recordError) {
      if (!isRpcMissing(recordError)) {
        await removeMilestoneImage(supabase, imageUrl);
        const status = getRpcHttpStatus(recordError);
        return NextResponse.json(
          {
            error: "milestone_write_failed",
            message: getRpcClientMessage(
              recordError,
              "Failed to save milestone.",
            ),
          },
          { status },
        );
      }

      console.warn(
        "record_goal_milestone RPC is missing; using temporary non-atomic fallback. Apply the Supabase milestone migration to enable the hardened path.",
      );

      const { data: fallbackLogData, error: fallbackLogError } = await supabase
        .from("daily_logs")
        .insert({
          goal_id: goalId,
          user_input: userInput,
          ai_score: finalScore,
          ai_feedback:
            typeof evaluation.coaching_message === "string"
              ? evaluation.coaching_message
              : "",
          breakdown: breakdownPayload,
        })
        .select("id")
        .single();

      if (fallbackLogError) {
        await removeMilestoneImage(supabase, imageUrl);
        throw fallbackLogError;
      }

      logId = fallbackLogData.id;

      const { error: fallbackPointsError } = await supabase.rpc(
        "increment_goal_points",
        {
          goal_uuid: goalId,
          points_to_add: finalScore,
        },
      );

      if (fallbackPointsError) {
        await supabase.from("daily_logs").delete().eq("id", logId);
        await removeMilestoneImage(supabase, imageUrl);
        throw fallbackPointsError;
      }
    }

    return NextResponse.json({
      status: "ok",
      tier: tierPolicy.tier,
      score: finalScore,
      imageUrl: imageUrl,
      message: evaluation.coaching_message,
      logId,
      imagePrompt,
    });
  } catch (error: unknown) {
    console.error("Milestone API POST error:", error);
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: "Daily usage limit exceeded.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      logId,
      goalId,
      name,
      description,
      tier,
      accentColor,
      imagePrompt,
      imageStylePreference,
    } =
      await req.json();

    if (!logId || !goalId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (tier && !ALLOWED_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (accentColor && !ALLOWED_ACCENT_COLORS.includes(accentColor)) {
      return NextResponse.json(
        { error: "Invalid accentColor" },
        { status: 400 },
      );
    }

    if (
      imagePrompt !== undefined &&
      (typeof imagePrompt !== "string" || imagePrompt.length > 6_000)
    ) {
      return NextResponse.json(
        { error: "Invalid imagePrompt" },
        { status: 400 },
      );
    }

    if (
      imageStylePreference !== undefined &&
      (typeof imageStylePreference !== "string" ||
        imageStylePreference.length > 64)
    ) {
      return NextResponse.json(
        { error: "Invalid imageStylePreference" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    const { data: log, error: fetchError } = await supabase
      .from("daily_logs")
      .select("id, breakdown")
      .eq("id", logId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (fetchError || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const breakdown = isRecord(log.breakdown) ? { ...log.breakdown } : {};
    if (!isRecord(breakdown.milestone)) {
      return NextResponse.json(
        { error: "Log is not a milestone" },
        { status: 400 },
      );
    }

    const updatedMilestone = { ...breakdown.milestone };
    if (typeof name === "string" && name.trim())
      updatedMilestone.name = name.trim();
    if (typeof description === "string") {
      updatedMilestone.description = description;
      updatedMilestone.short_description =
        description.length > 120
          ? description.slice(0, 120) + "…"
          : description;
    }
    if (tier) updatedMilestone.tier = tier;
    if (accentColor) updatedMilestone.accentColor = accentColor;
    if (typeof imagePrompt === "string") {
      updatedMilestone.imagePrompt = imagePrompt.trim();
    }
    if (typeof imageStylePreference === "string") {
      updatedMilestone.imageStylePreference = imageStylePreference.trim();
    }

    breakdown.milestone = updatedMilestone;

    const { error: updateError } = await supabase
      .from("daily_logs")
      .update({ breakdown })
      .eq("id", logId);

    if (updateError) throw updateError;

    return NextResponse.json({ status: "ok", milestone: updatedMilestone });
  } catch (error: unknown) {
    console.error("Milestone API PATCH error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { logId, goalId } = await req.json();

    if (!logId || !goalId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch the log to verify it belongs to this goal and get the score/image
    const { data: log, error: fetchError } = await supabase
      .from("daily_logs")
      .select("id, ai_score, breakdown")
      .eq("id", logId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (fetchError || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const breakdown = isRecord(log.breakdown) ? log.breakdown : {};

    if (!isRecord(breakdown.milestone)) {
      return NextResponse.json(
        { error: "Log is not a milestone" },
        { status: 400 },
      );
    }

    const scoreToRevert = log.ai_score || 0;
    const imageUrl =
      typeof breakdown.milestone.imageUrl === "string"
        ? breakdown.milestone.imageUrl
        : null;

    const { error: deleteError } = await supabase.rpc("delete_goal_milestone", {
      p_goal_id: goalId,
      p_log_id: logId,
    });

    if (deleteError) {
      if (!isRpcMissing(deleteError)) {
        const status = getRpcHttpStatus(deleteError);
        return NextResponse.json(
          {
            error: "milestone_delete_failed",
            message: getRpcClientMessage(
              deleteError,
              "Failed to delete milestone.",
            ),
          },
          { status },
        );
      }

      console.warn(
        "delete_goal_milestone RPC is missing; using temporary non-atomic fallback. Apply the Supabase milestone migration to enable the hardened path.",
      );

      const { error: fallbackDeleteError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", logId)
        .eq("goal_id", goalId);

      if (fallbackDeleteError) {
        throw fallbackDeleteError;
      }

      if (scoreToRevert > 0) {
        const { error: fallbackPointsError } = await supabase.rpc(
          "increment_goal_points",
          {
            goal_uuid: goalId,
            points_to_add: -scoreToRevert,
          },
        );

        if (fallbackPointsError) {
          console.error(
            "Milestone log was deleted but point revert failed in fallback path:",
            fallbackPointsError,
          );
          throw fallbackPointsError;
        }
      }
    }

    await removeMilestoneImage(supabase, imageUrl);

    return NextResponse.json({ status: "ok", revertedScore: scoreToRevert });
  } catch (error: unknown) {
    console.error("Milestone API DELETE error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}
