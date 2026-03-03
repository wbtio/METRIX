import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getErrorMessage, parseChallengeRpcError } from '../shared';

export async function POST(req: Request) {
  try {
    const { challengeId } = await req.json();

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .rpc('end_goal_challenge', {
        p_challenge_id: challengeId,
      })
      .single();

    if (error) {
      const parsed = parseChallengeRpcError(error.message);
      return NextResponse.json({ error: parsed.message, code: parsed.code }, { status: parsed.status });
    }

    const row = data as { challenge_id: string; ended_at: string } | null;
    if (!row) {
      return NextResponse.json({ error: 'Challenge was not ended' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        challengeId: row.challenge_id,
        endedAt: row.ended_at,
      },
    });
  } catch (error: unknown) {
    console.error('End challenge API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
