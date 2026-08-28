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

// Bonus de GROUPE (mode fun) : +2% de chance d'IV EXCELLENT [12..15] par joueur EN LIGNE (hors soi), cap +20%.
export const FUN_GROUP_EXCELLENT_PER_PLAYER = 0.02
export const FUN_GROUP_EXCELLENT_CAP = 0.20

/**
 * MODE FUN — tirage IV à PALIERS (aucun quota reps en fun), UNIFORME dans le palier :
 *   60% MOYEN [6..9] · 25% [4..5]∪[10..11] · 10% [1..3]∪[12..14] · 5% {0,15}.
 * « L'IV très moyen est le plus fréquent ; bon/mauvais sont rares ; très bon/très mauvais très rares. »
 * Bonus de groupe : +2%/joueur en ligne (cap +20%) d'IV EXCELLENT [12..15], PRIS sur le palier moyen
 * (la tranche [0,bonus) est carvée du 60% → moyen effectif = 0.60 − bonus, jamais négatif car cap 0.20 < 0.60).
 * rng injecté → testable/déterministe.
 * @param connectedCount joueurs EN LIGNE (hors soi) → chasse groupée = meilleurs génes.
 */
export function funRollIvs(rng: () => number, connectedCount = 0): Record<StatKey, number> {
    const bonus = Math.min(FUN_GROUP_EXCELLENT_CAP, FUN_GROUP_EXCELLENT_PER_PLAYER * Math.max(0, connectedCount))
    const one = (): number => {
        const u = rng()
        if (u < bonus)  return 12 + Math.floor(rng() * 4)                                          // EXCELLENT 12..15 (bonus groupe, pris au moyen)
        if (u < 0.60)   return 6 + Math.floor(rng() * 4)                                           // MOYEN 6..9 (largeur 0.60 − bonus)
        if (u < 0.85)   return rng() < 0.5 ? 4 + Math.floor(rng() * 2) : 10 + Math.floor(rng() * 2)  // BON/MAUVAIS 4-5 | 10-11
        if (u < 0.95)   return rng() < 0.5 ? 1 + Math.floor(rng() * 3) : 12 + Math.floor(rng() * 3)  // TRÈS BON/MAUVAIS 1-3 | 12-14
        return rng() < 0.5 ? 0 : IV_MAX                                                            // EXTRÊMES 0 | 15
    }
    return { hp: one(), atk: one(), def: one(), spe: one(), spc: one() }
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
