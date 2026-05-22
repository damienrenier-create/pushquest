-- Migration v3.8.2 : Tour des Pâtes Aiguës
--
-- Ajoute 1 colonne pour tracker le plus haut étage atteint par chaque user.
-- 1 = rez-de-chaussée (entrée libre), 5 = sommet (où se trouve l'oiseau PIAFFINI).
-- Une fois un étage validé via le check squats, on garde l'accès libre vers le bas
-- ET vers les étages déjà débloqués.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "towerFloorReached" INTEGER NOT NULL DEFAULT 1;
