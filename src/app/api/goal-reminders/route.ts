import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('goal_reminders')
      .select('id, goal_id, reminder_time, reminder_count, enabled')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching goal reminders:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { goalId, reminderTime, reminderCount } = body;

    if (!goalId || !reminderTime) {
      return NextResponse.json({ error: 'goalId and reminderTime are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('goal_reminders')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        reminder_time: reminderTime,
        reminder_count: reminderCount || 3,
        enabled: true,
      })
      .select('id, goal_id, reminder_time, reminder_count, enabled')
      .single();

    if (error) {
      console.error('Error creating goal reminder:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, reminder_time, reminder_count, enabled, timezone } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (reminder_time !== undefined) updates.reminder_time = reminder_time;
    if (reminder_count !== undefined) updates.reminder_count = reminder_count;
    if (enabled !== undefined) updates.enabled = enabled;
    if (timezone !== undefined) updates.timezone = timezone;

    const { error } = await supabase
      .from('goal_reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating goal reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('goal_reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting goal reminder:', error);
      return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
