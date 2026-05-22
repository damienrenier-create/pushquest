-- Migration v3.3 : ajout des champs pour les PNJ de Bourg-Boulette + PNJ muscu
-- À appliquer APRÈS les migrations v3 et v3.1 + après le déploiement code v3.2.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "gymGuyEnergyGiven"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "npcsTalkedTo"       JSONB   NOT NULL DEFAULT '[]'::jsonb;
