# METRIX Telegram Bot — Architecture Reference

> **Purpose:** Complete deep-dive for AI-assistant debugging, Vercel deployment, and maintenance of the Telegram integration.

---

## 1. System Overview & Entry Points

### Webhook URL

```
POST https://<your-domain>/api/telegram/webhook
```

Set via BotFather or:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/telegram/webhook"
```

Verify:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

### All Telegram API Routes

| Route | File | Method | Auth | Description |
|-------|------|--------|------|-------------|
| `/api/telegram/webhook` | `webhook/route.ts` | POST | None (Telegram) | Single entry point for all Telegram updates — commands, callbacks, text messages |
| `/api/telegram/chat` | `chat/route.ts` | POST | Service Role | Also exports `processChatMessage()` used internally by the webhook. Processes one user message through Gemini. |
| `/api/telegram/link` | `link/route.ts` | POST | User (Supabase Auth) | Generates a Telegram deep-link with random hex code for account linking |
| `/api/telegram/status` | `status/route.ts` | GET | User (Supabase Auth) | Returns `{ linked, username }` for the authenticated user |
| `/api/telegram/disconnect` | `disconnect/route.ts` | POST | User (Supabase Auth) | Nullifies `telegram_chat_id`, `telegram_username`, disables reminders |
| `/api/telegram/settings` | `settings/route.ts` | POST | User (Supabase Auth) | Saves timezone/language preference to `telegram_links` table |
| `/api/telegram/reminders/cron` | `reminders/cron/route.ts` | GET | Service Role | Iterates all users with linked Telegram + enabled reminders, sends any due sequence messages |
| `/api/telegram/reminders/run` | `reminders/run/route.ts` | POST | User (Supabase Auth) | Sends a specific reminder sequence for one goal (triggered per-goal from UI) |
| `/api/telegram/progress-notify` | `progress-notify/route.ts` | POST | User (Supabase Auth) | Sends an immediate progress-log notification with AI coach feedback |

### Server-Side (Supabase Edge Function)

| Function | Schedule | File | Runtime |
|----------|----------|------|---------|
| `telegram-reminder` | `*/5 * * * *` (every 5 min) | `supabase/functions/telegram-reminder/index.ts` | Deno |

---

## 2. Webhook Logic (`webhook/route.ts`)

### Step-by-Step Flow

```
Telegram sends Update (JSON)
         │
         ▼
  POST /api/telegram/webhook
         │
    ┌────┴────┐
    │  Does   │
    │  update │  YES → handleCallbackQuery()
    │  have   │         │
    │ callback│     ┌───┴──────────┐
    │ _query? │     │ data starts  │  NO  → answerCallbackQuery(id)
    └────┬────┘     │ with chat_?  │        return { ok: true }
         │ NO       └───┬──────────┘
         ▼              │
  Extract message       ├─ chat_cancel → editMessageText("Cancelled")
  & message.text        │
         │              ├─ chat_goal:<id> →
         │               │  1. getUserByChatId()
         ▼               │  2. Verify goal ownership
  text.startsWith        │  3. End any existing active session
  ('/start')? ──YES──→  │  4. INSERT new session (state='active')
         │               │  5. answerCallbackQuery("selected")
         │ NO            │  6. editMessageText(confirmation with goal title)
         │               │
         ▼               └── return { ok: true }
  getUserByChatId()
  (query user_settings   ◄── Both entry paths converge here for the
   by telegram_chat_id)        "no user" check
         │
    ┌────┴────┐
    │  User   │
    │ found?  │  NO → sendMessage("Account not linked")
    └────┬────┘        return { ok: true }
         │ YES
         ▼
    ┌──────────┐
    │ text     │
    │ starts   │
    │ with /?  │
    └────┬─────┘
         │
    ┌────┴────────────────────────────────┐
    │ command === '/chat' || '/khat'      │──→ handleChatCommand()
    │ command === '/goals' || '/اهدافي'   │──→ fetch goals, send list
    │ command === '/stop'||'/end'||'/انهاء'│──→ UPDATE state='idle', confirm
    │ default (unknown command)           │──→ send BOT_MESSAGES.commands
    └─────────────────────────────────────┘
         │ (text does NOT start with /)
         ▼
  Query telegram_chat_sessions
  WHERE user_id AND state='active'
         │
    ┌────┴────┐
    │ Active  │
    │ session │  NO → sendMessage("No active chat. Send /chat")
    │ found?  │
    └────┬────┘
         │ YES
         ▼
  processChatMessage(chatId, text)
         │
    ┌────┴────────────────┐
    │ result.ok = false   │──→ sendMessage(result.response || fallback)
    │ result.ok = true,   │
    │  no response        │──→ sendMessage("An error occurred")
    │ result.ok = true    │
    │  has response       │──→ sendMessage(response, useHtml=false)
    └─────────────────────┘
         │
         ▼
  return { ok: true }
