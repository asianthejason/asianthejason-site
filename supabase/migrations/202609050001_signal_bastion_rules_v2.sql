-- Existing records retain rules_version 1 (waves reached).
-- New records use rules_version 2 (waves completed), with separate rankings.
alter table public.signal_bastion_scores
  add column if not exists bosses_defeated integer not null default 0 check (bosses_defeated >= 0),
  add column if not exists run_seconds integer not null default 0 check (run_seconds >= 0),
  add column if not exists modifiers text[] not null default '{}',
  add column if not exists run_id uuid,
  add column if not exists rules_version integer not null default 1;

create unique index if not exists signal_bastion_unique_run
  on public.signal_bastion_scores (user_id, run_id) where run_id is not null;
create index if not exists signal_bastion_v2_ranking
  on public.signal_bastion_scores (rules_version, waves desc, bosses_defeated desc, enemies_defeated desc);

-- RLS ownership policies from the original migration remain in force.
-- These are client-reported casual scores, not server-verified match results.
