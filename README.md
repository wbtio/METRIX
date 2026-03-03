# METRIX

نظام متابعة أهداف ذكي مبني بـ `Next.js + Supabase + Gemini` يركز على:
- بناء خطة واقعية للهدف.
- تقييم التقدم اليومي بالنقاط.
- تحليلات أسبوعية ومتقدمة.
- تحديات 1v1 بين هدفك وهدف منافسك.

هذا الملف محدث بناءً على الكود الحالي داخل المشروع.

---

## الفكرة بسرعة

METRIX يحول الهدف من جملة عامة إلى نظام عمل يومي:
1. تحليل الهدف بالذكاء الاصطناعي.
2. إنشاء خطة قابلة للتنفيذ (مهام + مدة + جهد يومي).
3. تسجيل يومي للنشاط وتقييم تلقائي بالنقاط.
4. عرض النمو، التحليلات، والملخص الأسبوعي.
5. (جديد) تشغيل تحدي مباشر 1v1 بكود دعوة.

---

## أهم التقنيات

- **Frontend**: `Next.js 16` (App Router) + `React 19` + `TypeScript`
- **Styling/UI**: `Tailwind CSS v4` + `shadcn/ui` + `Radix UI` + `Lucide`
- **Charts**: `Recharts`
- **Backend**: Supabase (`Postgres`, `Auth`, `Storage`, `RLS`, `RPC`)
- **AI**:
  - `Google Gemini` للتحليل/التخطيط/تقييم اليومي
  - `Mistral` للملخص الأسبوعي
- **Auth**: تسجيل دخول Google عبر Supabase OAuth

---

## طريقة العمل (Workflow)

### 1) إنشاء الهدف

من الشاشة الرئيسية عندك 3 طرق:
- **AI**: عبر `GoalCreator`
- **Manual**: عبر `ManualGoalCreator`
- **Templates**: قوالب جاهزة (`GoalTemplates`)

### تدفق AI الفعلي (Gemini)

المنطق موجود في [`src/lib/gemini.ts`](/home/wbtio/Desktop/METRIX/src/lib/gemini.ts):

### Phase 1: Investigate (`/api/goal/investigate`)
- يفهم الهدف ويحدد المعلومات الناقصة.
- يطبق فلترة أمان أولية للكلمات الخطرة.
- يحترم السياق السابق (لا يعيد نفس الأسئلة).
- يعتمد قاعدة **Core 4** قبل الانتقال للخطة:
  - الوضع الحالي
  - الهدف المطلوب
  - الإطار الزمني
  - الجهد المتاح
- يخرج حالات مثل: `ok`, `needs_info`, `unrealistic`, `refused`.

### Phase 2: Plan (`/api/goal/plan`)
- يبني خطة واقعية تتكون من مهام (4 إلى 9).
- يحسب مدة متوقعة وتاريخ إنجاز.
- يولد خيارات تسريع مع tradeoffs.
- يفرض قاعدة: العادات الروتينية تكون غالبًا `time_required_minutes = 0`.

### Phase 3: Daily Judge (`/api/goal/evaluate`)
- يقارن تقريرك اليومي مع مهام الهدف.
- يعتمد تقييمًا مبنيًا على `impact_weight`.
- يضيف Bonus فقط عند جهد إضافي حقيقي.
- يطبق قواعد anti-gaming (التكرار/الغش/النص غير المرتبط).
- يستخدم آخر سجلاتك + سياق الهدف لرسالة تدريب شخصية.

### ملاحظة مهمة عن Gemini Quota/Fallback

