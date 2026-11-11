create table public.english_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  answers jsonb not null default '{}'::jsonb, -- respuestas del cuestionario de la sección 7
  unique (user_id)
);
select private.own_table('public.english_profile');

create table public.vocab_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  term text not null,
  translation text not null,
  example text,
  box smallint not null default 1 check (box between 1 and 4),
  due_on date not null default current_date,
  source text not null default 'seed' -- seed | user | song | phrase
);
select private.own_table('public.vocab_cards');
create index vocab_cards_due_idx on public.vocab_cards (user_id, due_on);

create table public.english_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  section text not null,
  topic text,
  payload jsonb not null,
  solution jsonb
);
select private.own_table('public.english_exercises');
create index english_exercises_section_idx on public.english_exercises (user_id, section, topic);

create table public.english_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  exercise_id uuid references public.english_exercises (id) on delete cascade,
  answer text,
  correct boolean,
  feedback text,
  rule text
);
select private.own_table('public.english_attempts');
create index english_attempts_exercise_idx on public.english_attempts (exercise_id);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  spotify_url text,
  youtube_url text,
  unique (user_id, name)
);
select private.own_table('public.artists');

-- La letra pegada por el usuario vive solo aquí (privada por RLS).
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  artist text not null,
  title text not null,
  lyrics text,
  lesson jsonb
);
select private.own_table('public.songs');

create table public.english_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  points integer not null default 0,
  streak integer not null default 0,
  unique (user_id, date)
);
select private.own_table('public.english_daily');
