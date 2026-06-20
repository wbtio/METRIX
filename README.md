# METRIX

> **A Comprehensive Live Blueprint for Humans and AI Assistants.**  
> **آخر تحديث:** مراجعة شاملة للمشروع — تبسيط كامل للهيكل البرمجي، إزالة تكامل تيليغرام ونظام الإشعارات الفردية، تفعيل تسجيل الدخول الحصري عبر Google OAuth، وإضافة ميزة تعديل الأهداف الذكي بالذكاء الاصطناعي (AI Smart Goal Edit) مع واجهات مصقولة فائقة الجودة.

---

## 1. Overview (نظرة عامة عن المشروع)

**METRIX** هو نظام شخصي صارم لتخطيط ومراقبة نمو الأهداف بالنقاط والأرقام بدقة بالغة. التطبيق مصمم لتجاوز مفهوم قائمة المهام (To-Do List) التقليدية، ليتحول إلى نظام التزام حقيقي مبني على أسس علمية ومحمي بالذكاء الاصطناعي.

### Core Stack (التقنيات الأساسية):
- **Next.js 16.1.4 (App Router) + React 19.2.3 + TypeScript**
- **Tailwind CSS v4** للتصميم العصري الموجه بـ OKLCH والألوان الكونية.
- **Supabase SSR** للمصادقة، قاعدة البيانات، والتخزين السحابي.
- **Google Gemini API** (عبر حزمتي `@google/genai` و `@google/generative-ai`) لاستجواب الأهداف، بناء الخطط المهيكلة، تقييم السجلات اليومية، توليد أسئلة التركيز اليومي، وتعديل الأهداف ذكياً.
- **Google Imagen / Gemini Image** لتوليد الصور البصرية للإنجازات الاستثنائية (Milestones).
- **Mistral Voxtral** لتحويل الكلام إلى نص (Speech-to-Text) عند تسجيل التقدم صوتياً.

---

## 2. Key Facts for Developers & AI Assistants (حقائق سريعة ومهمة جداً)

1. **دورة حياة التنقل (State-Based Navigation):** التطبيق لا يعتمد على التنقل التقليدي بين الصفحات (Multi-page app). ملف `src/app/page.tsx` يدير التنقل داخلياً عبر تغيير الـ state للـ View الحالي: `home` / `create-goal` / `dashboard` / `goals` / `settings`.
2. **شريط التنقل (OrbitDock):** يتم التحكم بالتنقل عبر `src/components/OrbitDock.tsx` الذي يحتوي على نظام حماية (Navigation Guard) يمنع ضياع البيانات أثناء إنشاء الأهداف بالذكاء الاصطناعي.
3. **تبويبات الداشبورد الثلاثة:** يحتوي الداشبورد (`src/components/dashboard/Dashboard.tsx`) على 3 تبويبات فقط:
   - **Focus (`FocusTab.tsx`):** عرض المهام وإتمامها وإدارتها + ميزة التركيز اليومي.
   - **Chart (`GrowthChart.tsx` / `DayCalendarGrid.tsx` / `TaskInsights.tsx`):** رسومات وتحليلات التقدم والمساهمات اليومية.
   - **Challenge (`ChallengeTab.tsx`):** تحديات 1v1 مع الخصوم وبطاقات المكافآت (Rewards).
4. **المسارات الفعلية للمكونات:**
   - مسار إنشاء الهدف بالذكاء الاصطناعي: `GoalCreatorPage.tsx` (وليس `GoalCreator.tsx`).
   - مسار تسجيل التقدم الفعلي: `ProgressLogDialog.tsx` (وليس `DailyLogModal.tsx`).
5. **إلغاء التليغرام بالكامل:** تم مسح كافة ملفات التذكير والشيفرات البرمجية وإعدادات الجداول والاتصال المتعلقة ببوت تيليغرام.
6. **المصادقة الحصرية (Google OAuth Only):** تم تبسيط واجهة تسجيل الدخول في `src/app/login/page.tsx` وإلغاء خيارات التسجيل بالبريد وكلمة المرور لتأمين الدخول بلمسة واحدة عبر Google.
7. **التعديل الذكي للأهداف:** تم توفير وضع تعديل الهدف بالذكاء الاصطناعي في `GoalEditDialog.tsx` للتعديل المباشر بالتوجيهات النصية مع معاينة حية عبر بطاقة مصغرة محاكية لبطاقة الهدف الأساسية.

