import type { User } from '@supabase/supabase-js';

export type ChallengeRpcCode =
  | 'goal_not_owned'
  | 'active_challenge_exists'
  | 'invalid_invite_code'
  | 'challenge_not_found'
  | 'cannot_join_own_challenge'
  | 'challenge_ended'
  | 'challenge_full'
  | 'already_joined'
  | 'not_challenge_member'
  | 'not_authenticated'
  | 'unknown_error';

const RPC_STATUS_MAP: Record<Exclude<ChallengeRpcCode, 'unknown_error'>, number> = {
  goal_not_owned: 403,
  active_challenge_exists: 409,
  invalid_invite_code: 400,
  challenge_not_found: 404,
  cannot_join_own_challenge: 409,
  challenge_ended: 409,
  challenge_full: 409,
  already_joined: 409,
  not_challenge_member: 403,
  not_authenticated: 401,
};

const RPC_MESSAGE_MAP: Record<ChallengeRpcCode, string> = {
  goal_not_owned: 'You can only challenge with a goal you own.',
  active_challenge_exists: 'You already have an active challenge.',
  invalid_invite_code: 'Invite code is invalid.',
  challenge_not_found: 'Challenge not found.',
  cannot_join_own_challenge: 'You cannot join your own challenge.',
  challenge_ended: 'This challenge has already ended.',
  challenge_full: 'This challenge is already full.',
  already_joined: 'You already joined this challenge.',
  not_challenge_member: 'You are not a member of this challenge.',
  not_authenticated: 'Authentication is required.',
  unknown_error: 'Unable to process challenge request.',
};

export function parseChallengeRpcError(message?: string | null) {
  const normalized = (message || '').toLowerCase();

  const code = (Object.keys(RPC_STATUS_MAP) as Array<keyof typeof RPC_STATUS_MAP>).find((key) =>
    normalized.includes(key)
  );

  if (!code) {
    return {
      code: 'unknown_error' as ChallengeRpcCode,
      status: 500,
      message: RPC_MESSAGE_MAP.unknown_error,
    };
  }

  return {
    code,
    status: RPC_STATUS_MAP[code],
    message: RPC_MESSAGE_MAP[code],
  };
}

export function getChallengeProfileSnapshot(user: User) {
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  const avatarUrl = typeof user.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null;

  return { displayName, avatarUrl };
}

export function getErrorMessage(error: unknown, fallback = 'Internal server error') {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}
