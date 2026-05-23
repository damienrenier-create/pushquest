-- Migration v3.17c : Polish narratif Phase 1
--
-- Ajoute 3 flags one-way pour les nouvelles mécaniques bonus :
--   - papaBoostClaimed     : tableau du père vu dans la Tour (one-shot +100 reps)
--   - nageurDefiCompleted  : défi 50 pompes du Nageur dans la mer (one-shot +100 reps)
--   - bourgCasinoCoinsFound: case cachée +50 reps du casino de Bourg trouvée (one-shot)
--
-- Toutes additives nullable-safe avec valeur par défaut.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "papaBoostClaimed" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "GamebookProgress"
  ADD COLUMN "nageurDefiCompleted" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "GamebookProgress"
  ADD COLUMN "bourgCasinoCoinsFound" BOOLEAN NOT NULL DEFAULT FALSE;
