import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getErrorMessage } from '../shared';

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

    // Get all challenge participations for this user on this goal
    const { data: participations, error: partError } = await supabase
      .from('challenge_participants')
      .select('challenge_id, user_id, goal_id, role, display_name_snapshot, avatar_url_snapshot, goal_title_snapshot, joined_at, left_at')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (partError) {
      return NextResponse.json({ error: 'Failed to load participations' }, { status: 500 });
    }

    if (!participations || participations.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const challengeIds = [...new Set(participations.map((p) => p.challenge_id))];

    // Get all rooms for these challenges
    const { data: rooms, error: roomsError } = await supabase
      .from('challenge_rooms')
      .select('id, invite_code, ended_at, created_at')
      .in('id', challengeIds)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(20);

    if (roomsError) {
      return NextResponse.json({ error: 'Failed to load challenge rooms' }, { status: 500 });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get all participants for these rooms
    const roomIds = rooms.map((r) => r.id);
    const { data: allParticipants, error: allPartError } = await supabase
      .from('challenge_participants')
      .select('challenge_id, user_id, goal_id, role, display_name_snapshot, avatar_url_snapshot, goal_title_snapshot, joined_at, left_at')
      .in('challenge_id', roomIds);

    if (allPartError) {
      return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 });
    }

    const history = rooms.map((room) => {
      const roomParticipants = (allParticipants || []).filter((p) => p.challenge_id === room.id);
      const me = roomParticipants.find((p) => p.user_id === user.id);
      const opponent = roomParticipants.find((p) => p.user_id !== user.id);

      return {
        challengeId: room.id,
        createdAt: room.created_at,
        endedAt: room.ended_at,
        me: me
          ? {
              displayName: me.display_name_snapshot,
              avatarUrl: me.avatar_url_snapshot,
              goalTitle: me.goal_title_snapshot,
            }
          : null,
        opponent: opponent
          ? {
              displayName: opponent.display_name_snapshot,
              avatarUrl: opponent.avatar_url_snapshot,
              goalTitle: opponent.goal_title_snapshot,
            }
          : null,
      };
    });

    return NextResponse.json({ data: history });
  } catch (error: unknown) {
    console.error('Challenge history API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
