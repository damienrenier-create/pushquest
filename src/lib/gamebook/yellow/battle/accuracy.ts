// src/lib/gamebook/yellow/battle/accuracy.ts
//
// Nexus Jaune Éclair — précision / esquive (module dédié, React-free, pur).
// HitChance = MoveAccuracy × AccuracyStageMod × EvasionStageMod
// Les stages de précision/esquive utilisent une table de FRACTIONS distincte des
// autres stats (base 3/3), d'où ce module séparé.

import type { MoveData, BattleMon } from "./types"
import { accEvaMultiplier, fullStats, effectiveStat } from "./stats"
import { getSpecies } from "../data/species"
import { heldEffect } from "../data/heldItems"
import type { Rng } from "./rng"

// HYPNOSE (speedScaledAcc) : bornes de la précision modulée par la vitesse.
const SPEED_ACC_MIN = 15  // plancher (même très lent, ça peut passer)
const SPEED_ACC_MAX = 80  // plafond (jamais un sommeil quasi garanti)

/** Vitesse EFFECTIVE d'un Daemon en combat (stats pleines + palier de Vitesse + statut). */
function effectiveSpeed(mon: BattleMon): number {
    const sp = getSpecies(mon.speciesId)
    if (!sp) return 1
    return effectiveStat(fullStats(mon, sp).spe, "spe", mon.stages.spe, mon.status)
}

/**
 * Probabilité de toucher (en %, 0..100+). move.accuracy <= 0 → ne rate jamais
 * (renvoie Infinity pour signaler le coup garanti).
 */
export function hitChance(move: MoveData, attacker: BattleMon, defender: BattleMon): number {
    if (move.accuracy <= 0) return Infinity
    // HYPNOSE : précision de base FIXE, INDÉPENDANTE de l'esquive, modulée par le ratio de Vitesse
    // lanceur/cible (rapide → +précis, lent → -précis), bornée [SPEED_ACC_MIN, SPEED_ACC_MAX].
    // OBJET TENU — Poudre Claire (×0.9) / Encens Doux (×0.95) : baisse la précision des attaques visant le porteur.
    const itemMod = heldEffect(defender)?.incomingAccMult ?? 1
    if (move.effect?.speedScaledAcc) {
        const sCaster = effectiveSpeed(attacker)
        const sTarget = Math.max(1, effectiveSpeed(defender))
        const scaled = move.accuracy * (sCaster / sTarget) * itemMod // l'objet réduit aussi l'Hypnose & co.
        return Math.max(SPEED_ACC_MIN, Math.min(SPEED_ACC_MAX, scaled))
    }
    const accMod = accEvaMultiplier(attacker.stages.acc)
    const evaMod = accEvaMultiplier(-defender.stages.eva)
    return move.accuracy * accMod * evaMod * itemMod
}

/** Résout le jet de précision. */
export function accuracyCheck(move: MoveData, attacker: BattleMon, defender: BattleMon, rng: Rng): boolean {
    const chance = hitChance(move, attacker, defender)
    if (!Number.isFinite(chance)) return true
    return rng.chance(chance)
}
