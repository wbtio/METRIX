import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const { error: upsertError } = await supabase
      .from('telegram_links')
      .upsert(
        { user_id: user.id, link_code: linkCode },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Telegram link upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to create link code' }, { status: 500 });
    }

    const botName = process.env.TELEGRAM_BOT_NAME || 'metrixe_bot';
    const deepLink = `https://t.me/${botName}?start=${linkCode}`;

    return NextResponse.json({ deepLink, code: linkCode });
  } catch (error) {
    console.error('Telegram link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
