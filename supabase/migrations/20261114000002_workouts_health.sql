-- Importación desde Apple Salud (Atajo de iOS → Edge Function `health`):
-- instante en que la función escribió o actualizó por última vez el entreno con datos del Apple Watch.
alter table public.workouts add column health_synced_at timestamptz;
