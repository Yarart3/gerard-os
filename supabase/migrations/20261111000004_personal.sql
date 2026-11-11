create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  monthly_budget numeric(10, 2),
  position integer not null default 0,
  unique (user_id, name)
);
select private.own_table('public.expense_categories');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  amount numeric(10, 2) not null,
  category_id uuid references public.expense_categories (id) on delete set null,
  date date not null default current_date,
  note text
);
select private.own_table('public.expenses');
create index expenses_user_date_idx on public.expenses (user_id, date desc);
create index expenses_category_idx on public.expenses (category_id);

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  kind text not null check (kind in ('series', 'movie', 'book')),
  status text not null default 'pending' check (status in ('pending', 'watching', 'done')),
  platform text,
  progress text,
  rating numeric(3, 1) check (rating between 0 and 10),
  notes text
);
select private.own_table('public.watchlist');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  pinned boolean not null default false
);
select private.own_table('public.notes');
create index notes_tags_idx on public.notes using gin (tags);
