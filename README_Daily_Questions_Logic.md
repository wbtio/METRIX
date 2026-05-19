# README: Daily Questions & Recommendation Engine — Architecture Analysis

---

## 1. Current Code & Prompt Location

### 1a. Daily Focus Question — Primary Prompt

**File:** `src/lib/gemini.ts:779` — Inside `GeminiService.generateDailyFocus()`

The **system prompt** (lines 779–867) is titled **"Plan Feedback Strategist"**. Its key characteristics:

- **Role:** Produce exactly one diagnostic question per day that helps improve future task suggestions and accelerates the user's goal path.
- **Content:** Question must be SPECIFIC, reference actual tasks/recent logs/goal description — never generic.
- **Format:** 1 opening line + 3–5 bullet points using `•` under the same topic.
- **Non-repetition:** Must NOT repeat a previous daily question or topic from PREVIOUS DAILY FEEDBACK ANSWERS. It compares 5–8 keyword fingerprints against history.
- **Language:** Responds in Iraqi Arabic dialect or English.
- **Angle selection:** One of 6 angles picked deterministically via `hashSeed()`: *Method Fit, Yesterday Review, Task Value, Obstacle, Evidence, Sustainability*.
- **Suggestions:** Generates 2–4 `suggestions` (actionable tasks) when enough answer history exists, classified as `goal_task` or `external_booster`.

**Triggering prompt (user prompt, lines 869–929):**

Sends to Gemini:
- DATE, ANGLE HINT
- ANSWER HISTORY COUNT, REQUIRED ANSWER DAYS
- GOAL context (id, title, ai_summary, current/target points)
- MAIN TASK OPTIONS (for `parent_task_id` references)
- CURRENT TASK MAP (full hierarchy)
- RECENT LOGS (last 8 logs)
- PREVIOUS DAILY FEEDBACK ANSWERS (last 12)
- PREVIOUS QUESTION TEXTS (for dedup)
- EXISTING QUESTION (if re-answering)
- USER_ANSWER (if provided)

### 1b. Which API Route Handles Generation

**File:** `src/app/api/goal/daily-focus/route.ts`

- **Method:** POST
- **Endpoint:** `/api/goal/daily-focus`
- **Input:** `{ goal, tasks, logs, history, answer, existingQuestion, date, language }`
- **Handler:** Calls `GeminiService.generateDailyFocus(...)` and returns the result.
- **Error handling:** Catches `GeminiQuotaError` (429) and generic failures (500).

### 1c. Client-Side Orchestration

**File:** `src/components/dashboard/Dashboard.tsx:566` — `generateDailyFocus()` function

Fetches `/api/goal/daily-focus`, normalizes the result, upserts to `daily_focus_answers` table, and builds the session state.

Two UI entry points display the question:
1. **`DailyFocusQuestionDialog.tsx`** — A bottom-sheet / centered modal (auto-shown once per day).
2. **`DailyFocusPanel.tsx`** — An inline panel inside the Focus tab showing question + suggestions + history.

---

## 2. Data Storage (Database Schema)

### 2a. `daily_focus_answers` — Where questions & answers live

Used by `Dashboard.tsx:487` via Supabase query:
```ts
supabase.from('daily_focus_answers').select(
  "id, goal_id, user_id, prompt_date, angle_label, question, question_why, answer, answer_coaching, suggestions, created_at, updated_at, answered_at"
)
```

**Columns (inferred from code + types):**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `goal_id` | UUID (FK → goals) | Which goal this entry belongs to |
| `user_id` | UUID (FK → auth.users) | The user (set automatically via RLS) |
| `prompt_date` | DATE (string) | Unique per goal: `YYYY-MM-DD` |
| `angle_label` | TEXT | The angle category (e.g. "Obstacle", "Method Fit") |
| `question` | TEXT | The AI-generated question |
| `question_why` | TEXT | Explanation of why this question matters today |
| `answer` | TEXT | User's answer (nullable until answered) |
| `answer_coaching` | TEXT | Coach line reacting to the answer |
| `suggestions` | JSONB | Array of suggestion objects (`DailyFocusSuggestion[]`) |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |
| `answered_at` | TIMESTAMPTZ | When the user submitted their answer |

**Conflict strategy:** `upsert` with `onConflict: "goal_id,prompt_date"` — one entry per goal per day.

### 2b. `daily_logs` — Daily progress logs

Used extensively for scoring, streak, chart data, and as context for daily focus.

**Columns (from `Dashboard.tsx:389`, `ProgressLogDialog.tsx`, `DailyLogModal.tsx`):**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `goal_id` | UUID (FK → goals) | Which goal |
| `created_at` | TIMESTAMPTZ | When logged |
| `user_input` | TEXT | Raw user log text |
| `ai_score` | INTEGER | Points awarded (sum of subtask points + bonus) |
| `ai_feedback` | TEXT | Coach message from the AI or manual analysis |
| `breakdown` | JSONB | `DailyLogBreakdownPayload` — per-task breakdown + performance_meta |

Previous logs are fetched as context for daily focus generation (`compactDailyFocusLogs()`) and for AI evaluation.

### 2c. `goals` — Goal level data

Relevant columns used as context:

| Column | Type |
|---|---|
| `id` | UUID |
| `title` | TEXT |
| `ai_summary` | TEXT |
| `current_points` | INTEGER |
| `target_points` | INTEGER |
| `created_at` | TIMESTAMPTZ |
| `is_pinned` | BOOLEAN |

