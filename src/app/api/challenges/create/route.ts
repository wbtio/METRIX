import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { getChallengeProfileSnapshot, getErrorMessage, parseChallengeRpcError } from '../shared';

async function getOpenGoalChallenge(supabase: SupabaseClient, goalId: string, userId: string) {
  const { data: participant, error: participantError } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (participantError) {
    throw participantError;
  }

  if (!participant?.challenge_id) {
    return null;
  }

  const { data: room, error: roomError } = await supabase
    .from('challenge_rooms')
    .select('id, invite_code, ended_at')
    .eq('id', participant.challenge_id)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room || room.ended_at) {
    return null;
  }

  return {
    challengeId: room.id,
    inviteCode: room.invite_code,
  };
}

export async function POST(req: Request) {
  try {
    const { goalId } = await req.json();

    if (!goalId) {
      return NextResponse.json({ error: 'goalId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const existingChallenge = await getOpenGoalChallenge(supabase, goalId, user.id);
    if (existingChallenge) {
      return NextResponse.json({ data: existingChallenge });
    }

    const { displayName, avatarUrl } = getChallengeProfileSnapshot(user);

    const { data, error } = await supabase
      .rpc('create_goal_challenge', {
        p_goal_id: goalId,
        p_display_name: displayName,
        p_avatar_url: avatarUrl,
      })
      .single();

    if (error) {
      const parsed = parseChallengeRpcError(error.message);

      if (parsed.code === 'active_challenge_exists') {
        const currentGoalChallenge = await getOpenGoalChallenge(supabase, goalId, user.id);
        if (currentGoalChallenge) {
          return NextResponse.json({ data: currentGoalChallenge });
        }
      }

      return NextResponse.json({ error: parsed.message, code: parsed.code }, { status: parsed.status });
    }

    const row = data as { challenge_id: string; invite_code: string } | null;
    if (!row) {
      return NextResponse.json({ error: 'Challenge was not created' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        challengeId: row.challenge_id,
        inviteCode: row.invite_code,
      },
    });
  } catch (error: unknown) {
    console.error('Create challenge API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
