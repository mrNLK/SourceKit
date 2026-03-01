-- BUG-003: Normalize github_username to lowercase to prevent case-sensitive duplicate issues.

-- Step 1: Delete duplicate rows keeping the most recently updated one.
-- When lowercasing creates conflicts, keep the row with the latest updated_at.
DELETE FROM public.candidates a
USING public.candidates b
WHERE LOWER(a.github_username) = LOWER(b.github_username)
  AND a.github_username != b.github_username
  AND a.updated_at < b.updated_at;

-- Step 2: Also handle exact duplicates (same case but two rows somehow)
DELETE FROM public.candidates a
USING public.candidates b
WHERE LOWER(a.github_username) = LOWER(b.github_username)
  AND a.id != b.id
  AND a.updated_at < b.updated_at;

-- Step 3: Normalize remaining rows to lowercase
UPDATE public.candidates
SET github_username = LOWER(github_username)
WHERE github_username != LOWER(github_username);

-- Also normalize pipeline table
UPDATE public.pipeline
SET github_username = LOWER(github_username)
WHERE github_username != LOWER(github_username);

-- Also normalize watchlist_items table
UPDATE public.watchlist_items
SET candidate_username = LOWER(candidate_username)
WHERE candidate_username != LOWER(candidate_username);