عند استدعاء Gemini يتم استخدام سلسلة نماذج بديلة تلقائيًا في حالة 429/404/503:
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash-lite`
- `gemini-2.0-flash`
- `gemini-2.5-flash`

وعند استنفاد الحصة تُرجع الـ API استجابة `quota_exceeded` مع `retryAfterSeconds`.

---

### 2) التنفيذ اليومي وتسجيل التقدم

من `Dashboard` → زر `Log Progress`:
- يدخل المستخدم وصف النشاط نصيًا أو صوتيًا.
- يجلب النظام آخر 5 سجلات لنفس الهدف.
- يرسل البيانات لـ `/api/goal/evaluate`.
- يخزن النتيجة في `daily_logs`.
- يزيد نقاط الهدف عبر RPC:
  - `increment_goal_points(goal_uuid, points_to_add)`
- يمسح كاش التحليلات من `analytics_cache` لإجبار تحديث الأرقام.

---

### 3) التحليلات والملخص الأسبوعي

### Advanced Analytics (`/api/analytics`)
- مقارنة نقاط هذا الأسبوع بالأسبوع السابق.
- متوسط النقاط لكل سجل.
- عدد الأيام النشطة.
- أفضل يوم إنتاجية.
- توقع تاريخ الإنجاز.
- حالة الالتزام مع الخطة (`onTrack` + `daysAheadOrBehind`).
- **Caching** في `analytics_cache` لمدة ساعة.

### Weekly Summary (`/api/weekly-summary`)
- يستخدم `Mistral` لإنتاج ملخص أسبوعي.
- يخزن الناتج في `weekly_summaries`.
- يدعم `forceRefresh`.
- إذا لا يوجد نشاط أسبوعي، ينشئ ملخصًا افتراضيًا مناسبًا.

---

### 4) ميزة التحديات 1v1 (الإضافة الجديدة)

الواجهة: `ChallengeTab`  
الـ API:
- `/api/challenges/create`
- `/api/challenges/join`
- `/api/challenges/end`
- `/api/challenges/by-goal`

قاعدة البيانات (موجودة في المايغريشن):
- [`supabase/migrations/20260227_add_challenges.sql`](/home/wbtio/Desktop/METRIX/supabase/migrations/20260227_add_challenges.sql)
- [`supabase/migrations/20260227_fix_challenge_invite_code_gen_random_bytes.sql`](/home/wbtio/Desktop/METRIX/supabase/migrations/20260227_fix_challenge_invite_code_gen_random_bytes.sql)

تشمل:
- جداول:
  - `challenge_rooms`
  - `challenge_participants`
- دوال RPC:
  - `create_goal_challenge`
  - `join_goal_challenge`
  - `end_goal_challenge`
  - `generate_challenge_invite_code`
- صلاحيات/RLS للمشاركين فقط.
- حالات التحدي:
  - `none`
  - `pending`
  - `active`
  - `ended`

لوحة النتيجة تعرض:
- نقاط اليوم
- آخر 7 أيام
- الإجمالي
- آخر الأحداث من `daily_logs`

---

## Authentication

- تسجيل دخول Google عبر Supabase OAuth.
- Middleware يحمي التطبيق ويحول غير المسجلين إلى `/login`.
- Callback في `/auth/callback`.

التفاصيل خطوة بخطوة موجودة في:
- [`SETUP_AUTH.md`](/home/wbtio/Desktop/METRIX/SETUP_AUTH.md)

---

## متغيرات البيئة المطلوبة

أنشئ ملف `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
MISTRAL_API_KEY=...
```

ملاحظات:
- `SUPABASE_SERVICE_ROLE_KEY` مستخدم في weekly summary API فقط (سيرفر).
- لا تضع service role key في الكلاينت.

---

## متطلبات قاعدة البيانات

المشروع يعتمد على وجود الكيانات التالية:
- `goals`
- `sub_layers`
- `daily_logs`
- `weekly_summaries`
- `analytics_cache`
- `challenge_rooms`
- `challenge_participants`
- RPC: `increment_goal_points`

مايغريشن التحديات موجودة داخل `supabase/migrations`.
أما الجداول الأساسية (goals/sub_layers/...) يجب أن تكون موجودة في مشروع Supabase لديك قبل التشغيل.

---

## التشغيل المحلي

```bash
npm install
npm run dev
```

ثم افتح:
- `http://localhost:3000`

---

## هيكل المشروع (مختصر)

```text
src/
  app/
    api/
      goal/           # investigate / plan / evaluate (Gemini)
      analytics/      # advanced analytics + cache
      weekly-summary/ # Mistral weekly summary
      challenges/     # 1v1 challenges APIs
    login/
    auth/callback/
  components/
    GoalCreator.tsx
    ManualGoalCreator.tsx
    Dashboard.tsx
    DailyLogModal.tsx
    ChallengeTab.tsx
    ...
  lib/
    gemini.ts
    translations.ts
  utils/supabase/
    client.ts
    server.ts
supabase/
  migrations/
```

---

## ملاحظات تشغيلية مهمة

- الإدخال الصوتي يعتمد على `SpeechRecognition` في المتصفح (أفضل دعم على Chrome/Edge).
- عند حصول `quota_exceeded` من Gemini، الواجهة تعرض وقت الانتظار تلقائيًا.
- Dashboard يصحح تلقائيًا عدم تطابق النقاط (reconciliation من `daily_logs`).
- التنبيهات الخاصة بالسلسلة (streak) تعتمد على إذن Notifications في المتصفح.

---

## API Endpoints (ملخص)

- `POST /api/goal/investigate`
- `POST /api/goal/plan`
- `POST /api/goal/evaluate`
- `POST /api/analytics`
- `POST /api/weekly-summary`
- `POST /api/challenges/create`
- `POST /api/challenges/join`
- `POST /api/challenges/end`
- `POST /api/challenges/by-goal`

---

## License

MIT
