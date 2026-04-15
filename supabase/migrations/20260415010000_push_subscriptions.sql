-- web push subscriptions for the nihongo chatbot.
-- endpoint is the natural key (unique per device+browser). server-only access via service_role.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  anon_user_id text,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_anon_user_id_idx
  on public.push_subscriptions (anon_user_id);

alter table public.push_subscriptions enable row level security;
-- no policies: anon/authenticated denied by default. server uses service_role which bypasses RLS.
