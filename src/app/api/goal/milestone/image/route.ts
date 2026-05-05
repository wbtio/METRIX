import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getErrorMessage } from "@/components/challenge/challenge-utils";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAllowedMimeType(mimeType: string) {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

function extractStorageFilename(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const urlObj = new URL(imageUrl);
    return urlObj.pathname.split("/").pop() || null;
  } catch {
    return null;
  }
}

async function removeMilestoneImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageUrl: string | null,
) {
  const filename = extractStorageFilename(imageUrl);
  if (!filename) return;

  const { error } = await supabase.storage
    .from("milestones")
    .remove([filename]);
  if (error) {
    console.error("Failed to remove previous milestone image:", error);
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data request" },
        { status: 415 },
      );
    }

    const form = await req.formData();
    const goalId = String(form.get("goalId") || "").trim();
    const logId = String(form.get("logId") || "").trim();
    const imageFile = form.get("image");

    if (!goalId || !logId || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing required fields or image file" },
        { status: 400 },
      );
    }
    if (!isAllowedMimeType(imageFile.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and WEBP images are allowed" },
        { status: 400 },
      );
    }
    if (imageFile.size <= 0 || imageFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size must be greater than 0 and at most 10MB" },
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
      .select("id, title, user_id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    const { data: log, error: logError } = await supabase
      .from("daily_logs")
      .select("id, user_input, breakdown")
      .eq("id", logId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (logError || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const breakdown = isRecord(log.breakdown) ? { ...log.breakdown } : {};
    if (!isRecord(breakdown.milestone)) {
      return NextResponse.json(
        { error: "Log is not a milestone" },
        { status: 400 },
      );
    }

    const milestone = { ...breakdown.milestone };
    const previousImageUrl =
      typeof milestone.imageUrl === "string" ? milestone.imageUrl : null;
    const imageMimeType = imageFile.type;
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    if (!imageBuffer.byteLength) {
      throw new Error("Uploaded image payload is empty");
    }
    const extension = getExtensionFromMimeType(imageMimeType);
    const filename = `milestone-${goalId}-${logId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("milestones")
      .upload(filename, imageBuffer, {
        contentType: imageMimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from("milestones")
      .getPublicUrl(filename);

    milestone.imageUrl = publicUrlData.publicUrl;
    milestone.imageUploadedAt = new Date().toISOString();
    milestone.imageSource = "user-upload";
    breakdown.milestone = milestone;

    const { error: updateError } = await supabase
      .from("daily_logs")
      .update({ breakdown })
      .eq("id", logId)
      .eq("goal_id", goalId);

    if (updateError) {
      await supabase.storage.from("milestones").remove([filename]);
      throw updateError;
    }

    await removeMilestoneImage(supabase, previousImageUrl);

    return NextResponse.json({
      status: "ok",
      imageUrl: publicUrlData.publicUrl,
      source: "user-upload",
    });
  } catch (error: unknown) {
    console.error("Milestone image upload API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Failed to upload milestone image"),
      },
      { status: 500 },
    );
  }
}
