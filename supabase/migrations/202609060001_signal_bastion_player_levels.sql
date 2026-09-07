-- Records the permanent progression level active when a run began.
-- Older leaderboard entries remain valid and display as commander level 0.
alter table public.signal_bastion_scores
  add column if not exists player_level integer not null default 0
  check (player_level >= 0);
