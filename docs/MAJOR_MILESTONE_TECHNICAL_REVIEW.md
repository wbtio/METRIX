# Major Milestone Feature — Technical Implementation Review

This document captures the current implementation details of the **Major Milestone** feature as implemented in the METRIX codebase. It is intended for structural and security review by a Senior Software Engineer.

Scope covered:

- Progress logging entry point and milestone mode UI.
- Next.js App Router API route for milestone create/update/delete.
- Gemini AI evaluation and image generation integration.
- Supabase `daily_logs` persistence model.
- Supabase Storage image upload/removal.
- Goal points mutation via `increment_goal_points` RPC call sites.
- Challenge/activity UI rendering of stored milestone data.

Important limitation: older snapshots of this repository did **not** include Supabase SQL migrations or the SQL definition of `increment_goal_points`. This review now includes a new migration draft for milestone-specific atomic RPCs:

- `supabase/migrations/20260101000100_milestone_atomic_rpc.sql`
- `record_goal_milestone(...)`
- `delete_goal_milestone(...)`
- `trg_enforce_goal_milestone_limit`

Current hardening status:

- `POST /api/goal/milestone` now validates and normalizes payloads server-side before AI evaluation.
- AI-provided multiplier/tier is clamped server-side before point calculation.
- Milestone log insertion and goal point increment now go through `record_goal_milestone`, intended to run as a single PostgreSQL transaction after the migration is applied.
- Milestone deletion and point reversion now go through `delete_goal_milestone`, intended to run as a single PostgreSQL transaction after the migration is applied.
- `DELETE` verifies that the target `daily_logs` row is a real milestone before invoking the delete RPC.
- The migration adds a trigger-level 2-milestone-per-goal guard to reduce race-condition risk even if writes bypass the Next.js API.

---

## 1. Relevant Files

| Concern | File |
|---|---|
| Milestone create/update/delete API | `src/app/api/goal/milestone/route.ts` |
| AI evaluation and image generation | `src/lib/gemini.ts` |
| User-facing progress/milestone modal | `src/components/progress/ProgressLogDialog.tsx` |
| Challenge milestone display and inline editing | `src/components/challenge/ActivityCard.tsx` |
| Challenge event type definitions | `src/components/challenge/challenge-types.ts` |
| Challenge API extraction of milestone events | `src/app/api/challenges/by-goal/route.ts` |
| General data model/RPC reference | `README.md` |

---

## 2. Database Persistence Model

### 2.1 `daily_logs` fields referenced by this feature

The main project README documents `daily_logs` as:

```md
`id`, `goal_id`, `created_at`, `user_input`, `ai_score`, `ai_feedback`, `breakdown`
```

The milestone feature persists milestones as a specialized `daily_logs` row. It does **not** use a dedicated `milestones` table.

### 2.2 Exact `breakdown` JSON shape written by milestone creation

From `src/app/api/goal/milestone/route.ts`, `POST` constructs:

```ts
const breakdownPayload = {
    version: 2,
    items: [],
    milestone: {
        tier: evaluation.milestone_tier,
        imageUrl: imageUrl,
        name: finalMilestoneName,
        description: userInput,
        short_description: evaluation.short_description || '',
    }
};
```

This object is inserted into `daily_logs.breakdown`:

```ts
const { data: logData, error: logError } = await supabase
    .from('daily_logs')
    .insert({
        goal_id: goalId,
        user_input: userInput,
        ai_score: finalScore,
        ai_feedback: evaluation.coaching_message,
        breakdown: breakdownPayload,
    })
    .select('id')
    .single();
```

Resulting stored JSONB structure:

```json
{
  "version": 2,
  "items": [],
  "milestone": {
    "tier": "minor | major | legendary",
    "imageUrl": "string | null",
    "name": "string",
    "description": "string",
    "short_description": "string"
  }
}
```

### 2.3 Milestone detection rule

The system treats a `daily_logs` row as a milestone when `breakdown` is an object and `breakdown.milestone` exists.

Used in `src/app/api/goal/milestone/route.ts` to count existing milestones:

```ts
const milestoneCount = (existingLogs || []).filter(
    (row: any) => row?.breakdown && typeof row.breakdown === 'object' && row.breakdown.milestone,
).length;
```

Used in `src/app/api/challenges/by-goal/route.ts` to expose milestone events:

```ts
return (data || []).map((row: { id: string; created_at: string; ai_score: number; breakdown: any }) => {
  let milestone;
  if (row.breakdown && typeof row.breakdown === 'object') {
    milestone = row.breakdown.milestone;
  }
  return {
    logId: row.id,
    actor,
    points: row.ai_score || 0,
    createdAt: row.created_at,
    milestone,
  };
});
```

---

## 3. Supabase RPC: `increment_goal_points`

### 3.1 SQL definition availability

The exact SQL definition of `increment_goal_points` is **not present in this repository**.

Repository search found no `.sql` files and no `CREATE FUNCTION increment_goal_points` migration. The README only documents the RPC at a high level:

```md
| `increment_goal_points` | ProgressLogDialog | زيادة نقاط الهدف atomically |
```

Therefore, this document cannot assert the internal SQL logic, locking behavior, validation, or exception handling of the RPC.

### 3.2 Exact milestone creation call site

From `src/app/api/goal/milestone/route.ts`:

```ts
const { error: updateError } = await supabase.rpc('increment_goal_points', {
    goal_uuid: goalId,
    points_to_add: finalScore
});

if (updateError) {
    throw updateError;
}
```

### 3.3 Exact milestone deletion/revert call site

From `src/app/api/goal/milestone/route.ts`:

```ts
if (scoreToRevert > 0) {
    const { error: updateError } = await supabase.rpc('increment_goal_points', {
        goal_uuid: goalId,
        points_to_add: -scoreToRevert
    });

    if (updateError) {
        throw updateError;
    }
}
```

