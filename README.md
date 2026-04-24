# METRIX

> مرجع حيّ شامل للمشروع مخصص للبشر والذكاء الاصطناعي.
> آخر تحديث: مراجعة كاملة لجميع ملفات المشروع مع تفصيل كل ملف ومحتواه.

---

## 1. ما هو هذا المشروع؟

**METRIX** هو تطبيق ويب خاص لتتبع الأهداف الشخصية باستخدام:

- **Next.js 16.1.4 + React 19.2.3 + TypeScript**
- **Supabase** للمصادقة وقاعدة البيانات والتخزين
- **Google Gemini** للتحقيق في الهدف، بناء الخطة، تقييم التقدم اليومي، وتوليد أسئلة التركيز اليومي
- **Mistral Voxtral** لتحويل الصوت إلى نص

الفكرة الأساسية ليست "To-Do List" تقليدية، بل نظام صارم لمراقبة التقدم بالأرقام:

- الهدف يتحول إلى **مهام رئيسية** و**مهام فرعية**
- كل مهمة لها **تكرار** (`daily` أو `weekly`) و**وزن تأثير**
- المستخدم يسجل تقدمه يومياً
- الذكاء الاصطناعي يقيّم السجل ويمنح نقاطاً
- التقدم يتراكم داخل الهدف
- ميزة **التركيز اليومي (Daily Focus)**: أسئلة ذكية تولّد تلقائياً
- ميزة **تحديات 1v1** بين هدفين لمستخدمان مختلفان
- ميزة **بطاقات المكافآت (Rewards)** ضمن التحديات

نبرة المنتج: الصرامة، المحاسبة، التقدم القابل للقياس، دعم العربية والإنجليزية (RTL/LTR).

---

## 2. حقائق سريعة مهمة جداً لأي AI

1. التطبيق **ليس Multi-Page App تقليدية**؛ `src/app/page.tsx` يدير التنقل الداخلي بين views عبر state: `home` / `dashboard` / `settings` / `goals` / `create-goal`.
2. الداشبورد يحتوي **3 تبويبات فقط**: `focus` / `chart` / `challenge`.
3. المسار الفعلي لإنشاء الهدف بالذكاء الاصطناعي: `GoalCreatorPage.tsx` وليس `GoalCreator.tsx`.
4. نافذة تسجيل التقدم الفعلي: `ProgressLogDialog.tsx` وليس `DailyLogModal.tsx`.
5. الرفع الصوتي يعتمد على `MISTRAL_API_KEY` — لا يوجد fallback عملي حقيقي.
6. تدفق إنشاء الهدف AI يرسل `structured_input: {}` دائماً (غير مستخدم).
7. حفظ الهدف من `GoalCreatorPage` يضع `target_points = 10000` ثابتاً.
8. المسار اليدوي `ManualGoalCreator` هو الوحيد الذي يسمح بتحديد تواريخ ونقاط قبل الحفظ.
9. نظام التحديات يعتمد على **Supabase RPCs**.
10. لا توجد **اختبارات** أو **سكريبت test** داخل `package.json`.
11. ميزة **Daily Focus** جديدة تعتمد على `/api/goal/daily-focus` و `GeminiService.generateDailyFocus`.
12. ميزة **تحليل أداء السجل اليومي** داخل `src/lib/daily-log-feedback.ts`.
13. هناك ملفات **legacy / غير موصولة** — سيتم ذكرها لاحقاً.

---

## 3. خريطة المنتج الحالية

### 3.1 المسارات الحقيقية في App Router

- `/` — التطبيق الرئيسي بعد تسجيل الدخول
- `/login` — شاشة تسجيل الدخول عبر Google OAuth
- `/auth/callback` — إتمام جلسة Supabase بعد OAuth
- `/api/goal/investigate` — فحص الهدف
- `/api/goal/plan` — بناء الخطة
- `/api/goal/evaluate` — تقييم السجل اليومي
- `/api/goal/daily-focus` — توليد أسئلة التركيز اليومي
- `/api/transcribe` — تحويل الصوت إلى نص
- `/api/challenges/create` — إنشاء تحدي
- `/api/challenges/join` — الانضمام لتحدي
- `/api/challenges/end` — إنهاء تحدي
- `/api/challenges/by-goal` — snapshot التحدي الحالي
- `/api/challenges/history` — أرشيف التحديات

### 3.2 الـ Views داخل الصفحة الرئيسية

| View | الغرض | الملف الأساسي |
| --- | --- | --- |
| `home` | الصفحة الرئيسية + حقل كتابة الهدف + الأهداف الأخيرة | `src/components/HomePage.tsx` |
| `create-goal` | إنشاء الهدف يدوياً أو بالذكاء الاصطناعي | `GoalCreatorPage.tsx` + `ManualGoalCreator.tsx` |
| `dashboard` | الهدف الحالي، المهام، الرسم البياني، التحديات | `src/components/dashboard/Dashboard.tsx` |
| `goals` | قائمة كل الأهداف وإدارتها | `src/components/goal/GoalsList.tsx` |
| `settings` | اللغة، الثيم، الإشعارات، الملف الشخصي | `src/components/settings/SettingsPage.tsx` |

