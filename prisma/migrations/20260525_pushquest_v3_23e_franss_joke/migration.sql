-- Migration v3.23e : Blague unique de PIAFFINI pour Franss
--
-- Suite au bug du téléport PIAFFINI (fixé en v3.23d), Franss s'est tapé le
-- retour à pied. Comme compensation narrative, PIAFFINI joue une dernière
-- blague à Franss : à sa prochaine connexion, dès le premier mouvement,
-- PIAFFINI le re-téléporte à la Tour (gag), puis dès le mouvement suivant,
-- l'amène à JOJO à Bourg-Boulette + offre 30 reps en compensation.
--
-- Flag one-shot, Franss uniquement (userId hardcodé dans /api/gamebook/franss-joke).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "franssJokeBirdDone" BOOLEAN NOT NULL DEFAULT false;
