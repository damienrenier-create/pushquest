// src/lib/gamebook/yellow/battle/stats.ts
//
// Nexus Jaune Éclair — calcul des stats (STRICT Gen 1 : 5 stats, IV/"DV" 0..15).
// Pas d'EV/Nature (volontaire, documenté). Le Spécial (spc) sert d'attaque ET de
// défense spéciale.

import type { SpeciesData, StatKey, StageKey, MonInstance, MajorStatus } from "./types"

// ============================================================
// Stats absolues (hors combat)
// ============================================================

/** PV max : floor(((2*Base + IV) * niveau) / 100) + niveau + 10. */
export function maxHp(species: SpeciesData, level: number, ivHp: number): number {
    return Math.floor(((2 * species.baseStats.hp + ivHp) * level) / 100) + level + 10
}

/** Autres stats : floor(((2*Base + IV) * niveau) / 100) + 5. */
export function computeStat(base: number, iv: number, level: number): number {
    return Math.floor(((2 * base + iv) * level) / 100) + 5
}

/** Les 5 stats absolues d'une instance. */
export function fullStats(
    inst: Pick<MonInstance, "level" | "ivs">,
    species: SpeciesData,
): Record<StatKey, number> {
    const lv = inst.level
    return {
        hp: maxHp(species, lv, inst.ivs.hp),
        atk: computeStat(species.baseStats.atk, inst.ivs.atk, lv),
        def: computeStat(species.baseStats.def, inst.ivs.def, lv),
        spe: computeStat(species.baseStats.spe, inst.ivs.spe, lv),
        spc: computeStat(species.baseStats.spc, inst.ivs.spc, lv),
    }
}

// ============================================================
// Multiplicateurs de stages (-6..+6)
// ============================================================

export function stageMultiplier(stage: number): number {
    const s = clampStage(stage)
    return s >= 0 ? (2 + s) / 2 : 2 / (2 - s)
}

/** Précision/esquive : table de fractions distincte (base 3/3). */
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

/** Attaque effective : base × stage, halvée par brûlure (Atq) / paralysie (Vit). */
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
