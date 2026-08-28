// src/lib/gamebook/yellow/multiplayer/onlinePresence.ts
//
// Compteur GLOBAL de joueurs fun EN LIGNE (hors soi) — canal de présence `gamebook-yellow_nexus`.
// ÉCRIT par YellowDevClient (2ᵉ instance useCasinoPresence sur le canal global) ; LU au spawn sauvage
// (encounters/gameStore) pour le bonus de groupe d'IV en mode fun (chasse groupée = meilleurs génes).
//
// 100% éphémère (aucune persistance, aucun champ de save). Côté serveur / tests : jamais écrit → reste 0 → aucun effet.
// Module NEUTRE (pas de "use client", aucun import) → importable partout sans cycle.

let onlineOthers = 0

/** Renseigne le nombre d'AUTRES joueurs fun en ligne (borné ≥0). */
export function setOnlineCount(n: number): void {
    onlineOthers = Math.max(0, Math.floor(n) || 0)
}

/** Nombre d'AUTRES joueurs fun en ligne (0 par défaut : hors présence, serveur, tests). */
export function getOnlineCount(): number {
    return onlineOthers
}
