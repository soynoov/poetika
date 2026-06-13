create unique index if not exists stories_author_challenge_date_idx
  on public.stories (author_id, challenge_date);