```

### Error Handling Architecture

```
Any thrown error
      │
      ▼
POST handler catch block (line 408-411):
  console.error('Telegram webhook error:', error)
  return NextResponse.json({ ok: true })
      │
      ▼
Telegram sees HTTP 200 → does NOT retry → SILENT FAILURE
```

All internal functions propagate errors upward. The **only safeguard** is the outer try/catch.

### `sendTelegramMessage()` — Parse Mode Logic

```typescript
async function sendTelegramMessage(
    chatId: number,
    text: string,
    replyMarkup?: object,
    useHtml = true,           // ← default: HTML mode
)
```

- `useHtml = true` (default): sets `parse_mode: 'HTML'`, text sent as-is (safe for controlled strings like `"<b>Goal</b>"`)
- `useHtml = false`: calls `escapeHtml(text)` before sending, **no** `parse_mode` set — used for **Gemini responses** (untrusted text)
- **Every call** checks `res.ok` and logs errors: `console.error('Telegram API error (${status}): ${body}')`

### Escape Function

```typescript
function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
               .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

---

## 3. Chat Session Management (`telegram_chat_sessions`)

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS telegram_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'active')),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    messages_today INTEGER NOT NULL DEFAULT 0,
    last_message_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_chat_sessions_user_chat ON telegram_chat_sessions(user_id, chat_id);
CREATE INDEX idx_telegram_chat_sessions_active ON telegram_chat_sessions(state) WHERE state = 'active';
```

### Messages JSONB Structure

```typescript
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Stored in the `messages` column:
// [
//   { "role": "user", "content": "كم نقطة عندي؟" },
//   { "role": "assistant", "content": "عندك 45 من أصل 100 نقطة." },
//   { "role": "user", "content": "شوRecommend تعمل؟" },
//   { "role": "assistant", "content": "أنصحك تركز على..." }
// ]

// Trimmed to last 3 exchanges = 6 messages max
```

### Daily Limit Reset Logic

Located in `processChatMessage()` (`chat/route.ts:68-82`):

```typescript
const todayStr = new Date().toISOString().split('T')[0];  // "2026-05-16"
let messagesToday = session.messages_today;

if (session.last_message_date !== todayStr) {
    messagesToday = 0;  // ← RESET: new day
}

if (messagesToday >= DAILY_MESSAGE_LIMIT) {  // 10
    return { ok: false, reason: 'daily_limit', response: '...' };
}
```

### Session Lifecycle

| Event | Action |
|-------|--------|
| User taps goal button | INSERT `state='active'`, `messages='[]'`, `messages_today=0` |
| User sends `/stop` | UPDATE `state='idle'` |
| User taps a DIFFERENT goal | UPDATE old session to `'idle'`, INSERT new `'active'` |
| Message processed | UPDATE `messages` (JSONB), `messages_today++`, `last_message_date` |
| New day starts | `messages_today` resets to 0 on next message (checked in-memory, not via cron) |

---

## 4. AI Integration (`gemini.ts` & `chat/route.ts`)

### `chatAboutGoal()` — Signature & Behavior

```typescript
static async chatAboutGoal(
    goal: {
        title: string;
        ai_summary?: string;
        created_at?: string;
        current_points?: number;
        target_points?: number;
    },
    userLanguage: 'ar' | 'en',
    messages: { role: 'user' | 'assistant'; content: string }[],
    userMessage: string,
): Promise<string>
```

**Behavior:**
1. **Safety check** — `checkContentSafety(userMessage)` against 22 dangerous keywords. If unsafe, returns polite refusal string.
2. **Compute days since start** — `Math.floor((now - goal.created_at) / 86400000)`
3. **Build system prompt** — bilingual (AR/EN), includes all goal context
4. **Map stored roles** — `'assistant'` → `'model'`, `'user'` → `'user'` (Gemini API requirement)
5. **Truncate context** — last 6 messages only (3 exchanges)
6. **Call Gemini** — via `callWithRetry()` using `gemini-2.5-flash-lite` as primary model, with fallback chain
7. **Error handling** — `GeminiQuotaError` → polite "try later" message; all other errors → generic "something went wrong"

### System Prompt (Arabic)

```
أنت مدرب شخصي ذكي داخل تطبيق METRIX. دورك الوحيد هو مساعدة المستخدم في التحدث عن هدفه الحالي ومتابعة تقدمه.

📌 معلومات الهدف الحالي:
- عنوان الهدف: {goal.title}
- تاريخ البدء: {goal.created_at} (تاريخ اليوم هو {todayStr})
- النقاط الحالية: {current} من أصل {target}
- عدد الأيام منذ البدء: {daysSinceStart} يوماً
- ملخص الهدف: {goal.ai_summary}