### 3.3 أسلوب التنقل

- التنقل عبر React state وليس routes منفصلة
- شريط التنقل الفعلي: `src/components/OrbitDock.tsx`
- Guard يمنع مغادرة شاشة الإنشاء AI إذا كانت جلسة غير محفوظة

---

## 4. هوية المنتج والنبرة

### 4.1 هوية بصرية

- الخلفية عبر `OrbitShell` (3 orbs + noise texture)
- أسلوب orbit / glow / cosmic / matrix
- الثيم الفاتح والداكن
- الشعار: `logo1.svg` (فاتح)، `logo2.svg` (داكن)، `logo.svg` (rewards)
- شريط التقدم: `patterns/waves.svg`

### 4.2 الخطوط

- **IBM Plex Sans Arabic** للعربية
- **Plus Jakarta Sans** للاتينية

### 4.3 نبرة النصوص

نبرة صارمة ومباشرة — شعار home: "اذا ما استمرت بهدفك راح تفشل يا غبي". `MatrixManifestoDialog` يشرح أن المنتج صُمم كـ "نظام تتبع صارم".

---

## 5. التدفقات الوظيفية الأساسية

### 5.1 تسجيل الدخول

الملفات: `src/app/login/page.tsx`, `src/components/login/MatrixManifestoDialog.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`

1. المستخدم يدخل `/login`
2. إذا كانت الجلسة موجودة → تحويل إلى `/`
3. إذا لم تكن: `MatrixManifestoDialog` (يظهر تلقائياً أول زيارة) + Google OAuth
4. بعد callback: `exchangeCodeForSession` → redirect `/`
5. `middleware.ts` يحمي كل المسارات ما عدا `/login`, `/auth/callback`, static assets

### 5.2 الصفحة الرئيسية Home

الملف: `src/components/HomePage.tsx` (779 سطر)

- استقبال نص هدف جديد + تسجيل صوتي
- عرض الأهداف الأخيرة (حتى 4 عادي / 2 موبايل)
- فتح مسار إنشاء الهدف: AI Plan / Manual
- إذا كان نص الهدف < 15 كلمة: تحفيز بـ 5 مراحل لونية لإعطاء تفاصيل أكثر
- كشف RTL/LTR تلقائي

### 5.3 إنشاء الهدف بالذكاء الاصطناعي

الملف: `src/components/goal/GoalCreatorPage.tsx` (42 KB)

المراحل: `INVESTIGATING` → `QUESTIONS` → `GENERATING_PLAN` → `REVIEW` → `SAVE`

- اللغة تُحسم من حروف النص (عربي = تجربة عربية)
- `structured_input` فارغ دائماً
- `target_points = 10000` ثابت
- لا يسمح باختيار target points قبل الحفظ

### 5.4 إنشاء الهدف يدوياً

الملف: `src/components/goal/ManualGoalCreator.tsx` (82 KB — أكبر ملف)

المراحل: `DETAILS` → `TIMELINE` → `TASKS` → `REVIEW`

- المستخدم يحدد: startDate, endDate, targetPoints
- بناء هيكل هرمي كامل قبل الحفظ

### 5.5 قائمة الأهداف

الملف: `src/components/goal/GoalsList.tsx` (17 KB)

- عرض، pin/unpin، edit، delete
- progress bar + days chip

### 5.6 Dashboard

الملف: `src/components/dashboard/Dashboard.tsx` (47 KB)

التبويبات:
1. **Focus** — `FocusTab.tsx` (51 KB) + `DailyFocusPanel.tsx` + `DailyFocusQuestionDialog.tsx`
2. **Chart** — `GrowthChart.tsx` + `DayCalendarGrid.tsx` + `TaskInsights.tsx`
3. **Challenge** — `ChallengeTab.tsx`

وظائف عامة: جلب المهام، checkins، سجلات اليوم، حساب streak، Daily Focus، رأس الهدف

### 5.7 Focus Tab

الملف: `src/components/dashboard/FocusTab.tsx` (51 KB)

- عرض main tasks + subtasks مع فلترة all/daily/weekly
- CRUD كامل: إضافة، rename، delete، تغيير icon/color/weight
- check/uncheck + تمييز المهام المكتملة اليوم + animation اكتمال
- Daily Focus Panel مدمج

### 5.8 Daily Focus (التركيز اليومي)

الملفات: `DailyFocusPanel.tsx` (9.2 KB), `DailyFocusQuestionDialog.tsx` (3.8 KB), `src/lib/daily-focus.ts` (9.3 KB), `/api/goal/daily-focus/route.ts` (43 سطر)

- توليد أسئلة تركيز يومية مخصصة بناءً على: سياق الهدف، المهام، السجلات السابقة، تاريخ الأسئلة
- يحتاج `DAILY_FOCUS_REQUIRED_DAYS` أيام سجلات قبل التفعيل
- يستدعي `GeminiService.generateDailyFocus`

### 5.9 تسجيل التقدم اليومي

الملف: `src/components/progress/ProgressLogDialog.tsx` (69 KB)

أنماط: `ai` (المستخدم يكتب + Gemini يقيّم) أو `manual` (المستخدم يحدد المهام مباشرة)

