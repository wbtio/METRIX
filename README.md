# METRIX

> مرجع حيّ للمشروع مخصص للبشر والذكاء الاصطناعي.
> هذا الملف يشرح ما هو موجود فعلاً في الكود الحالي داخل المستودع، وليس ما كان موجوداً في وثائق أقدم أو ما هو مخطط له مستقبلاً.

---

## 1. ما هو هذا المشروع؟

**METRIX** هو تطبيق ويب خاص لتتبع الأهداف الشخصية باستخدام:

- **Next.js 16 + React 19 + TypeScript**
- **Supabase** للمصادقة وقاعدة البيانات والتخزين
- **Google Gemini** للتحقيق في الهدف، بناء الخطة، وتقييم سجل التقدم اليومي
- **Mistral Voxtral** لتحويل الصوت إلى نص

الفكرة الأساسية ليست “To-Do List” تقليدية، بل نظام صارم لمراقبة التقدم بالأرقام:

- الهدف يتحول إلى **مهام رئيسية** و**مهام فرعية**
- كل مهمة لها **تكرار** (`daily` أو `weekly`) و**وزن تأثير**
- المستخدم يسجل تقدمه يومياً
- الذكاء الاصطناعي يقيّم السجل ويمنح نقاطاً
- التقدم يتراكم داخل الهدف
- توجد أيضاً ميزة **تحديات 1v1** بين هدفين يملكهـما مستخدمان مختلفان

نبرة المنتج الحالية تميل إلى:

- الصرامة
- المحاسبة
- التقدم القابل للقياس
- دعم العربية والإنجليزية

---

## 2. حقائق سريعة مهمة جداً لأي AI

هذه النقاط هي أكثر الأشياء التي يجب ألا يخطئ فيها أي AI يعمل على المشروع:

1. التطبيق الرئيسي فعلياً **ليس Multi-Page App تقليدية** من منظور UX؛ ملف `src/app/page.tsx` يدير التنقل الداخلي بين views عبر state:
   `home` / `dashboard` / `settings` / `goals` / `create-goal`.
2. الداشبورد الحالي يحتوي **3 تبويبات فقط**:
   `focus` / `chart` / `challenge`.
   لا يوجد حالياً تبويب Activity History داخل الداشبورد المعروض.
3. المسار المستخدم فعلياً لإنشاء الهدف بالذكاء الاصطناعي هو:
   `src/components/goal/GoalCreatorPage.tsx`
   وليس `src/components/goal/GoalCreator.tsx`.
4. نافذة تسجيل التقدم المستخدمة حالياً هي:
   `src/components/progress/ProgressLogDialog.tsx`
   وليس `src/components/progress/DailyLogModal.tsx`.
5. الرفع الصوتي الحالي يعتمد على `MISTRAL_API_KEY`.
   الكود **لا يملك fallback عملي حقيقي داخل الواجهة** إلى Web Speech API؛ الواجهة الحالية فقط تعرض حالة فشل/تحذير عند عدم توفر Mistral.
6. تدفق إنشاء الهدف بالذكاء الاصطناعي يرسل حالياً `structured_input: {}` دائماً.
   أي أن البنية الأعمق المدعومة داخل `GeminiService` موجودة، لكنها **غير مستخدمة** في المسار النشط.
7. حفظ الهدف من `GoalCreatorPage` يضع حالياً:
   `target_points = 10000`
   بشكل ثابت.
8. المسار اليدوي `ManualGoalCreator` هو المسار الوحيد الذي يسمح للمستخدم بتحديد:
   تاريخ البداية، تاريخ النهاية، والنقاط المستهدفة قبل الحفظ.
9. نظام التحديات يعتمد على **Supabase RPCs**؛ المنطق الأساسي ليس كله داخل الواجهة.
10. لا توجد حالياً **اختبارات** أو **سكريبت test** داخل `package.json`.
11. `README` القديم كان يذكر ميزات غير موجودة حالياً مثل:
   ملخص أسبوعي API، analytics route، وتفاصيل أخرى غير مطابقة للكود الحالي.
12. هناك عدة ملفات **legacy / غير موصولة حالياً** وسيتم ذكرها لاحقاً حتى لا يعدّل AI الملف الخطأ.

---

## 3. خريطة المنتج الحالية

### 3.1 المسارات الحقيقية في App Router

المشروع يعرّف المسارات التالية فعلياً:

- `/`
  التطبيق الرئيسي بعد تسجيل الدخول
- `/login`
  شاشة تسجيل الدخول عبر Google OAuth
- `/auth/callback`
  إتمام جلسة Supabase بعد OAuth
- `/api/goal/investigate`
- `/api/goal/plan`
- `/api/goal/evaluate`
- `/api/transcribe`
- `/api/challenges/create`
- `/api/challenges/join`
- `/api/challenges/end`
- `/api/challenges/by-goal`
- `/api/challenges/history`

### 3.2 الشاشات/الـ Views داخل الصفحة الرئيسية

ملف `src/app/page.tsx` يحرك الواجهة بين الحالات التالية:

