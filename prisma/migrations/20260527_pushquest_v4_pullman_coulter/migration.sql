-- Migration v4.0 — Extensions Pullman Pastagone : Coulter + Brigadier Faa
--
-- pastagoneCoulterBeaten  : true après défaite Inspecteur Coulter (mini-boss).
-- pastagoneFaaGiftClaimed : true après cadeau Brigadier Faa (+100 reps one-shot).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "pastagoneCoulterBeaten" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pastagoneFaaGiftClaimed" BOOLEAN NOT NULL DEFAULT false;
