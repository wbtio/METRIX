import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ linked: false, username: null });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('telegram_chat_id, telegram_username')
      .eq('user_id', user.id)
      .not('telegram_chat_id', 'is', null)
      .maybeSingle();

    if (settings?.telegram_chat_id) {
      return NextResponse.json({
        linked: true,
        username: settings.telegram_username || null,
      });
    }

    const { data: link } = await supabase
      .from('telegram_links')
      .select('chat_id, username')
      .eq('user_id', user.id)
      .not('chat_id', 'is', null)
      .maybeSingle();

    return NextResponse.json({
      linked: !!link?.chat_id,
      username: link?.username || null,
    });
  } catch {
    return NextResponse.json({ linked: false, username: null });
  }
}
