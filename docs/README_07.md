# METRIX - الإعدادات والمكونات المشتركة

---

## ⚙️ صفحة الإعدادات (SettingsPage)

`src/components/settings/SettingsPage.tsx` (1371 سطر)

### 🎨 التصميم
- **Tabbed interface**: General + Profile
- **Card rows** مع أيقونات + toggle switches
- **ScrollArea** للمحتوى
- RTL support كامل

### 📋 تبويب General

#### 1. Theme Toggle
- Light / Dark
- أيقونات: Sun / Moon
- يقرأ ويكتب `localStorage.theme`

#### 2. Language
- العربية / English
- `setLanguage` يغير `document.documentElement` dir + lang
- يُحفظ في `localStorage`

#### 3. Notifications
- Browser notification permission check
- Toggle switch
- `Notification.permission` API
- يدعم `unsupported` state

#### 4. Goal Reminders (لكل هدف)
- لكل هدف: زر تفعيل/إلغاء
- Time picker
- Count (عدد التذكيرات)
- API: `/api/telegram/reminders/`

#### 5. Telegram Integration
- Generate link → RabbitMQ deep link
- Poll for status (حتى يربط)
- Disconnect
- **Guide Dialog**: تعليمات مع صور

#### 6. Sign Out
- `supabase.auth.signOut()`
- Spinner أثناء التسجيل
- Redirect إلى `/login`

### 👤 تبويب Profile

#### 1. Avatar
- Upload إلى Supabase Storage
- Fallback إلى base64 إذا فشل
- أيقونة Camera على hover
- صورة دائرية 96px

#### 2. Display Name
- Input مع validation
- Save + Success message

#### 3. Account Stats
| الإحصائية | المصدر |
|-----------|--------|
| الأهداف المنشأة | `goals.count()` |
| إجمالي السجلات | `daily_logs.count()` |
| أطول Streak | `daily_logs` تحليل تواريخ |
| إجمالي النقاط | `sum(ai_score)` |
| الأهداف المكتملة | `goals.status === "completed"` |

#### 4. Goal Export (تصدير الأهداف)
- Markdown format
- يتضمن Full Calendar من الـ daily_logs
- إسم الهدف + كل السجلات + نقاط
- تحميل كملف `.md`

---

## 🔄 المكونات المشتركة (Shared Components)

### ConfirmModal
`src/components/shared/ConfirmModal.tsx`

- **Variant**: danger (أحمر) / primary (أزرق)
- **RTL support**
- **العناصر**: Title, Message, Confirm Button, Cancel Button
- **Animated**: fade-in + slide-in
- استخدامات: حذف هدف، حذف مهمة، مغادرة AI creation

### VoiceRecorder
`src/components/shared/VoiceRecorder.tsx`

- **API**: MediaRecorder
- **MIME negotiation**: webm > mp4
- **States**: Idle (Mic) / Recording (StopCircle + red pulse) / Processing (Loader2)
- **Variants**: `default` (full) / `sm` (صغير)
- **Error handling**: alert إذا فشل الميكروفون
- يُرسل إلى `/api/transcribe` (Mistral Voxtral)

### GoalProgressBar
`src/components/shared/GoalProgressBar.tsx`

- **Animated gradient fill**: `bg-gradient-to-r` مع wave pattern
- **Glow effect**: `shadow-[0_0_12px]` على الحافة
- **Labels**: داخل الشريط (ديسكتوب) / خارجه (موبايل)
- **ARIA**: `role="progressbar"` مع `aria-valuenow`
- **RTL**: `dir="ltr"` حتى الأرقام

### TaskAppearancePicker
`src/components/shared/TaskAppearancePicker.tsx`

- **Two-mode popover**: Emoji (10 categories × 16 emojis) + Color (14 swatches)
- **"Auto" button**: يمسح الاختيار (auto-color حسب النص)
- يستخدم `getTaskAccent(seed, preferredColor)` للتلوين التلقائي

### TaskColorPicker
`src/components/shared/TaskColorPicker.tsx`

- **14 color swatches** من `TASK_COLOR_OPTIONS`
- Auto-reset button
- Popover بسيط مع أيقونة Palette

### FullEmojiPicker
`src/components/shared/FullEmojiPicker.tsx`

- **Category tabs**: 10 فئات
- **6-column grid** من الإيموجيز
- **Selected state**: border primary
- Popover مع scroll

### ThemeToggle (Legacy)
- غير مستخدم حالياً (SettingsPage تدير الثيم)

### StreakFlame (Legacy)
- غير مستخدم حالياً (DashboardHeader يعرض الـ streak)

---

## 🎣 React Hooks

### useStreakReminder
`src/hooks/useStreakReminder.ts`

- **Check كل 30 دقيقة**: `setInterval(fetchStreakStatus, 30 * 60 * 1000)`
- **Browser Notification**: إذا streak في خطر (سجل أمس لكن ليس اليوم)
- **Once per day**: localStorage key
- **AR/EN support**: حسب اللغة

### useTelegramReminder
`src/hooks/useTelegramReminder.ts`

- **Poll كل 5 دقائق**: `/api/telegram/reminders/cron`
- **Background**: لا يحتاج تدخل المستخدم

### useNotifications
`src/hooks/useNotifications.ts`

- **يولد إشعارات** من `UserGoalContext`:
  - Streak status (safe/at_risk/broken)
  - Challenge status (none/pending/active/ended)
  - Daily focus status (none/unanswered/answered)
  - Logged today check
- **Falls back** إلى mock notifications إذا ما في بيانات
- **Loading + Error states** مع refresh function

### useMobile
`src/hooks/use-mobile.ts`

- **Detects** `window.innerWidth < 768px`
- يستخدم `useEffect` + `addEventListener('resize')`

---

## 📦 Library Files

### translations.ts (804 سطر)
- **قاموس AR/EN** لكل النصوص في التطبيق
- Sections: Settings, Dashboard, Daily Focus, Challenge, Goals, Progress Log, Voice, Common
- `type Language = "ar" | "en"`
- كل text معرف في object واحد

### gemini.ts (1455 سطر)
- **كل منطق Gemini AI**:
  1. `investigateGoal` → تحليل الهدف + أسئلة
  2. `createPlan` → بناء خطة هرمية
  3. `evaluateDailyLog` → تقييم التقدم اليومي
  4. `generateDailyFocus` → توليد سؤال اليوم
  5. `evaluateMilestone` → تقييم الإنجاز الكبير
  6. `generateMilestoneImage` → توليد صورة الإنجاز
- **Fallback chain**: flash-lite → flash → pro
- **Safety blocklist**: ~20 كلمة خطيرة
- **Daily cap**: `max(5, sum(weights) + 5)`
- **JSON extraction**: من markdown-wrapped JSON

### daily-log-feedback.ts (570 سطر)
- تحليل أداء اليوم
- `performance_tier`: weak/average/strong/exceptional
- `trend`: below/at/above usual
- `badge`, `warning_level`, `evidence_level`

### task-hierarchy.ts (238 سطر)
- `buildTaskHierarchy`: flat rows → MainTask[] مع subtasks
- `getScorableTasks`: المهام القابلة للتقييم
- `calculateDailyCap`: الحد اليومي للنقاط

### task-colors.ts (195 سطر)
- 14 لون مع CSS classes
- Hash-based auto-color: `getTaskAccent(seed)` → 6 ألوان أساسية

### utils.ts (23 سطر)
- `cn()`: clsx + tailwind-merge
- `hasArabicText()`: كشف النص العربي
- `textDirectionFor()`: RTL/LTR
- `formatNumberEn()`: تنسيق الأرقام