| View | الغرض | الملف الأساسي |
| --- | --- | --- |
| `home` | الصفحة الرئيسية مع حقل كتابة الهدف وعرض الأهداف الأخيرة | `src/components/HomePage.tsx` |
| `create-goal` | إنشاء الهدف يدوياً أو بالذكاء الاصطناعي | `src/components/goal/GoalCreatorPage.tsx` + `src/components/goal/ManualGoalCreator.tsx` |
| `dashboard` | عرض الهدف الحالي، المهام، الرسم البياني، التحديات | `src/components/dashboard/Dashboard.tsx` |
| `goals` | قائمة كل الأهداف وإدارتها | `src/components/goal/GoalsList.tsx` |
| `settings` | اللغة، الثيم، الإشعارات، الملف الشخصي | `src/components/settings/SettingsPage.tsx` |

### 3.3 أسلوب التنقل

- التنقل بين هذه الـ views يتم داخل React state وليس عبر routes منفصلة لكل شاشة.
- شريط التنقل الحقيقي المستخدم حالياً هو:
  `src/components/OrbitDock.tsx`
- هناك guard يمنع مغادرة شاشة الإنشاء AI إذا كانت هناك جلسة إنشاء غير محفوظة.

---

## 4. هوية المنتج والنبرة

### 4.1 هوية بصرية

- الخلفية العامة تُبنى عبر `OrbitShell`
- يوجد أسلوب orbit / glow / cosmic / matrix
- الثيم الفاتح والداكن موجودان
- الشعار المستخدم:
  - `public/logo1.svg` للوضع الفاتح
  - `public/logo2.svg` للوضع الداكن
  - `public/logo.svg` يستخدم داخل بطاقات rewards
- شريط التقدم يستخدم:
  `public/patterns/waves.svg`

### 4.2 الخطوط

من `src/app/layout.tsx`:

- **IBM Plex Sans Arabic** للعربية
- **Plus Jakarta Sans** للاتينية

### 4.3 نبرة النصوص

المشروع ليس لطيفاً أو ناعماً بالكامل؛ فيه لهجة صارمة ومباشرة، مثل:

- شعار home الحالي يحمل عبارة قاسية/هجومية نسبياً
- `MatrixManifestoDialog` يشرح أن المنتج صُمم كـ “نظام تتبع صارم” لا كقائمة مهام عادية

إذا كان AI سيولد copy أو prompts أو UI text، الأفضل أن يحافظ على:

- الوضوح
- المباشرة
- شعور الالتزام والانضباط
- عدم تحويل المنتج إلى productivity app عامة بلا شخصية

---

## 5. التدفقات الوظيفية الأساسية

### 5.1 تسجيل الدخول

الملفات:

- `src/app/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`

السلوك:

1. المستخدم يدخل `/login`
2. إذا كانت الجلسة موجودة يتم تحويله إلى `/`
3. إذا لم تكن هناك جلسة:
   - يمكن فتح `MatrixManifestoDialog`
   - عند الضغط على تسجيل الدخول يتم `signInWithOAuth` عبر Google
4. بعد callback:
   - `exchangeCodeForSession`
   - redirect إلى `/`
5. `middleware.ts` يحمي كل المسارات تقريباً ما عدا:
   - `/login`
   - `/auth/callback`
   - static assets الأساسية

### 5.2 الصفحة الرئيسية Home

الملف:

- `src/components/HomePage.tsx`

وظيفتها:

- استقبال نص هدف جديد
- دعم تسجيل صوتي للهدف وإرساله إلى `/api/transcribe`
- عرض الأهداف الأخيرة
- فتح مسار إنشاء الهدف:
  - `AI Plan`
  - `Manual`

تفاصيل مهمة:

- إذا كان نص الهدف أقل من **15 كلمة تقريباً**، زر AI لا يذهب مباشرة للإنشاء؛ بل يظهر تحفيز للمستخدم كي يعطي تفاصيل أكثر.
- الواجهة تكتشف اتجاه النص (`RTL/LTR`) محلياً لعرض العناوين بشكل مناسب.
- عدد الأهداف الأخيرة المعروضة:
  - حتى 4 على الشاشات العادية
  - حتى 2 على الهاتف

### 5.3 إنشاء الهدف بالذكاء الاصطناعي

الملف النشط:

- `src/components/goal/GoalCreatorPage.tsx`

المراحل:

1. `INVESTIGATING`
   إرسال الهدف إلى `/api/goal/investigate`
2. `QUESTIONS`
   عرض أسئلة المتابعة إن وجدت
3. `GENERATING_PLAN`
   إرسال الهدف + الإجابات إلى `/api/goal/plan`
4. `REVIEW`
   عرض الخطة وتعديل أسماء المهام الفرعية/الرئيسية والأوزان
5. `SAVE`
   حفظ الهدف والمهام في Supabase

ملاحظات دقيقة:

- اللغة تُحسم هكذا:
  إذا كان النص الأولي يحتوي حروفاً عربية، يتم إجبار التجربة إلى العربية.
- `structured_input` حالياً **فارغ** في هذا المسار.
- عند الحفظ:
  - يتم إنشاء row في `goals`
  - ثم إنشاء main tasks في `sub_layers`
  - ثم subtasks تحتها
