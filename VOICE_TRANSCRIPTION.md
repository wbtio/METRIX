# 🎤 ميزة تحويل الصوت إلى نص - Voice Transcription

## نظرة عامة

تم تكامل **Mistral Voxtral Realtime** في مشروع METRIX لتحويل الصوت إلى نص بدقة عالية وزمن استجابة منخفض (<200ms).

## المميزات

- ✅ **دقة عالية**: استخدام نموذج Voxtral من Mistral AI
- ✅ **دعم اللغة العربية**: تحويل صوتي دقيق للعربية والإنجليزية
- ✅ **زمن استجابة منخفض**: أقل من 200ms
- ✅ **Fallback ذكي**: يستخدم Web Speech API كبديل إذا لم يتوفر Mistral API
- ✅ **تجربة مستخدم سلسة**: واجهة بسيطة وسهلة الاستخدام

## الإعداد

### 1. الحصول على Mistral API Key

1. اذهب إلى [Mistral Console](https://console.mistral.ai/)
2. سجل حساب جديد أو سجل الدخول
3. انتقل إلى قسم API Keys
4. أنشئ API key جديد
5. انسخ الـ API key

### 2. إضافة API Key للمشروع

أنشئ ملف `.env.local` في جذر المشروع وأضف:

```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. إعادة تشغيل السيرفر

```bash
npm run dev
```

## كيفية الاستخدام

### في DailyLogModal

1. افتح نافذة تسجيل التقدم اليومي
2. اضغط على زر الميكروفون 🎤
3. تحدث بوضوح (عربي أو إنجليزي)
4. اضغط على الزر مرة أخرى لإيقاف التسجيل
5. سيتم تحويل الصوت إلى نص تلقائياً

## البنية التقنية

### المكونات الرئيسية

#### 1. `/api/transcribe` - API Endpoint
- يستقبل ملف صوتي
- يرسله إلى Mistral Voxtral API
- يعيد النص المحول

#### 2. `VoiceRecorder.tsx` - مكون التسجيل
- يسجل الصوت باستخدام MediaRecorder API
- يرسل الصوت إلى `/api/transcribe`
- يعرض حالة التسجيل والمعالجة
- يستخدم Web Speech API كـ fallback

#### 3. `DailyLogModal.tsx` - التكامل
- يستخدم مكون VoiceRecorder
- يضيف النص المحول إلى textarea

## نماذج Mistral Voxtral

### Voxtral Mini Transcribe V2
- للنصوص المسجلة (batch transcription)
- دقة عالية جداً
- دعم 13 لغة
- ملفات حتى 3 ساعات

### Voxtral Realtime
- للتطبيقات الحية
- زمن استجابة <200ms
- مفتوح المصدر (Apache 2.0)
- يعمل على الأجهزة الصغيرة

## التكلفة

- **Voxtral Mini Transcribe V2**: $0.003 لكل دقيقة
- **Voxtral Realtime**: $0.006 لكل دقيقة

## Fallback Mechanism

إذا لم يتوفر Mistral API Key أو حدث خطأ:
- يستخدم النظام Web Speech API تلقائياً
- دقة أقل قليلاً لكن مجاني
- يعمل في Chrome و Edge

## المتطلبات

- **المتصفح**: Chrome, Edge, Safari (للتسجيل الصوتي)
- **Mistral API Key**: اختياري (للدقة العالية)
- **اتصال إنترنت**: مطلوب

## استكشاف الأخطاء

### "فشل الوصول إلى الميكروفون"
- تأكد من منح المتصفح صلاحية الوصول للميكروفون
- تحقق من إعدادات الخصوصية في نظام التشغيل

### "Mistral API key not configured"
- أضف `MISTRAL_API_KEY` في ملف `.env.local`
- أعد تشغيل السيرفر

### "فشل التعرف على الصوت"
- تحدث بوضوح وببطء
- تأكد من عدم وجود ضوضاء في الخلفية
- جرب استخدام ميكروفون خارجي

## الموارد

- [Mistral Voxtral Documentation](https://docs.mistral.ai/capabilities/audio_transcription)
- [Mistral Console](https://console.mistral.ai/)
- [Voxtral on Hugging Face](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602)

## الدعم

للمساعدة أو الإبلاغ عن مشاكل، يرجى فتح issue في المشروع.