### 3.4 Error handling at TypeScript call site

The RPC call returns `{ error }`. If `error` exists, the route throws it. The surrounding route-level `catch` converts it into a `500` JSON response.

For `POST`, the catch block is:

```ts
} catch (error: unknown) {
    console.error("Milestone API POST error:", error);
    if (error instanceof GeminiQuotaError) {
        return NextResponse.json({
            error: 'quota_exceeded',
            message: 'Daily usage limit exceeded.',
        }, { status: 429 });
    }
    return NextResponse.json(
        { error: 'Internal server error', message: getErrorMessage(error, 'Internal server error') },
        { status: 500 }
    );
}
```

For `DELETE`, the catch block is:

```ts
} catch (error: unknown) {
    console.error("Milestone API DELETE error:", error);
    return NextResponse.json(
        { error: 'Internal server error', message: getErrorMessage(error, 'Internal server error') },
        { status: 500 }
    );
}
```

### 3.5 Transaction/rollback implication

Because the SQL function definition is absent, only TypeScript-level behavior can be reviewed. In milestone creation, the DB insert occurs before the RPC increment. If the insert succeeds and the RPC fails, this route has no local rollback of the inserted `daily_logs` row.

---

## 4. Backend API Route: `src/app/api/goal/milestone/route.ts`

This file implements three handlers:

- `POST`: create a milestone.
- `PATCH`: update saved milestone metadata.
- `DELETE`: remove a milestone and revert its points.

---

## 5. `POST /api/goal/milestone` Create Flow

### 5.1 Request body destructuring

```ts
const {
    goalId,
    userInput,
    milestoneName,
    targetPoints,
    dailyCap,
    aspectRatio = '16:9',
    tasksDescriptions = [],
    goalContext = {},
    language = 'en',
} = await req.json();
```

### 5.2 Input validation

Only a truthiness check is performed:

```ts
if (!goalId || !userInput || !milestoneName || !targetPoints || !dailyCap) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}
```

Technical constraints and edge cases:

- Empty strings fail for `goalId`, `userInput`, `milestoneName`.
- `targetPoints = 0` fails because `!targetPoints` is true.
- `dailyCap = 0` fails because `!dailyCap` is true.
- `aspectRatio` is not validated in the API route. It defaults to `'16:9'` but accepts any request value until passed to image generation.
- `tasksDescriptions`, `goalContext`, and `language` are not structurally validated in the route.

### 5.3 Supabase client and authentication

```ts
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
```

### 5.4 Goal ownership check

```ts
const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, title')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();

if (goalError || !goal) {
    return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
}
```

### 5.5 Existing milestone count limit

The route enforces a maximum of 2 milestone logs per goal by reading all `daily_logs` rows for the goal and filtering in application code.

```ts
const { data: existingLogs, error: existingError } = await supabase
    .from('daily_logs')
    .select('id, breakdown')
    .eq('goal_id', goalId);

if (existingError) {
    console.error('Failed to count existing milestones:', existingError);
} else {
    const milestoneCount = (existingLogs || []).filter(
        (row: any) => row?.breakdown && typeof row.breakdown === 'object' && row.breakdown.milestone,
    ).length;
    if (milestoneCount >= 2) {
        return NextResponse.json({
            success: false,
            status: 'limit_reached',
            message: language === 'ar'
                ? 'لا يمكن تسجيل أكثر من إنجازين كبيرين لكل هدف. احذف إنجازاً سابقاً لتسجيل واحد جديد.'
                : 'You cannot record more than 2 big milestones per goal. Delete an existing one to add a new one.',
        }, { status: 400 });
    }
}
```

Technical constraints and edge cases:

- If counting existing milestones fails, the route logs the error but does **not** stop creation.
- The milestone limit is not enforced transactionally in this route.
- Concurrent milestone creation requests could both pass the count check before either insert completes.

### 5.6 AI evaluation operation

```ts
const evaluation = await GeminiService.evaluateMilestone(
    { ...goalContext, title: goal.title },
    tasksDescriptions,
    userInput,
    language
);
```

### 5.7 Rejection response handling

If AI rejects the milestone:

```ts
if (!evaluation.is_milestone_accepted) {
    return NextResponse.json({
        success: false,
        status: 'rejected',
        is_milestone_accepted: false,
        reason: evaluation.rejection_reason || evaluation.coaching_message,
        rejection_reason: evaluation.rejection_reason,
        message: evaluation.coaching_message,
        coaching_message: evaluation.coaching_message
    }, { status: 200 });
}
```

Technical behavior:

- Rejection is returned with HTTP `200`, not `400`.
- No database writes or point mutations occur on rejection.

### 5.8 Tier-to-score calculation

```ts
let multiplier = 1;
let maxPercentage = 0;

switch (evaluation.milestone_tier) {
    case 'minor':
        multiplier = 3;
        maxPercentage = 0.05;
        break;
    case 'major':
        multiplier = 5;
        maxPercentage = 0.10;
        break;
    case 'legendary':
        multiplier = 10;
        maxPercentage = 0.20;
        break;
    default:
        multiplier = 1;
        maxPercentage = 0.01;
}

const finalMilestoneName = milestoneName.trim() !== "" ? milestoneName : (evaluation.generated_name || 'Milestone');
const calculatedScore = (evaluation.suggested_base_points_multiplier || multiplier) * dailyCap;
const maxScore = Math.floor(maxPercentage * targetPoints);
const finalScore = Math.min(calculatedScore, maxScore);
```

Technical constraints and edge cases:

- `evaluation.suggested_base_points_multiplier` overrides the fallback multiplier if truthy.
- `finalScore` is capped by percentage of `targetPoints`.
- `maxScore` can be `0` for small `targetPoints`, causing `finalScore` to be `0`.
- There is no lower bound ensuring at least 1 point after acceptance.
- There is no numeric validation of `evaluation.suggested_base_points_multiplier` in this route.

