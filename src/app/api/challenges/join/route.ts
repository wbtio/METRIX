import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getChallengeProfileSnapshot, getErrorMessage, parseChallengeRpcError } from '../shared';

export async function POST(req: Request) {
  try {
    const { goalId, inviteCode } = await req.json();

    if (!goalId || !inviteCode) {
      return NextResponse.json({ error: 'goalId and inviteCode are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { displayName, avatarUrl } = getChallengeProfileSnapshot(user);

    const { data, error } = await supabase
      .rpc('join_goal_challenge', {
        p_invite_code: String(inviteCode).toUpperCase().trim(),
        p_goal_id: goalId,
        p_display_name: displayName,
        p_avatar_url: avatarUrl,
      })
      .single();

    if (error) {
      const parsed = parseChallengeRpcError(error.message);
      return NextResponse.json({ error: parsed.message, code: parsed.code }, { status: parsed.status });
    }

    const row = data as { challenge_id: string; invite_code: string } | null;
    if (!row) {
      return NextResponse.json({ error: 'Challenge was not joined' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        challengeId: row.challenge_id,
        inviteCode: row.invite_code,
      },
    });
  } catch (error: unknown) {
    console.error('Join challenge API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
