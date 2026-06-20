# Metrix - تطبيق الأندرويد

تطبيق Android يغلّف موقع Metrix المنشور باستخدام **Capacitor**.
التطبيق يفتح الموقع `https://metrix-beryl-zeta.vercel.app/` داخل WebView أصلي، فيشتغل كل شيء (المصادقة، الذكاء الاصطناعي، الـ API routes) لأنها تشتغل على السيرفر.

## البنية
```
app/
├── capacitor.config.ts   # إعدادات Capacitor (الرابط، الاسم، package id)
├── env.sh                # سكربت بيئة (JAVA_HOME + ANDROID_HOME) — source قبل البناء
├── resources/            # الأيقونة و splash المصدر (icon.png / splash.png)
├── www/index.html        # شاشة تحميل احتياطية
├── android/              # مشروع Android الأصلي (Gradle)
└── metrix-debug.apk      # الـ APK الجاهز للتثبيت
```

## المتطلبات (مثبتة بالفعل)
- JDK 21 → `/opt/homebrew/opt/openjdk@21`
- Android SDK → `~/Library/Android/sdk` (platform-tools, build-tools;35.0.0, platforms;android-35)

## بناء الـ APK
```bash
cd app
source ./env.sh
npx cap sync android          # مزامنة الإعدادات/الأصول
cd android && ./gradlew assembleDebug
```
الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`
(ويُنسخ أيضاً إلى `app/metrix-debug.apk`)

## تثبيت APK على جهاز الأندرويد
**خيار 1 — عبر USB (سريع):**
1. فعّل "تصحيح USB" في إعدادات الأندرويد (خيارات المطور).
2. وصّل الجهاز بالماك عبر USB.
3. شغّل:
```bash
source ./env.sh
adb install -r metrix-debug.apk
```

**خيار 2 — يدوي:**
1. انسخ `metrix-debug.apk` لجهاز الأندرويد (واتساب، إيميل، Google Drive، أو USB).
2. افتح الملف من الجهاز واسمح "التثبيت من مصادر غير معروفة" عند الطلب.
3. افتح تطبيق Metrix.

## بعد تحديث الموقع
الموقع يُحمّل مباشرة من الرابط، فلا داعي لإعادة بناء التطبيق عند كل تحديث للموقع.
أعد بناء الـ APK فقط إذا غيّرت: الأيقونة، الاسم، الرابط، أو إعدادات Capacitor.

## تغيير الرابط أو الاسم
عدّل `capacitor.config.ts` ثم:
```bash
source ./env.sh
npx cap sync android
cd android && ./gradlew assembleDebug
```
