-- Migration v3.24b : Casino pattern (Muscuville)
--
-- Le casino de Muscuville a une roulette pattern de 20 chiffres (0-10).
-- Le joueur mise 10-50 reps sur une ou plusieurs cases. À chaque spin,
-- la roulette tombe sur PATTERN[spinIndex % 20]. spinIndex s'incrémente.
--
-- Si le joueur a misé sur la case gagnante, il gagne mise × 10.
-- Pour les cases perdantes, la mise est consommée.
--
-- 5 wins consécutifs (au moins 1 case gagnante par spin) → casino en banqueroute :
--   - badge "Casseur de banque" (200 XP)
--   - cooldown 24h
--   - reset du spinIndex à 0 (le joueur doit ré-observer le pattern)

ALTER TABLE "GamebookProgress"
  ADD COLUMN "casinoPatternSpinIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "casinoPatternWinStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "casinoPatternBankruptUntil" TIMESTAMP;
