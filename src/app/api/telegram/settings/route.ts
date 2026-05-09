import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { timezone, language } = body;

    const updates: Record<string, string> = {};
    if (timezone) updates.timezone = timezone;
    if (language) updates.language = language;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('telegram_links')
        .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