---

## 3. Product Features & Recent Updates (الميزات وتحديثات النظام الأخيرة)

### 3.1 تسجيل الدخول والميثاق (Manifesto & Google OAuth)
- واجهة دخول مصقولة تعتمد بالكامل على **Google OAuth**.
- ظهور **اتفاقية الصرامة والمحاسبة (MatrixManifestoDialog)** في الزيارة الأولى لتعريف المستخدم بفلسفة التطبيق الصارمة.

### 3.2 فحص وبناء الأهداف بالذكاء الاصطناعي (Goal Investigation & Planning)
- **مرحلة الاستجواب (Investigation):** يفحص Gemini واقعية الهدف وجديته، ويطرح 4 أسئلة استكشافية لاستخلاص أركان الخطة.
- **مرحلة الهيكلة (Hierarchical Plan):** يقسم الهدف إلى مهام رئيسية (Main Tasks) ومهام فرعية (Subtasks) مع توزيع أوزان التأثير (Impact Weights) ونوع التكرار (يومي/أسبوعي).
- **الخيار اليدوي (Manual Goal Creator):** للمستخدمين الراغبين في تخطيط أهدافهم بأنفسهم خطوة بخطوة.

### 3.3 لوحة التحكم الفائقة (Compact Focus Tab & UI Polish)
- واجهة مهام مصغرة عصرية بحجم `h-8` للأزرار والرموز لتقليل التشتت البصري.
- إضافة ميزة **تعديل/إضافة المهام الرئيسية والفرعية** بشكل مدمج ومباشر داخل التبويب مع اختيار التكرار وتلوين المسار (Task Color Picker).

### 3.4 تعديل الأهداف الذكي (AI Smart Edit Goal)
- شاشة تعديل مُعاد تصميمها بالكامل (`GoalEditDialog.tsx`):
  - **التعديل اليدوي:** تصميم نظيف من عمودين يفصل الهوية البصرية (الاسم، الوصف، الأيقونة) عن البيانات الرقمية (التواريخ، النقاط الحالية والمستهدفة).
  - **التعديل بالذكاء الاصطناعي:** تتيح كتابة أوامر نصية (مثل: "مدد الهدف حتى نهاية الشهر واجعل النقاط المستهدفة 20 ألف") لمعالجتها عبر Gemini وإرجاع الخطة المحدثة فوراً.
  - **معاينة الخطة المحدثة:** بطاقة معاينة مدمجة وذكية تعرض هوية الهدف ونقاطه ومعدل النقاط اليومي المطلوب في الوقت الفعلي قبل الحفظ النهائي.

### 3.5 تتبع التقدم ومكافحة التلاعب (Progress Logging & Anti-Gaming)
- **تسجيل ذكي:** يستقبل السجلات نصياً أو صوتياً (عبر Mistral Voxtral)، ثم يقوم Gemini بتقييم السجل وتوزيع النقاط الحقيقية بناءً على الإنجاز الفعلي، مع كشف محاولات الغش أو إدخال سجلات غير حقيقية ومعاقبتها بنقاط منخفضة أو صفر.
- **تسجيل يدوي:** يسمح بتحديد المهام المنجزة وتوقيتها الفعلي يدوياً.

### 3.6 لوحة المساهمات والتحليلات (Recharts & Calendar Grid)
- **منحنى النمو (Growth Chart):** يوضح معدل تراكم النقاط تجاه الهدف النهائي.
- **تقويم المساهمات (Day Calendar Grid):** لوحة تلوين يومية تظهر كثافة الإنجاز مع نافذة تفصيلية تعرض كافة السجلات ودرجات المدرب الذكي والـ Performance Tiers (طبيعي، ممتاز، استثنائي).

