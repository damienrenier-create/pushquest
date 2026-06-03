// src/lib/gamebook/yellow/battle/stats.ts
//
// Nexus Jaune Éclair — calcul des stats (niveau / base / IV) + stages de combat.
// Formules style Gen 3+ simplifiées (sans EV/nature pour l'instant — extensible).

import type { SpeciesData, StatKey, StageKey, MonInstance, MajorStatus } from "./types"

// ============================================================
// Stats absolues d'un monstre (hors combat)
// ============================================================

/** PV max : ((2*Base + IV) * niveau / 100) + niveau + 10. */
export function maxHp(species: SpeciesData, level: number, ivHp: number): number {
    return Math.floor(((2 * species.baseStats.hp + ivHp) * level) / 100) + level + 10
}

/** Autres stats : (((2*Base + IV) * niveau / 100) + 5). */
export function computeStat(base: number, iv: number, level: number): number {
    return Math.floor(((2 * base + iv) * level) / 100) + 5
}

/** Toutes les stats absolues d'une instance (atk/def/spa/spd/spe + hpMax). */
export function fullStats(
    inst: Pick<MonInstance, "level" | "ivs">,
    species: SpeciesData,
): Record<StatKey, number> {
    const lv = inst.level
    return {
        hp: maxHp(species, lv, inst.ivs.hp),
        atk: computeStat(species.baseStats.atk, inst.ivs.atk, lv),
        def: computeStat(species.baseStats.def, inst.ivs.def, lv),
        spa: computeStat(species.baseStats.spa, inst.ivs.spa, lv),
        spd: computeStat(species.baseStats.spd, inst.ivs.spd, lv),
        spe: computeStat(species.baseStats.spe, inst.ivs.spe, lv),
    }
}

// ============================================================
// Multiplicateurs de stages (-6..+6)
// ============================================================

/** Multiplicateur d'une stat offensive/défensive (atk/def/spa/spd/spe). */
export function stageMultiplier(stage: number): number {
    const s = clampStage(stage)
    return s >= 0 ? (2 + s) / 2 : 2 / (2 - s)
}

/** Multiplicateur précision/esquive (table différente : 3/3..9/3). */
export function accEvaMultiplier(stage: number): number {
    const s = clampStage(stage)
    return s >= 0 ? (3 + s) / 3 : 3 / (3 - s)
}

export function clampStage(stage: number): number {
    return Math.max(-6, Math.min(6, stage))
}

// ============================================================
// Stats EFFECTIVES en combat (stage + statut)
// ============================================================

/** Attaque effective : base * stage, halvée si brûlure (phys) / paralysie (spe). */
export function effectiveStat(
    raw: number,
    key: Exclude<StageKey, "acc" | "eva">,
    stage: number,
    status: MajorStatus,
): number {
    let v = Math.floor(raw * stageMultiplier(stage))
    if (key === "atk" && status === "BURN") v = Math.floor(v / 2)
    if (key === "spe" && status === "PARALYSIS") v = Math.floor(v / 2)
    return Math.max(1, v)
}
