-- Migration v3.21 : Casino mini-jeu roulette rouge/noir
--
-- Compteur quotidien des paris (reset à minuit via casinoBetsDate != today).
-- Max 10 paris/jour. Bet 10 reps. Win 30% normal / 60% si LINGUINI talked today.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "casinoBetsDate" TEXT NOT NULL DEFAULT '';

ALTER TABLE "GamebookProgress"
  ADD COLUMN "casinoBetsToday" INTEGER NOT NULL DEFAULT 0;
