import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .single();

    if (settings?.telegram_chat_id) {
      try {
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: settings.telegram_chat_id,
              text:
                'تم فصل حسابك عن منصة METRIX بنجاح. لن تتلقى أي إشعارات أو تذكيرات بعد الآن. 🛑\n\nYour account has been successfully disconnected from METRIX. You will no longer receive notifications. 🛑',
            }),
          }
        );
      } catch {
        // Proceed even if the message fails to send
      }
    }

    await Promise.all([
      supabase
        .from('telegram_links')
        .update({ chat_id: null, username: null, linked_at: null })
        .eq('user_id', user.id),
      supabase
        .from('user_settings')
        .update({
          telegram_chat_id: null,
          telegram_username: null,
          telegram_linked_at: null,
          reminders_enabled: false,
        })
        .eq('user_id', user.id),
      supabase
        .from('telegram_chat_sessions')
        .update({ state: 'idle' })
        .eq('user_id', user.id),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
