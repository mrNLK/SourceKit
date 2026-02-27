-- Watchlist items table
create table if not exists watchlist_items (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references candidates(id) on delete cascade,
  user_id uuid references auth.users(id),
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_watchlist_user on watchlist_items(user_id);
create index if not exists idx_watchlist_candidate on watchlist_items(candidate_id);

alter table watchlist_items enable row level security;

create policy "Users can view their own watchlist"
  on watchlist_items for select
  using (auth.uid() = user_id);

create policy "Users can manage their own watchlist"
  on watchlist_items for all
  using (auth.uid() = user_id);

-- User plans table for Stripe billing
create table if not exists user_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'past_due')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_plans_user on user_plans(user_id);
create index if not exists idx_user_plans_stripe_customer on user_plans(stripe_customer_id);

alter table user_plans enable row level security;

create policy "Users can view their own plan"
  on user_plans for select
  using (auth.uid() = user_id);

create trigger user_plans_updated_at
  before update on user_plans
  for each row execute function update_updated_at();