- إنشاء row في `daily_logs` + تحديث نقاط عبر `increment_goal_points` RPC
- event `challenge-log-updated` لتحديث challenge UI
- **ملاحظة مهمة**: `calculateTimeBonus: true` يُرسل لكن route handler لا يمرره دائماً → Bonus الوقت في AI mode غير مضمون

### 5.10 تحليل أداء السجل اليومي (Daily Log Feedback)

الملف: `src/lib/daily-log-feedback.ts` (19.8 KB / 562 سطر)

- `performance_tier`: weak / average / strong / exceptional
- `trend`: below_usual / at_usual / above_usual / no_history
- `badge`: none / strong / exceptional
- `warning_level`: none / watch / high
- `evidence_level`: thin / solid / detailed / manual
- يحسب: total_points, base_points, bonus_points, daily_cap, score_ratio, completion_ratio, coverage_ratio

### 5.11 Chart Tab

- **GrowthChart.tsx** (18 KB) — Bar/Line/Area, Week/Month/Year/All
- **DayCalendarGrid.tsx** (31 KB) — heatmap + modal تفاصيل اليوم
- **TaskInsights.tsx** (22 KB) — Top tasks, Weekly pulse, dialog تفاصيل

### 5.12 التحديات 1v1

الملف الرئيسي: `src/components/ChallengeTab.tsx` (374 سطر)

مكونات فرعية (`src/components/challenge/`):
- `HeaderCard.tsx` (12 KB) — رأس التحدي، invite code، أزرار
- `BoardCard.tsx` (2 KB) — لوحة النتائج
- `ActivityCard.tsx` (3.1 KB) — آخر الأحداث
- `HistoryCard.tsx` (6.4 KB) — أرشيف التحديات المنتهية
- `RewardsSection.tsx` (24 KB) — بطاقات المكافآت
- `EndChallengeDialog.tsx` (2.1 KB) — تأكيد إنهاء
- `FeedbackBanner.tsx` (594 B), `LoadingSkeleton.tsx` (638 B)
- `GoalTitleReveal.tsx` (1.7 KB), `PlayerAvatar.tsx` (1.1 KB)
- `ScoreCard.tsx` (2.1 KB), `MetricBox.tsx` (587 B)
- `challenge-types.ts` (4.6 KB) — أنواع TypeScript + ثوابت
- `challenge-utils.ts` (3.2 KB) — دوال مساعدة
- `index.ts` (1 KB) — إعادة تصدير

الحالات: `none` → `pending` → `active` → `ended`

التدفق: host ينشئ → يحصل على invite code → guest ينضم → scoreboard → إنهاء → أرشيف

- polling كل 20 ثانية + refresh عند `challenge-log-updated`

### 5.13 Rewards

الملف: `RewardsSection.tsx` (24 KB)

- deck من رتب/بطاقات Matrix مع أنيميشن فتح (shimmer → seal-break → core-burst → card-emerge)
- thresholds حسب targetPoints
- localStorage: `metrix:challenge-rewards:${goalId}:${targetPoints}`

### 5.14 Settings

الملف: `SettingsPage.tsx` (34 KB)

- الثيم، اللغة، الإشعارات، الملف الشخصي، إحصائيات الحساب، MatrixManifestoDialog، تسجيل الخروج

---

## 6. البنية التقنية

### 6.1 Stack

| المجال | التقنية |
| --- | --- |
| Framework | Next.js 16.1.4 |
| UI | React 19.2.3 |
| اللغة | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (new-york) + Radix UI |
| Icons | lucide-react |
| Charts | Recharts |
| Calendar | react-day-picker |
| Confetti | canvas-confetti + react-confetti-boom |
| Emoji | emoji-picker-react |
| Dates | date-fns |
| Auth/DB | Supabase (@supabase/ssr + @supabase/supabase-js) |
| AI | Google Gemini (@google/genai + @google/generative-ai) |
| Speech-to-Text | Mistral Voxtral |
| Compiler | React Compiler (babel-plugin-react-compiler) |
| Bundler | Turbopack |

### 6.2 البنية العامة

- `src/app/layout.tsx` — root layout + fonts + theme bootstrapping
- `src/app/page.tsx` — orchestrator الرئيسي
- `src/middleware.ts` — حارس الجلسة
- `src/utils/supabase/client.ts` — browser client
- `src/utils/supabase/server.ts` — server client مع cookies

### 6.3 ملاحظة معمارية

المشروع يمزج بين client-side fetching مباشر من Supabase و route handlers للسيرفر — ليس "server actions" خالص ولا "REST-only" خالص.

### 6.4 OrbitShell + OrbitDock

- `OrbitShell` — خلفية متحركة (3 orbs + noise)
- `OrbitDock` — navigation (bottom bar موبايل / sidebar ديسكتوب)، pinned goals حد أقصى 2، RTL

### 6.5 الثيم والاتجاه

- RootLayout: `lang="ar" dir="rtl"` افتراضياً
- بعد hydration: يقرأ `localStorage.language`
- الثيم يُطبّق فوراً عبر inline script (يمنع flash)

### 6.6 CSS والأنيميشن

