-- Migration v3.11 : Résolution PIAFFINI
--
-- Ajoute le flag persistant qui marque la fin de l'arc PIAFFINI :
--   - true = le joueur a déclenché la cinématique au sommet de la Tour
--   - À true, JOJO change de dialogue (cadeau Maillot+Palmes) et JOJETTE félicite.
--   - Ne redevient JAMAIS false (à vie, idempotent côté serveur).
--
-- Le Maillot+Palmes (swim_set) est stocké dans inventory (Json), pas en colonne séparée.
-- L'XP du badge "Sauveur de PIAFFINI" est créé via XpAdjustment idempotent par reason.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "piaffiniRescued" BOOLEAN NOT NULL DEFAULT FALSE;
