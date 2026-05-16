// @ts-nocheck
// Supabase Edge Function — runs on Deno, excluded from Next.js TypeScript
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MESSAGES: Record<string, string[]> = {
  en: [
    'Reminder: You have not logged progress today. Take a moment and log your daily progress now!',
    'Heads up: The day is passing with no log. Do not lose your momentum!',
    'Warning: You are about to break your streak! Log your progress immediately.',
    'Critical: No log today — this is clear momentum loss. Open the app and log now!',
    'Final call: The day is ending soon. Will you leave your goals without a log?',
  ],
  ar: [
    'تذكير: لم تسجل تقدمك اليوم. خذ دقيقة وسجل تقدمك الآن!',
    'تنبيه: اليوم يمر ولا يوجد تسجيل. لا تفقد زخمك!',
    'تحذير: أنت على وشك كسر سلسلتك! سجل تقدمك فوراً.',
    'خطير: لم تسجل اليوم وهذا تراجع واضح. افتح التطبيق وسجل الآن!',
    'أخيراً: اليوم ينتهي قريباً. هل ستترك أهدافك بدون تسجيل؟',
  ],
};

function getLocalTimeParts(timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0');
  return { hour: get('hour'), minute: get('minute') };
}

function getSequenceToSend(
  reminderTime: string,
  timezone: string
): number | null {
  const [rh, rm] = reminderTime.split(':').map(Number);
  const { hour: ch, minute: cm } = getLocalTimeParts(timezone);

  const reminderMinutes = rh * 60 + rm;
  const currentMinutes = ch * 60 + cm;

  let diff = currentMinutes - reminderMinutes;
  if (diff < -720) diff += 1440;

  if (diff < 0 || diff >= 150) return null;
  return Math.floor(diff / 30) + 1;
}

function getLocalDateStr(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

function getTodayLogDates(dailyLogs: { created_at: string }[], goalId: string, timezone: string): Set<string> {
  const dates = new Set<string>();
  for (const log of dailyLogs || []) {
    if (log.created_at < goalId) continue;
    const logDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: timezone });
    dates.add(`${goalId}:${logDate}`);
  }
  return dates;
}

async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

interface UserWithReminders {
  user_id: string;
  telegram_chat_id: string;
  language: string;
  goal_reminders: {
    id: string;
    goal_id: string;
    reminder_time: string;
    reminder_count: number;
    timezone: string;
    goals: { title?: string } | { title?: string }[] | null;
  }[];
}

Deno.serve(async () => {
  // 1. Single query: get users + their enabled goal reminders in one JOIN
  const { data: users, error: usersError } = await supabase
    .from('user_settings')
    .select(`
      user_id,
      telegram_chat_id,
      language,
      goal_reminders!inner(
        id,
        goal_id,
        reminder_time,
        reminder_count,
        timezone,
        goals(title)
      )
    `)
    .not('telegram_chat_id', 'is', null)
    .eq('reminders_enabled', true)
    .eq('goal_reminders.enabled', true);

  if (usersError) {
    console.error('Failed to fetch users:', usersError);
    return new Response(JSON.stringify({ error: usersError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const typedUsers = users as unknown as UserWithReminders[];

  // 2. Collect unique goal IDs for batch daily_logs fetch
  const allGoalIds = [...new Set(
    typedUsers.flatMap((u) => u.goal_reminders.map((r) => r.goal_id))
  )];

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgoDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA');

  // 3. Batch fetch existing reminder logs (last 2 days covers all timezone offsets)
  const { data: existingLogsRaw } = await supabase
    .from('telegram_reminder_logs')
    .select('user_id, goal_id, sequence, reminder_date')
    .gte('reminder_date', twoDaysAgoDate);

  const alreadySent = new Set<string>();
  for (const log of existingLogsRaw || []) {
    alreadySent.add(`${log.user_id}:${log.goal_id}:${log.sequence}:${log.reminder_date}`);
  }

  // 4. Batch fetch daily logs for all goals
  const { data: dailyLogsRaw } = await supabase
    .from('daily_logs')
    .select('goal_id, created_at')
    .in('goal_id', allGoalIds)
    .gte('created_at', twoDaysAgo);

  // Index daily_logs by goal_id for O(1) lookup
  const logsByGoal: Record<string, { created_at: string }[]> = {};
  for (const log of dailyLogsRaw || []) {
    if (!logsByGoal[log.goal_id]) logsByGoal[log.goal_id] = [];
    logsByGoal[log.goal_id].push({ created_at: log.created_at });
  }

  let sentCount = 0;

  for (const user of typedUsers) {
    for (const reminder of user.goal_reminders) {
      try {
        const timezone = reminder.timezone || 'UTC';
        const sequence = getSequenceToSend(reminder.reminder_time, timezone);
        if (!sequence) continue;
        if (sequence > reminder.reminder_count) continue;

        const localToday = getLocalDateStr(timezone);
        const sentKey = `${user.user_id}:${reminder.goal_id}:${sequence}:${localToday}`;
        if (alreadySent.has(sentKey)) continue;

        // Check if this goal was already logged today (in-memory)
        const goalLogs = logsByGoal[reminder.goal_id] || [];
        const hasLogToday = goalLogs.some((log) => {
          const logDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: timezone });
          return logDate === localToday;
        });
        if (hasLogToday) continue;

        const lang = user.language === 'ar' ? 'ar' : 'en';
        const goalData = reminder.goals;
        const goalTitle = Array.isArray(goalData)
          ? goalData[0]?.title || 'Your goal'
          : goalData?.title || 'Your goal';
        const message = `${MESSAGES[lang][sequence - 1]}\n\n<b>Goal:</b> ${goalTitle}`;

        await sendTelegramMessage(user.telegram_chat_id, message);
        sentCount++;

        await supabase.from('telegram_reminder_logs').insert({
          user_id: user.user_id,
          goal_id: reminder.goal_id,
          reminder_date: localToday,
          sequence,
        });
      } catch (err) {
        console.error(`Error processing reminder ${reminder.id} for user ${user.user_id}:`, err);
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: typedUsers.length, sent: sentCount }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