- هذا المسار يضع `target_points = 10000` ثابتاً.
- هذا المسار لا يعطي للمستخدم شاشة اختيار target points قبل الحفظ.

### 5.4 إنشاء الهدف يدوياً

الملف:

- `src/components/goal/ManualGoalCreator.tsx`

المراحل:

1. `DETAILS`
   عنوان الهدف + الوصف
2. `TIMELINE`
   تاريخ البداية + النهاية + target points
3. `TASKS`
   بناء main tasks وsubtasks يدوياً
4. `REVIEW`
   مراجعة نهائية

ميزات هذا المسار:

- المستخدم يحدد:
  - `startDate`
  - `endDate`
  - `targetPoints`
- يمكنه بناء هيكل هرمي كامل قبل الحفظ
- يحفظ `ai_summary` كنص يدوي أو عبارة fallback

### 5.5 قائمة الأهداف

الملف:

- `src/components/goal/GoalsList.tsx`

الوظائف:

- عرض كل الأهداف
- تحديد هدف للدخول إلى Dashboard
- Pin / Unpin
- Edit
- Delete
- عرض progress bar لكل هدف
- عرض chip لعدد الأيام المتبقية أو المتأخرة نسبةً إلى `estimated_completion_date`

### 5.6 Dashboard

الملف المحوري:

- `src/components/dashboard/Dashboard.tsx`

التبويبات الحالية:

1. **Focus**
   - `src/components/dashboard/FocusTab.tsx`
2. **Chart**
   - `src/components/dashboard/GrowthChart.tsx`
   - `src/components/dashboard/DayCalendarGrid.tsx`
   - `src/components/dashboard/TaskInsights.tsx`
3. **Challenge**
   - `src/components/ChallengeTab.tsx`

وظائف الداشبورد العامة:

- جلب المهام من `sub_layers`
- جلب check-ins من `task_checkins`
- جلب سجلات اليوم من `daily_logs.breakdown`
- حساب streak
- جلب بيانات الرسم البياني
- إدارة هدف واحد بالكامل

### 5.7 Focus Tab

الملف:

- `src/components/dashboard/FocusTab.tsx`

وظيفته:

- عرض main tasks وsubtasks
- فلترة حسب:
  - `all`
  - `daily`
  - `weekly`
- expand/collapse لكل main task
- CRUD داخل الواجهة:
  - إضافة main task
  - إضافة subtask
  - rename
  - delete
  - تغيير icon
  - تغيير color
  - تغيير weight
- check/uncheck للمهام
- تمييز المهام المكتملة اليوم
- animation عند اكتمال المهمة

ملاحظة بنيوية مهمة:

- `buildTaskHierarchy()` يحول الصفوف القادمة من `sub_layers` إلى:
  `MainTask[]` مع `subtasks[]`

### 5.8 تسجيل التقدم اليومي

الملف النشط:

- `src/components/progress/ProgressLogDialog.tsx`

أنماط التسجيل:

1. `ai`
   المستخدم يكتب ما فعله، والذكاء الاصطناعي يقيّمه
2. `manual`
   المستخدم يحدد المهام المنجزة مباشرة

في كلا الحالتين:

- يتم إنشاء row في `daily_logs`
- يتم تحديث نقاط الهدف عبر RPC:
  `increment_goal_points`
- يتم إرسال حدث:
  `challenge-log-updated`
  لتحديث challenge UI مباشرة

تفصيل دقيق:

- في الوضع manual:
  - النقاط تُحسب محلياً
  - bonus الوقت يُحسب محلياً أيضاً
- في الوضع ai:
  - يتم استدعاء `/api/goal/evaluate`
  - ثم تُحفظ النتيجة

ملاحظة تنفيذية مهمة جداً:

- `ProgressLogDialog` يرسل `calculateTimeBonus: true` في AI mode
- لكن `src/app/api/goal/evaluate/route.ts` لا يمرر هذا الوسيط إلى `GeminiService.evaluateDailyLog`
- لذلك **Bonus الوقت في AI mode غير مضمون حالياً من جهة التنفيذ**
- Bonus الوقت الموثوق حالياً هو الموجود في **manual mode**

### 5.9 Chart Tab

#### Growth Chart

الملف:

- `src/components/dashboard/GrowthChart.tsx`

يوفر:

- Bar / Line / Area
- Week / Month / Year / All
- تجميع points حسب اليوم

#### Day Calendar Grid

الملف:

- `src/components/dashboard/DayCalendarGrid.tsx`

الوظيفة:

- heatmap مصغّر لأيام الشهر
- فتح modal عند اختيار يوم
- عرض السجلات الموجودة في ذلك اليوم

ملاحظة:

- الشكل الحالي ليس calendar تقليدي 7 أعمدة
- بل شبكة compact فيها تمثيل مرئي لكثافة النشاط

#### Task Radar

الملف:

- `src/components/dashboard/TaskInsights.tsx`

الوظيفة:

- تحليل التكرار والنقاط لكل مهمة قابلة للتسجيل
- دمج بيانات:
  - `task_checkins`
  - `daily_logs.breakdown`
- إظهار:
  - Top tasks
  - Weekly pulse
  - dialog لتفاصيل المهمة

