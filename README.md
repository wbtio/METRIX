# METRIX

## Project Title & Badges
[[**METRIX** is an AI-powered goal tracking application built with Next.js, Supabase, Gemini, and Mistral.

![Next.js](https://img.shields.io/badge/Next.js-16.1.4-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![Mistral](https://img.shields.io/badge/AI-Mistral-FF7000)
![License](https://img.shields.io/badge/License-Unspecified-lightgrey)]]

## Project Overview
[[METRIX converts high-level goals into a structured execution loop:

1. Understand the goal with AI (`/api/goal/investigate`).
2. Generate an actionable hierarchical plan (`/api/goal/plan`).
3. Score daily progress against subtasks (`/api/goal/evaluate`).
4. Visualize growth with analytics and weekly summaries (`/api/analytics`, `/api/weekly-summary`).
5. Compete in goal-based 1v1 challenges (`/api/challenges/*`).

The product targets consistency, realism, and measurable progress, with Arabic and English support, voice input, and Google OAuth authentication through Supabase.]]

## Key Features
[[1. AI goal investigation with safety checks and iterative clarification.
2. AI plan generation with a two-level hierarchy (`main_tasks` and `subtasks`) and speed-up options.
3. Daily AI judging that scores subtasks by impact weight and applies anti-gaming rules.
4. Dynamic daily point caps computed from subtask weights.
5. Weekly summary generation via Mistral with caching and deterministic fallback summary for zero-score weeks.
6. Advanced analytics with one-hour server cache and on-demand refresh.
7. Full goal/task CRUD: add/edit/delete main tasks and subtasks, task check-ins by period, emoji/icon assignment.
8. 1v1 challenge system with invite codes, status transitions (`none`, `pending`, `active`, `ended`), and live scoreboard slices (`today`, `last7Days`, `total`).
9. Voice-to-text logging pipeline using Mistral transcription with browser speech-recognition fallback.
10. Browser streak reminders using Notification API and periodic background checks.
11. Localization support (`en`, `ar`) with runtime direction switching (`ltr`/`rtl`).
12. Theme support (light/dark) persisted in `localStorage`.
13. Google OAuth login and middleware route protection.
14. Responsive UI based on Tailwind v4 + shadcn/ui + Radix primitives.]]

## Tech Stack
[[**Frontend**
- Next.js 16.1.4 (App Router)
- React 19.2.3
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Radix UI primitives
- Lucide icons
- Recharts charts
- emoji-picker-react

**Backend / Data**
- Next.js Route Handlers (`src/app/api/**`)
- Supabase:
  - Postgres tables (goals, sub_layers, daily_logs, etc.)
  - Auth (Google OAuth)
  - Storage bucket (`avatars`)
  - RPC functions (`increment_goal_points`, challenge RPCs)

**AI**
- Google Gemini (`@google/genai`) for investigate/plan/evaluate phases.
- Mistral API for:
  - Weekly summary generation (`mistral-small-latest`)
  - Audio transcription (`voxtral-mini-transcribe-v2`)

**Tooling**
- ESLint 9 + `eslint-config-next`
- PostCSS via `@tailwindcss/postcss`
- npm lockfile (`package-lock.json`)]]

## Project Structure
[[```text
METRIX/
├── .agents/
│   └── skills/
│       └── find-skills/
│           └── SKILL.md                  # Local agent-skill metadata (not app runtime logic)
├── .env.local                            # Local environment variables (gitignored)
├── .gitignore
├── COMPONENT_REFACTORING.md             # Internal refactor report
├── COMPONENTS_STATUS.md                 # Component status report
├── VOICE_TRANSCRIPTION.md               # Voice feature notes
├── debug.log                            # Browser/dev debug output snapshots
├── components.json                      # shadcn/ui config
├── eslint.config.mjs
├── next.config.ts                       # Next config, reactCompiler, turbopack root
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── skills-lock.json                     # Agent skill lock metadata
├── tsconfig.json
├── tsconfig.tsbuildinfo                 # TS incremental artifact
├── next-env.d.ts                        # Next generated typing stub
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── logo1.svg
│   ├── logo2.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── patterns/
│       └── waves.svg
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── analytics/route.ts
    │   │   ├── transcribe/route.ts
    │   │   ├── weekly-summary/route.ts
    │   │   ├── goal/
    │   │   │   ├── evaluate/route.ts
    │   │   │   ├── investigate/route.ts
    │   │   │   └── plan/route.ts
    │   │   └── challenges/
    │   │       ├── by-goal/route.ts
    │   │       ├── create/route.ts
    │   │       ├── end/route.ts
    │   │       ├── join/route.ts
    │   │       └── shared.ts
    │   ├── auth/callback/route.ts       # Supabase OAuth callback exchange
    │   ├── login/page.tsx               # Google sign-in page
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx                     # Main client shell routing Home/Goals/Settings/Dashboard
    ├── components/
    │   ├── ActivityHistory.tsx
    │   ├── AdvancedAnalytics.tsx
    │   ├── AppSidebar.tsx               # Present but not used in current main page flow
    │   ├── ChallengeTab.tsx
    │   ├── ConfirmModal.tsx
    │   ├── DailyLogModal.tsx
    │   ├── Dashboard.tsx
    │   ├── FullEmojiPicker.tsx
    │   ├── GoalCreator.tsx
    │   ├── GoalInput.tsx
    │   ├── GoalTemplates.tsx            # Exported but currently not mounted
    │   ├── GoalsList.tsx
    │   ├── GrowthChart.tsx
    │   ├── HomePage.tsx
    │   ├── IconPicker.tsx
    │   ├── ManualGoalCreator.tsx
    │   ├── OrbitDock.tsx
    │   ├── OrbitShell.tsx
    │   ├── SettingsPage.tsx
    │   ├── StreakFlame.tsx
    │   ├── ThemeToggle.tsx
    │   ├── VoiceRecorder.tsx
    │   ├── WeeklySummaryCard.tsx
    │   └── ui/
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── chart.tsx
    │       ├── collapsible.tsx
    │       ├── dialog.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx
    │       ├── popover.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       └── tooltip.tsx
    ├── hooks/
    │   ├── use-mobile.ts
    │   └── useStreakReminder.ts
    ├── lib/
    │   ├── gemini.ts
    │   ├── task-hierarchy.ts
    │   ├── task-periods.ts
    │   ├── translations.ts
    │   └── utils.ts
    ├── middleware.ts
    └── utils/
        └── supabase/
            ├── client.ts
            └── server.ts

Generated directories present locally:
- `.next/` (build and dev artifacts)
- `node_modules/` (dependencies)
```]]

## Prerequisites
[[1. Node.js 20+ and npm.
2. A Supabase project with:
   - Google OAuth configured.
   - Required tables and RPC functions (listed below in Installation).
   - Optional `avatars` storage bucket for profile images.
3. API keys:
   - `GEMINI_API_KEY`
   - `MISTRAL_API_KEY`
4. Modern browser for full client features:
   - MediaRecorder/Web Speech (voice input fallback)
   - Notification API (streak reminders)]]

## Installation & Setup
[[1. Install dependencies:
```bash
npm install
```

2. Create a local env file named `.env.local` in the project root and add the variables listed in the Environment Variables section.

3. Ensure Supabase schema contains these runtime entities:
- Tables: `goals`, `sub_layers`, `daily_logs`, `task_checkins`, `analytics_cache`, `weekly_summaries`, `challenge_rooms`, `challenge_participants`
- RPC functions: `increment_goal_points`, `create_goal_challenge`, `join_goal_challenge`, `end_goal_challenge`
- Storage bucket: `avatars` (optional but used by profile photo upload)
- Deletion behavior: child rows are expected to cascade from `goals` (as assumed by `GoalsList.tsx` delete flow).

4. Start the app:
```bash
npm run dev
```

5. Open:
```text
http://localhost:3000
```

6. Sign in with Google at `/login` and complete OAuth callback flow (`/auth/callback`).]]

## Environment Variables
[[The codebase currently references exactly these variables:

| Variable | Required | Used In | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase client/server, middleware, auth callback | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client/server, middleware, auth callback | Supabase anon key for SSR/browser auth sessions |
| `GEMINI_API_KEY` | Yes | `src/lib/gemini.ts` | Gemini API key for investigate/plan/evaluate |
| `MISTRAL_API_KEY` | Yes for weekly summary, optional fallback for transcription | `/api/weekly-summary`, `/api/transcribe` | Mistral API key for weekly summaries and transcription |

Example `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
```]]

## How to Run
[[**Development**
```bash
npm run dev
```

**Production build**
```bash
npm run build
npm run start
```

**Linting**
```bash
npm run lint
```

**Testing**
- There is currently no automated test script in `package.json`.
- Current verification is lint + manual runtime/API testing.]]

## API Documentation
[[All application APIs are implemented as Next.js route handlers under `src/app/api`.  
Most APIs expect authenticated users (verified via middleware + Supabase session).

### Endpoint Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/goal/investigate` | AI investigation/questions for a goal |
| `POST` | `/api/goal/plan` | AI plan generation |
| `POST` | `/api/goal/evaluate` | AI daily log scoring |
| `POST` | `/api/analytics` | Advanced analytics for a goal |
| `POST` | `/api/weekly-summary` | Weekly AI summary |
| `POST` | `/api/transcribe` | Audio transcription |
| `POST` | `/api/challenges/create` | Create challenge room |
| `POST` | `/api/challenges/join` | Join challenge by invite code |
| `POST` | `/api/challenges/end` | End an active challenge |
| `POST` | `/api/challenges/by-goal` | Fetch challenge snapshot for one goal |
| `GET` | `/auth/callback` | OAuth code exchange and redirect |

### `POST /api/goal/investigate`
- Request body:
  - `goal: string`
  - `context?: Record<string, string>`
  - `structured_input?: object`
- Success response:
  - `status: ok | needs_info | unrealistic | refused`
  - `goal_understanding`
  - `questions[]`
  - `realism_check`
- Error response:
  - `429` with `{ error: "quota_exceeded", retryAfterSeconds, message_ar, message_en }`
  - `500` with `{ error: "Failed to investigate goal" }`

### `POST /api/goal/plan`
- Request body:
  - `goal: string`
  - `answers: object`
  - `targetDeadline?: string`
  - `structured_input?: object`
- Success response:
  - Hierarchical plan payload with `plan`, `main_tasks`, `tasks`, `speedup`, `ai_summary`
- Error:
  - `429` quota payload
  - `500` generic failure

### `POST /api/goal/evaluate`
- Request body:
  - `tasks: TaskRow[]`
  - `mainTasks?: TaskRow[]`
  - `log: string`
  - `previousLogs?: array`
  - `goalContext?: object`
- Success response:
  - `subtask_breakdown`
  - `main_breakdown`
  - `bonus`
  - `daily_cap`
  - `total_points_awarded`
  - `score`
- Error:
  - `429` quota payload
  - `500` generic failure

### `POST /api/analytics`
- Request body:
  - `goalId: string`
  - `forceRefresh?: boolean`
- Success response:
  - `{ data: { currentWeekPoints, lastWeekPoints, weekComparison, averagePointsPerLog, totalActiveDays, mostProductiveDay, projectedCompletionDate, onTrack, daysAheadOrBehind }, cached }`
- Behavior:
  - Uses `analytics_cache`.
  - Cache TTL: 1 hour.
- Errors:
  - `400` missing `goalId`
  - `404` goal not found
  - `500` internal error

### `POST /api/weekly-summary`
- Request body:
  - `goalId: string`
  - `forceRefresh?: boolean`
- Success response:
  - `{ cached: boolean, data: WeeklySummary }`
- Rules:
  - Requires at least 7 unique log days; otherwise `400` with `code: INSUFFICIENT_DAYS`.
  - If total weekly score is zero, returns deterministic non-AI fallback summary.
- Errors:
  - `500` on missing Mistral key or AI call failure

### `POST /api/transcribe`
- Content type: `multipart/form-data`
- Fields:
  - `audio: File` (required)
  - `language` (sent from client but server currently forces Arabic model language)
- Success response:
  - `{ text, language, duration, fallback }`
- Behavior:
  - If `MISTRAL_API_KEY` is missing, returns `fallback: true` and client uses Web Speech API.

### Challenge APIs

#### `POST /api/challenges/create`
- Request: `{ goalId }`
- Response: `{ data: { challengeId, inviteCode } }`
- Uses RPC: `create_goal_challenge`

#### `POST /api/challenges/join`
- Request: `{ goalId, inviteCode }`
- Response: `{ data: { challengeId, inviteCode } }`
- Uses RPC: `join_goal_challenge`

#### `POST /api/challenges/end`
- Request: `{ challengeId }`
- Response: `{ data: { challengeId, endedAt } }`
- Uses RPC: `end_goal_challenge`

#### `POST /api/challenges/by-goal`
- Request: `{ goalId }`
- Response: challenge snapshot:
  - `status`
  - `challengeId`, `inviteCode`
  - `me`, `opponent`
  - `scoreboard` (`today`, `last7Days`, `total`)
  - `recentEvents`
  - `endedAt`

Challenge RPC error mapping is centralized in `src/app/api/challenges/shared.ts` and includes:
- `goal_not_owned`
- `active_challenge_exists`
- `invalid_invite_code`
- `challenge_not_found`
- `cannot_join_own_challenge`
- `challenge_ended`
- `challenge_full`
- `already_joined`
- `not_challenge_member`
- `not_authenticated`]]

## Usage Examples
[[### Generate a goal plan
```ts
const res = await fetch("/api/goal/plan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    goal: "Master JavaScript in 90 days",
    answers: { "Current level": "Beginner", "Daily time": "60 minutes" },
    targetDeadline: "2026-06-30",
    structured_input: {
      title: "Master JavaScript",
      target_points: 10000,
      main_tasks: []
    }
  })
});
const data = await res.json();
```

### Submit a daily log for AI scoring
```ts
const res = await fetch("/api/goal/evaluate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tasks,
    log: "Completed 45 minutes of coding exercises and reviewed closures.",
    previousLogs,
    goalContext
  })
});
const evaluation = await res.json();
```

### Fetch challenge snapshot for current goal
```ts
const res = await fetch("/api/challenges/by-goal", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ goalId })
});
const snapshot = await res.json();
```]]

## Architecture Overview
[[### 1. Client shell and routing
- `src/app/page.tsx` is the main client orchestrator for views: `home`, `goals`, `dashboard`, `settings`.
- `OrbitShell` provides global visual shell.
- `OrbitDock` controls primary navigation and pinned-goal shortcuts.

### 2. Authentication and access control
- Login starts at `src/app/login/page.tsx` with Supabase Google OAuth.
- OAuth callback is handled by `src/app/auth/callback/route.ts`.
- `src/middleware.ts` redirects unauthenticated users to `/login` and prevents authenticated users from staying on `/login`.

### 3. Goal lifecycle
- Goal creation:
  - AI path: `HomePage` -> `GoalCreator` -> investigate/plan APIs.
  - Manual path: `ManualGoalCreator` inserts goal + hierarchical tasks directly.
- Goal/task persistence is stored in `goals` and `sub_layers`.

### 4. Daily execution and scoring
- `Dashboard` displays hierarchical tasks (`task-hierarchy.ts`) and check-in states (`task_checkins`).
- `DailyLogModal` sends user logs (text/voice) to `/api/goal/evaluate`.
- Scored result is stored in `daily_logs`.
- Goal points increment atomically via `increment_goal_points` RPC.

### 5. Analytics and summaries
- `GrowthChart` visualizes daily point aggregates.
- `AdvancedAnalytics` consumes `/api/analytics`, which reads/writes `analytics_cache`.
- `WeeklySummaryCard` consumes `/api/weekly-summary`, which reads/writes `weekly_summaries`.

### 6. Challenge subsystem
- `ChallengeTab` calls create/join/end/by-goal challenge APIs.
- APIs rely on challenge RPC functions and challenge tables.
- UI polls snapshot every 20 seconds and also refreshes on `challenge-log-updated` window event.

### 7. Voice and notifications
- Voice logs use `VoiceRecorder`:
  - MediaRecorder audio -> `/api/transcribe` -> Mistral transcription.
  - Fallback to browser speech recognition on failure.
- `useStreakReminder` periodically checks at-risk streaks and triggers browser notifications.

### 8. AI orchestration details
- `src/lib/gemini.ts` implements:
  - model fallback chain across Gemini variants
  - quota error normalization (`GeminiQuotaError`)
  - safety keyword gating
  - robust JSON extraction from model output
  - plan normalization and task hierarchy compatibility]]

## Contributing Guidelines
[[1. Fork and create a feature branch from `main`.
2. Install dependencies with `npm install`.
3. Configure `.env.local` with working Supabase + AI keys.
4. Run locally: `npm run dev`.
5. Run lint before opening a PR: `npm run lint`.
6. Keep changes scoped and include:
   - clear description of behavior changes
   - affected endpoints/components
   - migration notes if schema/RPC changes are required
7. Because there is no automated test suite yet, include manual test steps in your PR.
8. Do not commit secrets from `.env.local` or generated artifacts from `.next`.]]

## License
[[No `LICENSE` file is currently present in this repository.

Important note:
- A previous README version mentioned `MIT`, but the repository does not currently contain a formal license file.
- Until a license file is added, treat usage/redistribution terms as unspecified by source control.]]
