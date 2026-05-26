-- Migration v4.0 Phase 1.D.bis : gate sérum sur Daemon
--
-- Ajout du champ unlockedAt :
--   null = compagnon 🐾 ANIMAL (UI masque stats/type/combat)
--   set  = 👾 DAEMON déverrouillé après usage du Sérum de Poussière
--          (drop du chef mafia Team Boulette, pré-arc Pastagone)
--
-- L'auto-migration tamagotchi → Daemon (ensureDaemonForTamagotchi) grandfather
-- les compagnons existants en posant unlockedAt = now() au moment de la création
-- de la row Daemon. Seuls les NOUVEAUX animaux adoptés via le flux mafia/sérum
-- resteront sur unlockedAt = null jusqu'au use-serum.

ALTER TABLE "Daemon"
  ADD COLUMN "unlockedAt" TIMESTAMP(3);
