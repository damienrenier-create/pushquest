-- Migration v3.8.1 : arbres fruitiers + suivi quotidien
--
-- Ajoute 1 colonne pour suivre les fruits cueillis sur chaque arbre de Pépiteville
-- (3 fruits max/jour/arbre, reset quotidien).
--
-- Format : { date: "YYYY-MM-DD", counts: { "apple_tree_1": n, "apple_tree_2": n } }
-- Pas d'impact sur les données existantes.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "fruitsTaken" JSONB NOT NULL DEFAULT '{}';
