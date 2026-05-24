-- Migration v3.23c : Sommet du Mont Pasta-Ventoux + badge Conquérant
--
-- Atteindre le sommet (y=1) du Mont Pasta-Ventoux déclenche :
--   - cinématique panorama
--   - badge "Conquérant" 500 XP (easter egg multi-détenteurs)
--   - déverrouille l'accès au contest_hall de Muscuville
--
-- One-shot : montSummitReached = true à vie une fois validé.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "montSummitReached" BOOLEAN NOT NULL DEFAULT false;
