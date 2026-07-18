// src/lib/gamebook/yellow/shinyGift.ts
//
// Nexus Jaune Éclair — signale au serveur qu'un SHINY a été croisé/capturé → déclenche la fête
// communautaire (+50 énergie pour tous, réclamée au login). Best-effort (jamais bloquant).

import { getActiveWorld } from "./store/playerStore"

/** Signale un shiny croisé ("encounter") ou capturé ("captured"). Idempotent côté serveur (eventKey). */
export function reportShiny(kind: "encounter" | "captured", uid: string, speciesId: string): void {
    if (!uid) return
    // REJEU (« run bis ») : un shiny croisé/capturé dans une bulle jetable NE déclenche PAS la fête communautaire
    //   (+50⚡ à tous) ni la prime de parrainage (+500⚡) → sinon rejouer en boucle = faucet d'énergie inter-comptes.
    //   La capture reste dans le Pokédex GLOBAL (voulu), mais aucun cadeau serveur n'est émis.
    if (getActiveWorld() === "replay") return
    try {
        void fetch("/api/gamebook/yellow/shiny-gift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, uid, speciesId }),
        })
    } catch {
        /* best-effort : si l'appel échoue, la fête se déclenchera au prochain shiny */
    }
}
