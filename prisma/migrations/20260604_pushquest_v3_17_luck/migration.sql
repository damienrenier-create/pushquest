-- Migration v3.17 : Luck counter (LINGUINI tap)
--
-- Ajoute un compteur de chance idempotent par jour (incrémenté à chaque dialogue
-- complet avec LINGUINI, max 1×/jour). Servira de booster pour le mini-jeu casino
-- en v3.20 (60 % win vs 30 % de base si luck talk fait aujourd'hui).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "luck" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "GamebookProgress"
  ADD COLUMN "lastLuckTalkDate" TEXT NOT NULL DEFAULT '';