🛑 قواعد صارمة جداً:
1. أجب فقط على الأسئلة المتعلقة بـ "{goal.title}".
2. قدم معلومات ونصائح وتوجيهات تخص هذا الهدف وحالته فقط.
3. إذا سألك المستخدم عن أي موضوع خارجي، اعتذر بلطف: "أنا هنا فقط لمساعدتك في هدفك [{title}]، دعنا نعود للتركيز عليه 🙌"
4. اجعل إجاباتك قصيرة، محفزة، ومباشرة (2-4 جمل).
5. يمكنك حساب كم يوم/شهر مضى على الهدف بناءً على dates أعلاه.
```

### Context Window (Messages → Gemini)

```typescript
// Stored in DB as:
[{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }, ...]

// Mapped to Gemini format:
const history = messages.slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',   // ← critical role mapping
    parts: [{ text: m.content }],
}));

// Sent as:
const contents = [
    ...history,                                          // last 6 messages
    { role: 'user', parts: [{ text: userMessage }] },   // new message
];
```

### Model Fallback Chain

```typescript
MODEL_FALLBACK_CHAIN = [
    "gemini-2.5-flash-lite",      // ← primary (cheap, fast)
    "gemini-2.0-flash-lite",       // ← fallback 1
    "gemini-2.0-flash",            // ← fallback 2
    "gemini-2.5-flash",            // ← fallback 3 (most capable)
];
```

On 429 (quota): tries next model in chain.  
On 503: retries once after 3s, then falls through.  
On 404: skips to next model.  
All exhausted: throws `GeminiQuotaError`.

### `processChatMessage()` — Full Flow (`chat/route.ts`)

```
processChatMessage(supabase, chatId, message)
  │
  ├── 1. Query user_settings by telegram_chat_id
  ├── 2. Query telegram_chat_sessions WHERE user_id AND state='active'
  ├── 3. Check/reset daily message limit (10)
  ├── 4. Query goals by session.goal_id
  ├── 5. Call GeminiService.chatAboutGoal(goal, language, messages, message)
  ├── 6. Append new exchange to messages array
  ├── 7. Trim to last 6 messages
  ├── 8. UPDATE telegram_chat_sessions (messages, messages_today++, date)
  ├── 9. Check remaining messages: if <= 2, append ⚠️ warning note
  └── 10. Return { ok: true, response: finalResponse }
```

---

## 5. Reminders & Notifications

### Two Independent Reminder Systems

#### A. Supabase Edge Function (`telegram-reminder`)

- **Schedule:** `*/5 * * * *` (every 5 minutes)
- **Runtime:** Deno (not Next.js)
- **Config:** `supabase/config.toml:126-134`
- **Database queries optimized to 3 queries total:**
  1. JOIN `user_settings` + `goal_reminders` — gets all linked users with enabled reminders
  2. Batch `telegram_reminder_logs` — last 2 days, deduplicate via in-memory Set
  3. Batch `daily_logs` — all relevant goals, indexed by `goal_id` for O(1) lookup
- **Sequence escalation logic:**
  - `getSequenceToSend(reminderTime, timezone)` → returns 1–5 or null
  - Sequence 1 fires when current time is 0–30 min past reminder time
  - Each subsequent sequence is +30 min
  - Max 150 min window (= 5 sequences)
  - Midnight crossing handled: if `diff < -720` add 1440 min
- **Messages:** 5 escalating levels (reminder → heads up → warning → critical → final call), bilingual

#### B. Client Trigger (`/api/telegram/reminders/cron`)

- Legacy GET endpoint (still exists but no longer called from client)
- Same logic as Edge Function but runs in Next.js runtime
- Previously triggered by `useTelegramReminder` hook (now deleted)

### Progress Notification (`progress-notify/route.ts`)

- Triggered from `ProgressLogDialog.tsx` after successful log submission
- Sends formatted HTML message: goal title, mode (manual/AI), rating, points, coach message, comparison, warning
- Uses authenticated user (not service role)

### Disconnect Logic (`disconnect/route.ts`)

```typescript
export async function POST() {
    const supabase = await createClient();               // ← Regular client (user auth)
    const { data: { user } } = await supabase.auth.getUser();

    await Promise.all([
        supabase.from('telegram_links').update({          // Clear legacy link table
            chat_id: null,
            username: null,
            linked_at: null,
        }).eq('user_id', user.id),

        supabase.from('user_settings').update({           // Clear main settings
            telegram_chat_id: null,
            telegram_username: null,
            telegram_linked_at: null,
            reminders_enabled: false,                     // ← Also disables reminders
        }).eq('user_id', user.id),
    ]);
}
```

**Key Observations for Debugging:**
- Uses `createClient()` (authenticated user), NOT `createServiceRoleClient()`
- Two tables updated in parallel via `Promise.all`
- `reminders_enabled` is set to `false`
- Does NOT delete `telegram_chat_sessions` rows — active sessions become orphaned
- No `try/catch` error logging (bare `catch {}`)

---

## 6. Database Tables Reference

| Table | Used By | Key Columns |
|-------|---------|-------------|
| `user_settings` | Every route | `user_id`, `telegram_chat_id`, `telegram_username`, `telegram_linked_at`, `reminders_enabled`, `language` |
| `telegram_link_codes` | `webhook/route.ts` (handleStart) | `code`, `user_id`, `expires_at`, `used` |
| `telegram_links` | `link`, `settings`, `status`, `disconnect` | `user_id`, `link_code`, `chat_id`, `username`, `timezone`, `language` |
| `telegram_chat_sessions` | `webhook`, `chat/route` | `id`, `user_id`, `chat_id`, `goal_id`, `state`, `messages` (JSONB), `messages_today`, `last_message_date` |
| `telegram_reminder_logs` | `cron`, `run`, Edge Function | `user_id`, `goal_id`, `reminder_date`, `sequence` |
| `goals` | `webhook` (handleChatCommand, handleCallbackQuery), `chat/route` | `id`, `user_id`, `title`, `icon`, `current_points`, `target_points`, `ai_summary`, `created_at`, `status` |
| `daily_logs` | `cron`, `run`, Edge Function | `goal_id`, `created_at`, `ai_score` |

---

## 7. Environment Variables

| Variable | Required | Used In | Purpose |
|----------|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Every route that sends messages | Bot token from BotFather |
| `TELEGRAM_BOT_NAME` | ✅ Yes | `link/route.ts` | Bot username for deep link URL (`https://t.me/{name}?start=...`) |
| `GEMINI_API_KEY` | ✅ Yes | `gemini.ts` | Google AI API key for Gemini models |
| `SUPABASE_URL` | ✅ Yes | All routes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Routes using `createServiceRoleClient()` | Service role key (bypasses RLS) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | `service-role.ts` | Same as SUPABASE_URL, used by client lib |

