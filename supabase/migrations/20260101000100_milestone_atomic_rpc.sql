-- Migration: Milestone atomic RPCs for goal milestones
-- This migration provides hardened, atomic operations for recording and deleting milestones.
-- Is_milestone_breakdown helper must be deployed first.

-- Helper: checks if a daily_logs.breakdown JSONB represents a milestone entry
CREATE OR REPLACE FUNCTION public.is_milestone_breakdown(p_breakdown jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(jsonb_typeof(p_breakdown->'milestone') = 'object', false);
$function$;

-- Atomically record a milestone log and increment goal points in one transaction
CREATE OR REPLACE FUNCTION public.record_goal_milestone(
  p_goal_id uuid,
  p_user_input text,
  p_ai_score integer,
  p_ai_feedback text,
  p_breakdown jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_log_id uuid;
  v_existing_count integer;
  v_target_points integer;
  v_tier text;
  v_max_score integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required'
      using errcode = 'P0001';
  end if;

  if p_goal_id is null then
    raise exception 'goal_id_required'
      using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_user_input, '')), '') is null then
    raise exception 'user_input_required'
      using errcode = 'P0001';
  end if;

  if length(coalesce(p_user_input, '')) > 6000 then
    raise exception 'user_input_too_long'
      using errcode = 'P0001';
  end if;

  if length(coalesce(p_ai_feedback, '')) > 6000 then
    raise exception 'ai_feedback_too_long'
      using errcode = 'P0001';
  end if;

  if coalesce(p_ai_score, 0) < 0 then
    raise exception 'invalid_ai_score'
      using errcode = 'P0001';
  end if;

  if not public.is_milestone_breakdown(p_breakdown) then
    raise exception 'not_a_milestone'
      using errcode = 'P0001';
  end if;

  v_tier := p_breakdown #>> '{milestone,tier}';
  if v_tier not in ('minor', 'major', 'legendary') then
    raise exception 'invalid_milestone_tier'
      using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_breakdown #>> '{milestone,name}', '')), '') is null then
    raise exception 'milestone_name_required'
      using errcode = 'P0001';
  end if;

  -- Lock the owning goal row, prove ownership, and serialize milestone count + point update.
  select target_points
    into v_target_points
  from public.goals
  where id = p_goal_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'goal_not_found_or_access_denied'
      using errcode = 'P0001';
  end if;

  if coalesce(v_target_points, 0) <= 0 then
    raise exception 'invalid_goal_target_points'
      using errcode = 'P0001';
  end if;

  v_max_score := floor(
    v_target_points *
    case v_tier
      when 'minor' then 0.05
      when 'major' then 0.10
      when 'legendary' then 0.20
      else 0
    end
  )::integer;

  if coalesce(p_ai_score, 0) <= 0 or p_ai_score > v_max_score then
    raise exception 'invalid_ai_score'
      using errcode = 'P0001',
            detail = 'Milestone score must be positive and stay within the tier cap.';
  end if;

  select count(*)
    into v_existing_count
  from public.daily_logs
  where goal_id = p_goal_id
    and public.is_milestone_breakdown(breakdown);

  if v_existing_count >= 2 then
    raise exception 'milestone_limit_reached'
      using errcode = 'P0001',
            detail = 'A goal can have at most two milestone logs.';
  end if;

  insert into public.daily_logs (
    goal_id,
    user_input,
    ai_score,
    ai_feedback,
    breakdown
  ) values (
    p_goal_id,
    p_user_input,
    p_ai_score,
    p_ai_feedback,
    p_breakdown
  )
  returning id into v_log_id;

  update public.goals
  set current_points = greatest(0, coalesce(current_points, 0) + coalesce(p_ai_score, 0))
  where id = p_goal_id
    and user_id = v_user_id;

  return jsonb_build_object('log_id', v_log_id);
end;
$function$;

-- Atomically delete a milestone log and revert goal points in one transaction
CREATE OR REPLACE FUNCTION public.delete_goal_milestone(
  p_goal_id uuid,
  p_log_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_score_to_revert integer := 0;
  v_breakdown jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required'
      using errcode = 'P0001';
  end if;

  if p_goal_id is null or p_log_id is null then
    raise exception 'required_ids_missing'
      using errcode = 'P0001';
  end if;

  -- Lock the goal first so deletion and point reversion are serialized with milestone creation.
  perform 1
  from public.goals
  where id = p_goal_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'goal_not_found_or_access_denied'
      using errcode = 'P0001';
  end if;

  select coalesce(ai_score, 0), breakdown
    into v_score_to_revert, v_breakdown
  from public.daily_logs
  where id = p_log_id
    and goal_id = p_goal_id
  for update;

  if not found then
    raise exception 'log_not_found_or_access_denied'
      using errcode = 'P0001';
  end if;

  if not public.is_milestone_breakdown(v_breakdown) then
    raise exception 'not_a_milestone'
      using errcode = 'P0001';
  end if;

  delete from public.daily_logs
  where id = p_log_id
    and goal_id = p_goal_id;

  update public.goals
  set current_points = greatest(0, coalesce(current_points, 0) - greatest(0, v_score_to_revert))
  where id = p_goal_id
    and user_id = v_user_id;

  return jsonb_build_object('reverted_score', greatest(0, v_score_to_revert));
end;
$function$;

-- Trigger function to enforce the 2-milestone limit at the SQL level
CREATE OR REPLACE FUNCTION public.enforce_goal_milestone_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_existing_count integer;
begin
  if tg_op in ('INSERT', 'UPDATE') and public.is_milestone_breakdown(new.breakdown) then
    -- Serialize competing milestone writes for the same goal to prevent race conditions.
    perform 1
    from public.goals
    where id = new.goal_id
    for update;

    select count(*)
      into v_existing_count
    from public.daily_logs
    where goal_id = new.goal_id
      and id <> new.id
      and public.is_milestone_breakdown(breakdown);

    if v_existing_count >= 2 then
      raise exception 'milestone_limit_reached'
        using errcode = 'P0001',
              detail = 'A goal can have at most two milestone logs.';
    end if;
  end if;

  return new;
end;
$function$;
