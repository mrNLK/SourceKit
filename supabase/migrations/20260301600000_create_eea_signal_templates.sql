-- EEA Signal Templates: reusable EEA criteria per role category
-- Used by the EEA Webset creation flow to persist signal configurations

create table if not exists eea_signal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role_category text not null,
  signal_name text not null,
  webset_criterion text not null,
  enrichment_description text not null,
  enrichment_format text not null default 'text',
  enrichment_options jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by user + role
create index if not exists idx_eea_templates_user_role
  on eea_signal_templates(user_id, role_category);

-- RLS
alter table eea_signal_templates enable row level security;

create policy "Users can read own templates"
  on eea_signal_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert own templates"
  on eea_signal_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own templates"
  on eea_signal_templates for delete
  using (auth.uid() = user_id);

-- Add EEA tracking columns to websets-related tables if they exist
-- These are safe to run even if the columns already exist
do $$
begin
  -- Add source_search_id to track which search spawned a webset
  if exists (select 1 from information_schema.tables where table_name = 'websets' and table_schema = 'public') then
    if not exists (select 1 from information_schema.columns where table_name = 'websets' and column_name = 'source_search_id') then
      alter table websets add column source_search_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'websets' and column_name = 'eea_signals') then
      alter table websets add column eea_signals jsonb;
    end if;
  end if;
end
$$;
