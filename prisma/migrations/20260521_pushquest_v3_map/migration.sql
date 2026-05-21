-- Migration : ajout des champs pour la version Map du Gamebook (v3)
-- On garde l'ancienne table GamebookProgress et on l'enrichit pour le nouveau système.
-- Les anciens chapterId restent valides ; le nouveau système utilise chapterId = 'map_v3'.

ALTER TABLE "GamebookProgress"
  ADD COLUMN     "mapId"                TEXT     NOT NULL DEFAULT 'bourgpates',
  ADD COLUMN     "posX"                 INTEGER  NOT NULL DEFAULT 7,
  ADD COLUMN     "posY"                 INTEGER  NOT NULL DEFAULT 12,
  ADD COLUMN     "direction"            TEXT     NOT NULL DEFAULT 'up',
  ADD COLUMN     "phase"                TEXT     NOT NULL DEFAULT 'explore',
  ADD COLUMN     "introStep"            INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN     "hasEnteredTallGrass"  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN     "monsterCaveRevealed"  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN     "hasSeenWelcomeScreen" BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN     "lastSeen"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index pour récupérer rapidement les snapshots des autres joueurs
CREATE INDEX "GamebookProgress_mapId_idx" ON "GamebookProgress"("mapId");
CREATE INDEX "GamebookProgress_lastSeen_idx" ON "GamebookProgress"("lastSeen" DESC);
