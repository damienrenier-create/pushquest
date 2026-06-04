// src/lib/gamebook/yellow/data/badges.ts
//
// Nexus Jaune Éclair — BADGES d'arène. Gagnés en battant le chef de chaque salle
// (Feu / Plante / Eau). Chaque badge :
//   1) augmente le PLAFOND de stockage des reps (repsCap),
//   2) augmente le CAP D'ÉNERGIE dépensable par combat,
//   3) débloque l'achat de CT de la salle correspondante (cf. cts.ts / purchasableCts).
// Les 3 badges débloquent le Champion (trône) et les CT "champion".

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

export const BADGES: BadgeMeta[] = [
    { id: "feu", label: "Badge Flamme", room: "Salle Feu", emoji: "🔥", color: "#e0502a" },
    { id: "plante", label: "Badge Feuille", room: "Salle Plante", emoji: "🌿", color: "#3aa54a" },
    { id: "eau", label: "Badge Goutte", room: "Salle Eau", emoji: "💧", color: "#3a8ee0" },
]

export function getBadge(id: BadgeId): BadgeMeta | undefined {
    return BADGES.find((b) => b.id === id)
}

/** Cap d'énergie d'un combat selon le nombre de badges possédés. */
export function battleEnergyCap(badgeCount: number): number {
    return BASE_BATTLE_ENERGY + Math.max(0, badgeCount) * BATTLE_ENERGY_PER_BADGE
}
