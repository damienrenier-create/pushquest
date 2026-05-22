-- Migration v3.8 : Pépiteville + Inventaire + Sac
--
-- Ajoute 2 colonnes additives à GamebookProgress :
--   - inventory : JSONB des items possédés (gourde, etc.)
--   - hasBag : true une fois que PEPITO a offert le sac
--
-- Les 7 joueurs existants reçoivent par défaut un inventaire vide et hasBag=false.
-- Aucune perte de données.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "inventory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "hasBag" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "durumEnergyGiven" BOOLEAN NOT NULL DEFAULT FALSE;