### 5.9 Image generation and upload operation

Image generation/upload happens before inserting the `daily_logs` row.

```ts
let imageUrl: string | null = null;
try {
    const base64Image = await GeminiService.generateMilestoneImage(
        userInput,
        goalContext.domain || goal.title,
        evaluation.milestone_tier as any,
        aspectRatio
    );

    const imageBuffer = Buffer.from(base64Image, 'base64');
    const filename = `milestone-${goalId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
        .from('milestones')
        .upload(filename, imageBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error("Storage upload error:", uploadError);
    } else {
        const { data: publicUrlData } = supabase.storage
            .from('milestones')
            .getPublicUrl(filename);
        imageUrl = publicUrlData.publicUrl;
    }
} catch (imgError: any) {
    console.warn("Milestone image generation skipped. Reason:", imgError?.message || imgError);
}
```

Technical behavior:

- Image generation or upload failure is non-fatal.
- If image generation/upload fails, `imageUrl` remains `null` and the milestone is still saved.
- The route assumes uploaded content is JPEG.
- Storage path is not saved separately; only public URL is stored in `breakdown.milestone.imageUrl`.

### 5.10 Daily log insert operation

```ts
const { data: logData, error: logError } = await supabase
    .from('daily_logs')
    .insert({
        goal_id: goalId,
        user_input: userInput,
        ai_score: finalScore,
        ai_feedback: evaluation.coaching_message,
        breakdown: breakdownPayload,
    })
    .select('id')
    .single();

if (logError) {
    throw logError;
}
```

### 5.11 Goal points increment operation

```ts
const { error: updateError } = await supabase.rpc('increment_goal_points', {
    goal_uuid: goalId,
    points_to_add: finalScore
});

if (updateError) {
    throw updateError;
}
```

### 5.12 Successful response

```ts
return NextResponse.json({
    status: 'ok',
    tier: evaluation.milestone_tier,
    score: finalScore,
    imageUrl: imageUrl,
    message: evaluation.coaching_message,
    logId: logData.id,
});
```

### 5.13 Exact async operation sequence in `POST`

The actual sequence is:

1. Parse request JSON.
2. Validate required fields using truthiness check.
3. Create Supabase server client.
4. Authenticate user with `supabase.auth.getUser()`.
5. Verify goal ownership via `goals` query.
6. Query all `daily_logs` for goal and count `breakdown.milestone` rows.
7. Call `GeminiService.evaluateMilestone`.
8. If rejected, return HTTP `200` with `status: 'rejected'`.
9. Calculate score cap and final score.
10. Call `GeminiService.generateMilestoneImage`.
11. Convert returned base64 image to Buffer.
12. Upload image Buffer to Supabase Storage bucket `milestones`.
13. Construct public URL using `getPublicUrl`.
14. Construct `breakdownPayload`.
15. Insert `daily_logs` row.
16. Call `increment_goal_points` RPC.
17. Return success JSON.

### 5.14 Transaction/rollback behavior in `POST`

There is no explicit transaction wrapping image upload, `daily_logs` insert, and points increment.

Observed partial-failure cases:

- If image generation/upload fails: route continues and saves milestone with `imageUrl: null`.
- If image upload succeeds but `daily_logs` insert fails: uploaded image is not removed by this route.
- If `daily_logs` insert succeeds but `increment_goal_points` fails: inserted log is not rolled back/deleted by this route.
- If `increment_goal_points` succeeds but response serialization fails after return construction, no rollback exists.

---

## 6. `PATCH /api/goal/milestone` Update Flow

### 6.1 Request fields

```ts
const { logId, goalId, name, description, tier } = await req.json();
```

### 6.2 Required validation

```ts
if (!logId || !goalId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}
```

### 6.3 Tier validation

```ts
const allowedTiers = ['minor', 'major', 'legendary'];
if (tier && !allowedTiers.includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
}
```

### 6.4 Auth and goal ownership check

```ts
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();

if (goalError || !goal) {
    return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
}
```

### 6.5 Fetch target log

```ts
const { data: log, error: fetchError } = await supabase
    .from('daily_logs')
    .select('id, breakdown')
    .eq('id', logId)
    .eq('goal_id', goalId)
    .maybeSingle();

if (fetchError || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
}
```

### 6.6 Milestone object validation and mutation

```ts
const breakdown = (log.breakdown && typeof log.breakdown === 'object') ? { ...(log.breakdown as any) } : {};
if (!breakdown.milestone) {
    return NextResponse.json({ error: 'Log is not a milestone' }, { status: 400 });
}

const updatedMilestone = { ...breakdown.milestone };
if (typeof name === 'string' && name.trim()) updatedMilestone.name = name.trim();
if (typeof description === 'string') {
    updatedMilestone.description = description;
    updatedMilestone.short_description = description.length > 120 ? description.slice(0, 120) + '…' : description;
}
if (tier) updatedMilestone.tier = tier;

breakdown.milestone = updatedMilestone;
```

### 6.7 Update operation

```ts
const { error: updateError } = await supabase
    .from('daily_logs')
    .update({ breakdown })
    .eq('id', logId);

if (updateError) throw updateError;

return NextResponse.json({ status: 'ok', milestone: updatedMilestone });
```

Technical constraints and edge cases:

- `PATCH` only updates `breakdown`, not `ai_score`, `ai_feedback`, or `user_input`.
- Changing `tier` does not recalculate points.
- Updating `description` recomputes `short_description` locally with 120-character truncation rather than using AI.
- No ownership condition is included directly on the final `daily_logs.update`; ownership is checked separately via goal lookup and log `goal_id` lookup.

---

## 7. `DELETE /api/goal/milestone` Delete Flow

### 7.1 Request fields

```ts
const { logId, goalId } = await req.json();

