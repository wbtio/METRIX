# METRIX - لوحة التحكم (Dashboard)

## 📍 المسار
`/` ← `src/components/dashboard/Dashboard.tsx` (1532 سطر)

## 🎯 الوظيفة
قلب التطبيق - إدارة المهام، تسجيل التقدم، عرض الرسوم البيانية، والتحديات.

## 🎨 التصميم العام
```
max-w-4xl mx-auto
├── DashboardHeader (goal info + progress + streak)
├── Log Progress Button (Flame)
├── Tabs
│   ├── Focus (tasks + daily focus)
│   ├── Chart (growth + calendar + insights)
│   └── Challenge (duels)
└── ProgressLogDialog (modal)
```

---

## 📋 شريط التبويب (Tab Bar)
- **3 tabs**: Focus/Chart/Challenge
- تصميم `rounded-xl border bg-muted/20 p-0.5`
- Tab النشط: `bg-white dark:bg-background border`
- أيقونات: ListTodo, BarChart3, Swords

---

## 🏠 DashboardHeader

### العناصر
- **Goal Icon**: أيقونة قابلة للنقر (تفتح IconPicker)
- **Title**: اسم الهدف
- **Badges**: Pinned, Days Chip, Status
- **Streak**: عدد أيام الالتزام المتتالية مع أيقونة Flame
- **Task Count**: `completed/total`
- **GoalProgressBar**: شريط التقدم مع gradient و wave effect

### القائمة المنسدلة (Dropdown)
- Pin/Unpin
- Edit (يفتح GoalEditDialog)
- Show/Hide Details
- Delete (مع تأكيد ConfirmModal)

### التفاصيل القابلة للطي
- Start/End Date
- Total Days
- Current/Target Points
- Status
- AI Summary

---

## ✅ FocusTab (تبويب المهام)

### التقسيم
```
├── DailyFocusPanel (سؤال اليوم + اقتراحات)
└── Task Hierarchy List
    ├── Main Tasks (expandable accordion)
    │   ├── Subtask 1
    │   ├── Subtask 2 (مع checkboxes)
    │   └── Add Subtask
    └── Add Main Task
```

### تصميم المهام
- **Main Task**: `rounded-3xl` container مع gradient bg، لون accent، border ملون
- **Subtask**: سطر مع checkbox دائري
- **Checked**: opacity منخفض + خط في النص
- **Freshly Completed**: أنيميشن خاص (1800ms)
- **Expand/Collapse**: ChevronDown/ChevronRight مع أنيميشن

### قائمة السياق للمهمة (Dropdown)
- Add Subtask
- Rename (inline editing)
- Weight Selector (1-10)
- Icon Picker
- Color Picker (14 لون)
- Delete (مع تأكيد)

### Add Main Task Composer
- Textarea auto-resize
- Frequency toggle (Daily/Weekly)
- Weight slider
- Color picker
- زر "إضافة"

### حالات العرض
- **Loading**: Skeleton (CardsPreview)
- **Empty**: "أضف مهمتك الأولى" مع أيقونة
- **No Subtasks**: عرض المهام الرئيسية مباشرة

---

## 💬 DailyFocusPanel

### الأقسام
1. **السؤال الحالي**: question + "Why this matters" (collapsible)
2. **حقل الإجابة**: textarea + voice recorder
3. **Coaching reply**: رد AI بعد الإجابة
4. **الاقتراحات**: قائمة مهام مقترحة مع زر "أضف إلى مهامي"
5. **التاريخ**: الأسئلة السابقة (read-only, collapsible)

### States
- **Loading**: Skeleton
- **Unanswered**: Show input + زر إرسال
- **Answered**: Show saved answer + coaching
- **Error**: رسالة خطأ (quota, refused)
- **Suggestions Locked**: حتى يجيب على السؤال

### Pop-up Dialog
`DailyFocusQuestionDialog` يظهر تلقائيًا عند فتح الـ Dashboard:
- Bottom sheet على الموبايل
- Centered modal على الديسكتوب
- يُخفي نفسه بعد الإجابة أو الـ dismiss (localStorage)

---

## 📈 GrowthChart (الرسم البياني)

### الميزات
- **3 أنواع**: Bar / Line / Area (اختيار عبر DropdownMenu)
- **7 نطاقات زمنية**: 7d / 30d / 60d / 90d / 120d / year / all
- **Smart Bucket**: day للنطاقات القصيرة، month للنطاقات الطويلة
- **Auto-fill**: يملأ الأيام الفارغة بصفر
- **Responsive**: default 7d على الشاشات الصغيرة

### مكتبة Recharts
- `ChartContainer` + `ChartTooltip` + `ChartTooltipContent`
- Custom X-axis مع أسماء الأشهر
- Gradient fill لمنطقة الـ Area chart
- Custom tooltip مع أيقونة

### حالات العرض
- **Empty**: dashed border placeholder + "لا توجد بيانات"
- **Has Data**: رسم بياني متكامل

---

## 📅 DayCalendarGrid

### الميزات
- Grid 7 أعمدة (Mon-Sun)
- **Heat intensity**: حسب عدد النقاط/logs
- **Month picker**: navigation بين الشهور
- **Today highlight**: border مميز
- **Hover tooltip**: تفاصيل اليوم
- **Click**: يفتح Portal modal مع تفاصيل اليوم (logs, points, performance badge, AI feedback)

### Badges
- "Strong Day" 🟢
- "Exceptional Day" 🔥
- Legend: Less / More

### التصميم
- خلايا مضغوطة بألوان متدرجة
- أيام قبل start date: `opacity-30`
- أيام مستقبلية: `opacity-30`
- نقاط صغيرة للنشاط

---

## 🏆 TaskInsights (أهم المهام)

### الميزات
- يدمج بيانات `checkin` + `daily_log`
- يعرض أعلى 6 مهام بالإنجاز
- كل مهمة: أيقونة + عدد مرات الإنجاز
- Click: يفتح اسم المهمة في dialog

### حالات العرض
- **Loading**: skeleton
- **Empty**: "أكمل بعض المهام..."
- **Has Data**: grid من الأزرار الملونة

---

## 🔥 ProgressLogDialog (تسجيل التقدم)

### 3 أوضاع
1. **AI Mode**: يكتب المستخدم إنجازاته ← Gemini يقيّم ← نقاط + feedback
2. **Manual Mode**: يختار المهام المنجزة ← وقت ← نقاط محتسبة
3. **Milestone Mode**: إنجاز كبير ← اسم + وصف ← Gemini يقيّم ← صورة (اختياري)

### شاشة النتائج
- **Performance Tier**: ضعيف / متوسط / قوي / استثنائي (مع لون)
- **Coach Message**: رسالة تحفيزية
- **Comparison**: مقارنة مع متوسط الأداء
- **Warning**: تحذير إذا الأداء ضعيف
- **Task Breakdown**: تفاصيل المهام (collapsible)
- **Bonus Display**: نقاط إضافية

### حالات التحميل
- **Loading**: Spinner + "تقييم..."
- **Error Quota**: رسالة خاص
- **Refused**: محتوى غير مناسب
- **Success**: نتائج مع أنيميشن

### تكامل
- يرسل `challenge-log-updated` event
- يتحقق من إكمال الهدف (100%) → GoalCompletionCelebration
- يرسل Telegram notification
