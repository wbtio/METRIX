# METRIX - إنشاء الأهداف

## 📍 المسارات
- AI Creation: `src/components/goal/GoalCreatorPage.tsx` (860 سطر)
- Manual Creation: `src/components/goal/ManualGoalCreator.tsx` (~82KB)
- Edit Dialog: `src/components/goal/GoalEditDialog.tsx`
- Icon Picker: `src/components/goal/IconPicker.tsx`
- Goal Templates (Legacy): `src/components/goal/GoalTemplates.tsx`

---

## 🤖 AI Goal Creator (GoalCreatorPage)

### المراحل (5 Stages)

```
INVESTIGATING → QUESTIONS → GENERATING_PLAN → REVIEW → SAVE
```

### 🎨 التصميم العام
- `max-w-2xl mx-auto` مع `animate-in fade-in slide-in-from-bottom-8`
- كل مرحلة تظهر مع أنيميشن انزلاق

### المرحلة 1: INVESTIGATING
- أيقونة Sparkles (Lottie/Animated)
- نص "تحليل هدفك..."
- يتم استدعاء `/api/goal/investigate` تلقائيًا عند التحميل
- يرسل النص الأولي إلى Gemini
- إذا رفض (محتوى خطر) → AlertTriangle + رسالة redirection

### المرحلة 2: QUESTIONS
- Gemini يولد أسئلة توضيحية عن الهدف
- أنواع الأسئلة: `single_choice`, `choice`, `number`, `text`
- **Choice**: أزرار دائرية مع أيقونات
- **Text**: Textarea عادي
- **Number**: Input مع validation
- كل سؤال له أيقونة حسب نوعه

### المرحلة 3: GENERATING_PLAN
- Spinner + "يتم إنشاء الخطة..."
- Gemini يحلل الإجابات ويبني هيكل المهام
- يرسل إلى `/api/goal/plan`

### المرحلة 4: REVIEW
- **Collapsible sections** للمهام الرئيسية
- كل مهمة رئيسية:
  - اسم قابل للتعديل (inline editing)
  - Frequency toggle (Daily/Weekly) مع أيقونات
  - Impact Weight (slider 1-10)
  - Completion Time (دقائق)
  - Subtasks (قائمة قابلة للطي)
- كل subtask:
  - editable name
  - frequency
  - weight (1-5)
  - completion criteria
- **أزرار**: Add Subtask, Delete
- **إحصائيات**: total days, daily tasks, weekly tasks

### المرحلة 5: SAVE
- `target_points = 10000` (ثابت)
- ينشئ الهدف في Supabase جدول `goals`
- ينشئ المهام الرئيسية والفرعية في `sub_layers`
- تحديث حالة على `onComplete`

### أمان وحماية
- `onGuardStateChange` ← يمنع التنقل أثناء الإنشاء
- `beforeunload` event ← يحذر قبل إغلاق المتصفح
- ConfirmModal إذا حاول المستخدم الخروج

### حالات الخطأ
- **Refused**: محتوى خطر → رسالة + زر رجوع
- **Error**: "تعذر إنشاء الخطة حالياً" + زر إعادة المحاولة
- **Quota exceeded**: رسالة خاصة (من Gemini API)

---

## ✍️ Manual Goal Creator (ManualGoalCreator)

### المراحل (4 Stages)

```
DETAILS → TIMELINE → TASKS → REVIEW
```

### المرحلة 1: DETAILS
- **Goal Title**: Input مع مثال توضيحي
- **Description**: Textarea مع مثال
- `max-w-4xl` (أوسع من AI creation)
- التحقق من صحة الإدخال

### المرحلة 2: TIMELINE
- **Start Date**: Date picker مع react-day-picker
- **End Date**: Date picker مع validation (بعد start date)
- **Target Points**: Input رقمي
- **إحصائيات تلقائية**:
  - Total Days (عدد الأيام)
  - Daily pace (نقاط/يوم)
  - Plan duration

### المرحلة 3: TASKS
- **Accordion** للمهام الرئيسية
- كل مهمة رئيسية:
  - Title input
  - Frequency select (Daily/Weekly)
  - Impact Weight slider (1-10)
  - Completion Criteria textarea
  - Subtasks list مع Add/Delete
  - كل subtask: name, frequency, weight (1-5), criteria
- **إضافة مهمة رئيسية**: زر Plus
- **حذف**: زر مع تأكيد

### المرحلة 4: REVIEW
- ملخص كامل للهدف وجميع المهام
- Target points (قابل للتعديل)
- Start/End dates
- Hierarchical task tree
- زر "حفظ الهدف"

---

## ✏️ GoalEditDialog

### التصميم
- **Shadcn Dialog** مع ScrollArea
- `w-full` على الموبايل، `max-w-lg` على الديسكتوب
- RTL support

### الحقول
- Title (Input)
- Description (Textarea)
- Icon (IconPicker popover)
- Start Date (Date picker)
- End Date (Date picker)
- Current Points (Input numeric)
- Target Points (Input numeric)

### States
- **Error**: رسالة خطأ داخل الـ Dialog
- **Saving**: Loader2 في زر الحفظ

---

## 🎯 IconPicker

### التصميم
- **Popover** مع grid 6 أعمدة (8 على sm)
- **115+ أيقونات** Lucide
- `getIconComponent(name)` ← returns React component
- `getGoalIcon(name)` ← returns JSX
- `GoalIconPicker` ← Popover wrapper جاهز

### الحالات
- **Selected**: highlight باللون primary
- **Default**: أيقونة Target كافتراضي

---

## 🧩 المهمات المتروكة (Legacy Files)
- `GoalCreator.tsx`: النسخة القديمة من AI creator (غير مستخدمة)
- `GoalTemplates.tsx`: قوالب جاهزة (Fitness, Python, Career, إلخ) - غير متوافقة مع النظام الجديد
- `GoalInput.tsx`: input component للنسخة القديمة
