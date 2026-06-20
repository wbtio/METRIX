# Metrix - تطبيق الأندرويد

تطبيق Android أصلي يغلّف واجهة موقع Metrix محلياً باستخدام **Capacitor**.
التطبيق يفتح الواجهة من ملفات محلية جوه الـ APK (يفتح فوراً بدون تحميل من رابط)، بينما الـ API calls (ذكاء اصطناعي، تحديات) تروح للسيرفر المنشور عند الحاجة.

## البنية
```
mobile/
├── capacitor.config.ts   # إعدادات Capacitor (الاسم، package id، scheme)
├── env.sh                # سكربت بيئة (JAVA_HOME + ANDROID_HOME) — source قبل البناء
├── resources/            # الأيقونة و splash المصدر (icon.png / splash.png)
├── www/                  # الـ static export (يُولّد بواسطة build-mobile.sh)
├── android/              # مشروع Android الأصلي (Gradle)
└── metrix-debug.apk      # الـ APK الجاهز للتثبيت
```

## المتطلبات (مثبتة بالفعل)
- JDK 21 → `/opt/homebrew/opt/openjdk@21`
- Android SDK → `~/Library/Android/sdk` (platform-tools, build-tools;35.0.0, platforms;android-35)

## بناء التطبيق كاملاً (static export + APK)
من جذر المشروع الرئيسي:
```bash
bash scripts/build-mobile.sh          # يبني الـ static export وينسخه لمجلد mobile/www
cd mobile && source ./env.sh          # تهيئة بيئة Java + Android SDK
cd android && ./gradlew assembleDebug # بناء الـ APK
```
الناتج: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
(ويُنسخ أيضاً إلى `mobile/metrix-debug.apk`)

## تثبيت APK على جهاز الأندرويد
**خيار 1 — عبر USB (سريع):**
1. فعّل "تصحيح USB" في إعدادات الأندرويد (خيارات المطور).
2. وصّل الجهاز بالماك عبر USB.
3. شغّل:
```bash
cd mobile && source ./env.sh
adb install -r metrix-debug.apk
```

**خيار 2 — يدوي:**
1. انسخ `mobile/metrix-debug.apk` لجهاز الأندرويد.
2. افتح الملف واسمح "التثبيت من مصادر غير معروفة".
3. افتح تطبيق Metrix.

## إعداد مهم (مرة واحدة فقط): إضافة redirect URL في Supabase
لتسجيل الدخول بـ Google يعمل في التطبيق، أضف رابط الـ deep link لـ Supabase:
1. اذهب لـ Supabase Dashboard → Authentication → URL Configuration
2. في **Redirect URLs** أضف: `com.metrix.app://auth`
3. احفظ

## بعد تحديث الموقع
أعد تشغيل `bash scripts/build-mobile.sh` ثم أعد بناء الـ APK لتضمين التحديثات في التطبيق.

## كيف يعمل التطبيق
- **الواجهة (UI):** محفوظة محلياً جوه الـ APK → تفتح فوراً بدون إنترنت
- **بيانات Supabase:** تتصل مباشرة بـ Supabase (تعمل طالما فيه إنترنت)
- **API routes (ذكاء اصطناعي):** تطلب من `https://metrix-beryl-zeta.vercel.app/api/...`
- **تسجيل الدخول:** يفتح Google في متصفح النظام، ويرجع للتطبيق عبر deep link
