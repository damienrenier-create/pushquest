-- Migration v3.23f : bonusSurplus persistant (fix bug minuit qui wipait les bonus)
--
-- Avant : les bonus (pommiers, BUFFY, papa, capitaine, etc.) décrémentaient
-- energySpentToday → cumul de "surplus négatif". Mais à minuit, energySpentToday
-- est reset (via le date check), donc tout le surplus accumulé la veille était perdu.
--
-- Après : les bonus s'accumulent dans bonusSurplus (positif, persistant). Les
-- dépenses consomment d'abord bonusSurplus, puis incrémentent energySpentToday.
-- À minuit, energySpentToday est wipé, bonusSurplus persiste.
--
-- Backfill : on convertit le surplus négatif existant (energySpentToday < 0) en
-- bonusSurplus. Cas marginal vu qu'il a souvent été wipé déjà, mais pour les
-- joueurs qui viennent de claim un bonus, on préserve.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "bonusSurplus" INTEGER NOT NULL DEFAULT 0;

-- Backfill : si energySpentToday < 0, c'est du surplus à transférer.
UPDATE "GamebookProgress"
SET "bonusSurplus" = -"energySpentToday",
    "energySpentToday" = 0
WHERE "energySpentToday" < 0;