if (!logId || !goalId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}
```

### 7.2 Auth and goal ownership check

```ts
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();

if (goalError || !goal) {
    return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 });
}
```

### 7.3 Fetch log and extract score/image

```ts
const { data: log, error: fetchError } = await supabase
    .from('daily_logs')
    .select('id, ai_score, breakdown')
    .eq('id', logId)
    .eq('goal_id', goalId)
    .maybeSingle();

if (fetchError || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
}

const scoreToRevert = log.ai_score || 0;
let imageUrl = null;
if (log.breakdown && typeof log.breakdown === 'object' && (log.breakdown as any).milestone) {
    imageUrl = (log.breakdown as any).milestone.imageUrl;
}
```

Important edge case:

- Unlike `PATCH`, `DELETE` does not reject non-milestone logs. If a valid non-milestone `daily_logs` row is passed, it can still be deleted by this route. It only conditionally extracts `imageUrl` if milestone metadata exists.

### 7.4 Image deletion logic

```ts
if (imageUrl) {
    try {
        // Extract filename from URL
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        if (filename) {
            await supabase.storage.from('milestones').remove([filename]);
        }
    } catch (e) {
        console.error("Failed to parse or remove image:", e);
        // Non-fatal error, continue deletion
    }
}
```

Technical behavior:

- Image removal failure is non-fatal.
- Only the last pathname segment is used as the storage object key.
- This works only because upload currently stores files at bucket root with filename only.
- The route does not verify the storage remove response/error.

### 7.5 Log deletion operation

```ts
const { error: deleteError } = await supabase
    .from('daily_logs')
    .delete()
    .eq('id', logId);

