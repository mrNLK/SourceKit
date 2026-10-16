-- Persist the AI "recruitable" opinion so cached GitHub-search results and history replay
-- can compute the same ungettable flag as fresh results. Additive and nullable.
alter table public.candidates add column if not exists recruitable boolean;
