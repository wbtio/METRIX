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
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
