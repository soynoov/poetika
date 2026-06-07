create extension if not exists pgcrypto;

create table if not exists public.challenge_categories (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	description text,
	active boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.challenge_words (
	id uuid primary key default gen_random_uuid(),
	category_id uuid not null references public.challenge_categories(id) on delete cascade,
	word text not null,
	active boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (category_id, word)
);

create table if not exists public.daily_challenges (
	challenge_date date primary key,
	first_category_id uuid not null references public.challenge_categories(id),
	first_word_id uuid not null references public.challenge_words(id),
	second_category_id uuid not null references public.challenge_categories(id),
	second_word_id uuid not null references public.challenge_words(id),
	third_category_id uuid not null references public.challenge_categories(id),
	third_word_id uuid not null references public.challenge_words(id),
	generated_at timestamptz not null default now()
);

create table if not exists public.stories (
	id uuid primary key default gen_random_uuid(),
	challenge_date date not null references public.daily_challenges(challenge_date) on delete cascade,
	title text not null,
	body text not null,
	author_name text not null default 'Anónimo',
	word_count integer not null default 0,
	source text not null default 'local',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists challenge_words_category_active_idx
	on public.challenge_words (category_id, active);

create index if not exists challenge_categories_active_idx
	on public.challenge_categories (active, sort_order);

create index if not exists stories_challenge_date_idx
	on public.stories (challenge_date, created_at desc);

insert into public.challenge_categories (slug, name, description, sort_order)
values
	('clima', 'Clima', 'Atmósfera y tiempo del reto', 1),
	('estilo', 'Estilo', 'Persona o enfoque narrativo', 2),
	('tematica', 'Temática', 'Idea principal o género', 3),
	('lugar', 'Lugar', 'Escenario donde sucede el relato', 4),
	('objeto', 'Objeto', 'Elemento material que debe aparecer', 5),
	('emocion', 'Emoción', 'Estado emocional dominante', 6)
on conflict (slug) do update
set name = excluded.name,
	description = excluded.description,
	sort_order = excluded.sort_order,
	updated_at = now();

with category_words (slug, word, sort_order) as (
	values
		('clima', 'niebla espesa', 1),
		('clima', 'tormenta eléctrica', 2),
		('clima', 'calor sofocante', 3),
		('clima', 'lluvia fina', 4),
		('estilo', 'primera persona', 1),
		('estilo', 'tercera persona', 2),
		('estilo', 'monólogo interior', 3),
		('estilo', 'tono poético', 4),
		('tematica', 'misterio', 1),
		('tematica', 'terror', 2),
		('tematica', 'nostalgia', 3),
		('tematica', 'supervivencia', 4),
		('lugar', 'cabana', 1),
		('lugar', 'puerto', 2),
		('lugar', 'hospital abandonado', 3),
		('lugar', 'azotea', 4),
		('objeto', 'espejo', 1),
		('objeto', 'llave', 2),
		('objeto', 'carta', 3),
		('objeto', 'reloj roto', 4),
		('emocion', 'miedo', 1),
		('emocion', 'culpa', 2),
		('emocion', 'deseo', 3),
		('emocion', 'esperanza', 4)
)
insert into public.challenge_words (category_id, word, sort_order)
select c.id, cw.word, cw.sort_order
from category_words cw
join public.challenge_categories c on c.slug = cw.slug
on conflict (category_id, word) do update
set sort_order = excluded.sort_order,
	updated_at = now();

create or replace function public.get_daily_challenge(requested_date date default (timezone('Europe/Madrid', now())::date))
returns table (
	challenge_date date,
	first_category text,
	first_word text,
	second_category text,
	second_word text,
	third_category text,
	third_word text,
	generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
	existing record;
	first_category_row record;
	second_category_row record;
	third_category_row record;
	first_word_row record;
	second_word_row record;
	third_word_row record;
begin
	select *
	into existing
	from public.daily_challenges
	where challenge_date = requested_date;

	if not found then
		select *
		into first_category_row
		from public.challenge_categories
		where active = true
		order by random()
		limit 1;

		select *
		into second_category_row
		from public.challenge_categories
		where active = true
			and id <> first_category_row.id
		order by random()
		limit 1;

		select *
		into third_category_row
		from public.challenge_categories
		where active = true
			and id not in (first_category_row.id, second_category_row.id)
		order by random()
		limit 1;

		select *
		into first_word_row
		from public.challenge_words
		where active = true
			and category_id = first_category_row.id
		order by random()
		limit 1;

		select *
		into second_word_row
		from public.challenge_words
		where active = true
			and category_id = second_category_row.id
		order by random()
		limit 1;

		select *
		into third_word_row
		from public.challenge_words
		where active = true
			and category_id = third_category_row.id
		order by random()
		limit 1;

		if first_word_row.id is null or second_word_row.id is null or third_word_row.id is null then
			raise exception 'Each selected category needs at least one active word';
		end if;

		insert into public.daily_challenges (
			challenge_date,
			first_category_id,
			first_word_id,
			second_category_id,
			second_word_id,
			third_category_id,
			third_word_id,
			generated_at
		)
		values (
			requested_date,
			first_category_row.id,
			first_word_row.id,
			second_category_row.id,
			second_word_row.id,
			third_category_row.id,
			third_word_row.id,
			now()
		);
	end if;

	return query
	select
		dc.challenge_date,
		c1.name as first_category,
		w1.word as first_word,
		c2.name as second_category,
		w2.word as second_word,
		c3.name as third_category,
		w3.word as third_word,
		dc.generated_at
	from public.daily_challenges dc
	join public.challenge_categories c1 on c1.id = dc.first_category_id
	join public.challenge_words w1 on w1.id = dc.first_word_id
	join public.challenge_categories c2 on c2.id = dc.second_category_id
	join public.challenge_words w2 on w2.id = dc.second_word_id
	join public.challenge_categories c3 on c3.id = dc.third_category_id
	join public.challenge_words w3 on w3.id = dc.third_word_id
	where dc.challenge_date = requested_date;
end;
$$;

grant execute on function public.get_daily_challenge(date) to anon, authenticated;
