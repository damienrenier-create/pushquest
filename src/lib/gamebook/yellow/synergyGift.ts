// src/lib/gamebook/yellow/synergyGift.ts
//
// Nexus Jaune Éclair — signale au serveur qu'une SYNERGIE de fusion vient d'être « découverte » (fusion inédite /
// clan / paire / mimimoy assemblée dans le gauntlet de Ligue). Déclenche la fête communautaire (+200⚡ aux joueurs
// ayant atteint le Dôme, +50⚡ aux autres) à la 1re découverte MONDIALE (idempotence serveur par `key`). Best-effort.

import { getActiveWorld } from "./store/playerStore"
import type { DiscoveredSecret } from "./data/fusionSecrets"
import { fusionSynergy, fusionSecretRevealKey } from "./data/fusionSpecies"

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

/** Les secrets déjà percés dans le Nexus (page « Secrets » du Fusiodex). Jamais d'erreur : [] si le réseau ou la table manque. */
export async function fetchDiscoveredSecrets(): Promise<DiscoveredSecret[]> {
    try {
        const r = await fetch("/api/gamebook/yellow/synergy-gift")
        const j = r.ok ? await r.json() : null
        return Array.isArray(j?.discovered) ? (j.discovered as DiscoveredSecret[]) : []
    } catch { return [] }
}

/** Révèle une PAIRE de clan sur la page « Secrets » (sans fête : celle du clan est unique). Best-effort, idempotent serveur. */
export function reportSecretReveal(revealKey: string, label: string): void {
    if (!revealKey || getActiveWorld() === "replay") return
    try {
        void fetch("/api/gamebook/yellow/synergy-gift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reveal: revealKey, label }) })
    } catch { /* best-effort */ }
}

/** Une fusion vient d'être FORGÉE (Autel, Atelier, ou rattrapage depuis « Mes fusions ») : révèle sa paire de clan sur la page
 *  « Secrets », et déclenche la fête si c'est la 1re fois que CE joueur perce CE secret (`firstTimeForMe` = markSynergyDiscovered).
 *  Renvoie le secret quand une fête vient d'être demandée (pour l'annoncer), sinon null. Best-effort, idempotent serveur. */
export function reportForgedFusionSecrets(aId: string, bId: string, firstTimeForMe: (key: string) => boolean): { key: string; label: string } | null {
    const syn = fusionSynergy(aId, bId)
    if (!syn) return null
    const rk = fusionSecretRevealKey(aId, bId)
    if (rk && rk !== syn.key) reportSecretReveal(rk, syn.label)
    if (!firstTimeForMe(syn.key)) return null
    reportSynergyDiscovery(syn.key, syn.label)
    return syn
}
