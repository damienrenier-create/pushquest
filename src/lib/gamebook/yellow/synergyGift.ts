// src/lib/gamebook/yellow/synergyGift.ts
//
// Nexus Jaune Éclair — signale au serveur qu'une SYNERGIE de fusion vient d'être « découverte » (fusion inédite /
// clan / paire / mimimoy assemblée dans le gauntlet de Ligue). Déclenche la fête communautaire (+200⚡ aux joueurs
// ayant atteint le Dôme, +50⚡ aux autres) à la 1re découverte MONDIALE (idempotence serveur par `key`). Best-effort.

import { getActiveWorld } from "./store/playerStore"

/** Signale la découverte d'un secret de synergie. `key` = idempotence mondiale ; `label` = annonce. */
export function reportSynergyDiscovery(key: string, label: string): void {
    if (!key) return
    // REJEU (bulle jetable) : aucune fête communautaire (anti-farm inter-comptes, comme la fête shiny).
    if (getActiveWorld() === "replay") return
    try {
        void fetch("/api/gamebook/yellow/synergy-gift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, label }),
        })
    } catch {
        /* best-effort : réessai à la prochaine entrée en Ligue avec une fusion synergique */
    }
}