if (deleteError) {
    throw deleteError;
}
```

### 7.6 Point revert operation

```ts
if (scoreToRevert > 0) {
    const { error: updateError } = await supabase.rpc('increment_goal_points', {
        goal_uuid: goalId,
        points_to_add: -scoreToRevert
    });

    if (updateError) {
        throw updateError;
    }
}
```

### 7.7 Successful response

```ts
return NextResponse.json({ status: 'ok', revertedScore: scoreToRevert });
```

### 7.8 Transaction/rollback behavior in `DELETE`

There is no explicit transaction.

Partial-failure cases:

- If image delete fails, the log deletion continues.
- If log deletion succeeds and point revert RPC fails, the log is gone but goal points are not reverted.
- If point revert succeeds but final response fails, no rollback exists.

---

## 8. AI Service Integration: `src/lib/gemini.ts`

### 8.1 Gemini client initialization

```ts
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
```

The code uses non-null assertion for `GEMINI_API_KEY`; there is no explicit runtime check in this file.

### 8.2 Model fallback chain

```ts
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
];
```

### 8.3 `callWithRetry` exact behavior

```ts
private static async callWithRetry(config: any, content: any): Promise<any> {
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        config,
        contents: [content],
      });
      console.log(`Gemini call succeeded with model: ${model}`);
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.code;

      if (status === 429) {
        console.warn(
          `Model ${model} quota exhausted (429), trying next fallback...`,
        );
        continue;
      }

      if (status === 503) {
        console.warn(`Model ${model} returned 503, retrying once in 3s...`);
        await delay(3000);
        try {
          const retryResponse = await ai.models.generateContent({
            model,
            config,
            contents: [content],
          });
          console.log(`Gemini 503 retry succeeded with model: ${model}`);
          return retryResponse;
        } catch (retryError: any) {
          lastError = retryError;
          const retryStatus = retryError?.status || retryError?.code;
          if (retryStatus === 429) {
            console.warn(
              `Model ${model} hit 429 on 503 retry, trying next fallback...`,
            );
            continue;
          }
          console.warn(
            `Model ${model} failed on 503 retry, trying next fallback...`,
          );
          continue;
        }
      }

      if (status === 404) {
        console.warn(
          `Model ${model} not found (404), trying next fallback...`,
        );
        continue;
      }

      throw error;
    }
  }

  console.error("All Gemini models exhausted their quotas.");
  const errorMsg = lastError?.message || "";
  const retryMatch = errorMsg.match(/retryDelay[":]\s*["']?(\d+)/i);
  const apiRetrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;
  throw new GeminiQuotaError(apiRetrySeconds);
}
```

Timeout behavior:

- There is no explicit timeout controller or abort signal.
- For HTTP/status `503`, it waits 3 seconds and retries once for the same model.
- For `429`, it tries the next fallback model.
- For `404`, it tries the next fallback model.
- Other errors are thrown immediately.
- If all fallback models fail with handled statuses, it throws `GeminiQuotaError`.

### 8.4 `GeminiQuotaError`

```ts
export class GeminiQuotaError extends Error {
  isQuotaExceeded = true;
  retryAfterSeconds: number;
  constructor(retryAfter: number) {
    super("Gemini API quota exceeded");
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfter;
  }
}
```

### 8.5 JSON extraction/parsing

```ts
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const cleanText = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanText);
    } catch {
      const start = cleanText.indexOf("{");
      const end = cleanText.lastIndexOf("}");

      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = cleanText.substring(start, end + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e3: any) {
          throw new Error(
            `Failed to parse extracted JSON: ${e3.message || e3}`,
          );
        }
      }
      throw new Error("No JSON object found in response");
    }
  }
}
```

Parsing behavior:

1. Attempts direct `JSON.parse`.
2. Strips Markdown fences matching `/```json|```/g`, then parses.
3. Extracts substring from first `{` to last `}`, then parses.
4. Throws if all attempts fail.

### 8.6 Safety check before milestone evaluation

```ts
const DANGEROUS_KEYWORDS = [
  "suicide",
  "kill myself",
  "harm myself",
  "end my life",
  "bomb",
  "explosive",
  "detonate",
  "shrapnel",
  "murder",
  "assassinate",
  "kill people",
  "terrorist",
  "terrorism",
  "steal credit card",
  "carding",
  "fraud",
  "manufacture weapon",
  "build gun",
  "child porn",
  "abuse children",
];
```

```ts
private static checkContentSafety(text: string): SafetyCheck {
  const lower = text.toLowerCase();
  for (const kw of DANGEROUS_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        isSafe: false,
        reason:
          "Safety Policy Violation: Request contains prohibited content.",
      };
    }
  }
  return { isSafe: true };
}
```

For `evaluateMilestone`, only `userInput` is safety checked:

```ts
const safetyCheck = GeminiService.checkContentSafety(userInput);
if (!safetyCheck.isSafe) {
  return {
    is_milestone_accepted: false,
    rejection_reason: safetyCheck.reason,
    milestone_tier: "minor",
    suggested_base_points_multiplier: 1,
    coaching_message: safetyCheck.reason,
    safe_redirection: {
      message: safetyCheck.reason,
      alternatives: [
        "Please reach out to professional support if you are in distress.",
      ],
    },
  };
}
```

---

## 9. Exact AI Prompt: `evaluateMilestone`

### 9.1 Function signature

```ts
static async evaluateMilestone(
  goalContext: any,
  tasksDescriptions: string[],
  userInput: string,
  language: "ar" | "en",
)
```

### 9.2 Exact system prompt

```ts
const systemPrompt = `
SYSTEM ROLE:
You are the "Milestone Evaluator" for a goal-tracking app.

Your job:
1. STRICT MATH EVALUATION (IGNORE HYPERBOLE): The user's Goal Title or Description might use extreme, hyperbolic, or metaphorical language for personal motivation (e.g., 'Becoming a machine'). DO NOT use the Goal Title to judge the validity of the milestone.
You MUST base your decision SOLELY on comparing the 'User Claimed Achievement' against their 'Regular Tasks'.
- If the claimed effort is >= 3x the normal task effort, you MUST ACCEPT it.
- If it's < 3x, REJECT it.
2. TONE & MESSAGING: Use the Goal Title and Description ONLY to set the tone, vocabulary, and theme of the \`coaching_message\`. Make it match their specific ambition.
3. NAME GENERATION: Generate a short, epic name for the milestone based on the action performed.
4. CLASSIFY TIER:
   - 'minor' (3x-4x effort)
   - 'major' (5x-9x effort)
   - 'legendary' (10x+ effort)
5. SHORT DESCRIPTION: Generate a concise summary of the user's milestone description in ONE clear sentence (max 18 words). It must capture the core achievement, not motivation.

Respond entirely in ${language === "ar" ? "Arabic" : "English"}.

OUTPUT JSON ONLY:
{
  "is_milestone_accepted": boolean,
  "rejection_reason": "string (if rejected, explain why based on effort comparison)",
  "milestone_tier": "minor" | "major" | "legendary",
  "suggested_base_points_multiplier": number,
  "generated_name": "string (short epic name)",
  "short_description": "string (one-sentence summary of the achievement, max 18 words)",
  "coaching_message": "string (encouraging message if accepted, or explanation if rejected. Match the hyperbole tone)"
}
`;
```

### 9.3 Exact user prompt

```ts
const userPrompt = `
GOAL CONTEXT:
${JSON.stringify(goalContext, null, 2)}

REGULAR TASKS:
${JSON.stringify(tasksDescriptions, null, 2)}

USER MILESTONE CLAIM:
<<<BEGIN_USER_INPUT>>>
${userInput}
<<<END_USER_INPUT>>>
`;
```

### 9.4 Exact Gemini call and parse

```ts
const response = await GeminiService.callWithRetry(
  {
    responseMimeType: "application/json",
    systemInstruction: {
      parts: [{ text: systemPrompt }],
      role: "system",
    },
  },
  { role: "user", parts: [{ text: userPrompt }] },
);

const responseText = response.text || "";
if (!responseText) throw new Error("Empty response from Gemini API");

return extractJson(responseText);
```

### 9.5 Error propagation

```ts
} catch (error) {
  console.error("Gemini evaluateMilestone Error:", error);
  throw error;
}
```

Errors from parsing, empty response, or `callWithRetry` are propagated to the milestone API route.

---

## 10. Exact AI Image Prompt: `generateMilestoneImage`

### 10.1 Function signature

```ts
static async generateMilestoneImage(
  userInput: string,
  goalDomain: string,
  milestoneTier: "minor" | "major" | "legendary",
  aspectRatio: "1:1" | "4:3" | "16:9" | "9:16" | "3:4" = "1:1",
)
```

### 10.2 Exact prompt

```ts
const prompt = `A purely abstract, breathtaking Cyberpunk or Matrix-style digital art representing a ${milestoneTier} milestone achievement in the domain of ${goalDomain}. The vibe should be epic, futuristic, and triumphant. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS in the image. Purely visual abstract art. Context of achievement: ${userInput}`;
```

### 10.3 Exact image generation call

```ts
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: prompt,
  config: {
    responseModalities: ["Image"],
    imageConfig: { aspectRatio },
  } as any,
});
```

### 10.4 Extracting returned image bytes

```ts
const parts = response.candidates?.[0]?.content?.parts ?? [];
for (const part of parts) {
  if (part.inlineData?.data) {
    console.log(`Image generated, mimeType: ${part.inlineData.mimeType}`);
    return part.inlineData.data;
  }
}
console.warn(
  "gemini-2.5-flash-image returned no image parts. Parts:",
  JSON.stringify(parts.map((p: any) => Object.keys(p))),
);
throw new Error("No image bytes returned from gemini-2.5-flash-image");
```

### 10.5 Image generation error propagation

```ts
} catch (error: any) {
  console.error(
    "Gemini generateMilestoneImage Error:",
    error?.message || error,
  );
  throw error;
}
```

The milestone API catches image-generation errors separately and treats them as non-fatal.

---

## 11. Storage Implementation

### 11.1 Upload bucket

The upload uses Supabase Storage bucket:

```ts
.from('milestones')
```

### 11.2 Exact upload code

```ts
const imageBuffer = Buffer.from(base64Image, 'base64');
const filename = `milestone-${goalId}-${Date.now()}.jpg`;