### 5.10 التحديات 1v1

الملف الرئيسي:

- `src/components/ChallengeTab.tsx`

الحالات:

- `none`
- `pending`
- `active`
- `ended`

التدفق:

1. host ينشئ challenge
2. يحصل على invite code
3. guest ينضم عبر code من هدفه
4. scoreboard يتحدث تلقائياً
5. يمكن إنهاء challenge
6. history يُعرض للأرشيف

تفاصيل التنفيذ:

- polling كل 20 ثانية
- refresh مباشر عند `challenge-log-updated`
- snapshots تأتي من:
  `POST /api/challenges/by-goal`
- archive يأتي من:
  `POST /api/challenges/history`

### 5.11 Rewards داخل التحديات

الملف:

- `src/components/challenge/RewardsSection.tsx`

الفكرة:

- deck من “رتب/بطاقات Matrix”
- thresholds تتوسع نسبةً إلى `targetPoints` للهدف
- البطاقات المفتوحة تُحفظ في `localStorage`

المفتاح:

- `metrix:challenge-rewards:${goalId}:${targetPoints}`

### 5.12 Settings

الملف:

- `src/components/settings/SettingsPage.tsx`

الوظائف:

- تغيير الثيم Light / Dark
- تغيير اللغة EN / AR
- تفعيل/تعطيل إشعارات streak
- تعديل display name
- رفع/حذف صورة المستخدم
- عرض إحصائيات الحساب
- فتح `MatrixManifestoDialog`
- تسجيل الخروج

---

## 6. البنية التقنية

### 6.1 Stack

| المجال | التقنية |
| --- | --- |
| Framework | Next.js 16.1.4 |
| UI | React 19.2.3 |
| اللغة | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI |
| Icons | lucide-react |
| Charts | Recharts |
| Auth/DB | Supabase |
| AI | Google Gemini |
| Speech-to-Text | Mistral Voxtral |

### 6.2 البنية العامة

- `src/app/layout.tsx`
  root layout + fonts + theme bootstrapping
- `src/app/page.tsx`
  orchestrator الرئيسي للمنتج
- `src/middleware.ts`
  حارس الجلسة
- `src/utils/supabase/client.ts`
  browser client
- `src/utils/supabase/server.ts`
  server client

### 6.3 ملاحظة معمارية مهمة

المشروع **يمزج** بين:

- client-side fetching مباشر من Supabase داخل كثير من المكونات
- route handlers للسيرفر في المسارات الحساسة
- route handlers للـ AI والتحديات

أي أنه ليس “server actions architecture” خالص، وليس “REST-only architecture” خالص.

### 6.4 OrbitShell + OrbitDock

- `OrbitShell` يبني الخلفية المتحركة والـ glow/noise
- `OrbitDock` هو navigation الحقيقي
- يظهر pinned goals بحد أقصى **2**

### 6.5 الثيم والاتجاه

- RootLayout يبدأ افتراضياً بـ `lang="ar"` و `dir="rtl"`
- بعد hydration، `src/app/page.tsx` يقرأ `localStorage.language`
- `SettingsPage` يغيّر:
  - `localStorage.theme`
  - `localStorage.language`
  - `<html dir>`
  - `<html lang>`

---

## 7. النموذج البياني للبيانات Data Model

> هذا القسم مبني على الأعمدة المستخدمة فعلياً في الكود، وليس على schema SQL صريح داخل المستودع.

### 7.1 `goals`

الأعمدة المستخدمة:

- `id`
- `user_id`
- `title`
- `domain`
- `current_points`
- `target_points`
- `status`
- `created_at`
- `estimated_completion_date`
- `total_days`
- `ai_summary`
- `icon`
- `is_pinned`

الدور:

- الكيان الأعلى في النظام
- يمثل هدفاً واحداً للمستخدم

### 7.2 `sub_layers`

الأعمدة المستخدمة:

- `id`
- `goal_id`
- `task_description`
- `impact_weight`
- `frequency`
- `time_required_minutes`
- `completion_criteria`
- `task_type`
- `parent_task_id`
- `sort_order`
- `icon`
- `accent_color`

الدور:

- تخزين main tasks وsubtasks في جدول واحد
- التمييز يتم عبر:
  `task_type = 'main' | 'sub'`

### 7.3 `daily_logs`

الأعمدة المستخدمة:

- `id`
- `goal_id`
- `created_at`
- `user_input`
- `ai_score`
- `ai_feedback`
- `breakdown`

الدور:

- سجل يومي للتقدم
- `breakdown` يحتفظ بتفصيل تقييم المهام

### 7.4 `task_checkins`

الأعمدة المستخدمة:

- `id`
- `goal_id`
- `task_id`
- `period_type`
- `period_start`
- `completed`
- `completed_at`

الدور:

- check-ins دورية على مستوى المهمة
- تستخدم للتعليم اليدوي ولمظاهر “completed today”

### 7.5 `challenge_rooms`

الأعمدة المستخدمة:

- `id`
- `invite_code`
- `created_at`
- `ended_at`

### 7.6 `challenge_participants`

الأعمدة المستخدمة:

