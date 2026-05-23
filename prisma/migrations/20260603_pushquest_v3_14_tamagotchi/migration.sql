-- Migration v3.14 : Tamagotchi (mécanique vétérinaire de Macaron'île)
--
-- Ajoute une colonne JSON nullable pour stocker le tamagotchi du joueur :
-- { name, adoptedAt, lastFedAt, happiness, feedCount, stage }
-- null = pas adopté. Une fois adopté, le champ reste rempli.
--
-- Le tamagotchi se nourrit en consommant des reps de l'énergie disponible.
-- Sa happiness décroît avec le temps (jours sans nourriture).
-- Il évolue (egg → baby → adult) selon le nombre de feedings cumulés.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "tamagotchi" JSONB;
