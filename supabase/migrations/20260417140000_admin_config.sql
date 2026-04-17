-- key/value config store edited from the admin dashboard.
-- server-only access via service_role.

create table if not exists public.admin_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_config enable row level security;
-- no policies: anon/authenticated denied by default.