من `src/app/globals.css` (518 سطر):

- Tailwind v4 مع `@theme inline` و CSS variables oklch
- أنيميشن اكتمال المهمة: `focus-task-complete` + `focus-task-pill-pop`
- أنيميشن Rewards: `reward-pack-float/shimmer/seal-break/core-burst/card-emerge`
- تنسيقات react-day-picker مخصصة
- scrollbar مخصص (ultra-thin, reveal on hover)

---

## 7. النموذج البياني للبيانات Data Model

### 7.1 `goals`
`id`, `user_id`, `title`, `domain`, `current_points`, `target_points`, `status`, `created_at`, `estimated_completion_date`, `total_days`, `ai_summary`, `icon`, `is_pinned`

### 7.2 `sub_layers`
`id`, `goal_id`, `task_description`, `impact_weight`, `frequency`, `time_required_minutes`, `completion_criteria`, `task_type` (`main`|`sub`), `parent_task_id`, `sort_order`, `icon`, `accent_color`

### 7.3 `daily_logs`
`id`, `goal_id`, `created_at`, `user_input`, `ai_score`, `ai_feedback`, `breakdown`

### 7.4 `task_checkins`
`id`, `goal_id`, `task_id`, `period_type`, `period_start`, `completed`, `completed_at`

### 7.5 `daily_focus_entries`
`id`, `goal_id`, `prompt_date`, `question`, `answer`, `answer_coaching`, `answered_at`

### 7.6 `challenge_rooms`
`id`, `invite_code`, `created_at`, `ended_at`

### 7.7 `challenge_participants`
`challenge_id`, `user_id`, `goal_id`, `role`, `display_name_snapshot`, `avatar_url_snapshot`, `goal_title_snapshot`, `joined_at`, `left_at`

### 7.8 Storage bucket
`avatars` — يستخدم في SettingsPage لصور الملف الشخصي

---

## 8. RPCs المستخدمة من Supabase

| RPC | المستخدم في | الغرض |
| --- | --- | --- |
| `increment_goal_points` | ProgressLogDialog | زيادة نقاط الهدف atomically |
| `create_goal_challenge` | POST /api/challenges/create | إنشاء challenge room + host |
| `join_goal_challenge` | POST /api/challenges/join | انضمام guest |
| `end_goal_challenge` | POST /api/challenges/end | إغلاق challenge |

---

## 9. API Reference

### 9.1 `POST /api/goal/investigate` (23 سطر)
المدخلات: `{ goal, context, structured_input }` → فحص سلامة الهدف + أسئلة متابعة

### 9.2 `POST /api/goal/plan` (21 سطر)
المدخلات: `{ goal, answers, targetDeadline, structured_input }` → خطة هرمية main_tasks + subtasks

### 9.3 `POST /api/goal/evaluate` (35 سطر)
المدخلات: `{ tasks, mainTasks, log, previousLogs, goalContext, calculateTimeBonus }` → breakdown + points + feedback

### 9.4 `POST /api/goal/daily-focus` (43 سطر)
المدخلات: `{ goal, tasks, logs, history, answer, existingQuestion, date }` → سؤال تركيز + coaching

### 9.5 `POST /api/transcribe` (71 سطر)
المدخلات: FormData (`audio`, `language`) → نص + fallback إذا لم يوجد MISTRAL_API_KEY

### 9.6 `POST /api/challenges/create` (112 سطر)
إنشاء تحدي أو إعادة تحدي مفتوح + snapshot المستخدم

### 9.7 `POST /api/challenges/join` (61 سطر)
الانضمام عبر invite code

### 9.8 `POST /api/challenges/end` (56 سطر)
إنهاء تحدي

### 9.9 `POST /api/challenges/by-goal` (305 سطر — أكبر API route)
snapshot كامل: status, me/opponent, scoreboard (today/last7Days/total), events, invite code

### 9.10 `POST /api/challenges/history` (107 سطر)
أرشيف التحديات المنتهية

### 9.11 ملف مشترك
`src/app/api/challenges/shared.ts` (90 سطر) — `parseChallengeRpcError`, `getChallengeProfileSnapshot`, `getErrorMessage`, أنواع `ChallengeRpcCode`

---

## 10. منطق الذكاء الاصطناعي (`src/lib/gemini.ts` — 38.6 KB / 1048 سطر)

### 10.1 الخدمات الأربع

1. `investigateGoal` — فحص الهدف + أسئلة متابعة (Core 4: current state, target state, timeline, available effort)
2. `createPlan` — بناء خطة هرمية (main_tasks + subtasks, realism_check, speedup, ai_summary)
3. `evaluateDailyLog` — تقييم السجل (done=80-100%, partial=30-60%, missed/unknown=0)
4. `generateDailyFocus` — توليد أسئلة تركيز يومية + coaching

### 10.2 Fallback Chain
`gemini-2.5-flash-lite` → `gemini-2.0-flash-lite` → `gemini-2.0-flash` → `gemini-2.5-flash`
- 429 → انتقال للتالي
- 503 → إعادة محاولة ثم انتقال
- فشل الكل → `GeminiQuotaError`

### 10.3 Safety
فحص كلمات خطرة: self-harm, violence, explosives, fraud, weapons, child abuse → رد `refused`

