-- P3: Atomic search count increment to fix race condition in gate.ts
-- This replaces the read-then-write pattern with a single atomic UPDATE.

create or replace function increment_searches_used(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update user_subscriptions
  set searches_used = searches_used + 1,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;