### 2d. `sub_layers` — Task hierarchy

| Column | Type |
|---|---|
| `id` | UUID |
| `goal_id` | UUID (FK → goals) |
| `task_description` | TEXT |
| `task_type` | TEXT (`main` or `sub`) |
| `parent_task_id` | UUID (nullable, self-ref FK) |
| `impact_weight` | INTEGER (1-10 for main, 1-5 for sub) |
| `frequency` | TEXT (`daily` or `weekly`) |
| `time_required_minutes` | INTEGER |
| `icon` | TEXT (emoji) |
| `accent_color` | TEXT (nullable) |
| `sort_order` | INTEGER |

### 2e. Additional Tables

| Table | Purpose |
|---|---|
| `task_checkins` | Tracks per-period task completion status |
| `user_settings` | `telegram_chat_id`, `language`, `reminders_enabled` |
| `goal_reminders` | `reminder_time`, `reminder_count`, `timezone`, `enabled` per goal |
| `telegram_reminder_logs` | Deduplication: `(user_id, goal_id, sequence, reminder_date)` |
| `telegram_chat_sessions` | Active Telegram coaching sessions with message history |
| `challenges` | Challenge/goal-completion data |

### 2f. How Past Answers Are Referenced

In `generateDailyFocus()` (gemini.ts:914-920), the **previous 12 answered daily focus rows** are passed as `PREVIOUS DAILY FEEDBACK ANSWERS` and `PREVIOUS QUESTION TEXTS` to the AI. The system prompt explicitly says:

> *"Do not repeat a previous daily question or the same underlying topic from PREVIOUS DAILY FEEDBACK ANSWERS."*

The history is built by `buildDailyFocusHistory()` in `daily-focus.ts:309` — filters rows that have `answer` and `answered_at`, sorted by date.

---

## 3. The Current Recommendation / Motivation Flow

### 3a. Suggestions (Inline with Daily Focus)

There is **no separate motivation function**. Recommendations are generated **as part of the same Gemini call** that creates the daily question. The `suggestions` field in the Gemini output contains 0–4 `DailyFocusSuggestion` objects (defined in `daily-focus.ts:48`):

```typescript
interface DailyFocusSuggestion {
  id: string;
  title: string;
  reason: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  impact_weight: number;
  target_type: 'main' | 'sub';
  parent_task_id: string | null;
  support_type: 'goal_task' | 'external_booster';
}
```

- `goal_task` = belongs inside the goal plan
- `external_booster` = outside the goal but indirectly helps

Suggestions are **unlocked** only when `answered_days_count >= REQUIRED_ANSWER_DAYS` (currently set to `1`).

The user can click "Add" on any suggestion, which creates it as a real task row in `sub_layers`.

### 3b. Daily Log Coach Message (Motivational Feedback)

**File:** `src/lib/gemini.ts:1081` — `evaluateDailyLog()` — The **"Daily Judge"** prompt.

This is a separate Gemini call triggered when the user submits a progress log. It produces:
- `coach_message` — Short motivational/reflective message (e.g., "Strong Day. You covered 80%...")
- `comparison_with_previous` — Comparison against recent performance
- `full_feedback` — Combined feedback string

The client-side `analyzeDailyPerformance()` in `daily-log-feedback.ts:425` also generates deterministic labels:
- Performance tiers: `exceptional`, `strong`, `average`, `weak`
- Localized day labels, comparison messages, warning messages
- Accountability index scoring (0–1) based on completion ratio, coverage, evidence, bonus

### 3c. Answer Coaching

When a user answers the daily focus question, the `answer_coaching` field is generated by the same Gemini call (the prompt says: *"answer_coaching should become a short coach line that reacts to the answer"*). Stored in `daily_focus_answers.answer_coaching` and displayed in the UI.

### 3d. Goal Chat AI (Conversational Coach)

**File:** `src/lib/gemini.ts:1362` — `chatAboutGoal()`

A separate Gemini-powered chat that lets the user talk about their goal. Uses a system prompt (lines 1390–1420) scoped strictly to the goal title, points, and start date. No connection to daily focus answers or suggestions.

### 3e. Telegram Reminders

**No AI involved.** Hardcoded 5-level escalation messages in English and Arabic, fired every 30 minutes after the user's configured reminder time if no daily log exists yet.

Processed by:
- **Edge Function:** `supabase/functions/telegram-reminder/index.ts` (cron via Supabase)
- **Server route:** `src/app/api/telegram/reminders/cron/route.ts`
- **Manual trigger:** `src/app/api/telegram/reminders/run/route.ts`

---

## 4. Summary of Gaps for Overhaul

| Area | Current State |
|---|---|
| **"Why" discovery** | No explicit prompt target — angles rotated blindly via `hashSeed()` |
| **Obstacle surfacing** | One of 6 angles, not systematic |
| **Emotional drivers** | Not addressed |
| **Recommendation depth** | Suggestions are task-level, not psychological/motivational |
| **History leverage** | Only last 12 Q&A pairs sent — no semantic clustering or pattern analysis |
| **Personalization** | No user model / persona — treats every user identically given same data |
| **Motivation engine** | No separate motivation prompt — purely from `answer_coaching` and `coach_message` |
| **Action steps** | Suggestions derive from task gaps, not from user psychology |