### 10.4 Daily Cap
```ts
dailyCap = max(5, sum(scorableTaskWeights) + 5)
```

### 10.5 نواتج إضافية
`subtask_breakdown` (alias `task_breakdown`), `main_breakdown`, `score`, `daily_cap`

---

## 11. فهرس ملفات المشروع الكامل

### 11.1 ملفات الجذر (7 ملفات)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `package.json` | 52 سطر | تبعيات المشروع وscripts (الاسم: `my-app`) |
| `next.config.ts` | 12 سطر | إعدادات Next.js + React Compiler + Turbopack |
| `tsconfig.json` | 35 سطر | إعدادات TypeScript مع path alias `@/*` |
| `components.json` | 23 سطر | إعدادات shadcn/ui (new-york style) |
| `postcss.config.mjs` | 8 سطر | PostCSS مع @tailwindcss/postcss |
| `eslint.config.mjs` | 19 سطر | ESLint مع next core-web-vitals + typescript |
| `.gitignore` | 43 سطر | ملفات مستبعدة من git |

### 11.2 ملفات التطبيق الأساسية (4 ملفات)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `src/app/page.tsx` | 376 سطر | منسق التطبيق — يدير views، جلب الأهداف، language، streak reminder، navigation guard |
| `src/app/layout.tsx` | 57 سطر | Root layout — خطوط، theme script، `lang="ar" dir="rtl"` |
| `src/app/globals.css` | 518 سطر | Tailwind v4 theme variables، أنيميشن المهام/Rewards، react-day-picker، scrollbar |
| `src/app/favicon.ico` | — | أيقونة الموقع |

### 11.3 تسجيل الدخول (3 ملفات)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `src/app/login/page.tsx` | 138 سطر | صفحة تسجيل الدخول — Google OAuth، MatrixManifestoDialog، logo |
| `src/app/auth/callback/route.ts` | 41 سطر | إتمام جلسة Supabase — exchangeCodeForSession → redirect `/` |
| `src/components/login/MatrixManifestoDialog.tsx` | — | حوار "القصة وراء ماتريكس" |

### 11.4 Middleware (1 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `src/middleware.ts` | 63 سطر | حارس الجلسة — يحمي كل المسارات ما عدا login/callback/static |

### 11.5 API Routes (11 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `api/goal/investigate/route.ts` | 23 سطر | فحص الهدف عبر Gemini |
| `api/goal/plan/route.ts` | 21 سطر | بناء خطة عبر Gemini |
| `api/goal/evaluate/route.ts` | 35 سطر | تقييم السجل اليومي عبر Gemini |
| `api/goal/daily-focus/route.ts` | 43 سطر | توليد سؤال تركيز يومي عبر Gemini |
| `api/transcribe/route.ts` | 71 سطر | تحويل الصوت إلى نص عبر Mistral Voxtral |
| `api/challenges/create/route.ts` | 112 سطر | إنشاء تحدي أو إعادة تحدي مفتوح |
| `api/challenges/join/route.ts` | 61 سطر | الانضمام لتحدي عبر invite code |
| `api/challenges/end/route.ts` | 56 سطر | إنهاء تحدي |
| `api/challenges/by-goal/route.ts` | 305 سطر | snapshot كامل للتحدي |
| `api/challenges/history/route.ts` | 107 سطر | أرشيف التحديات المنتهية |
| `api/challenges/shared.ts` | 90 سطر | دوال مشتركة + أنواع أخطاء RPC |

### 11.6 المكونات الرئيسية (5 ملفات)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `HomePage.tsx` | 779 سطر | الصفحة الرئيسية — حقل كتابة الهدف، صوتي، تحفيز AI بمراحل، RTL/LTR |
| `OrbitShell.tsx` | 48 سطر | الخلفية البصرية — 3 orbs + noise texture |
| `OrbitDock.tsx` | 134 سطر | شريط التنقل — bottom bar/sidebar، pinned goals، RTL |
| `ChallengeTab.tsx` | 374 سطر | تبويب التحدي — يجمع كل المكونات الفرعية |
| `AppSidebar.tsx` | 156 سطر | **Legacy** — sidebar قديم غير مستخدم |

### 11.7 مكونات الأهداف (9 ملفات)

| الملف | الحجم | الحالة | المحتوى |
| --- | --- | --- | --- |
| `GoalCreatorPage.tsx` | 42 KB | **Active** | تدفق إنشاء AI — 5 مراحل |
| `ManualGoalCreator.tsx` | 82 KB | **Active** | إنشاء يدوي — 4 مراحل (أكبر ملف) |
| `GoalsList.tsx` | 17 KB | **Active** | قائمة الأهداف — عرض، pin، edit، delete |
| `GoalEditDialog.tsx` | 21 KB | **Active** | تعديل الهدف |
| `IconPicker.tsx` | 6.6 KB | **Active** | اختيار أيقونة الهدف |
| `GoalCompletionCelebration.tsx` | 6.1 KB | **Active** | احتفال اكتمال الهدف — confetti |
| `GoalCreator.tsx` | 59 KB | **Legacy** | مسار AI أقدم (يدعم structured_input) غير mounted |
| `GoalTemplates.tsx` | 13 KB | **Legacy** | قوالب أهداف (frequencies غير مدعومة) |
| `GoalInput.tsx` | 6.1 KB | **Legacy** | input مركب لـ GoalCreator.tsx فقط |

