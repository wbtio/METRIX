create table if not exists public.daily_focus_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  prompt_date date not null,
  angle_label text,
  question text not null,
  question_why text,
  answer text,
  answer_coaching text,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  answered_at timestamptz
);

create unique index if not exists daily_focus_answers_goal_date_idx
  on public.daily_focus_answers (goal_id, prompt_date);

create index if not exists daily_focus_answers_user_goal_idx
  on public.daily_focus_answers (user_id, goal_id, prompt_date desc);

alter table public.daily_focus_answers enable row level security;

create policy "daily_focus_answers_select_own"
  on public.daily_focus_answers
  for select
  using (auth.uid() = user_id);

create policy "daily_focus_answers_insert_own"
  on public.daily_focus_answers
  for insert
  with check (auth.uid() = user_id);

create policy "daily_focus_answers_update_own"
  on public.daily_focus_answers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_daily_focus_answers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_daily_focus_answers_updated_at on public.daily_focus_answers;

create trigger set_daily_focus_answers_updated_at
before update on public.daily_focus_answers
for each row
execute function public.set_daily_focus_answers_updated_at();
