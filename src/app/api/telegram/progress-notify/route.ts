import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return { ok: false, error: 'Bot token not configured' };
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, error: null };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's telegram chat id
    const { data: settings } = await supabase
      .from('user_settings')
      .select('telegram_chat_id, language')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.telegram_chat_id) {
      return NextResponse.json({ sent: false, reason: 'telegram_not_linked' });
    }

    const body = await req.json();
    const {
      goalTitle,
      mode,
      dayLabel,
      points,
      bonusPoints,
      coachMessage,
      comparisonMessage,
      warningMessage,
      fullFeedback,
      sessionTotalPoints,
    } = body;

    const isArabic = (settings.language || 'ar') === 'ar';

    const modeLabel = mode === 'manual'
      ? (isArabic ? 'يدوي' : 'Manual')
      : (isArabic ? 'تحليل AI' : 'AI Analysis');

    let message = isArabic
      ? `📊 <b>METRIX</b> — تسجيل تقدم\n`
      : `📊 <b>METRIX</b> — Progress Logged\n`;

    message += `\n🎯 <b>${isArabic ? 'الهدف' : 'Goal'}:</b> ${goalTitle}`;
    message += `\n📋 <b>${isArabic ? 'النوع' : 'Mode'}:</b> ${modeLabel}`;
    message += `\n🏆 <b>${isArabic ? 'التقييم' : 'Rating'}:</b> ${dayLabel}`;

    if (sessionTotalPoints) {
      message += `\n➕ <b>${isArabic ? 'النقاط' : 'Points'}:</b> +${sessionTotalPoints}`;
      if (bonusPoints > 0) {
        message += ` (${isArabic ? 'مكافأة' : 'bonus'}: +${bonusPoints})`;
      }
    }

    message += `\n\n${coachMessage || ''}`;

    if (comparisonMessage) {
      message += `\n${comparisonMessage}`;
    }

    if (warningMessage) {
      message += `\n\n⚠️ ${warningMessage}`;
    }

    const result = await sendTelegramMessage(settings.telegram_chat_id, message);
    if (!result.ok) {
      console.error('Telegram progress notify failed:', result.error);
      return NextResponse.json({ sent: false, reason: 'send_failed', error: result.error }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Telegram progress notify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
