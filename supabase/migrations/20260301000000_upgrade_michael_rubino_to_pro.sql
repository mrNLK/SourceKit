-- Upgrade michael.f.rubino@gmail.com to pro plan with unlimited searches.
-- Idempotent: safe to run multiple times.

DO $$
DECLARE
  target_uid uuid;
BEGIN
  SELECT id INTO target_uid
    FROM auth.users
   WHERE email = 'michael.f.rubino@gmail.com'
   LIMIT 1;

  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'User michael.f.rubino@gmail.com not found in auth.users';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan, search_limit, searches_used)
  VALUES (target_uid, 'pro', NULL, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET plan        = 'pro',
                search_limit = NULL,
                updated_at   = now();
END $$;
