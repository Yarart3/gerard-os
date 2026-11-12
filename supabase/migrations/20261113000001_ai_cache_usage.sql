-- Fase 5: caché de respuestas de la IA y contador diario de peticiones (Edge Function `ai`).
-- La función usa la service_role (salta RLS), pero las tablas siguen el patrón own_table.

create table public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hash text not null, -- sha-256 de proveedor + modelo + prompt
  provider text not null,
  model text not null,
  response text not null,
  unique (user_id, hash)
);
select private.own_table('public.ai_cache');
create index ai_cache_created_idx on public.ai_cache (created_at);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  day date not null,
  requests integer not null default 0,
  unique (user_id, day)
);
select private.own_table('public.ai_usage');

-- Un mismo término no se repite en las tarjetas (el sembrado es idempotente).
create unique index vocab_cards_term_uniq on public.vocab_cards (user_id, lower(term));
