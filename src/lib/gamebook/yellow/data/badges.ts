// src/lib/gamebook/yellow/data/badges.ts
//
// Nexus Jaune Éclair — BADGES d'arène. SIX arènes depuis le 21/10/2026, dans cet ordre de jeu : Plante, Roche, Feu
// (porte du GYM), le BATEAU (badge ANCRE, cf. data/boatArena.ts), Électrik (porte du GYM, gardée par le gardien des
// clés), Eau (Cendreville). Les 6 ouvrent la Ligue. Chaque badge :
//   1) augmente le PLAFOND de stockage des reps (repsCap),
//   2) augmente le CAP D'ÉNERGIE dépensable par combat,
//   3) débloque l'achat de CT de la salle correspondante (cf. cts.ts / purchasableCts).

import type { BadgeId } from "./cts"

/** + de plafond de stockage des reps par badge gagné. */
export const BADGE_REPS_CAP_BONUS = 250

/** Énergie (reps) dépensable dans UN combat, de base puis par badge. */
export const BASE_BATTLE_ENERGY = 200
export const BATTLE_ENERGY_PER_BADGE = 150

export interface BadgeMeta {
    id: BadgeId
    label: string
    room: string
    emoji: string
    color: string
}

/** Les 6 badges, dans l'ORDRE DE JEU (source unique : Ligue, compteurs « x/6 », reprises). */
export const ALL_BADGE_IDS: readonly BadgeId[] = ["plante", "roche", "feu", "ancre", "elec", "eau"]

export const BADGES: BadgeMeta[] = [
    { id: "plante", label: "Badge Feuille", room: "Bosquet Sacré", emoji: "🌿", color: "#3aa54a" },
    { id: "roche", label: "Badge Roche", room: "Caverne Minière", emoji: "🪨", color: "#a07a4a" },
    { id: "feu", label: "Badge Flamme", room: "Caldeira", emoji: "🔥", color: "#e0502a" },
    { id: "ancre", label: "Badge Ancre", room: "Aqua Arena (le bateau)", emoji: "⚓", color: "#2a6ea0" },
    { id: "elec", label: "Badge Éclair", room: "Tour Hertz", emoji: "⚡", color: "#f6c640" },
    { id: "eau", label: "Badge Goutte", room: "Sanctuaire des Marées", emoji: "💧", color: "#3a8ee0" },
]

export function getBadge(id: BadgeId): BadgeMeta | undefined {
    return BADGES.find((b) => b.id === id)
}

/** Cap d'énergie d'un combat selon le nombre de badges possédés. */
export function battleEnergyCap(badgeCount: number): number {
    return BASE_BATTLE_ENERGY + Math.max(0, badgeCount) * BATTLE_ENERGY_PER_BADGE
}
