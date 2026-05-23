-- Migration v3.22 : Fast travel entre villes débloquées
--
-- Ajout d'une colonne JSON array stockant les mapIds de villes visitées.
-- Auto-rempli côté serveur dès qu'on visite : bourgpates / pepiteville / hautespates / macaron_ile / muscuville.
-- Le fast travel via START → VOYAGE est gratuit pour les villes dans cette liste.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "visitedTowns" JSONB NOT NULL DEFAULT '[]';