### 11.8 مكونات الداشبورد (10 ملفات)

| الملف | الحجم | الحالة | المحتوى |
| --- | --- | --- | --- |
| `Dashboard.tsx` | 47 KB | **Active** | منسق الداشبورد — 3 تبويبات، streak، Daily Focus |
| `FocusTab.tsx` | 51 KB | **Active** | تبويب التركيز — CRUD، check/uncheck، فلترة |
| `DashboardHeader.tsx` | 9.6 KB | **Active** | رأس الهدف — العنوان، النقاط، days chip |
| `GrowthChart.tsx` | 18 KB | **Active** | الرسم البياني — Bar/Line/Area |
| `DayCalendarGrid.tsx` | 31 KB | **Active** | تقويم أيام الشهر — heatmap + modal |
| `TaskInsights.tsx` | 22 KB | **Active** | تحليل المهام — Top tasks، Weekly pulse |
| `DailyFocusPanel.tsx` | 9.2 KB | **Active** | لوحة التركيز اليومي |
| `DailyFocusQuestionDialog.tsx` | 3.8 KB | **Active** | حوار سؤال التركيز اليومي |
| `ToastNotification.tsx` | 722 B | **Active** | إشعار toast بسيط |
| `ActivityHistory.tsx` | 13 KB | **Legacy** | سجل نشاط غير ظاهر حالياً |

### 11.9 مكونات التقدم (2 ملف)

| الملف | الحجم | الحالة | المحتوى |
| --- | --- | --- | --- |
| `ProgressLogDialog.tsx` | 69 KB | **Active** | تسجيل التقدم — AI + manual mode |
| `DailyLogModal.tsx` | 16 KB | **Legacy** | modal تسجيل قديم |

### 11.10 مكونات التحدي (15 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `RewardsSection.tsx` | 24 KB | بطاقات المكافآت — deck، thresholds، أنيميشن، localStorage |
| `HeaderCard.tsx` | 12 KB | رأس التحدي — الحالة، invite code، أزرار |
| `HistoryCard.tsx` | 6.4 KB | أرشيف التحديات المنتهية |
| `ActivityCard.tsx` | 3.1 KB | آخر أحداث التحدي |
| `BoardCard.tsx` | 2 KB | لوحة النتائج me vs opponent |
| `EndChallengeDialog.tsx` | 2.1 KB | تأكيد إنهاء التحدي |
| `GoalTitleReveal.tsx` | 1.7 KB | كشف عنوان هدف الخصم |
| `ScoreCard.tsx` | 2.1 KB | بطاقة نقاط |
| `PlayerAvatar.tsx` | 1.1 KB | صورة اللاعب |
| `MetricBox.tsx` | 587 B | صندوق قياس |
| `FeedbackBanner.tsx` | 594 B | banner رسائل |
| `LoadingSkeleton.tsx` | 638 B | skeleton تحميل |
| `challenge-types.ts` | 4.6 KB | أنواع TypeScript + ثوابت |
| `challenge-utils.ts` | 3.2 KB | دوال مساعدة |
| `index.ts` | 1 KB | إعادة تصدير |

### 11.11 مكونات الإعدادات (1 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `SettingsPage.tsx` | 34 KB | صفحة الإعدادات — الثيم، اللغة، الإشعارات، الملف الشخصي، تسجيل الخروج |

### 11.12 مكونات مشتركة (8 ملفات)

| الملف | الحجم | الحالة | المحتوى |
| --- | --- | --- | --- |
| `ConfirmModal.tsx` | 2.1 KB | **Active** | حوار تأكيد |
| `GoalProgressBar.tsx` | 3.2 KB | **Active** | شريط تقدم الهدف |
| `VoiceRecorder.tsx` | 5.6 KB | **Active** | تسجيل صوتي → `/api/transcribe` |
| `TaskAppearancePicker.tsx` | 9.5 KB | **Active** | تغيير مظهر المهمة — إيموجي + لون |
| `TaskColorPicker.tsx` | 4 KB | **Active** | اختيار لون المهمة |
| `FullEmojiPicker.tsx` | 935 B | **Active** | emoji picker مدمج |
| `ThemeToggle.tsx` | 1.7 KB | **غير موصول** | toggle منفصل غير مستخدم |
| `StreakFlame.tsx` | 1.5 KB | **غير موصول** | widget streak قديم |

### 11.13 مكونات UI — shadcn/ui (22 ملف)

`accordion.tsx`, `alert.tsx`, `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `chart.tsx`, `collapsible.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `popover.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx` (21.6 KB — يستخدم فقط في AppSidebar Legacy), `skeleton.tsx`, `slider.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`

