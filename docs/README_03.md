# METRIX - الصفحة الرئيسية (HomePage)

## 📍 المسار
`/` ← `src/components/HomePage.tsx`

## 🎯 الوظيفة
الصفحة الرئيسية بعد تسجيل الدخول. تحتوي على:
- مدخل كتابة الهدف (مع تحليل AI)
- تسجيل صوتي
- شبكة الأهداف الأخيرة
- تبويب الإشعارات

## 🎨 التصميم العام

### التخطيط
```
max-w-3xl mx-auto
├── Logo + Tagline
├── Goal Input (مع AI Prompt)
└── Tabs
    ├── Recent Goals (grid 1-2 columns)
    └── Notifications
```

### الشعار
- `logo1.svg` / `logo2.svg` مع responsive sizing
- `w-[170px] sm:w-[220px] md:w-[240px]`
- Tagline جريئة: "اذا ما استمرت بهدفك راح تفشل يا غبي"

---

## 📝 مدخل الهدف (Goal Input)

### التصميم
- **Container**: `rounded-[22px] border bg-background/92 backdrop-blur-xl`
- **Shadow**: `shadow-lg shadow-black/5`
- **Focus**: `focus-within:border-primary/35 focus-within:shadow-xl`
- **Textarea**: `min-h-[44px] max-h-[132px]` مع auto-resize (JavaScript يحسب الـ scrollHeight)
- **Placeholder**: يتغير حسب الحالة (كتابة / تسجيل / معالجة)

### زر التسجيل الصوتي
- دائري (`rounded-full w-9 h-9`)
- أيقونة Mic عادي / StopCircle أثناء التسجيل / Loader2 أثناء المعالجة
- **Idle**: `text-muted-foreground`
- **Recording**: `border-red-300/70 bg-red-500/10 text-red-700`
- **Processing**: `border-amber-300/70 bg-amber-500/10 text-amber-700`

### أزرار الإرسال
- **AI Plan**: أيقونة Sparkles، "ذكاء اصطناعي"
- **Manual**: أيقونة PenLine، "يدوي"
- عند الاختيار: `ring-1 ring-primary/15 bg-primary/10`

### AI Detail Prompt
- يظهر عندما كلمات النص < 15 كلمة
- 5 مراحل لونية من البرتقالي الغامق إلى الفاتح حسب عدد الكلمات
- رسالة تشجيعية حسب المرحلة (عربي/إنجليزي)
- Container بارز فوق حقل الإدخال مع animate slide

---

## 🎯 تبويب الأهداف الأخيرة (Recent Goals)

### بطاقة الهدف
```
rounded-2xl border border-border/80 bg-white p-3
├── أيقونة (48px, rounded-xl, primary/10 bg)
├── العنوان (line-clamp-2, font-black)
├── Badges (Pinned / Days Chip / Task Stats)
└── GoalProgressBar
```

### Badges
- **Pinned**: `rounded-full bg-amber-500/10 text-amber-600`
- **Days Chip**: `tabular-nums` مع 3 tones (soon/today/late)
- **Task Stats**: `completed/total` مع أيقونة ListChecks

### GoalProgressBar
`src/components/shared/GoalProgressBar.tsx`
- Animated gradient fill مع wave pattern overlay
- Glow effect على الحافة الأمامية
- ARIA `progressbar` role
- Label حسب حجم الشاشة (داخل/خارج)

### حالة فارغة (Empty)
```
rounded-3xl border-dashed border p-10 text-center
├── أيقونة Target في دائرة primary/10
└── "لا توجد أهداف بعد"
```

---

## 🔔 تبويب الإشعارات (Notifications)

### المكونات
- `NotificationsSection` من `src/components/notifications/`
- يأخذ `UserGoalContext` من `useNotifications` hook
- أنواع الإشعارات:
  - `streak_rescue` 🔥 - streak في خطر
  - `challenge_alert` ⚔️ - تحديثات التحدي
  - `daily_focus` 🎯 - سؤال اليوم
  - `milestone_celebration` 🏆 - إنجاز كبير
  - `smart_push` 🤖 - تذكيرات ذكية

### التصميم
- كل نوع له لون وأيقونة مختلفة
- زر "تحديث" لإعادة جلب الإشعارات
- Badge عدد الإشعارات في الـ Tab

---

## 🔄 OrbitShell (الخلفية)

`src/components/OrbitShell.tsx`

### العناصر
1. **Main Orb**: `-top-[10%] -right-[10%] w-[50vw]` لون primary مع blur 120px
2. **Secondary Orb**: `-bottom-[10%] -left-[10%] w-[40vw]` لون chart-1
3. **Accent Orb**: `top-0 left-1/2 w-[60vw] h-[30vh]` لون chart-2
4. **Noise Texture**: `/noise.svg` مع opacity 20%

### Dark/Light
- `mix-blend-multiply` في الوضع الفاتح
- `mix-blend-screen` في الوضع الداكن

---

## 🧭 OrbitDock (شريط التنقل)

`src/components/OrbitDock.tsx`

### الموقع
- **موبايل**: أسفل الشاشة (bottom bar)
- **ديسكتوب**: يسار الشاشة (`lg:left-6 lg:top-1/2 lg:flex-col`)
- RTL: `rtl:lg:right-6`

### التصميم
- Glassmorphism: backdrop blur
- `rounded-2xl` مع border و shadow خفيف
- أيقونات: Home, My Goals, divider, 2 pinned goals, Settings
- العنصر النشط: `bg-primary/12` مع ring

### العناصر
- **Home**: الصفحة الرئيسية
- **My Goals**: قائمة الأهداف
- **Pinned Goals**: أقصى 2 أهداف مثبتة (تظهر أيقونتها)
- **Settings**: الإعدادات

---

## 📱 الـ States

| الحالة | الوصف | العناصر المرئية |
|--------|-------|-----------------|
| Empty (لا أهداف) | أول مرة | رسالة "لا توجد أهداف بعد" + أيقونة |
| Recording | تسجيل صوتي | border أحمر، placeholder "جارِ الاستماع..." |
| Processing | معالجة الصوت | أيقونة Loader2، زر معطل |
| AI Detail | أقل من 15 كلمة | Prompt برتقالي + رسالة حسب المرحلة |
| Notifications | فيش إشعارات | Badge مع العدد |
| Has Goals | أهداف موجودة | Grid 1-2 columns مع البطاقات |
