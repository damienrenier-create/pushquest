-- Migration v4.0 Phase 2.B : combat actif (BattleState) sérialisé en Json
--
-- Une seule battle par user à tout instant. null = pas de combat en cours.
-- Le contenu suit l'interface BattleState dans src/lib/gamebook/battleState.ts.
-- Stockage server-side pour survivre aux refresh / déconnexions au milieu d'un combat.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "activeBattle" JSONB;
