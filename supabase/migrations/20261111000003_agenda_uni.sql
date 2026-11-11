-- Agenda (iCloud CalDAV)
create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  caldav_url text not null,
  name text not null,
  color text,
  visible boolean not null default true,
  is_default boolean not null default false,
  unique (user_id, caldav_url)
);
select private.own_table('public.calendars');

-- "start"/"end" son palabras reservadas en SQL: se usan starts_at/ends_at.
-- href = URL del recurso .ics en el servidor CalDAV (necesaria para PUT/DELETE).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  uid text not null,
  href text,
  etag text,
  title text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  raw_ics text,
  deleted boolean not null default false,
  unique (calendar_id, uid)
);
select private.own_table('public.events');
create index events_user_range_idx on public.events (user_id, starts_at);

create table public.sync_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  calendar_id uuid references public.calendars (id) on delete cascade,
  ctag text,
  sync_token text,
  last_synced_at timestamptz,
  last_error text,
  unique (user_id, calendar_id)
);
select private.own_table('public.sync_state');
create index sync_state_calendar_idx on public.sync_state (calendar_id);

-- Uni
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  color text,
  ects numeric(4, 1),
  course smallint,
  term smallint check (term in (1, 2)),
  grade numeric(4, 2) check (grade between 0 and 10)
);
select private.own_table('public.subjects');

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  due_at timestamptz not null,
  kind text not null default 'assignment' check (kind in ('assignment', 'exam', 'other')),
  done boolean not null default false
);
select private.own_table('public.deadlines');
create index deadlines_user_due_idx on public.deadlines (user_id, due_at);
create index deadlines_subject_idx on public.deadlines (subject_id);

create table public.tfg_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  progress smallint not null default 0 check (progress between 0 and 100),
  due_at date,
  position integer not null default 0
);
select private.own_table('public.tfg_milestones');
