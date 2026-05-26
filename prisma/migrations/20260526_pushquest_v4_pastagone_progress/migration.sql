-- Migration v4.0 Phase 4 : flags narratifs Pastagone
--
-- Additive only. Tous les champs nullable / défaut neutre. Les joueurs
-- existants ne sont pas affectés (tous reçoivent les défauts à false/null/{}).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "pastagoneArrested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneEscaped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneBossBeaten" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneInterrogStart" TIMESTAMP(3),
  ADD COLUMN "pastagoneInterrogDefis" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "pastagoneOrphanChosen" TEXT,
  ADD COLUMN "pastagoneBolognionFound" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneCuisinePuzzle" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "pastagoneInfirmerieUses" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "pastagoneTourLastNpc" TEXT,
  ADD COLUMN "pastagoneTourLastRotAt" TIMESTAMP(3),
  ADD COLUMN "pastagoneTourCooldownUntil" TIMESTAMP(3);
