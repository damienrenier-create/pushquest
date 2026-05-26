-- Migration v4.0 Phase 3 : Saiyan level up — pending stat points
--
-- Quand un Daemon level up combat, il gagne 5-9 points (formule Saiyan) à
-- répartir manuellement entre Force / Vitesse / Défense / Intelligence / Endurance.
-- Le joueur dépense via POST /api/gamebook/daemon/allocate-points.

ALTER TABLE "Daemon"
  ADD COLUMN "pendingStatPoints" INTEGER NOT NULL DEFAULT 0;
