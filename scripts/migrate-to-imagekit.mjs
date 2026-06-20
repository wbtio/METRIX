import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://asxynodsnmrymmdspprn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/amalcenter";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

const required = { SUPABASE_SERVICE_ROLE_KEY, IMAGEKIT_PRIVATE_KEY };
for (const [name, val] of Object.entries(required)) {
  if (!val) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const IMAGEKIT_AUTH = btoa(`${IMAGEKIT_PRIVATE_KEY}:`);

let total = 0;
let uploaded = 0;
let failed = 0;
let skipped = 0;

async function uploadToImageKit(imageBuffer, fileName) {
  const form = new FormData();
  form.append("file", new Blob([imageBuffer]), fileName);
  form.append("fileName", fileName);
  form.append("useUniqueFileName", "false");
  form.append("folder", "/milestones");

  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${IMAGEKIT_AUTH}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Upload failed (${res.status}): ${err}`);
    return null;
  }

  const data = await res.json();
  return data.url;
}

async function migrateAll() {
  console.log("Fetching milestone image URLs from database...");

  const { data: logs, error } = await supabase
    .from("daily_logs")
    .select("id, goal_id, breakdown")
    .not("breakdown->milestone->>imageUrl", "is", null);

  if (error) {
    console.error("Database query failed:", error.message);
    process.exit(1);
  }

  const entries = [];

  for (const log of logs ?? []) {
    const breakdown =
      typeof log.breakdown === "object" && log.breakdown !== null
        ? log.breakdown
        : {};
    const milestone =
      typeof breakdown.milestone === "object" && breakdown.milestone !== null
        ? breakdown.milestone
        : {};
    const imageUrl =
      typeof milestone.imageUrl === "string" ? milestone.imageUrl : null;

    if (
      imageUrl &&
      imageUrl.includes("supabase.co/storage") &&
      !imageUrl.includes("ik.imagekit.io")
    ) {
      entries.push({ logId: log.id, goalId: log.goal_id, imageUrl });
    }
  }

  total = entries.length;
  console.log(`Found ${total} milestone images to migrate.\n`);

  for (let i = 0; i < entries.length; i++) {
    const { logId, goalId, imageUrl } = entries[i];
    const fileName = `milestone-${goalId}-${logId}.png`;
    console.log(`[${i + 1}/${total}] ${imageUrl.split("/").pop()}`);

    try {
      const downloadRes = await fetch(imageUrl, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });

      if (!downloadRes.ok) {
        console.error(`  Download failed (${downloadRes.status}), skipping`);
        failed++;
        continue;
      }

      const buffer = await downloadRes.arrayBuffer();

      if (buffer.byteLength === 0) {
        console.error("  Empty file, skipping");
        failed++;
        continue;
      }

      const imageKitUrl = await uploadToImageKit(buffer, fileName);
      if (!imageKitUrl) {
        failed++;
        continue;
      }

      const breakdownRes = await supabase
        .from("daily_logs")
        .select("breakdown")
        .eq("id", logId)
        .single();

      if (breakdownRes.error) {
        console.error(`  Failed to fetch log: ${breakdownRes.error.message}`);
        failed++;
        continue;
      }

      const breakdown =
        typeof breakdownRes.data?.breakdown === "object" &&
        breakdownRes.data?.breakdown !== null
          ? { ...breakdownRes.data.breakdown }
          : {};
      const milestone =
        typeof breakdown.milestone === "object" && breakdown.milestone !== null
          ? { ...breakdown.milestone }
          : {};
      milestone.imageUrl = imageKitUrl;
      milestone.imageSource = "imagekit-migration";
      breakdown.milestone = milestone;

      const { error: updateError } = await supabase
        .from("daily_logs")
        .update({ breakdown })
        .eq("id", logId);

      if (updateError) {
        console.error(`  DB update failed: ${updateError.message}`);
        failed++;
      } else {
        uploaded++;
      }
    } catch (err) {
      console.error("  Unexpected error:", err);
      failed++;
    }
  }

  console.log(
    `\nDone. ${uploaded} migrated, ${failed} failed, ${skipped} skipped (of ${total} total).`,
  );
}

migrateAll();