### 11.14 مكتبات المنطق (9 ملفات)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `gemini.ts` | 38.6 KB / 1048 سطر | منطق Gemini الكامل — 4 خدمات، fallback chain، safety، JSON extraction |
| `translations.ts` | 32 KB / 679 سطر | قاموس EN/AR المركزي — كل النصوص |
| `daily-log-feedback.ts` | 19.8 KB / 562 سطر | تحليل أداء السجل — tier, trend, badge, warning, evidence |
| `task-hierarchy.ts` | 6.7 KB / 239 سطر | بناء hierarchy، daily cap، main breakdown، getScorableTasks |
| `daily-focus.ts` | 9.3 KB / 316 سطر | أنواع وثوابت التركيز اليومي |
| `task-colors.ts` | 2.8 KB / 101 سطر | 6 ألوان accent (sky, emerald, amber, orange, pink, violet) + hash selection |
| `goal-dates.ts` | 2 KB / 64 سطر | حساب الأيام المتبقية/المتأخرة |
| `task-periods.ts` | 1.1 KB / 32 سطر | حساب الفترات — daily/week keys، بداية الأسبوع Monday |
| `utils.ts` | 166 B / 7 سطر | `cn()` — clsx + tailwind-merge |

### 11.15 Supabase Utils (2 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `src/utils/supabase/client.ts` | 232 B | Browser client — `createBrowserClient` |
| `src/utils/supabase/server.ts` | 999 B | Server client — `createServerClient` مع cookies |

### 11.16 Hooks (2 ملف)

| الملف | الحجم | المحتوى |
| --- | --- | --- |
| `useStreakReminder.ts` | 183 سطر | إشعارات streak — فحص كل 30 دقيقة، Browser Notification، EN/AR |
| `use-mobile.ts` | 20 سطر | كشف الموبايل — `window.innerWidth < 768` |

### 11.17 أصول Static (`public/`)

| الملف | الحالة | الاستخدام |
| --- | --- | --- |
| `logo1.svg` | **مستخدم** | شعار الوضع الفاتح |
| `logo2.svg` | **مستخدم** | شعار الوضع الداكن |
| `logo.svg` | **مستخدم** | شعار داخل بطاقات rewards |
| `patterns/waves.svg` | **مستخدم** | نمط شريط التقدم |
| `file.svg` | **Leftover** | بقايا Next template |
| `globe.svg` | **Leftover** | بقايا Next template |
| `next.svg` | **Leftover** | بقايا Next template |
| `vercel.svg` | **Leftover** | بقايا Next template |
| `window.svg` | **Leftover** | بقايا Next template |

---

## 12. إحصائية الملفات

| الفئة | العدد |
| --- | --- |
| ملفات الجذر (config) | 7 |
| ملفات التطبيق الأساسية | 4 |
| تسجيل الدخول + auth | 3 |
| Middleware | 1 |
| API Routes | 11 |
| المكونات الرئيسية | 5 |
| مكونات الأهداف | 9 |
| مكونات الداشبورد | 10 |
| مكونات التقدم | 2 |
| مكونات التحدي | 15 |
| مكونات الإعدادات | 1 |
| مكونات مشتركة | 8 |
| مكونات UI (shadcn) | 22 |
| مكتبات المنطق | 9 |
| Supabase Utils | 2 |
| Hooks | 2 |
| أصول Static | 9 |
| **المجموع** | **~120 ملف** |

**ملفات Active**: ~95 ملف | **ملفات Legacy**: ~8 ملف | **أصول Leftover**: ~5 ملف

---

## 13. الملفات غير الموصولة أو المرشحة للتنظيف

### 13.1 ملفات Legacy

- `src/components/goal/GoalCreator.tsx` — مسار AI أقدم (59 KB)، يدعم structured_input، غير mounted
- `src/components/goal/GoalTemplates.tsx` — قوالب أهداف (frequencies غير مدعومة مثل x_times_per_week)
- `src/components/goal/GoalInput.tsx` — input مركب لـ GoalCreator.tsx فقط
- `src/components/progress/DailyLogModal.tsx` — modal تسجيل قديم
- `src/components/dashboard/ActivityHistory.tsx` — سجل نشاط غير ظاهر
- `src/components/AppSidebar.tsx` — sidebar قديم (OrbitDock هو الفعلي)
- `src/components/shared/ThemeToggle.tsx` — toggle منفصل غير مستخدم
- `src/components/shared/StreakFlame.tsx` — widget streak قديم

### 13.2 أصول Leftover

`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — بقايا Next template

---

## 14. localStorage والمفاتيح المحلية

- `theme` — `"light"` أو `"dark"`
- `language` — `"en"` أو `"ar"`
- `streak_notifications_enabled` — `"true"` أو `"false"`
- `streak_last_notified_date` — تاريخ آخر إشعار (YYYY-MM-DD)
- `metrix-login-manifesto-seen` — `"true"` بعد أول مشاهدة للحوار
- `metrix:challenge-rewards:${goalId}:${targetPoints}` — البطاقات المفتوحة

---

## 15. الإشعارات والسلوك الزمني

### 15.1 Streak Reminder (`useStreakReminder.ts`)
- فحص كل 30 دقيقة
- الشرط: سجّل أمس + لم يسجل اليوم
- Browser Notification (مرة واحدة في اليوم)
- يدعم EN/AR

### 15.2 حساب الفترات (`task-periods.ts`)
- daily: تاريخ اليوم المحلي
- weekly: بداية الأسبوع = **Monday**

### 15.3 window logic في Dashboard
- day window محلي من 00:00 إلى 24:00 لتمييز المهام المكتملة "اليوم"

---

## 16. Environment Variables

| المتغير | إلزامي | الاستخدام |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | نعم | Supabase anon key |
| `GEMINI_API_KEY` | نعم | Gemini investigate/plan/evaluate/daily-focus |
| `MISTRAL_API_KEY` | اختياري (مهم عملياً) | Transcription API |

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
MISTRAL_API_KEY=your-mistral-api-key
```

