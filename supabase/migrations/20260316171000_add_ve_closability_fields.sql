alter table public.aifund_evaluation_scores
  add column if not exists quality_score_10 numeric,
  add column if not exists closability_probability_pct numeric,
  add column if not exists expected_value numeric,
  add column if not exists inbound_intent_score integer,
  add column if not exists company_mobility_score integer,
  add column if not exists ve_model_fit_score integer,
  add column if not exists comp_reachability_score integer,
  add column if not exists outreach_blocked boolean default false,
  add column if not exists closability_reasons jsonb,
  add column if not exists closability_version text;

update public.aifund_evaluation_scores
set outreach_blocked = coalesce(closability_probability_pct, 0) < 25
where outreach_blocked is null;
