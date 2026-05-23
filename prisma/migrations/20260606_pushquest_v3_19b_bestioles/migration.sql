-- Migration v3.19b : Bestioles attack mechanic
--
-- Ajoute :
--   - bestiolesFirstEncountered Boolean : tracking de la première rencontre (pas de perte)
--   - bestiolesSpeciesName String? : nom donné à l'espèce par le joueur (premier contact)
--
-- Migration additive nullable-safe.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "bestiolesFirstEncountered" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "GamebookProgress"
  ADD COLUMN "bestiolesSpeciesName" TEXT;