const { error: uploadError } = await supabase.storage
    .from('milestones')
    .upload(filename, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
    });
```

### 11.3 Public URL construction

```ts
const { data: publicUrlData } = supabase.storage
    .from('milestones')
    .getPublicUrl(filename);
imageUrl = publicUrlData.publicUrl;
```

Technical detail:

- The stored JSON contains the public URL, not the storage path.
- The upload path is exactly `filename` at bucket root.

### 11.4 Deletion implementation

From `DELETE /api/goal/milestone`:

```ts
if (imageUrl) {
    try {
        // Extract filename from URL
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        if (filename) {
            await supabase.storage.from('milestones').remove([filename]);
        }
    } catch (e) {
        console.error("Failed to parse or remove image:", e);
        // Non-fatal error, continue deletion
    }
}
```

Storage edge cases:

- If `imageUrl` is malformed, deletion continues.
- If `.remove()` returns an error, it is not inspected because the result is not assigned.
- If storage files are later moved into folders, extracting only the last pathname segment will be insufficient.

---

## 12. Frontend: `ProgressLogDialog.tsx`

### 12.1 Milestone-specific state

```ts
const [milestoneName, setMilestoneName] = useState('');
const [milestoneAspectRatio, setMilestoneAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
```

Milestone shares general modal state:

```ts
const [mode, setMode] = useState<LogMode>('select');
const [logText, setLogText] = useState('');
const [loading, setLoading] = useState(false);
const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
const [notification, setNotification] = useState<{ type: 'error' | 'warning', message: string } | null>(null);
```

### 12.2 Mode selection UI

```tsx
<button
    onClick={() => setMode('milestone')}
    className="w-full p-5 bg-purple-500/5 border-2 border-purple-500/20 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/40 transition-all active:scale-[0.98]"
>
    <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-500/15 rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-purple-500" />
        </div>
        <div className="flex-1 text-start">
            <h4 className="font-bold text-foreground text-base mb-0.5">{language === 'ar' ? 'إنجاز كبير (Milestone)' : 'Major Milestone'}</h4>
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'سجل إنجازاً استثنائياً كبيراً لتحصل على مكافأة ضخمة' : 'Log an exceptional achievement for massive points'}</p>
        </div>
    </div>
</button>
```

### 12.3 Milestone submit handler

```ts
const handleMilestoneSubmit = async () => {
    if (!logText.trim() || !milestoneName.trim()) return;

    setLoading(true);
    setNotification(null);

    try {
        const res = await fetch('/api/goal/milestone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goalId: goal.id,
                userInput: logText,
                milestoneName,
                targetPoints: goal.target_points || 0,
                dailyCap,
                aspectRatio: milestoneAspectRatio,
                tasksDescriptions: tasks.map(t => t.task_description),
                goalContext: goal,
                language
            })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || data.error || 'Failed to evaluate milestone');
        }

        if (data.status === 'rejected') {
            setNotification({
                type: 'error',
                message: data.message || 'Milestone rejected'
            });
            return;
        }

        // Milestone accepted
        const milestoneResult: EvaluationResult = {
            total_points_awarded: data.score,
            base_points: data.score,
            bonus_points: 0,
            coach_message: data.message,
        };

        setEvaluation(milestoneResult);
        
        const currentPoints = (goal.current_points || 0) + data.score;
        if (goal.target_points && currentPoints >= goal.target_points) {
            setShowCelebration(true);
        } else {
            setMode('ai'); // Switch to results view style (will use evaluation)
        }
        
        window.dispatchEvent(new CustomEvent('challenge-log-updated', { detail: { goalId: goal.id } }));
    } catch (error: any) {
        console.error('Milestone submit error:', error);
        setNotification({
            type: 'error',
            message: error.message || (language === 'ar' ? 'فشل إرسال الإنجاز' : 'Failed to submit milestone.')
        });
    } finally {
        setLoading(false);
    }
};
```

### 12.4 Loading state during long AI/image generation

Loading behavior is managed with one boolean:

- Set to `true` immediately before `fetch('/api/goal/milestone')`.
- Used to disable the submit button.
- Used to show `Loader2` spinner inside the submit button.
- Reset to `false` in `finally`, regardless of success, rejection, or error.

Submit button code:

```tsx
<button
    onClick={handleMilestoneSubmit}
    disabled={loading || !logText.trim() || !milestoneName.trim()}
    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20 mt-4"
>
    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Trophy className="w-5 h-5" /> {language === 'ar' ? 'سجل الإنجاز الكبير' : 'Log Major Milestone'}</>}
</button>
```

Technical constraints:

- There is no progress phase indicator for AI evaluation vs image generation vs DB save.
- There is no client-side request abort/cancel handling.
- The modal close button remains available while `loading` is true.
- Duplicate submit is blocked only by React state disabling the button; no idempotency key exists server-side.

### 12.5 Milestone input UI constraints

The UI permits aspect ratios:

```ts
['1:1', '16:9', '9:16']
```

But API route does not independently validate `aspectRatio`.

Textarea uses shared `logText` state:

```tsx
<textarea
    value={logText}
    onChange={(e) => setLogText(e.target.value)}
    placeholder={language === 'ar' ? 'اشرح بالتفصيل لماذا يعتبر هذا الإنجاز قفزة استثنائية في هدفك...' : 'Explain in detail why this is an exceptional leap in your goal...'}
    className="w-full h-32 p-4 border-2 rounded-2xl resize-none transition-all placeholder:text-muted-foreground bg-muted/30 text-foreground border-transparent focus:border-purple-500"
