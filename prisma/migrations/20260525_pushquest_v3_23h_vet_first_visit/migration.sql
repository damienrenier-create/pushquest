-- Migration v3.23h : snapshot du level XP au 1er passage chez V3T
-- L'animal du tamagotchi est figé à ce level, JAMAIS ne ré-évolue.
ALTER TABLE "GamebookProgress"
  ADD COLUMN "vetFirstVisitLevel" INTEGER;
