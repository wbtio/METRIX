import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type ReminderGoal = { title?: string | null } | { title?: string | null }[] | null;

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

function getLocalDateStr(timezone: string): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
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

function getGoalTitle(goal: ReminderGoal, fallback: string) {
    if (Array.isArray(goal)) return goal[0]?.title || fallback;
    return goal?.title || fallback;
}

async function sendTelegramMessage(chatId: string, text: string) {
    if (!BOT_TOKEN) {
        return { ok: false, error: 'Telegram bot token is not configured' };
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        }),
    });

    if (!response.ok) {
        return { ok: false, error: await response.text() };
    }

    return { ok: true, error: null };
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const reminderId = typeof body.reminderId === 'string' ? body.reminderId : null;
        const requestedSequence = Number(body.sequence);
        const language = body.language === 'ar' ? 'ar' : 'en';
        const isArabic = language === 'ar';

        if (!reminderId || !Number.isInteger(requestedSequence)) {
            return NextResponse.json({ error: 'reminderId and sequence are required' }, { status: 400 });
        }

        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('telegram_chat_id, language')
            .eq('user_id', user.id)
            .maybeSingle();

        if (settingsError) {
            console.error('Telegram reminder settings error:', settingsError);
            return NextResponse.json({ error: 'Failed to read Telegram settings' }, { status: 500 });
        }

        if (!settings?.telegram_chat_id) {
            return NextResponse.json({ sent: false, reason: 'telegram_not_linked' });
        }

        const { data: reminder, error: reminderError } = await supabase
            .from('goal_reminders')
            .select('id, goal_id, reminder_time, reminder_count, timezone, enabled, goals(title)')
            .eq('id', reminderId)
            .eq('user_id', user.id)
            .eq('enabled', true)
            .maybeSingle();

        if (reminderError) {
            console.error('Telegram reminder fetch error:', reminderError);
            return NextResponse.json({ error: 'Failed to read reminder' }, { status: 500 });
        }

        if (!reminder) {
            return NextResponse.json({ sent: false, reason: 'reminder_not_found' });
        }

        const timezone = reminder.timezone || 'UTC';
        const dueSequence = getSequenceToSend(reminder.reminder_time, timezone);

        if (!dueSequence || dueSequence !== requestedSequence) {
            return NextResponse.json({ sent: false, reason: 'not_due' });
        }

        if (dueSequence > reminder.reminder_count) {
            return NextResponse.json({ sent: false, reason: 'sequence_exceeds_count' });
        }

        const localToday = getLocalDateStr(timezone);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const { data: logs, error: logsError } = await supabase
            .from('daily_logs')
            .select('created_at')
            .eq('goal_id', reminder.goal_id)
            .gte('created_at', twoDaysAgo);

        if (logsError) {
            console.error('Telegram reminder logs error:', logsError);
            return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
        }

        const hasLogToday = (logs || []).some((log) => {
            const logDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: timezone });
            return logDate === localToday;
        });

        if (hasLogToday) {
            return NextResponse.json({ sent: false, reason: 'already_logged_today' });
        }

        const goalTitle = getGoalTitle(
            reminder.goals as ReminderGoal,
            isArabic ? 'هدفك' : 'your goal',
        );
        const messages = isArabic
            ? [
                `تذكير: لم تسجل تقدمك اليوم في "${goalTitle}". خذ دقيقة وسجل الآن!`,
                `تنبيه: اليوم يمر ولا يوجد تسجيل لـ "${goalTitle}". لا تفقد زخمك!`,
                `تحذير: أنت على وشك كسر سلسلتك في "${goalTitle}"! سجل تقدمك فوراً.`,
                `خطير: لم تسجل اليوم في "${goalTitle}" وهذا تراجع واضح. افتح التطبيق وسجل الآن!`,
                `أخيراً: اليوم ينتهي قريباً و"${goalTitle}" بدون تسجيل. هل ستترك أهدافك؟`,
            ]
            : [
                `Reminder: You haven't logged progress today for "${goalTitle}". Take a moment and log now!`,
                `Heads up: The day is passing with no log for "${goalTitle}". Don't lose momentum!`,
                `Warning: You're about to break your streak on "${goalTitle}"! Log immediately.`,
                `Critical: No log today for "${goalTitle}" — clear momentum loss. Open the app and log now!`,
                `Final call: The day is ending soon and "${goalTitle}" has no log. Don't leave your goals empty!`,
            ];

        const result = await sendTelegramMessage(settings.telegram_chat_id, messages[dueSequence - 1]);
        if (!result.ok) {
            console.error('Telegram reminder send failed:', result.error);
            return NextResponse.json(
                { sent: false, reason: 'telegram_send_failed', error: result.error },
                { status: 502 },
            );
        }

        return NextResponse.json({ sent: true, sequence: dueSequence });
    } catch (error) {
        console.error('Telegram reminder API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
