import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { getErrorMessage } from '../shared';

interface ScoreSlice {
  today: number;
  last7Days: number;
  total: number;
}

interface ParticipantRow {
  challenge_id: string;
  user_id: string;
  goal_id: string;
  role: 'host' | 'guest';
  display_name_snapshot: string;
  avatar_url_snapshot: string | null;
  goal_title_snapshot: string;
  joined_at: string;
  left_at: string | null;
}

const ZERO_SCORE: ScoreSlice = {
  today: 0,
  last7Days: 0,
  total: 0,
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function maxIso(a: string, b: string) {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

async function sumGoalPoints(
  supabase: SupabaseClient,
  goalId: string,
  fromIso: string,
  toIso: string,
  endInclusive = false
) {
  const fromTs = new Date(fromIso).getTime();
  const toTs = new Date(toIso).getTime();
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs >= toTs) {
    return 0;
  }

  let query = supabase
    .from('daily_logs')
    .select('ai_score, created_at')
    .eq('goal_id', goalId)
    .gte('created_at', fromIso);

  query = endInclusive ? query.lte('created_at', toIso) : query.lt('created_at', toIso);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).reduce((sum: number, row: { ai_score: number | null }) => sum + (row.ai_score || 0), 0);
}

async function buildParticipantScore(params: {
  supabase: SupabaseClient;
  participant: ParticipantRow;
  referenceDate: Date;
  challengeEndedAt: string | null;
  localMidnightUtc?: string | null;
}) {
  const { supabase, participant, referenceDate, challengeEndedAt, localMidnightUtc } = params;

  // For active challenges, use the client's local midnight so "today" matches the user's timezone.
  // For ended challenges, use the UTC end date as the reference.
  const todayStart =
    !challengeEndedAt && localMidnightUtc && !isNaN(new Date(localMidnightUtc).getTime())
      ? new Date(localMidnightUtc)
      : startOfUtcDay(referenceDate);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const last7Start = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const joinedAt = participant.joined_at;
  const totalEnd = challengeEndedAt || new Date().toISOString();

  const [today, last7Days, total] = await Promise.all([
    sumGoalPoints(supabase, participant.goal_id, maxIso(joinedAt, todayStart.toISOString()), tomorrowStart.toISOString()),
    sumGoalPoints(supabase, participant.goal_id, maxIso(joinedAt, last7Start.toISOString()), tomorrowStart.toISOString()),
    sumGoalPoints(supabase, participant.goal_id, joinedAt, totalEnd, Boolean(challengeEndedAt)),
  ]);

  return {
    today,
    last7Days,
    total,
  } as ScoreSlice;
}

async function getRecentEvents(
  supabase: SupabaseClient,
  participant: ParticipantRow,
  actor: 'me' | 'opponent',
  challengeEndedAt: string | null
) {
  let query = supabase
    .from('daily_logs')
    .select('created_at, ai_score')
    .eq('goal_id', participant.goal_id)
    .gte('created_at', participant.joined_at)
    .order('created_at', { ascending: false })
    .limit(8);

  if (challengeEndedAt) {
    query = query.lte('created_at', challengeEndedAt);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map((row: { created_at: string; ai_score: number }) => ({
    actor,
    points: row.ai_score || 0,
    createdAt: row.created_at,
  }));
}

function noneSnapshot() {
  return {
    status: 'none' as const,
    challengeId: null,
    inviteCode: null,
    me: null,
    opponent: null,
    scoreboard: {
      me: ZERO_SCORE,
      opponent: ZERO_SCORE,
    },
    recentEvents: [] as Array<{ actor: 'me' | 'opponent'; points: number; createdAt: string }>,
    endedAt: null,
  };
}

export async function POST(req: Request) {
  try {
    const { goalId, localMidnightUtc } = await req.json();

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

    const { data: ownedGoal, error: ownedGoalError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownedGoalError) {
      return NextResponse.json({ error: 'Failed to verify goal ownership' }, { status: 500 });
    }

    if (!ownedGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { data: myParticipant, error: participantError } = await supabase
      .from('challenge_participants')
      .select(
        'challenge_id, user_id, goal_id, role, display_name_snapshot, avatar_url_snapshot, goal_title_snapshot, joined_at, left_at'
      )
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (participantError) {
      return NextResponse.json({ error: 'Failed to load challenge participant' }, { status: 500 });
    }

    if (!myParticipant) {
      return NextResponse.json({ data: noneSnapshot() });
    }

    const { data: room, error: roomError } = await supabase
      .from('challenge_rooms')
      .select('id, invite_code, ended_at, created_at')
      .eq('id', myParticipant.challenge_id)
      .maybeSingle();

    if (roomError) {
      return NextResponse.json({ error: 'Failed to load challenge room' }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ data: noneSnapshot() });
    }

    const { data: participants, error: participantsError } = await supabase
      .from('challenge_participants')
      .select(
        'challenge_id, user_id, goal_id, role, display_name_snapshot, avatar_url_snapshot, goal_title_snapshot, joined_at, left_at'
      )
      .eq('challenge_id', room.id);

    if (participantsError) {
      return NextResponse.json({ error: 'Failed to load challenge participants' }, { status: 500 });
    }

    const me = ((participants || []) as ParticipantRow[]).find((p) => p.user_id === user.id) ||
      (myParticipant as ParticipantRow);

    const opponent = ((participants || []) as ParticipantRow[]).find((p) => p.user_id !== user.id) || null;

    const status = room.ended_at ? 'ended' : opponent ? 'active' : 'pending';
    const referenceDate = room.ended_at ? new Date(room.ended_at) : new Date();

    const [meScore, opponentScore, meEvents, opponentEvents] = await Promise.all([
      buildParticipantScore({
        supabase,
        participant: me,
        referenceDate,
        challengeEndedAt: room.ended_at,
        localMidnightUtc,
      }),
      opponent
        ? buildParticipantScore({
            supabase,
            participant: opponent,
            referenceDate,
            challengeEndedAt: room.ended_at,
            localMidnightUtc,
          })
        : Promise.resolve(ZERO_SCORE),
      getRecentEvents(supabase, me, 'me', room.ended_at),
      opponent ? getRecentEvents(supabase, opponent, 'opponent', room.ended_at) : Promise.resolve([]),
    ]);

    const recentEvents = [...meEvents, ...opponentEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({
      data: {
        status,
        challengeId: room.id,
        inviteCode: room.invite_code,
        me: {
          userId: me.user_id,
          role: me.role,
          displayName: me.display_name_snapshot,
          avatarUrl: me.avatar_url_snapshot,
          goalTitle: me.goal_title_snapshot,
        },
        opponent: opponent
          ? {
              userId: opponent.user_id,
              role: opponent.role,
              displayName: opponent.display_name_snapshot,
              avatarUrl: opponent.avatar_url_snapshot,
              goalTitle: opponent.goal_title_snapshot,
            }
          : null,
        scoreboard: {
          me: meScore,
          opponent: opponentScore,
        },
        recentEvents,
        endedAt: room.ended_at,
      },
    });
  } catch (error: unknown) {
    console.error('Challenge by-goal API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
