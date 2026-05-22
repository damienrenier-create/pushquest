-- Migration v3.6 : anti-triche suppression de reps
-- Quand un user réduit ses reps (suppression de set, édition à la baisse, resave avec moins),
-- on reset sa progression Gamebook (position, flags, badge Pionnier excepté) et on bloque
-- ses mouvements pendant 24h via ce champ.
-- null = pas frozen, valeur = instant après lequel le joueur récupère ses mouvements.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "gamebookFrozenUntil" TIMESTAMP(3);
