-- Entreno en curso / terminado (estilo Hevy): varios entrenos por día.
alter table public.workouts add column title text;
alter table public.workouts add column finished_at timestamptz; -- null = en curso
-- Los que ya existían se dan por terminados.
update public.workouts
set finished_at = coalesce(started_at + make_interval(mins => coalesce(duration_min, 0)), updated_at)
where finished_at is null;
create index workouts_active_idx on public.workouts (user_id, created_at desc) where finished_at is null;