---

## 17. التشغيل المحلي

```bash
npm install
npm run dev        # next dev -H localhost (مع Turbopack)
npm run build      # next build (مع React Compiler)
npm run start      # next start
npm run lint       # eslint
```

ملاحظات:
- اسم الحزمة في `package.json`: `my-app` (الـ branding الفعلي: **METRIX**)
- لا يوجد script tests
- React Compiler مفعّل عبر `babel-plugin-react-compiler` و `reactCompiler: true`

---

## 18. إذا طلب المستخدم شيئاً معيّناً، أين أعدل؟

| المطلوب | الملفات |
| --- | --- |
| الصفحة الرئيسية | `HomePage.tsx`, `page.tsx` |
| إنشاء الهدف AI | `GoalCreatorPage.tsx`, `/api/goal/investigate`, `/api/goal/plan`, `gemini.ts` |
| حفظ الهدف / هيكلة المهام | `ManualGoalCreator.tsx`, `GoalCreatorPage.tsx`, `task-hierarchy.ts` |
| واجهة المهام اليومية | `Dashboard.tsx`, `FocusTab.tsx`, `task-colors.ts`, `TaskAppearancePicker.tsx` |
| تسجيل التقدم / النقاط | `ProgressLogDialog.tsx`, `/api/goal/evaluate`, `gemini.ts`, `task-hierarchy.ts` |
| التركيز اليومي | `DailyFocusPanel.tsx`, `DailyFocusQuestionDialog.tsx`, `/api/goal/daily-focus`, `daily-focus.ts` |
| التحديات | `ChallengeTab.tsx`, `challenge/*`, `/api/challenges/*` |
| الإشعارات | `useStreakReminder.ts`, `SettingsPage.tsx` |
| الترجمة | `translations.ts` |
| الثيم / RTL | `globals.css`, `layout.tsx`, `SettingsPage.tsx` |

---

## 19. Prompt Starter لأي AI

```text
أنت تعمل على مشروع اسمه METRIX. هو تطبيق ويب خاص لتتبع الأهداف باستخدام Next.js 16 وReact 19 وTypeScript وSupabase وGemini. التطبيق ثنائي اللغة (عربي/إنجليزي) ويدعم RTL/LTR. تجربة المستخدم الرئيسية ليست متعددة الصفحات بالكامل، بل شاشة رئيسية واحدة في src/app/page.tsx تدير views داخلية: home / dashboard / goals / settings / create-goal.

المشروع مبني حول Goal -> Main Tasks -> Subtasks. كل مهمة لها frequency من نوع daily أو weekly وimpact weight. تسجيل التقدم يتم عبر ProgressLogDialog، إما AI mode أو manual mode. تقييم AI يأتي من /api/goal/evaluate ويعتمد على GeminiService داخل src/lib/gemini.ts. هناك Dashboard فيه 3 تبويبات فقط: focus / chart / challenge. جزء challenge يعتمد على Supabase RPCs. ميزة Daily Focus تولد أسئلة تركيز يومية عبر /api/goal/daily-focus.

لا تفترض وجود weekly summary route أو analytics route لأنهما غير موجودين في الكود الحالي. المسار الفعلي لإنشاء الهدف بالذكاء الاصطناعي هو GoalCreatorPage وليس GoalCreator. المسار الفعلي لتسجيل التقدم هو ProgressLogDialog وليس DailyLogModal. الترجمة في src/lib/translations.ts.
```

---

## 20. Checklist لتحديث هذا الملف

1. **Route/API جديد** → حدّث قسم 3 و9
2. **تغيير في الجداول أو RPCs** → حدّث قسم 7 و8
3. **تغيير في الـ active flow** → حدّث قسم 2
4. **ربط/حذف ملف legacy** → حدّث قسم 13
5. **تغيير في النبرة أو الهوية** → حدّث قسم 4
6. **تغيير في منطق Gemini أو scoring** → حدّث قسم 10

---

## 21. خلاصة نهائية

**METRIX هو نظام ثنائي اللغة لتخطيط الأهداف ومحاسبة التقدم اليومي بالنقاط، مع هيكل مهام هرمي، تقييم AI، تركيز يومي ذكي، وتحديات 1v1، مبني على Next.js + Supabase + Gemini.**

**الملفات المركزية لفهم التجربة الحالية**: `page.tsx`, `Dashboard.tsx`, `ProgressLogDialog.tsx`, `GoalCreatorPage.tsx`, `ManualGoalCreator.tsx`, `ChallengeTab.tsx`, `gemini.ts`.