---

## 4. Product Map & Directories (خريطة المجلدات والملفات)

```text
src/
├── app/
│   ├── api/
│   │   ├── challenges/            # إدارة غرف التحديات وتصفية النتائج
│   │   ├── goal/
│   │   │   ├── ai-edit/           # [New] تعديل الأهداف باستخدام Gemini
│   │   │   ├── daily-focus/       # توليد الأسئلة النفسية والتحفيزية
│   │   │   ├── evaluate/          # تقييم السجلات اليومية واحتساب الدرجات
│   │   │   ├── investigate/       # فحص جدية وأولويات الأهداف المقترحة
│   │   │   ├── milestone/         # إدارة صور وإنجازات المايلستون
│   │   │   └── plan/              # توليد وتوزيع خطط المهام الهرمية
│   │   └── transcribe/            # تفريغ الصوت عبر Mistral API
│   ├── auth/callback/             # معالجة استجابة جلسة Supabase OAuth
│   ├── login/                     # شاشة الدخول الحصرية عبر Google
│   ├── globals.css                # الإعدادات العالمية والخطوط والحركات
│   ├── layout.tsx                 # الغلاف الهيكلي للتطبيق وثنائية اللغة
│   └── page.tsx                   # محرك التنقل وإدارة الحالة وحماية الخروج
├── components/
│   ├── dashboard/                 # تبويبات الداشبورد (Focus, Chart, Challenge)
│   ├── goal/                      # إنشاء، تعديل، وعرض قوائم الأهداف
│   ├── progress/                  # تسجيل ومتابعة التقدم (نصي، صوتي، يدوياً)
│   ├── settings/                  # إدارة الملف الشخصي، اللغة، والثيم
│   └── shared/                    # النوافذ العامة والتأكيدات والترحيب
├── hooks/                         # الخطافات المخصصة للمصادقة والتنبيهات
├── lib/
│   ├── gemini.ts                  # [Core] محرك الذكاء الاصطناعي لـ METRIX
│   ├── translations.ts            # ملف الترجمات العربية والانجليزية (RTL/LTR)
│   └── task-periods.ts            # معالجة الفترات الزمنية للمهام
└── utils/
    └── supabase/                  # إعداد عملاء Supabase في المتصفح والخادم
```

---

## 5. Database Schema (نموذج قاعدة البيانات - Supabase)

### 5.1 جدول الأهداف (`goals`)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> auth.users)
- `title` (TEXT)
- `domain` (TEXT) - تصنيف الهدف (health, money, skills, career, study, home, other)
- `current_points` (INTEGER)
- `target_points` (INTEGER) - الحد الأدنى الافتراضي 10,000
- `status` (TEXT) - (`active`, `investigating`, `completed`, `archived`)
- `icon` (TEXT) - اسم أيقونة Lucide المستخدمة
- `ai_summary` (TEXT) - الوصف التلخيصي للخطة من Gemini
- `is_pinned` (BOOLEAN) - لتثبيت الهدف في شريط التنقل
- `created_at` (TIMESTAMPTZ)
- `estimated_completion_date` (DATE)
- `total_days` (INTEGER)

### 5.2 جدول المهام (`sub_layers`)
- `id` (UUID, PK)
- `goal_id` (UUID, FK -> goals)
- `task_description` (TEXT)
- `impact_weight` (INTEGER) - وزن المهمة (1-10 للرئيسية، 1-5 للفرعية)
- `frequency` (TEXT) - تكرار المهمة (`daily` أو `weekly`)
- `task_type` (TEXT) - تصنيف المهمة (`main` أو `sub`)
- `parent_task_id` (UUID, Nullable) - لربط المهام الفرعية برئيسية
- `accent_color` (TEXT, Nullable) - اللون المميز للمسار
- `icon` (TEXT, Nullable) - إيموجي المهمة