/>
```

---

## 13. Frontend Display: `ActivityCard.tsx`

### 13.1 Type definition for milestone events

From `src/components/challenge/challenge-types.ts`:

```ts
export interface ChallengeEvent {
  actor: 'me' | 'opponent';
  points: number;
  createdAt: string;
  logId?: string;
  milestone?: {
    tier: 'minor' | 'major' | 'legendary';
    imageUrl: string;
    name: string;
    description: string;
    short_description?: string;
  };
}
```

Note: the API can set `imageUrl` to `null`, but this TypeScript interface declares it as `string`.

### 13.2 Filtering milestone events

```ts
const milestoneEvents = recentEvents.filter(e => e.milestone);
```

Only events with a truthy `milestone` object are rendered.

### 13.3 Component collapsed state

```ts
const [collapsed, setCollapsed] = useState(true);
```

The section is collapsed by default.

### 13.4 Header count display

```tsx
{milestoneEvents.length > 0 && (
  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-400 ring-1 ring-amber-500/20">
    {milestoneEvents.length}/2
  </span>
)}
```

The UI displays count relative to the hard-coded per-goal maximum of 2.

### 13.5 Tier visual configuration

```ts
const tierConfig: Record<Tier, {
  gradient: string;
  border: string;
  glow: string;
  badge: string;
  icon: string;
  label: { ar: string; en: string };
  Icon: typeof Star;
}> = {
  minor: {
    gradient: 'from-blue-600/25 via-indigo-500/20 to-violet-600/25',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    icon: 'text-blue-400',
    label: { ar: 'إنجاز', en: 'Achievement' },
    Icon: Star,
  },
  major: {
    gradient: 'from-violet-600/30 via-fuchsia-500/25 to-pink-600/30',
    border: 'border-fuchsia-500/50',
    glow: 'shadow-fuchsia-500/25',
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    icon: 'text-fuchsia-400',
    label: { ar: 'إنجاز كبير', en: 'Major Achievement' },
    Icon: Flame,
  },
  legendary: {
    gradient: 'from-amber-500/35 via-orange-500/25 to-rose-600/30',
    border: 'border-amber-500/60',
    glow: 'shadow-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    icon: 'text-amber-400',
    label: { ar: 'إنجاز أسطوري', en: 'Legendary' },
    Icon: Zap,
  },
};
```

### 13.6 Rendering each milestone card

Key data extraction:

```ts
const tier = (event.milestone!.tier || 'minor') as Tier;
const cfg = tierConfig[tier] ?? tierConfig.minor;
const TierIcon = cfg.Icon;
const actorIsMe = event.actor === 'me';
const actorName = actorIsMe ? meName : opponentName;
const logId = event.logId || `${event.actor}-${event.createdAt}-${index}`;
const displayDesc = event.milestone!.short_description?.trim() || event.milestone!.description;
```

Image rendering:

```tsx
{event.milestone!.imageUrl ? (
  <img
    src={event.milestone!.imageUrl}
    alt={event.milestone!.name}
    className="w-full h-full object-cover"
  />
) : (
  <div className={cn('flex h-full w-full items-center justify-center', cfg.icon)}>
    <TierIcon className="h-6 w-6" />
  </div>
)}
```

Points badge:

```tsx
<div className={cn('absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums', actorIsMe ? 'bg-chart-2/80 text-chart-2' : 'bg-chart-5/80 text-chart-5')}>
  +{numberFormatter.format(event.points)}
</div>
```

Title/description rendering:

```tsx
<h4 className="text-[11px] font-black text-foreground leading-tight line-clamp-2">{event.milestone!.name}</h4>
<p className="line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">{displayDesc}</p>
```

### 13.7 Edit/delete menu visibility

Edit menu only appears when the event belongs to the current user and has `event.logId`:

```tsx
{actorIsMe && event.logId && (
  <div className="relative">
    ...
  </div>
)}
```

### 13.8 PATCH calls from UI

```ts
const handlePatch = async (logId: string, payload: { name?: string; description?: string; tier?: Tier }) => {
  if (!goalId) return;
  setBusyId(logId);
  try {
    await fetch('/api/goal/milestone', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, goalId, ...payload }),
    });
    refresh();
  } catch (e) { console.error(e); }
  finally {
    setBusyId(null);
    closeAllMenus();
    setEditMode(null);
  }
};
```

Important behavior:

- The frontend does not inspect `res.ok` for PATCH.
- It calls `refresh()` even if the server responds with an error status, unless `fetch` itself throws.

### 13.9 DELETE calls from UI

```ts
const handleDelete = async (logId: string) => {
  if (!goalId) return;
  setBusyId(logId);
  try {
    await fetch('/api/goal/milestone', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, goalId }),
    });
    refresh();
  } catch (e) { console.error(e); }
  finally {
    setBusyId(null);
    setConfirmDeleteId(null);
  }
};
```

Important behavior:

- The frontend does not inspect `res.ok` for DELETE.
- It calls `refresh()` even if the server responds with an error status, unless `fetch` itself throws.

### 13.10 Refresh event

```ts
const refresh = () => {
  if (goalId) {
    window.dispatchEvent(new CustomEvent('challenge-log-updated', { detail: { goalId } }));
  }
};
```

---

## 14. Challenge API Milestone Extraction

From `src/app/api/challenges/by-goal/route.ts`, recent milestone-capable events are pulled from `daily_logs`:

```ts
let query = supabase
  .from('daily_logs')
  .select('id, created_at, ai_score, breakdown')
  .eq('goal_id', participant.goal_id)
  .gte('created_at', participant.joined_at)
  .order('created_at', { ascending: false })
  .limit(20);

