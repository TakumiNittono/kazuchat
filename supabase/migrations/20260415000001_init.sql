-- chatbot tables for the nihongo web chatbot.
-- access is always via server-side service role; frontend never touches these tables directly.
-- prefixed with chat_ to avoid collision with the existing messages table in this project.

create extension if not exists "pgcrypto";

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_user_id text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_anon_user_id_idx
  on public.chat_sessions (anon_user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx
  on public.chat_messages (session_id, created_at asc);

create or replace function public.bump_chat_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_sessions
    set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_chat_session_updated_at on public.chat_messages;
create trigger trg_bump_chat_session_updated_at
  after insert on public.chat_messages
  for each row execute function public.bump_chat_session_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- no policies: anon/authenticated denied by default. server uses service_role which bypasses RLS.
