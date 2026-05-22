-- Migration v3.4a : fix critique - énergie qui se régénérait au refresh
-- On ajoute 2 colonnes pour tracker l'énergie consommée du jour.
-- L'énergie disponible côté joueur = (reps du jour) - energySpentToday (si la date matche, sinon 0).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "energySpentToday"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "energySpentDate"    TEXT    NOT NULL DEFAULT '';
