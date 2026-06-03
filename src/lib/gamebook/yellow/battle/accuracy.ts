// src/lib/gamebook/yellow/battle/accuracy.ts
//
// Nexus Jaune Éclair — précision / esquive (module dédié, React-free, pur).
// HitChance = MoveAccuracy × AccuracyStageMod × EvasionStageMod
// Les stages de précision/esquive utilisent une table de FRACTIONS distincte des
// autres stats (base 3/3), d'où ce module séparé.

import type { MoveData, BattleMon } from "./types"
import { accEvaMultiplier } from "./stats"
import type { Rng } from "./rng"

/**
 * Probabilité de toucher (en %, 0..100+). move.accuracy <= 0 → ne rate jamais
 * (renvoie Infinity pour signaler le coup garanti).
 */
export function hitChance(move: MoveData, attacker: BattleMon, defender: BattleMon): number {
    if (move.accuracy <= 0) return Infinity
    const accMod = accEvaMultiplier(attacker.stages.acc)
    const evaMod = accEvaMultiplier(-defender.stages.eva)
    return move.accuracy * accMod * evaMod
}

/** Résout le jet de précision. */
export function accuracyCheck(move: MoveData, attacker: BattleMon, defender: BattleMon, rng: Rng): boolean {
    const chance = hitChance(move, attacker, defender)
    if (!Number.isFinite(chance)) return true
    return rng.chance(chance)
}
