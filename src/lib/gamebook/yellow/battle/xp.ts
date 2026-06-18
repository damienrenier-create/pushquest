// src/lib/gamebook/yellow/battle/exp.ts
//
// Nexus Jaune Éclair — expérience, courbe de niveau, montée de niveau + apprentissage.
// React-free, pur. Courbe : base 16·L² + terme cubique en PALIERS (coef +0.1 tous les ~7
// niveaux). À bas niveau ≈ identique à avant ; en fin de jeu la montée se durcit de plus en
// plus (un sauvage médian = ~1.3 combat/niveau au début → ~4.8 vers le niveau 50).

import type { MonInstance } from "./types"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { growthMult } from "../data/growthCurve"

export const MAX_LEVEL = 100

/** Coefficient cubique en PALIERS : +0.1 tous les ~7 niveaux. La montée se DURCIT de plus
 *  en plus en fin de jeu (à bas niveau quasi identique à l'ancienne 16·L²). */
function xpBandCoef(level: number): number {
    const L = Math.floor(level)
    return L <= 12 ? 0.1 : L <= 19 ? 0.2 : L <= 27 ? 0.3 : L <= 34 ? 0.4 : L <= 41 ? 0.5 : L <= 48 ? 0.6 : 0.7
}

/** XP pour passer du niveau L au niveau L+1 = incrément de 16·L² (32L+16) + coef de palier
 *  × incrément de L³ (3L²+3L+1). Coef appliqué à l'INCRÉMENT (pas de saut brutal aux paliers). */
export function xpToNextLevel(level: number): number {
    const L = Math.floor(level)
    return Math.round(32 * L + 16 + xpBandCoef(L) * (3 * L * L + 3 * L + 1))
}

/** Table cumulative (XP totale pour ATTEINDRE le niveau L), précalculée une fois. */
const EXP_CUM: number[] = (() => {
    const t: number[] = new Array(MAX_LEVEL + 1)
    t[0] = 0
    t[1] = 0 // niveau 1 = 0 XP
    for (let L = 2; L <= MAX_LEVEL; L++) t[L] = t[L - 1] + xpToNextLevel(L - 1)
    return t
})()

/**
 * XP cumulée nécessaire pour ATTEINDRE un niveau.
 * Si `speciesId` est fourni, la valeur est multipliée par la courbe de progression de
 * l'espèce (cf. growthCurve.ts : ×0.80 frêle → ×1.25 colossal). Sans espèce = courbe de
 * référence (×1.0), compatibilité ascendante stricte.
 */
export function expForLevel(level: number, speciesId?: string): number {
    const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
    const base = EXP_CUM[L]
    return speciesId ? Math.round(base * growthMult(speciesId)) : base
}

/** Niveau correspondant à une XP cumulée (sur la courbe de l'espèce si fournie). */
export function levelFromExp(exp: number, speciesId?: string): number {
    let l = 1
    while (l < MAX_LEVEL && expForLevel(l + 1, speciesId) <= exp) l++
    return l
}

/** XP gagnée en battant un adversaire (formule simplifiée : baseExp × niveau / 5). */
export function xpForDefeat(defeatedBaseExp: number, defeatedLevel: number, isWild: boolean): number {
    const base = Math.floor((defeatedBaseExp * defeatedLevel) / 5)
    return Math.max(1, isWild ? base : Math.floor(base * 1.5))
}

export interface ExpResult {
    gained: number
    fromLevel: number
    toLevel: number
    learnedMoveIds: string[]
    /** Attaques que le Daemon veut apprendre mais ne peut pas (4 slots pleins). */
    pendingMoveIds: string[]
}

/**
 * Applique l'XP au monstre (MUTE l'instance) : recale l'exp, gère la montée de
 * niveau et l'apprentissage des nouvelles attaques (dans la limite de 4 slots).
 * Ne touche PAS aux PV (le moteur gère le delta de PV au level-up en combat).
 */
export function applyExp(mon: MonInstance, gained: number): ExpResult {
    const sp = getSpecies(mon.speciesId)
    const fromLevel = mon.level
    const baseExp = Math.max(mon.exp, expForLevel(mon.level, mon.speciesId))
    const newExp = baseExp + Math.max(0, gained)
    const toLevel = Math.max(fromLevel, Math.min(MAX_LEVEL, levelFromExp(newExp, mon.speciesId)))

    mon.exp = newExp
    mon.level = toLevel

    // ENTRAÎNEMENT SAIYAN : on note seulement les niveaux gagnés (compteur pur).
    // La conversion en points (règle amende/quota PushQuest) se fait après coup,
    // côté app (processSaiyanPoints), car elle nécessite date + accès serveur.
    if (toLevel > fromLevel) {
        mon.pendingSaiyanLevels = (mon.pendingSaiyanLevels ?? 0) + (toLevel - fromLevel)
    }

    const learnedMoveIds: string[] = []
    const pendingMoveIds: string[] = []
    if (sp && toLevel > fromLevel) {
        for (let lv = fromLevel + 1; lv <= toLevel; lv++) {
            for (const entry of sp.learnset) {
                if (entry.level !== lv) continue
                if (mon.moves.some((m) => m.moveId === entry.moveId)) continue
                if (mon.moves.length < 4) {
                    const mv = getMove(entry.moveId)
                    const pp = mv?.pp ?? 5
                    mon.moves.push({ moveId: entry.moveId, pp, ppMax: pp })
                    learnedMoveIds.push(entry.moveId)
                } else {
                    // 4 slots pleins → en attente d'un choix « oublier une capacité ».
                    mon.pendingMoves ??= []
                    if (!mon.pendingMoves.includes(entry.moveId)) {
                        mon.pendingMoves.push(entry.moveId)
                        pendingMoveIds.push(entry.moveId)
                    }
                }
            }
        }
    }
    return { gained, fromLevel, toLevel, learnedMoveIds, pendingMoveIds }
}