### Which Routes Use Which Client

| Client | Routes | Bypasses RLS? |
|--------|--------|---------------|
| `createServiceRoleClient()` | `webhook`, `chat`, `cron` | ✅ Yes (service key) |
| `createClient()` (server) | `link`, `status`, `disconnect`, `settings`, `run`, `progress-notify` | ❌ No (authenticated user) |

---

## 8. Vercel Deployment Notes

### No Special Configuration Required

- **No `maxDuration`**: Telegram API routes are lightweight (the heavy Gemini call sets its own timeout via `callWithRetry`)
- **No Edge Runtime**: All routes use the default Node.js runtime (not Edge)
- **No `force-dynamic`**: Only `link/route.ts`, `status/route.ts`, and `disconnect/route.ts` export `dynamic = 'force-dynamic'`; webhook and chat routes don't need it
- **Serverless Function Limits**: Gemini calls can take 5–15 seconds. Standard Vercel Hobby plan has 10s timeout, Pro plan 60s. Flash-lite model usually responds in 2–4s.

### Webhook URL for Vercel

```
https://your-project.vercel.app/api/telegram/webhook
```

Set via:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-project.vercel.app/api/telegram/webhook"
```

### Known Vercel Considerations

1. **Cold starts**: First request after inactivity may be slow (Gemini + Supabase initialization). Telegram waits up to ~5s for webhook response; if exceeded, Telegram retries.
2. **Edge Function (Supabase)**: Runs independently on Supabase infrastructure, NOT on Vercel. Ensure `TELEGRAM_BOT_TOKEN` is set in both Vercel env AND Supabase Edge Function secrets.
3. **Service Role Key**: If deploying, `SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel env. Keep it secret — it provides full database access.

---

## 9. Debugging Checklist

### Silent Failure — No Response From Bot

1. **Check webhook is set**:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
   Should show `url` pointing to your deployed `/api/telegram/webhook`

2. **Check server logs**:
   - Vercel: Function Logs in dashboard
   - Local: Terminal running `npm run dev`
   - Look for `"Telegram webhook error:"` or `"Telegram API error:"`

3. **Check environment variables**:
   - `TELEGRAM_BOT_TOKEN` must be set
   - `GEMINI_API_KEY` must be set
   - Verify no typos (especially for Supabase Edge Function)

4. **Check database**:
   - `telegram_chat_sessions` table must exist (run migration)
   - Verify RLS isn't blocking service role queries
   - Check `user_settings.telegram_chat_id` matches the actual chat ID

5. **Common failure points**:
   - Migration not applied → `telegram_chat_sessions` table missing → silent error on INSERT/UPDATE
   - HTML parse mode with unescaped characters → Telegram API error (logged now)
   - Role mapping `"assistant"` not converted to `"model"` → Gemini API error
   - Localhost testing without ngrok → Telegram can't reach the server