- `challenge_id`
- `user_id`
- `goal_id`
- `role`
- `display_name_snapshot`
- `avatar_url_snapshot`
- `goal_title_snapshot`
- `joined_at`
- `left_at`

### 7.7 Storage bucket

- bucket:
  `avatars`

يستخدم في `SettingsPage` لصور الملف الشخصي.

---

## 8. RPCs المستخدمة من Supabase

### 8.1 `increment_goal_points`

المستخدم في:

- `DailyLogModal`
- `ProgressLogDialog`

الغرض:

- زيادة نقاط الهدف atomically
- تجنب مشاكل race conditions

### 8.2 `create_goal_challenge`

المستخدم في:

- `POST /api/challenges/create`

الغرض:

- إنشاء challenge room
- تسجيل host participant

### 8.3 `join_goal_challenge`

المستخدم في:

- `POST /api/challenges/join`

الغرض:

- انضمام مستخدم آخر إلى challenge موجود

### 8.4 `end_goal_challenge`

المستخدم في:

- `POST /api/challenges/end`

الغرض:

- إغلاق challenge

---

## 9. API Reference

### 9.1 `POST /api/goal/investigate`

الملفات:

- `src/app/api/goal/investigate/route.ts`
- `src/lib/gemini.ts`

المدخلات:

```json
{
  "goal": "string",
  "context": {},
  "structured_input": {}
}
```

الوظيفة:

- فحص سلامة الهدف
- تقييم مدى وضوحه
- طلب معلومات ناقصة إذا لزم

### 9.2 `POST /api/goal/plan`

الملفات:

- `src/app/api/goal/plan/route.ts`
- `src/lib/gemini.ts`

المدخلات:

```json
{
  "goal": "string",
  "answers": {},
  "targetDeadline": "optional string",
  "structured_input": {}
}
```

الوظيفة:

- تحويل الهدف إلى plan hierarchical
- إرجاع `main_tasks[]` و`subtasks[]`

### 9.3 `POST /api/goal/evaluate`

الملفات:

- `src/app/api/goal/evaluate/route.ts`
- `src/lib/gemini.ts`

المدخلات المتوقعة:

```json
{
  "tasks": [],
  "mainTasks": [],
  "log": "string",
  "previousLogs": [],
  "goalContext": {}
}
```

الوظيفة:

- تقييم اليوم
- إرجاع breakdown + total points + coach message

ملاحظة مهمة:

- route handler الحالي لا يمرر `calculateTimeBonus`
- لذلك AI mode لا يستفيد من هذا العلم كما يوحي client

### 9.4 `POST /api/transcribe`

الملف:

- `src/app/api/transcribe/route.ts`

المدخلات:

- `FormData`
  - `audio`
  - `language`

الوظيفة:

- إرسال الملف إلى Mistral Voxtral
- إرجاع:
  - `text`
  - `language`
  - `duration`
  - `fallback`

المهم:

- إذا لم يوجد `MISTRAL_API_KEY` يرجع `fallback: true`
- الواجهة الحالية لا تنفذ fallback صوتي محلي فعلي

### 9.5 `POST /api/challenges/create`

الوظيفة:

- إنشاء challenge أو إعادة challenge مفتوح موجود لنفس goal

### 9.6 `POST /api/challenges/join`

الوظيفة:

- الانضمام عبر invite code

### 9.7 `POST /api/challenges/end`

الوظيفة:

- إنهاء challenge

### 9.8 `POST /api/challenges/by-goal`

الوظيفة:

- بناء snapshot كامل للتحدي الحالي:
  - status
  - me/opponent
  - scoreboard
  - recent events
  - invite code

### 9.9 `POST /api/challenges/history`

الوظيفة:

- إرجاع آخر challenges منتهية لهذا الهدف

---

## 10. منطق الذكاء الاصطناعي داخل `src/lib/gemini.ts`

### 10.1 الخدمات الأساسية

`GeminiService` يحتوي على 3 وظائف محورية:

1. `investigateGoal`
2. `createPlan`
3. `evaluateDailyLog`

### 10.2 اختيار الموديل

يوجد fallback chain:

1. `gemini-2.5-flash-lite`
2. `gemini-2.0-flash-lite`
3. `gemini-2.0-flash`
4. `gemini-2.5-flash`

السلوك:

- إذا حصل `429` ينتقل للموديل التالي
- إذا حصل `503` يعيد المحاولة مرة ثم قد ينتقل للموديل التالي
- إذا فشلت السلسلة كلها يرمي `GeminiQuotaError`

### 10.3 Safety

يتم فحص كلمات خطرة مرتبطة بـ:

- self-harm
- violence
- explosives
- fraud
- weapons
- child abuse

إذا فشل الفحص:

- لا تُبنى الخطة
- يعاد رد `refused`

### 10.4 تحقيق الهدف `investigateGoal`

المهمة:

- فهم الهدف
- معرفة إن كان “جاهزاً للتخطيط”
- طلب 2 إلى 4 أسئلة متابعة

Core 4 المطلوبة:

1. current state
2. target state
3. timeline
4. available effort

### 10.5 التخطيط `createPlan`

المهمة:

