-- Fase 3: recurrencia en eventos + sincronización de iCloud y limpieza con pg_cron/pg_net.
-- Requiere en Supabase Vault (ver README/CLAUDE.md): 'cron_secret' (= secret CRON_SECRET) y
-- 'project_url' (https://<ref>.supabase.co). Ningún valor secreto vive en este archivo.

-- Eventos recurrentes: se guarda la regla del evento principal y se expande en el cliente.
alter table public.events
  add column if not exists rrule text,
  add column if not exists exdates timestamptz[] not null default '{}';

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Llama a la Edge Function `caldav` (action sync) con el secreto del cron leído de Vault.
-- Si falta algún secreto no hace nada (no falla el cron).
create or replace function private.run_caldav_sync()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1);
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1);
begin
  if base is null or secret is null then
    raise warning 'run_caldav_sync: faltan los secretos project_url o cron_secret en Vault';
    return;
  end if;
  perform net.http_post(
    url := rtrim(base, '/') || '/functions/v1/caldav',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('action', 'sync'),
    timeout_milliseconds := 120000
  );
end
$$;

-- Mantenimiento: historial de cron y respuestas de pg_net de más de 7 días.
create or replace function private.cleanup_cron_logs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from cron.job_run_details where end_time < now() - interval '7 days';
  delete from net._http_response where created < now() - interval '7 days';
end
$$;

revoke all on function private.run_caldav_sync() from public, anon, authenticated;
revoke all on function private.cleanup_cron_logs() from public, anon, authenticated;

-- Idempotente: se desprograman si ya existían.
select cron.unschedule(jobid) from cron.job where jobname in ('caldav-sync', 'cron-cleanup');
select cron.schedule('caldav-sync', '*/15 * * * *', $$select private.run_caldav_sync()$$);
select cron.schedule('cron-cleanup', '30 3 * * *', $$select private.cleanup_cron_logs()$$);
