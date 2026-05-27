-- Migration v4.0 — CAPOLINO 3ᵉ + 4ᵉ rencontre Pastagone
--
-- pastagoneCapolinoMidBeaten : défaite mini-boss Pastagone mid-arc
-- pastagoneCapolinoFleeShown : cinématique fuite post-boss vue

ALTER TABLE "GamebookProgress"
  ADD COLUMN "pastagoneCapolinoMidBeaten" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneCapolinoFleeShown" BOOLEAN NOT NULL DEFAULT false;
