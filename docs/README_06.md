# METRIX - نظام التحديات (Challenge System)

## 📍 المسار
`src/components/ChallengeTab.tsx` + `src/components/challenge/`

## 🎯 الوظيفة
نظام مبارزات 1v1 بين المستخدمين. كل مشارك يربط هدفه بالتحدي، ويتنافسون على من يسجل نقاط أكثر.

## 🎨 التصميم العام
Collapsible section داخل dashboard tab مع أنيميشن و status badges.

---

## 📋 حالات التحدي (Challenge States)

```
none → pending → active → ended
```

### 1. none (لا يوجد تحدي)
- زر "ابدأ التحدي"
- إدخال كود دعوة للانضمام
- تصميم بسيط مع أيقونة Swords

### 2. pending (انتظار الخصم)
- Badge: `bg-amber-500/20 text-amber-700` (أصفر)
- عرض كود الدعوة + زر نسخ
- "بانتظار انضمام الخصم..."
- الـ host فقط يستطيع رؤية الكود

### 3. active (تحدي نشط)
- Badge: `bg-emerald-500/20 text-emerald-700` (أخضر)
- لوحة النتائج الكاملة
- أزرار تسجيل التقدم (مرتبطة بـ ProgressLogDialog)
- Lead indicator (من المتقدم)

### 4. ended (تحدي منتهي)
- Badge: `bg-slate-500/20 text-slate-700` (رمادي)
- عرض النتيجة النهائية
- زر "ابدأ تحدياً آخر"

---

## 🧩 المكونات

### HeaderCard
`src/components/challenge/HeaderCard.tsx`

- **Status Badge**: لون حسب الحالة
- **كود الدعوة**: مع زر نسخ + أيقونة Copy
- **Lead Points**: عدد نقاط المتقدم
- **Summary Text**: وصف مختصر
- **Actions**: Create / Join / End buttons
- **Join Input**: حقل إدخال الكود + زر Join

### BoardCard (لوحة النتائج)
`src/components/challenge/BoardCard.tsx`

- **3 أعمدة**: Today / Last 7 Days / Total
- **قارنة**: أنا (Me) vs الخصم (Opponent)
- **Lead Indicator**: سهم يظهر المتقدم
- تصميم شبكي مع borders

#### حالات العرض
- **Loading**: Skeleton
- **No opponent yet**: صفوف "-"
- **Active**: أرقام حقيقية

### ActivityCard (النشاطات الأخيرة)
`src/components/challenge/ActivityCard.tsx`

- **Event List**: إنجازات التحدي مع milestones
- **Tier Colors**: Weak (رمادي) / Average / Strong / Exceptional
- **Actor Labels**: "أنا" / "الخصم"
- **Expandable**: قائمة قابلة للطي

### HistoryCard (تاريخ التحديات)
`src/components/challenge/HistoryCard.tsx`

- **قائمة التحديات السابقة**: مع opponent info
- **End Date**: تاريخ الانتهاء
- **Final Score**: النتيجة النهائية
- **زر**: "ابدأ مباراة أخرى"

### LoadingSkeleton
`src/components/challenge/LoadingSkeleton.tsx`

- 3 كروت متحركة (Skeleton)

### FeedbackBanner
`src/components/challenge/FeedbackBanner.tsx`

- **Success**: أخضر مع أيقونة Check
- **Error**: أحمر مع أيقونة Alert
- أنيميشن fade-in

### EndChallengeDialog
`src/components/challenge/EndChallengeDialog.tsx`

- تأكيد إنهاء التحدي
- تحذير: "لا يمكن التراجع"

---

## 🏆 RewardsSection (نظام المكافآت)

### 7 رتب (Ranks)
| الرتبة | النقاط المطلوبة | الوصف (عربي) |
|--------|-----------------|--------------|
| النائم (Sleeper) | 0 | عالق في العادات القديمة |
| الملتزم (Committed) | 2,000 | تأخذ أهدافك بجدية |
| المنضبط (Disciplined) | 5,000 | يبدأ الانضباط الحقيقي |
| المحارب (Warrior) | 15,000 | تقاتل أعذارك يومياً |
| المهندس (Architect) | 50,000 | تصمم مستقبلك بنفسك |
| النخبة (Elite) | 100,000 | 1% فقط يصلون هنا |
| الاستثنائي (Exceptional) | 1,000,000 | إعادة تعريف المستحيل |

### التصميم
```
RewardsSection
├── Collapsible header + Chevron
├── Current Rank Card (big, with palette colors)
│   ├── Rank title + description
│   ├── Progress bar (toward next rank)
│   └── Points display
└── All Ranks Grid (small cards)
    └── لكل رتبة:
        ├── Lock/Unlock icon
        ├── Title
        └── Threshold
```

### أنيميشن فتح الرتبة
1. **Shimmer**: وميض ضوئي
2. **Seal Break**: كسر الختم
3. **Core Burst**: انفجار النواة
4. **Card Emerge**: ظهور البطاقة

كل رتبة مفتوحة تُحفظ في localStorage (`reward-{goalId}-{rankKey}`)

### ألوان الرتب
- Sleeper: رمادي (`148, 163, 184`)
- Committed: أزرق (`96, 165, 250`)
- Disciplined: أخضر (`52, 211, 153`)
- Warrior: أحمر (`251, 113, 133`)
- Architect: تركواز (`45, 212, 191`)
- Elite: بنفسجي (`167, 139, 250`)
- Exceptional: ذهبي (`250, 204, 21`)

### حالات العرض
- **Locked**: أيقونة LockKeyhole + opacity مخفض
- **Unlocked**: أيقونة Star + ألوان كاملة
- **Current**: Highlight + progress نحو التالية
- **Next Reward**: يظهر الرتبة التالية مع "تبقى X نقطة"

---

## 🔄 API Endpoints للتحديات

| المسار | الوظيفة |
|--------|---------|
| `POST /api/challenges/create` | إنشاء غرفة تحدي + host |
| `POST /api/challenges/join` | الانضمام عبر كود |
| `POST /api/challenges/end` | إنهاء التحدي |
| `POST /api/challenges/by-goal` | Snapshot كامل للتحدي (305 سطر) |
| `POST /api/challenges/history` | أرشيف التحديات المنتهية |
| `shared.ts` | Utilities مشتركة (90 سطر) |

## 📊 نموذج البيانات

### challenge_rooms
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | UUID | المفتاح الرئيسي |
| invite_code | TEXT (6 chars) | كود الدعوة |
| created_at | TIMESTAMP | وقت الإنشاء |
| ended_at | TIMESTAMP | وقت الانتهاء |

### challenge_participants
| الحقل | النوع | الوصف |
|-------|------|-------|
| room_id | UUID | معرف الغرفة |
| user_id | UUID | معرف المستخدم |
| goal_id | UUID | معرف الهدف |
| role | TEXT | host / guest |
| display_name_snapshot | TEXT | اسم المستخدم عند البدء |
| avatar_url_snapshot | TEXT | الصورة عند البدء |
| goal_title_snapshot | TEXT | عنوان الهدف عند البدء |
