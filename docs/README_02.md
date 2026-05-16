# METRIX - تسجيل الدخول والمصادقة

## 📍 المسار
`/login` ← `src/app/login/page.tsx`

## 🎯 الوظيفة
صفحة تسجيل الدخول الوحيدة في التطبيق. تدعم Google OAuth فقط.

## 🎨 التصميم

### الشكل العام
- **Full-screen centered**: `min-h-screen flex items-center justify-center`
- **Gradient background**: `bg-gradient-to-br from-background via-background to-primary/5`
- **بطاقة الدخول**: `rounded-2xl shadow-2xl p-8` مع تأثير `animate-in fade-in slide-in-from-bottom-4 duration-700`
- **أنيميشين الدخول**: انزلاق من الأسفل مع fade

### الشعار
- `logo1.svg` للوضع الفاتح (يظهر بشكل افتراضي)
- `logo2.svg` للوضع الداكن (`dark:block`)
- مقاس 180px عرض، مع responsive `sm:w-52`

### زر Google
- تصميم أبيض مع hover رمادي فاتح
- أيقونة Google بألوانها الرسمية (أزرق، أخضر، أصفر، أحمر)
- تأثيرات hover: `hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
- نص عربي: "تسجيل الدخول باستخدام جوجل"

### رابط Show Manifesto
- رابط "القصة وراء ماتريكس" في الأسفل
- `text-muted-foreground hover:text-foreground hover:underline`
- يفتح MatrixManifestoDialog عند النقر

### نص الأ脚
- "بتسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية"
- `text-xs text-muted-foreground`

## 📋 الحالات (States)

### 1. حالة التحميل (Loading)
```tsx
<div className="min-h-screen flex items-center justify-center animate-pulse gap-4">
  <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
</div>
```
- Spinner دائري بحجم 64px
- `animate-pulse` للنبض
- يظهر أثناء التحقق من وجود جلسة موجودة مسبقًا

### 2. حالة الجاهزية (Ready)
- يظهر النموذج بعد التأكد من عدم وجود جلسة
- MatrixManifestoDialog يظهر تلقائيًا لأول زيارة (يُخزن في `localStorage`)

### 3. حالة الخطأ
- Console.error فقط في حال فشل Google OAuth
- لا يوجد UI للخطأ حالياً

## 🔄 تدفق المصادقة

```
1. المستخدم يفتح /login
2. useEffect → supabase.auth.getSession()
3. إذا في جلسة → redirect إلى /
4. إذا لا → تحقق من localStorage ("metrix-login-manifesto-seen")
5. أول زيارة → أظهر MatrixManifestoDialog + save to localStorage
6. المستخدم يضغط على Google → signInWithOAuth → /auth/callback
7. Middleware يسمح بالدخول
```

## 🛡 Middleware
`src/middleware.ts`:
- يستخدم `@supabase/ssr` مع `createServerClient`
- يقرأ الكوكيز عبر `request.cookies.getAll/set`
- يحمي كل المسارات عدا `/login` و `/auth/callback` و الملفات الثابتة
- يعيد توجيه المستخدمين المسجلين من `/login` إلى `/`

## 🗣 MatrixManifestoDialog
`src/components/login/MatrixManifestoDialog.tsx`

### التصميم
- **Radix Dialog** مع Portal + Overlay
- **Overlay**: `bg-black/50 backdrop-blur-[2px]`
- **Modal**: `rounded-[2rem] max-w-[36rem]` مع fade-in + zoom-in
- **RTL**: `dir="rtl" text-right`
- **Header line**: gradient from transparent to black to transparent
- **خلفية modal**: `bg-background`

### المحتوى
- "البيان التأسيسي" badge مع `rounded-full border`
- عنوان: "لماذا صممت ماتريكس؟"
- نص فلسفي: يشرح أن METRIX ليس To-Do List عادي
- زر: "أنا مستعد" مع shadow ثقيل

## 👋 WelcomeDialog
`src/components/shared/WelcomeDialog.tsx`

### الوظيفة
ترحيب للمستخدم الجديد (أول فتح للتطبيق). 5 خطوات درامية.

### الخطوات
1. **طلب الموقع**: `navigator.geolocation.getCurrentPosition()` → reverse geocode مع Nominatim API
2. **تحليل البيئة**: spinner مع تحليل وهمي للظروف المحيطة
3. **نقد المجتمع**: انتقاد درامي للمجتمع
4. **تقديم METRIX**: الحل المثالي
5. **خيار الهروب**: "اخرج من النظام" أو "ابق وتذمر"

### التصميم
- Full-screen glassmorphism overlay مع backdrop blur
- تدرج لوني درامي
- أزرار مع تأثيرات hover
- إذا اختار "اخرج من النظام" → sign out بعد 5 ثواني مع progress bar

### حالات العرض
- `isVisible`: يتحقق من `localStorage('metrix_welcome_seen')`
- `isAnalyzing`: spinner مع loading (3.5 ثواني)
- `isSearchingSolution`: spinner ثاني
- `isRejected`: progress bar + sign out