- إنتاج main tasks
- كل main task يحتوي subtasks
- frequencies المدعومة فقط:
  - `daily`
  - `weekly`

يوجد أيضاً:

- `realism_check`
- `speedup`
- `ai_summary`

### 10.6 تقييم السجل اليومي `evaluateDailyLog`

يعتمد على:

- scorable tasks
- previous logs
- goal context

القواعد المهمة:

- إذا وجدت subtasks، التقييم يكون عليها
- إذا لم توجد subtasks، تتحول main tasks إلى fallback scorable tasks
- `done` يعطي تقريباً 80%-100% من وزن المهمة
- `partial` يعطي تقريباً 30%-60%
- `missed` / `unknown` = 0

### 10.7 daily cap

من `src/lib/task-hierarchy.ts`:

```ts
dailyCap = max(5, sum(scorableTaskWeights) + 5)
```

أي:

- مجموع أوزان المهام القابلة للتسجيل
- زائد 5
- وبحد أدنى 5

### 10.8 نواتج إضافية

بعد التقييم، الكود يبني:

- `subtask_breakdown`
- alias باسم `task_breakdown`
- `main_breakdown`
- `score`
- `daily_cap`

---

## 11. الوحدات البرمجية المهمة

### 11.1 ملفات التطبيق الأساسية

| الملف | الدور |
| --- | --- |
| `src/app/page.tsx` | منسق التطبيق بالكامل وحارس التنقل بين الـ views |
| `src/app/layout.tsx` | layout عام + fonts + script الثيم |
| `src/middleware.ts` | حماية الجلسات وتحويل غير المسجّل إلى `/login` |
| `src/components/OrbitShell.tsx` | shell البصري والخلفية |
| `src/components/OrbitDock.tsx` | شريط التنقل الحقيقي |

### 11.2 إنشاء وإدارة الأهداف

| الملف | الحالة | الدور |
| --- | --- | --- |
| `src/components/goal/GoalCreatorPage.tsx` | Active | AI goal creation flow الحالي |
| `src/components/goal/ManualGoalCreator.tsx` | Active | manual goal creation |
| `src/components/goal/GoalsList.tsx` | Active | قائمة الأهداف |
| `src/components/goal/GoalEditDialog.tsx` | Active | تعديل الهدف بعد إنشائه |
| `src/components/goal/IconPicker.tsx` | Active | اختيار أيقونات الأهداف |
| `src/components/goal/GoalCompletionCelebration.tsx` | Active | احتفال اكتمال الهدف |
| `src/components/goal/GoalCreator.tsx` | Legacy / غير موصول | مسار AI أقدم وأغنى لكنه غير مستخدم حالياً |
| `src/components/goal/GoalTemplates.tsx` | Legacy / غير موصول | قوالب أهداف غير مدمجة في التجربة الحالية |
| `src/components/goal/GoalInput.tsx` | Legacy / تابع للمسار القديم | input مركب مستخدم في `GoalCreator.tsx` فقط |

### 11.3 الداشبورد والتحليل

| الملف | الحالة | الدور |
| --- | --- | --- |
| `src/components/dashboard/Dashboard.tsx` | Active | coordinator للهدف داخل dashboard |
| `src/components/dashboard/FocusTab.tsx` | Active | task focus + CRUD + checkins |
| `src/components/dashboard/DashboardHeader.tsx` | Active | رأس الهدف الحالي |
| `src/components/dashboard/GrowthChart.tsx` | Active | الرسم البياني |
| `src/components/dashboard/DayCalendarGrid.tsx` | Active | heatmap + day detail |
| `src/components/dashboard/TaskInsights.tsx` | Active | radar / top tasks |
| `src/components/dashboard/ToastNotification.tsx` | Active | toast بسيط |
| `src/components/dashboard/ActivityHistory.tsx` | Legacy / غير موصول | سجل نشاط UI غير ظاهر حالياً في dashboard |

### 11.4 التقدم اليومي

| الملف | الحالة | الدور |
| --- | --- | --- |
| `src/components/progress/ProgressLogDialog.tsx` | Active | تسجيل التقدم الحالي |
| `src/components/progress/DailyLogModal.tsx` | Legacy / غير موصول | modal أقدم للتسجيل |

### 11.5 التحديات

الوحدة كاملة موزعة على:

- `src/components/ChallengeTab.tsx`
- `src/components/challenge/*`
- `src/app/api/challenges/*`

### 11.6 Shared / Support

| الملف | الحالة | الدور |
| --- | --- | --- |
| `src/components/shared/ConfirmModal.tsx` | Active | تأكيد الحذف أو المغادرة |
| `src/components/shared/GoalProgressBar.tsx` | Active | progress bar |
| `src/components/shared/VoiceRecorder.tsx` | Active | تسجيل صوت وإرساله لـ `/api/transcribe` |
| `src/components/shared/TaskColorPicker.tsx` | Active | اختيار لون المهمة الرئيسية |
| `src/components/shared/TaskAppearancePicker.tsx` | Active | تغيير إيموجي/لون المهمة |
| `src/components/shared/FullEmojiPicker.tsx` | Active | emoji picker |
| `src/components/shared/ThemeToggle.tsx` | غير موصول حالياً | toggle منفصل غير مستخدم في flow الحالي |
| `src/components/shared/StreakFlame.tsx` | غير موصول حالياً | widget streak قديم غير ظاهر حالياً |

