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
  if (diff < -720) diff += 1440; // Crossed midnight

  if (diff < 0 || diff >= 150) return null;
  return Math.floor(diff / 30) + 1;
}

async function hasLogTodayForGoal(goalId: string, timezone: string): Promise<boolean> {
  const localToday = new Date().toLocaleDateString('en-CA', {
    timeZone: timezone,
  });

  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('created_at')
    .eq('goal_id', goalId)
    .gte('created_at', twoDaysAgo);

  for (const log of logs || []) {
    const logLocalDate = new Date(log.created_at).toLocaleDateString('en-CA', {
      timeZone: timezone,
    });
    if (logLocalDate === localToday) {
      return true;
    }
  }

  return false;
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

Deno.serve(async () => {
  // Get users with linked Telegram
  const { data: users, error: usersError } = await supabase
    .from('user_settings')
    .select('user_id, telegram_chat_id, language')
    .not('telegram_chat_id', 'is', null);

  if (usersError || !users) {
    return new Response(JSON.stringify({ error: usersError?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;

  for (const user of users) {
    try {
      // Get active goal reminders for this user
      const { data: reminders } = await supabase
        .from('goal_reminders')
        .select('id, goal_id, reminder_time, reminder_count, timezone, goals(title)')
        .eq('user_id', user.user_id)
        .eq('enabled', true);

      if (!reminders || reminders.length === 0) continue;

      for (const reminder of reminders) {
        const sequence = getSequenceToSend(
          reminder.reminder_time,
          reminder.timezone || 'UTC'
        );
        if (!sequence) continue;

        // Skip if sequence exceeds this reminder's count
        if (sequence > reminder.reminder_count) continue;

        const userLocalToday = new Date().toLocaleDateString('en-CA', {
          timeZone: reminder.timezone || 'UTC',
        });

        // Check if already sent
        const { data: existing } = await supabase
          .from('telegram_reminder_logs')
          .select('sequence')
          .eq('user_id', user.user_id)
          .eq('goal_id', reminder.goal_id)
          .eq('reminder_date', userLocalToday)
          .eq('sequence', sequence)
          .maybeSingle();

        if (existing) continue;

        // Check if this specific goal has been logged today
        const logged = await hasLogTodayForGoal(
          reminder.goal_id,
          reminder.timezone || 'UTC'
        );
        if (logged) continue;

        const lang = user.language === 'ar' ? 'ar' : 'en';
        const baseMessage = MESSAGES[lang][sequence - 1];
        const goalTitle = reminder.goals?.title || 'Your goal';
        const message = `${baseMessage}\n\n<b>Goal:</b> ${goalTitle}`;

        await sendTelegramMessage(user.telegram_chat_id, message);
        sentCount++;

        await supabase.from('telegram_reminder_logs').insert({
          user_id: user.user_id,
          goal_id: reminder.goal_id,
          reminder_date: userLocalToday,
          sequence,
        });
      }
    } catch (err) {
      console.error(`Error processing user ${user.user_id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({ processed: users.length, sent: sentCount }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