### 5.3 جدول السجلات اليومية (`daily_logs`)
- `id` (UUID, PK)
- `goal_id` (UUID, FK -> goals)
- `user_input` (TEXT) - النص المكتوب أو المفرغ صوتياً
- `ai_score` (INTEGER) - النقاط الممنوحة من التقييم
- `ai_feedback` (TEXT) - تعليقات وتوجيهات المدرب الصارم
- `breakdown` (JSONB) - تفاصيل مطابقة المهام الفرعية وبيانات الأداء
- `created_at` (TIMESTAMPTZ)

### 5.4 جدول التركيز اليومي (`daily_focus_answers`)
- `id` (UUID, PK)
- `goal_id` (UUID, FK -> goals)
- `user_id` (UUID)
- `prompt_date` (DATE) - تاريخ السؤال
- `angle_label` (TEXT) - الزاوية النفسية المستخدمة
- `question` (TEXT)
- `answer` (TEXT, Nullable)
- `answer_coaching` (TEXT, Nullable) - رد المدرب الذكي على الإجابة

---

## 6. AI Engine Setup (`src/lib/gemini.ts`)

يعمل الـ `GeminiService` كالمحرك الذكي للتطبيق عبر 5 وظائف رئيسية:
1. `investigateGoal`: اختبار سلامة وجدية الأهداف المقترحة.
2. `createPlan`: صياغة وهيكلة خطة المهام الهرمية وتوزيع الأوزان.
3. `evaluateDailyLog`: تحليل السجل اليومي، مطابقة السجلات بالمهام، ومنع محاولات التلاعب (Anti-Gaming).
4. `generateDailyFocus`: اختيار زاوية نفسية/استراتيجية من أصل 6 زوايا وتوليد سؤال يومي للمستخدم.
5. `editGoalWithAI`: [New] استلام توجيهات المستخدم وتعديل الحقول والتواريخ والنقاط والأيقونة مع شرح التغييرات باللغة المناسبة.

---

## 7. Local Development (التشغيل المحلي)

قم بإنشاء ملف `.env.local` في الجذر وضف المتغيرات التالية:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_IMAGE_API_KEY=your-google-image-key
MISTRAL_API_KEY=your-mistral-key
```

ثم قم بتشغيل التطبيق:

```bash
# تثبيت الاعتمادات
npm install

# تشغيل خادم التطوير
npm run dev

# بناء نسخة الإنتاج
npm run build
```

---

## 8. AI Prompt Starter (نسخة جاهزة لمساعدي الذكاء الاصطناعي)

> [!TIP]
> انسخ النص أدناه ومرره لأي مساعد ذكاء اصطناعي تفاعلي ليفهم سياق METRIX بشكل فوري ودقيق:

```text
أنت تعمل على مشروع METRIX، وهو تطبيق ويب متقدم لتتبع الأهداف الشخصية مبني على Next.js 16 (App Router) و React 19 و TypeScript و Supabase و Google Gemini. 
التطبيق يدعم اللغتين العربية والانجليزية ويتبع نظام RTL/LTR بشكل كامل. 
النظام ليس متعدد الصفحات بالكامل، بل يدير views داخلية في page.tsx: (home, dashboard, goals, settings, create-goal) باستخدام OrbitDock للتنقل.

الهدف يتكون من مهام رئيسية (Main Tasks) ومهام فرعية (Subtasks). 
تسجيل التقدم يتم عبر ProgressLogDialog يدوياً أو بالذكاء الاصطناعي (حيث يقيّم Gemini النص ويعيد توزيع النقاط).
تمت إزالة تكامل Telegram Bot بالكامل من التطبيق ولم تعد هناك تذكيرات تليغرام أو ربط بوت خارجي في الواجهات أو الإعدادات.
تمت إعادة تصميم شاشة تعديل الهدف (GoalEditDialog.tsx) بالكامل لتكون مبسطة ومدمجة ومتقنة بأسلوب عمودين للتعديل اليدوي، وبطاقة معاينة ذكية ومصغرة في التعديل بالذكاء الاصطناعي.
التبويبات المتاحة في الداشبورد هي: focus و chart و challenge فقط.
```
