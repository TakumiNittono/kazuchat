-- per-anon-user flags used by the chat CTA logic.
-- access is always via server-side service role; frontend never touches this directly.

create table if not exists public.anon_user_flags (
  anon_user_id text primary key,
  cta_shown_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.anon_user_flags enable row level security;
-- no policies: anon/authenticated denied by default. server uses service_role which bypasses RLS.
