# Signal Bastion ruleset 2

Waves start immediately after all enemies from the previous wave have been resolved. There is no preparation phase. Scores count completed waves, not the wave in progress at defeat.

- Enemy unlocks: swarm (2), runner (3), juggernaut (5), regenerator (8), disruptor (11), shield drone (14), phase (18). Bosses arrive every ten waves.
- Targets: first, last, strongest, weakest, closest, unslowed. Level-five towers choose one permanent evolution.
- Firing range is capped to preserve placement strategy: Railgun 220, Arc Coil 175, and Cryo Node 185 battlefield units. Range calculations, selection overlays, and tower stats share the same cap.
- Selecting a Salvager-evolved Scrap Harvester displays its 150-unit kill-bonus zone. The upgrade panel groups choices by purpose and keeps effects visible without relying on tooltips.
- Generator clicks build combos; critical clicks triple output. At 100 heat, clicks lock until heat falls to 40. Overcharge boosts tower speed and generator output.
- Abilities: overcharge (8s / 35s cooldown), EMP (2.5s / 30s), aimed orbital strike (130 radius / 42s), repair (5 integrity / 55s), scrap magnet (double kill rewards for 10s / 38s).
- Core: integrity, regenerating shield, reactive damage pulse, emergency overcharge, single revival per run.
- Threat choices appear every five completed waves without pausing. Accepted modifiers persist and award immediate scrap.
- Runs award persistent Data Cores: one per five completed waves plus two per defeated boss. The Archive spends them on five-level tower doctrine research, and one researched doctrine may be equipped before each run. Commander level is the sum of all doctrine research levels and is recorded on the leaderboard. Doctrines remain strategic sidegrades with matching drawbacks.
- Sound is opt-in. Synthesized combat tones and rhythmic music intensify during boss waves. Particles, floating numbers, core-hit flashes and boss warnings provide visual feedback.

## Deployment

Apply `supabase/migrations/202609050001_signal_bastion_rules_v2.sql` after the original score migration. Old records are preserved; the new board filters ruleset 2. Run IDs prevent duplicate global submissions, and local records use a versioned storage key.

Scores remain client-reported casual results with authenticated ownership policies. Extra fields and duplicate protection do not provide server-authoritative anti-cheat.

## Verification

Run `node --test tests/signal-bastion.test.cjs`, `npx tsc --noEmit`, and `npx eslint app/signal-bastion/page.tsx`.

Browser checks cover placement, upgrades, evolutions, targeting, EMP, immediate waves, modifiers, revival, completed-wave scores, duplicate local saves, and mobile coordinates. Production Supabase writes require a configured project and the migration.
