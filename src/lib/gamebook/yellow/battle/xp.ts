// src/lib/gamebook/yellow/battle/exp.ts
//
// Nexus Jaune Éclair — expérience, courbe de niveau, montée de niveau + apprentissage.
// React-free, pur. Courbe DOUCE (XP totale au niveau L = 12·L²) pour accélérer
// nettement la progression — le jeu était trop long avec l'ancienne courbe L³.

import type { MonInstance } from "./types"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"

export const MAX_LEVEL = 100

/** XP cumulée nécessaire pour ATTEINDRE un niveau (courbe douce : 12·L²). */
export function expForLevel(level: number): number {
    return Math.max(0, 12 * Math.floor(level) ** 2)
}

/** Niveau correspondant à une XP cumulée. */
export function levelFromExp(exp: number): number {
    let l = 1
    while (l < MAX_LEVEL && expForLevel(l + 1) <= exp) l++
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
    const baseExp = Math.max(mon.exp, expForLevel(mon.level))
    const newExp = baseExp + Math.max(0, gained)
    const toLevel = Math.max(fromLevel, Math.min(MAX_LEVEL, levelFromExp(newExp)))

    mon.exp = newExp
    mon.level = toLevel

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
