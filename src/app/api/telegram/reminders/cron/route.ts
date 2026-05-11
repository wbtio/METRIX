import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0');
  return { hour: get('hour'), minute: get('minute') };
}

function getSequenceToSend(reminderTime: string, timezone: string): number | null {
  const [rh, rm] = reminderTime.split(':').map(Number);
  const { hour: ch, minute: cm } = getLocalTimeParts(timezone);
  const reminderMinutes = rh * 60 + rm;
  const currentMinutes = ch * 60 + cm;
  let diff = currentMinutes - reminderMinutes;
  if (diff < -720) diff += 1440;
  if (diff < 0 || diff >= 150) return null;
  return Math.floor(diff / 30) + 1;
}

async function hasLogTodayForGoal(supabase: ReturnType<typeof createServiceRoleClient>, goalId: string, timezone: string): Promise<boolean> {
  const localToday = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('created_at')
    .eq('goal_id', goalId)
    .gte('created_at', twoDaysAgo);
  for (const log of logs || []) {
    const logLocalDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: timezone });
    if (logLocalDate === localToday) return true;
  }
  return false;
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return { ok: false, error: 'Telegram bot token not configured' };
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!response.ok) return { ok: false, error: await response.text() };
  return { ok: true, error: null };
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, telegram_chat_id, language, reminders_enabled')
      .not('telegram_chat_id', 'is', null)
      .eq('reminders_enabled', true);
    if (usersError || !users) {
      return NextResponse.json({ error: usersError?.message }, { status: 500 });
    }
    let sentCount = 0;
    for (const user of users) {
      try {
        const { data: reminders } = await supabase
          .from('goal_reminders')
          .select('id, goal_id, reminder_time, reminder_count, timezone, goals(title)')
          .eq('user_id', user.user_id)
          .eq('enabled', true);
        if (!reminders || reminders.length === 0) continue;
        for (const reminder of reminders) {
          const sequence = getSequenceToSend(reminder.reminder_time, reminder.timezone || 'UTC');
          if (!sequence) continue;
          if (sequence > reminder.reminder_count) continue;
          const userLocalToday = new Date().toLocaleDateString('en-CA', { timeZone: reminder.timezone || 'UTC' });
          const { data: existing } = await supabase
            .from('telegram_reminder_logs')
            .select('sequence')
            .eq('user_id', user.user_id)
            .eq('goal_id', reminder.goal_id)
            .eq('reminder_date', userLocalToday)
            .eq('sequence', sequence)
            .maybeSingle();
          if (existing) continue;
          const logged = await hasLogTodayForGoal(supabase, reminder.goal_id, reminder.timezone || 'UTC');
          if (logged) continue;
          const lang = user.language === 'ar' ? 'ar' : 'en';
          const baseMessage = MESSAGES[lang][sequence - 1];
          const goalTitle = (reminder.goals as { title?: string })?.title || 'Your goal';
          const message = `${baseMessage}\n\n<b>Goal:</b> ${goalTitle}`;
          const result = await sendTelegramMessage(user.telegram_chat_id, message);
          if (!result.ok) {
            console.error(`Failed to send to ${user.user_id}:`, result.error);
            continue;
          }
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
    return NextResponse.json({ processed: users.length, sent: sentCount });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
