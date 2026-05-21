-- Migration v3.1 : ajout des champs pour Route 1 + Pont Pépite d'Azuria
-- À appliquer APRÈS la migration v3 (20260521_pushquest_v3_map).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "treeObstacleCleared"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pioneerBadgeAwarded"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bridgePnjDefeated"         JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "bridgePnjLastBeatenDate"   JSONB   NOT NULL DEFAULT '{}'::jsonb;
