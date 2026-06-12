create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists username text,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  username = coalesce(
    username,
    lower(regexp_replace(display_name, '[^a-zA-Z0-9]+', '', 'g')),
    'writer'
  ),
  updated_at = coalesce(updated_at, now())
where username is null;

alter table public.profiles
  alter column username set not null;

alter table public.profiles
  add constraint profiles_username_length_check
    check (char_length(username) between 3 and 24);

alter table public.profiles
  add constraint profiles_username_format_check
    check (username ~ '^[a-z0-9_]+$');

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  normalized_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'writer');
  normalized_username := lower(regexp_replace(raw_username, '[^a-zA-Z0-9_]+', '', 'g'));

  if char_length(normalized_username) < 3 then
    normalized_username := normalized_username || substr(replace(new.id::text, '-', ''), 1, 3);
  end if;

  normalized_username := substr(normalized_username, 1, 24);

  while exists (
    select 1
    from public.profiles
    where lower(username) = lower(normalized_username)
  ) loop
    normalized_username := substr(normalized_username, 1, 20) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end loop;

  insert into public.profiles (user_id, username, display_name, bio, avatar_url)
  values (
    new.id,
    normalized_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    null,
    null
  )
  on conflict (user_id) do update
  set
    username = excluded.username,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  challenge_date text not null,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_challenge_date_idx
  on public.stories (challenge_date, created_at desc);

create index if not exists stories_author_id_idx
  on public.stories (author_id, created_at desc);

drop trigger if exists set_stories_updated_at on public.stories;
create trigger set_stories_updated_at
before update on public.stories
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists story_likes_user_id_idx
  on public.story_likes (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_likes enable row level security;

drop policy if exists "profiles_are_public_readable" on public.profiles;
create policy "profiles_are_public_readable"
on public.profiles
for select
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "stories_are_public_readable" on public.stories;
create policy "stories_are_public_readable"
on public.stories
for select
using (true);

drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own"
on public.stories
for insert
with check (auth.uid() = author_id);

drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own"
on public.stories
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own"
on public.stories
for delete
using (auth.uid() = author_id);

drop policy if exists "story_likes_are_public_readable" on public.story_likes;
create policy "story_likes_are_public_readable"
on public.story_likes
for select
using (true);

drop policy if exists "story_likes_insert_own" on public.story_likes;
create policy "story_likes_insert_own"
on public.story_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "story_likes_delete_own" on public.story_likes;
create policy "story_likes_delete_own"
on public.story_likes
for delete
using (auth.uid() = user_id);
