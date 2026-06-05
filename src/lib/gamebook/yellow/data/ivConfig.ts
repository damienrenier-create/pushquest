// src/lib/gamebook/yellow/data/ivConfig.ts
//
// Nexus Jaune Éclair — IV ("génétique") des Daemons SAUVAGES, pilotés par l'EFFORT.
// Plus tu es proche de ton quota du jour, plus le PLANCHER d'IV monte ; il reste
// un delta aléatoire (le fun de la chasse). Gros dépassement → chance d'un Daemon
// PARFAIT (tous les IV au max). Pur (rng injecté) → testable/déterministe.
//
// Rappel : l'IV pèse `~niveau×IV/100` dans les stats (formule Gen 1) — variation
// subtile mais réelle, qui s'ajoute par-dessus l'entraînement Saiyan.

import type { StatKey } from "../battle/types"

export const IV_MAX = 15
/** Plancher d'IV atteint quand le quota du jour est bouclé (IV alors dans [12,15]). */
export const IV_FLOOR_AT_QUOTA = 12
/** Chance de Daemon PARFAIT (tous IV=15) : base + bonus selon le dépassement de quota. */
export const IV_PERFECT_BASE = 0.0
export const IV_PERFECT_PER_OVERSHOOT = 0.25

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Tire les 5 IV d'un Daemon sauvage.
 * @param rng       fonction [0,1) (injectée pour déterminisme).
 * @param quotaRatio min(1, reps_du_jour / quota) → relève le plancher.
 * @param overshoot  dépassement du quota (0..1) → chance de parfait.
 */
export function rollIvs(rng: () => number, quotaRatio: number, overshoot: number): Record<StatKey, number> {
    const perfectChance = Math.min(0.3, IV_PERFECT_BASE + IV_PERFECT_PER_OVERSHOOT * clamp01(overshoot))
    if (rng() < perfectChance) {
        return { hp: IV_MAX, atk: IV_MAX, def: IV_MAX, spe: IV_MAX, spc: IV_MAX }
    }
    const floor = Math.round(IV_FLOOR_AT_QUOTA * clamp01(quotaRatio))
    const span = IV_MAX - floor + 1
    const ivs = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) ivs[k] = floor + Math.floor(rng() * span)
    return ivs
}

/** Somme des IV (0..75). */
export function ivTotal(ivs: Record<StatKey, number>): number {
    return STAT_KEYS.reduce((a, k) => a + (ivs[k] ?? 0), 0)
}

export type IvTier = "PARFAIT" | "S" | "A" | "B" | "C" | "D"

/** Palier "potentiel" lisible affiché au joueur. */
export function ivTier(ivs: Record<StatKey, number>): IvTier {
    const t = ivTotal(ivs)
    if (t >= 75) return "PARFAIT"
    if (t >= 64) return "S"
    if (t >= 52) return "A"
    if (t >= 38) return "B"
    if (t >= 24) return "C"
    return "D"
}

/** Couleur d'affichage par palier. */
export function ivTierColor(tier: IvTier): string {
    switch (tier) {
        case "PARFAIT": return "#e0c020"
        case "S": return "#e0502a"
        case "A": return "#c020a0"
        case "B": return "#3a8ee0"
        case "C": return "#3aa54a"
        default: return "#888"
    }
}
