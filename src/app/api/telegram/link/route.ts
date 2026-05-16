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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Insert into telegram_link_codes — this is the table the webhook's /start handler reads from
    const { error: insertError } = await supabase
      .from('telegram_link_codes')
      .insert({
        code: linkCode,
        user_id: user.id,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Insert Link Code Error:', insertError);
      return NextResponse.json({ error: 'Failed to create link code' }, { status: 500 });
    }

    // Also upsert into telegram_links for legacy/persistent tracking (non-critical)
    const { error: legacyError } = await supabase
      .from('telegram_links')
      .upsert(
        { user_id: user.id, link_code: linkCode },
        { onConflict: 'user_id' }
      );

    if (legacyError) {
      console.error('Legacy telegram_links upsert error:', legacyError);
    }

    const botName = process.env.TELEGRAM_BOT_NAME || 'metrixe_bot';
    const deepLink = `https://t.me/${botName}?start=${linkCode}`;

    return NextResponse.json({ deepLink, code: linkCode });
  } catch (error) {
    console.error('Telegram link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
