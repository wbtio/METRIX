# إعداد تسجيل الدخول بحساب جوجل - Setup Google Authentication

## الخطوات المطلوبة منك (User Setup Steps)

### 1. إعداد Google OAuth في Supabase (خطوة ضرورية جداً)

1. افتح مشروع Supabase الخاص بك على [https://supabase.com](https://supabase.com)
2. اذهب إلى **Authentication** > **Providers** > **Google**
3. فعّل Google Provider
4. أضف البيانات التالية:
   - **Client ID**: `your_client_id_here`
   - **Client Secret**: `your_client_secret_here`
5. في قسم **URL Configuration** (بنفس الصفحة):
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: أضف `http://localhost:3000/auth/callback`
6. احفظ التغييرات

### 2. حماية البيانات (Row Level Security)

✅ **تم تنفيذ هذه الخطوة تلقائياً!**
لقد قمت بتفعيل Row Level Security (RLS) وحماية جميع جداول قاعدة البيانات (Goals, Daily Logs, Sub Layers, etc.).
الآن، لا يمكن لأي مستخدم رؤية أو تعديل أو حذف بيانات مستخدم آخر. كل شخص يرى بياناته فقط.

### 3. إضافة متغيرات البيئة (Environment Variables)

1. أنشئ ملف `.env.local` في المجلد الرئيسي للمشروع (بجانب `package.json`).
2. أضف المحتوى التالي (استبدل القيم ببيانات مشروعك):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

   احصل على هذه القيم من: **Supabase Dashboard** > **Settings** > **API**

### 4. إعادة تشغيل التطبيق

```bash
npm run dev
```

## ما تم إنجازه (What Was Done)

### ملفات جديدة:
- ✅ `src/app/login/page.tsx` - صفحة تسجيل الدخول
- ✅ `src/app/auth/callback/route.ts` - معالج تسجيل الدخول
- ✅ `src/middleware.ts` - حماية المسارات

### ملفات محدثة:
- ✅ `src/app/page.tsx` - جلب بيانات المستخدم وتصفية الأهداف
- ✅ `src/components/AppSidebar.tsx` - عرض بيانات المستخدم وزر تسجيل الخروج
- ✅ `src/components/OrbitShell.tsx` - دعم بيانات المستخدم

### قاعدة البيانات:
- ✅ تفعيل RLS على جميع الجداول
- ✅ إضافة سياسات الأمان (Policies) لضمان الخصوصية التامة

## ملاحظات مهمة (Important Notes)

- ⚠️ تأكد من تفعيل Google Provider في Supabase وإلا لن يعمل تسجيل الدخول.
- ⚠️ تأكد من إضافة رابط `http://localhost:3000/auth/callback` في Redirect URLs.