// For "me", show all milestones — including ones submitted after the challenge ended.
// For "opponent", limit to challenge timeframe (post-challenge activity is irrelevant).
if (challengeEndedAt && actor === 'opponent') {
  query = query.lte('created_at', challengeEndedAt);
}
```

Then milestone data is extracted:

```ts
return (data || []).map((row: { id: string; created_at: string; ai_score: number; breakdown: any }) => {
  let milestone;
  if (row.breakdown && typeof row.breakdown === 'object') {
    milestone = row.breakdown.milestone;
  }
  return {
    logId: row.id,
    actor,
    points: row.ai_score || 0,
    createdAt: row.created_at,
    milestone,
  };
});
```

Technical behavior:

- This API returns both normal and milestone events, but `ActivityCard` filters only milestone events.
- For current user after a challenge ended, milestones after challenge end are still shown.
- For opponent after challenge end, events are limited to `created_at <= challengeEndedAt`.

---

## 15. Current Security/Structural Review Findings

### 15.1 Missing SQL migration visibility

The codebase does not contain the SQL implementation of `increment_goal_points`, RLS policies, table schemas, or storage bucket policies. These must be reviewed directly in Supabase.

### 15.2 No transaction around milestone create

`POST` combines independent async operations:

1. AI evaluation.
2. Optional image generation/upload.
3. `daily_logs` insert.
4. RPC point increment.

No transaction/rollback mechanism coordinates the DB insert and points increment.

### 15.3 Possible orphan storage object

If image upload succeeds and `daily_logs` insert fails, uploaded image is not removed.

### 15.4 Possible orphan log or point mismatch

If `daily_logs` insert succeeds but `increment_goal_points` fails, milestone log remains without corresponding goal point increment.

If `DELETE` removes the log but point revert fails, points remain inflated.

### 15.5 Milestone limit is application-level only

The `2` milestone limit is enforced by a non-transactional read/filter check in the route. Concurrent requests may bypass it unless Supabase constraints/RPCs enforce it elsewhere.

### 15.6 `DELETE` route can delete non-milestone logs

`PATCH` verifies `breakdown.milestone`, but `DELETE` does not reject non-milestone logs before deletion. It fetches any `daily_logs` row matching `logId` and `goalId`, then deletes it.

### 15.7 API route has limited input validation

The route uses truthiness checks and does not validate:

- numeric range of `targetPoints` or `dailyCap`;
- numeric type of AI-returned multiplier;
- `language` enum;
- `aspectRatio` enum;
- max length of `userInput` or `milestoneName`;
- structure of `goalContext` or `tasksDescriptions`.

### 15.8 Gemini output is trusted for scoring fields

`evaluation.suggested_base_points_multiplier` is used directly if truthy:

```ts
const calculatedScore = (evaluation.suggested_base_points_multiplier || multiplier) * dailyCap;
```

No local clamp validates it against the tier.

### 15.9 Frontend PATCH/DELETE does not inspect HTTP status

`ActivityCard` calls `fetch` for `PATCH` and `DELETE`, then refreshes UI without checking `res.ok`.

### 15.10 Type mismatch for `imageUrl`

`ChallengeEvent.milestone.imageUrl` is typed as `string`, but the backend can store and return `null`.

### 15.11 No server-side idempotency key

Milestone POST has no idempotency key or duplicate submission guard. UI disables the submit button during loading, but server-side duplicate prevention is only the non-transactional count limit.

---

## 16. Exact End-to-End Create Sequence

Current create path, in exact implemented order:

1. User selects `mode = 'milestone'` in `ProgressLogDialog`.
2. User fills `milestoneName`, `logText`, and `milestoneAspectRatio`.
3. `handleMilestoneSubmit` returns early if name or text is blank.
4. Frontend sets `loading = true`.
5. Frontend posts JSON to `/api/goal/milestone`.
6. API checks required fields using truthiness.
7. API authenticates via Supabase `getUser()`.
8. API verifies goal ownership from `goals`.
9. API fetches all `daily_logs` for the goal and counts `breakdown.milestone` rows.
10. API calls Gemini milestone evaluation.
11. If rejected, API returns HTTP `200` with `status: 'rejected'`.
12. If accepted, API computes `finalScore` using tier caps.
13. API attempts Gemini image generation.
14. API attempts Supabase Storage upload.
15. API stores public image URL if upload succeeds.
16. API inserts `daily_logs` row with `breakdown.milestone`.
17. API calls `increment_goal_points` with `finalScore`.
18. API returns `{ status: 'ok', tier, score, imageUrl, message, logId }`.
19. Frontend sets `evaluation` from API response.
20. Frontend checks if goal completion celebration should show.
21. Frontend dispatches `challenge-log-updated`.
22. Challenge UI refetches and `ActivityCard` renders rows with `event.milestone`.

---

## 17. Open Questions For Senior Review

1. What is the exact SQL definition of `increment_goal_points`?
2. Does the RPC clamp points or enforce ownership/security?
3. Are RLS policies on `daily_logs`, `goals`, and Storage bucket `milestones` sufficient?
4. Should milestone creation be moved into a single Postgres RPC/transaction?
5. Should Storage object path be saved separately from `imageUrl`?
6. Should milestone count be enforced by a DB constraint or transactional function?
7. Should `DELETE /api/goal/milestone` reject non-milestone logs?
8. Should AI multipliers be clamped server-side according to tier?
9. Should the API validate `aspectRatio`, `language`, payload length, and numeric ranges?
10. Should frontend PATCH/DELETE inspect `res.ok` and surface failures?