### 11.7 مكتبات المنطق

| الملف | الدور |
| --- | --- |
| `src/lib/gemini.ts` | منطق Gemini الكامل |
| `src/lib/task-hierarchy.ts` | بناء hierarchy وحساب cap وتفكيك breakdown |
| `src/lib/task-periods.ts` | daily/week keys وبداية الأسبوع Monday |
| `src/lib/task-colors.ts` | ألوان accent للمسارات الرئيسية |
| `src/lib/goal-dates.ts` | chips الأيام المتبقية/المتأخرة |
| `src/lib/translations.ts` | قاموس EN/AR المركزي |
| `src/lib/utils.ts` | `cn()` |

---

## 12. حالة الملفات غير الموصولة أو المرشحة للتنظيف

هذه القائمة مهمة جداً لأي AI حتى لا يعدّل ملفات غير مؤثرة:

### 12.1 ملفات موجودة لكن غير مستخدمة في التجربة الرئيسية الحالية

- `src/components/goal/GoalCreator.tsx`
- `src/components/progress/DailyLogModal.tsx`
- `src/components/dashboard/ActivityHistory.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/shared/ThemeToggle.tsx`
- `src/components/shared/StreakFlame.tsx`
- `src/components/goal/GoalTemplates.tsx`

### 12.2 ملاحظات على هذه الملفات

- `GoalCreator.tsx`
  يدعم `structured_input` ويبدو أغنى من المسار الحالي، لكنه غير mounted.
- `GoalTemplates.tsx`
  يحتوي قوالب فيها frequency مثل `x_times_per_week` بينما المنظومة الحالية الرسمية تدعم فقط:
  `daily` و`weekly`.
- `AppSidebar.tsx`
  مبني على shadcn sidebar، لكن التطبيق الفعلي يستخدم `OrbitDock`.
- `DailyLogModal.tsx`
  modal قديم يكرر جزءاً من منطق `ProgressLogDialog`.

### 12.3 أصول static يحتمل أنها leftovers من scaffold

داخل `public/` توجد ملفات تبدو أقرب لبقايا Next template:

- `file.svg`
- `globe.svg`
- `next.svg`
- `vercel.svg`
- `window.svg`

بينما الأصول المستخدمة بوضوح في المنتج الحالي هي:

- `logo.svg`
- `logo1.svg`
- `logo2.svg`
- `patterns/waves.svg`

---

## 13. localStorage والمفاتيح المحلية

المفاتيح المستخدمة حالياً:

- `theme`
- `language`
- `streak_notifications_enabled`
- `streak_last_notified_date`
- `metrix-login-manifesto-seen`
- `metrix:challenge-rewards:${goalId}:${targetPoints}`

هذا مفيد إذا كان AI سيعدل:

- onboarding
- settings
- reward persistence
- hydration logic

---

## 14. الإشعارات والسلوك الزمني

### 14.1 Streak Reminder

الملف:

- `src/hooks/useStreakReminder.ts`

السلوك:

- فحص كل 30 دقيقة
- الشرط:
  - المستخدم سجّل أمس
  - لكنه لم يسجل اليوم
- إذا تحقّق الشرط:
  - يصدر Browser Notification
- لا تتكرر الإشعارات أكثر من مرة في اليوم

### 14.2 حساب الفترات

من `src/lib/task-periods.ts`:

- daily tasks:
  تعتمد على تاريخ اليوم المحلي
- weekly tasks:
  بداية الأسبوع = **Monday**

### 14.3 window logic في dashboard

`Dashboard.tsx` يستخدم:

- day window محلي من 00:00 إلى 24:00
- لتمييز المهام المكتملة “اليوم”

---

## 15. Environment Variables

المتغيرات المستخدمة فعلياً في الكود:

| المتغير | إلزامي | الاستخدام |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | نعم | Supabase anon key |
| `GEMINI_API_KEY` | نعم | Gemini investigate/plan/evaluate |
| `MISTRAL_API_KEY` | اختياري تقنياً لكن مهم عملياً | Transcription API |

