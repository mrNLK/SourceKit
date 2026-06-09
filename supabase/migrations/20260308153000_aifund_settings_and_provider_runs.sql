create table if not exists public.aifund_user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_secrets jsonb not null default '{}'::jsonb,
  provider_preferences jsonb not null default '{}'::jsonb,
  sourcing_channels jsonb not null default '[]'::jsonb,
  evaluation_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aifund_user_settings enable row level security;
