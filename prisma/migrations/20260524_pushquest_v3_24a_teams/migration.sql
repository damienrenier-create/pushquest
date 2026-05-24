-- Migration v3.24a : Bonus quotidien du capitaine d'équipe
--
-- 7 joueurs sont répartis en 3 groupes :
--   - Équipe ROUGE  : Mools, Milkardashian, Neuneu
--   - Équipe JAUNE  : Xa, Embi, Gg
--   - Sans équipe   : Franss
--
-- Chaque joueur en équipe peut réclamer +30 reps 1× par jour auprès du
-- capitaine de sa couleur. Les joueurs sans équipe (Franss) sont accueillis
-- mais ne reçoivent pas le bonus.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "lastTeamCaptainBonusDate" TEXT NOT NULL DEFAULT '';
