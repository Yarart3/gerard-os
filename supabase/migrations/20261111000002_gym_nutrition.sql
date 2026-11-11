-- Gym
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  aliases text[] not null default '{}',
  muscle_group text,
  type text not null check (type in ('strength', 'gymnastics', 'metcon', 'cardio')),
  unit text not null check (unit in ('kg', 'reps', 'time', 'meters', 'calories')),
  met numeric(4, 1),
  archived boolean not null default false,
  unique (user_id, name)
);
select private.own_table('public.exercises');

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  started_at timestamptz,
  duration_min integer check (duration_min >= 0),
  met_kcal numeric(7, 1),
  watch_kcal numeric(7, 1),
  notes text,
  kind text not null default 'strength',
  result jsonb -- reservado para resultados de WOD (For Time, AMRAP...)
);
select private.own_table('public.workouts');
create index workouts_user_date_idx on public.workouts (user_id, date desc);

create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  notes text
);
select private.own_table('public.workout_items');
create index workout_items_workout_idx on public.workout_items (workout_id, position);
create index workout_items_exercise_idx on public.workout_items (exercise_id);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  item_id uuid not null references public.workout_items (id) on delete cascade,
  position integer not null default 0,
  weight_kg numeric(6, 2),
  reps integer,
  seconds integer,
  meters numeric(8, 1),
  calories numeric(7, 1),
  done boolean not null default false
);
select private.own_table('public.sets');
create index sets_item_idx on public.sets (item_id, position);

-- Nutrición (macros por 100 g)
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  kcal numeric(7, 2) not null default 0,
  protein numeric(6, 2) not null default 0,
  carbs numeric(6, 2) not null default 0,
  fat numeric(6, 2) not null default 0,
  fiber numeric(6, 2) not null default 0,
  unique (user_id, name)
);
select private.own_table('public.foods');

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  photo_path text,
  notes text,
  unique (user_id, name)
);
select private.own_table('public.recipes');

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(7, 1) not null check (grams >= 0),
  position integer not null default 0
);
select private.own_table('public.recipe_items');
create index recipe_items_recipe_idx on public.recipe_items (recipe_id);
create index recipe_items_food_idx on public.recipe_items (food_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null,
  slot text not null,
  unique (user_id, date, slot)
);
select private.own_table('public.meals');

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_id uuid references public.foods (id) on delete restrict,
  recipe_id uuid references public.recipes (id) on delete restrict,
  grams numeric(7, 1) not null check (grams >= 0),
  position integer not null default 0,
  check (num_nonnulls(food_id, recipe_id) = 1)
);
select private.own_table('public.meal_items');
create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_food_idx on public.meal_items (food_id);
create index meal_items_recipe_idx on public.meal_items (recipe_id);
