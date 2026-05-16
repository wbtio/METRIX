# METRIX - نظرة عامة على المشروع

## 🧠 الفكرة العامة
تطبيق ويب لتتبع الأهداف الشخصية بطريقة رقمية صارمة. ليس To-Do List عادي -而是 نظام محاسبة رقمي يعتمد على النقاط والتقييم بالذكاء الاصطناعي. المستخدم يضيف هدف، يكسرها لمهام رئيسية وفرعية، ويسجل تقدمه اليومي.

## 🏗 التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| Next.js 16 | إطار العمل الرئيسي (App Router) |
| React 19 | مكتبة الواجهات |
| TypeScript | لغة البرمجة |
| Supabase | قاعدة البيانات + المصادقة + التخزين |
| Google Gemini AI | تحليل الأهداف وتوليد الخطط والتقييم |
| Tailwind CSS v4 | التصميم والتنسيق |
| shadcn/ui | مكونات الواجهة الجاهزة |
| Recharts | الرسوم البيانية |
| React Day Picker | منتقي التاريخ |
| Radix UI | مكونات الوصول accessibility |

## 📁 هيكل المشروع

```
src/
├── app/                    # الصفحات الرئيسية
│   ├── layout.tsx         # التخطيط الأساسي (fonts, theme, RTL)
│   ├── page.tsx           # الصفحة الرئيسية (SPA shell)
│   ├── globals.css        # التصميم العام والمتغيرات
│   ├── middleware.ts      # حماية المسارات
│   ├── login/             # صفحة تسجيل الدخول
│   ├── auth/              # callback المصادقة
│   ├── start/             # صفحة البدء
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # مكونات لوحة التحكم
│   ├── goal/              # مكونات الأهداف
│   ├── challenge/         # مكونات التحديات
│   ├── progress/          # مكونات تسجيل التقدم
│   ├── settings/          # صفحة الإعدادات
│   ├── shared/            # مكونات مشتركة
│   ├── login/             # مكونات تسجيل الدخول
│   └── notifications/     # مكونات الإشعارات
├── lib/                   # مكتبات و دوال مساعدة
├── hooks/                 # React hooks
└── utils/                 # أدوات Supabase
```

## 🎨 نظام التصميم (Design System)

### الألوان
- **الوضع الفاتح**: خلفية بيضاء (`oklch(1 0 0)`)، أساسي تيل (`oklch(0.57 0.13 218)`)
- **الوضع الداكن**: خلفية زرقاء داكنة (`oklch(0.145 0.015 220)`)، أساسي تيل فاتح (`oklch(0.67 0.12 218)`)
- 5 ألوان للرسوم البيانية (`chart-1` إلى `chart-5`)

### الخطوط
- **العربية**: IBM Plex Sans Arabic
- **اللاتينية**: Plus Jakarta Sans
- **أحادي المسافة**: Geist Mono

### التصميم العام
- **Glassmorphism**: خلفيات شفافة مع backdrop blur
- **RTL First**: اللغة العربية هي الافتراضية (`dir="rtl"`)
- **Animations**: animate-in من Tailwind، custom keyframes للمكافآت
- **Scrollbar**: شريط تمرير نحيف (`scrollbar-thin`)

### المكونات الأساسية
- **OrbitShell**: طبقة الخلفية مع 3 orbs متحركة + noise texture
- **OrbitDock**: شريط التنقل السفلي (موبايل) / الجانبي (ديسكتوب)
- كل المكونات المبنية مع shadcn/ui (Dialog, DropdownMenu, Tabs, إلخ)

## 🔄 تدفق البيانات

1. **المستخدم** ← يسجل دخول عبر Google OAuth
2. **supabase.auth.getSession()** ← التحقق من الجلسة
3. **supabase.from("goals").select()** ← جلب الأهداف
4. **supabase.from("sub_layers").select()** ← جلب المهام
5. **Gemini AI API** ← تحليل الهدف، توليد خطة، تقييم التقدم
6. **localStorage** ← حفظ التفضيلات (theme, language, welcome seen)

## 🔐 الأمان
- Middleware يحمي كل الصفحات عدا `/login` و `/auth/callback`
- التحقق من الجلسة عند كل طلب
- API keys محمية في `.env.local`

## 🌐 دعم اللغات
- العربية (افتراضي)
- الإنجليزية
- كل النصوص في `src/lib/translations.ts`
- RTL/LTR التلقائي حسب النص