### مثال `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
MISTRAL_API_KEY=your-mistral-api-key
```

ملاحظة مهمة:

- بدون `MISTRAL_API_KEY`
  ستفشل تجربة التفريغ الصوتي الحالية من وجهة نظر المستخدم النهائي، لأن fallback المحلي غير مكمل فعلياً في الواجهة.

---

## 16. التشغيل المحلي

### 16.1 الأوامر الموجودة

من `package.json`:

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

### 16.2 ملاحظات

- اسم الحزمة في `package.json` ما زال:
  `my-app`
  رغم أن branding داخل المنتج هو **METRIX**
- لا يوجد script tests

---

## 17. إذا طلب المستخدم شيئاً معيّناً، أين أعدل؟

هذا القسم موجه خصيصاً لأي AI أو مطور جديد:

### 17.1 تعديل الصفحة الرئيسية

اذهب إلى:

- `src/components/HomePage.tsx`
- وإذا كان التعديل يخص التنقل أو اختيار الـ view:
  `src/app/page.tsx`

### 17.2 تعديل إنشاء الهدف بالذكاء الاصطناعي

اذهب إلى:

- `src/components/goal/GoalCreatorPage.tsx`
- `src/app/api/goal/investigate/route.ts`
- `src/app/api/goal/plan/route.ts`
- `src/lib/gemini.ts`

### 17.3 تعديل منطق حفظ الهدف أو هيكلة المهام

اذهب إلى:

- `src/components/goal/ManualGoalCreator.tsx`
- `src/components/goal/GoalCreatorPage.tsx`
- `src/lib/task-hierarchy.ts`

### 17.4 تعديل واجهة المهام اليومية

اذهب إلى:

- `src/components/dashboard/Dashboard.tsx`
- `src/components/dashboard/FocusTab.tsx`
- `src/lib/task-colors.ts`
- `src/components/shared/TaskAppearancePicker.tsx`

### 17.5 تعديل منطق تسجيل التقدم أو النقاط

اذهب إلى:

- `src/components/progress/ProgressLogDialog.tsx`
- `src/app/api/goal/evaluate/route.ts`
- `src/lib/gemini.ts`
- `src/lib/task-hierarchy.ts`

### 17.6 تعديل التحديات

اذهب إلى:

- `src/components/ChallengeTab.tsx`
- `src/components/challenge/*`
- `src/app/api/challenges/*`

### 17.7 تعديل الإشعارات

اذهب إلى:

- `src/hooks/useStreakReminder.ts`
- `src/components/settings/SettingsPage.tsx`

### 17.8 تعديل الترجمة

اذهب إلى:

- `src/lib/translations.ts`

---

## 18. Prompt Starter جاهز لأي AI

إذا أردت إعطاء هذا المشروع لذكاء اصطناعي آخر، يمكنك استخدام النص التالي كبداية:

```text
أنت تعمل على مشروع اسمه METRIX. هو تطبيق ويب خاص لتتبع الأهداف باستخدام Next.js 16 وReact 19 وTypeScript وSupabase وGemini. التطبيق ثنائي اللغة (عربي/إنجليزي) ويدعم RTL/LTR. تجربة المستخدم الرئيسية ليست متعددة الصفحات بالكامل، بل شاشة رئيسية واحدة في src/app/page.tsx تدير views داخلية: home / dashboard / goals / settings / create-goal.

المشروع مبني حول Goal -> Main Tasks -> Subtasks. كل مهمة لها frequency من نوع daily أو weekly وimpact weight. تسجيل التقدم يتم عبر ProgressLogDialog، إما AI mode أو manual mode. تقييم AI يأتي من /api/goal/evaluate ويعتمد على GeminiService داخل src/lib/gemini.ts. هناك Dashboard فيه 3 تبويبات فقط: focus / chart / challenge. جزء challenge يعتمد على Supabase RPCs لإنشاء التحدي والانضمام والإنهاء.

لا تفترض وجود weekly summary route أو analytics route لأنهما غير موجودين في الكود الحالي. المسار الفعلي لإنشاء الهدف بالذكاء الاصطناعي هو GoalCreatorPage وليس GoalCreator. المسار الفعلي لتسجيل التقدم هو ProgressLogDialog وليس DailyLogModal. الترجمة في src/lib/translations.ts. إذا طُلب تعديل منطق النقاط، راجع ProgressLogDialog + /api/goal/evaluate + src/lib/gemini.ts + src/lib/task-hierarchy.ts.
```

---

## 19. Checklist لتحديث هذا الملف عند تغيّر المشروع

بما أن المشروع يتغير باستمرار، حدّث هذا README عند أي تغيير في:

1. **Route جديد أو API جديد**
   حدّث قسم خريطة المنتج وAPI Reference.
2. **تغيير في الجداول أو RPCs**
   حدّث قسم Data Model وSupabase RPCs.
3. **تغيير في الـ active flow**
   حدّث قسم “حقائق سريعة مهمة جداً لأي AI”.
4. **ربط ملف legacy أو حذف ملف قديم**
   حدّث قسم “الملفات غير الموصولة”.
5. **تغيير في أسلوب العلامة أو النبرة**
   حدّث قسم الهوية والنبرة.
6. **تغيير في منطق Gemini أو scoring**
   حدّث قسم الذكاء الاصطناعي.

---

## 20. خلاصة نهائية

إذا أردنا وصف المشروع بجملة واحدة دقيقة:

**METRIX هو نظام ثنائي اللغة لتخطيط الأهداف ومحاسبة التقدم اليومي بالنقاط، مع هيكل مهام هرمي، تقييم AI، وتحديات 1v1، مبني على Next.js + Supabase + Gemini.**

وهذه الجملة أيضاً صحيحة:

**الملف المركزي الحقيقي لفهم التجربة الحالية هو `src/app/page.tsx`، والملفات المركزية لفهم منطق المنتج هي `Dashboard.tsx`, `ProgressLogDialog.tsx`, `GoalCreatorPage.tsx`, `ManualGoalCreator.tsx`, `ChallengeTab.tsx`, و`src/lib/gemini.ts`.**
