// src/lib/gamebook/yellow/battle/stats.ts
//
// Nexus Jaune Éclair — calcul des stats (STRICT Gen 1 : 5 stats, IV/"DV" 0..15).
// Pas d'EV/Nature (volontaire, documenté). Le Spécial (spc) sert d'attaque ET de
// défense spéciale.

import type { SpeciesData, StatKey, StageKey, MonInstance, MajorStatus } from "./types"
import { allocatedBonus } from "../data/saiyanConfig"
import { evStatBonus } from "../data/evConfig"

// ============================================================
// Stats absolues (hors combat)
// ============================================================

/** PV max : floor(((2*Base + IV + ⌊EV/4⌋) * niveau) / 100) + niveau + 10. */
export function maxHp(species: SpeciesData, level: number, ivHp: number, evHp = 0): number {
    return Math.floor(((2 * species.baseStats.hp + ivHp + evStatBonus(evHp)) * level) / 100) + level + 10
}

/**
 * Autres stats : floor(((2*Base + IV) * niveau) / 100) + 5.
 * CHOIX DE GAME-DESIGN (assumé, pas un oubli) : le vrai Gen 1 fait 2*(Base + DV),
 * donc le DV y compte double. On garde 2*Base + IV (un IV pèse moitié moins) :
 * écart d'au plus ~niveau/13 sur une stat, négligeable pour 7 joueurs en prod.
 */
export function computeStat(base: number, iv: number, level: number, ev = 0): number {
    return Math.floor(((2 * base + iv + evStatBonus(ev)) * level) / 100) + 5
}

/** Les 5 stats absolues : Gen-1 (base+IV) + EV (⌊EV/4⌋, plafonné) + bonus Saiyan (à plat). */
export function fullStats(
    inst: Pick<MonInstance, "level" | "ivs" | "allocated" | "ev" | "shiny">,
    species: SpeciesData,
): Record<StatKey, number> {
    const lv = inst.level
    const a = inst.allocated ?? {}
    const e = inst.ev ?? {}
    // SHINY = "un peu plus que parfait" : +10% sur CHAQUE stat finale (en plus des IV parfaits posés
    // au spawn). Choix de Sartay (flex assumé pour 7 joueurs) — appliqué ici → propage à maxHpOf + combat.
    const sh = (n: number) => (inst.shiny ? Math.floor(n * 1.1) : n)
    return {
        hp: sh(maxHp(species, lv, inst.ivs.hp, e.hp ?? 0) + allocatedBonus("hp", a.hp ?? 0)),
        atk: sh(computeStat(species.baseStats.atk, inst.ivs.atk, lv, e.atk ?? 0) + allocatedBonus("atk", a.atk ?? 0)),
        def: sh(computeStat(species.baseStats.def, inst.ivs.def, lv, e.def ?? 0) + allocatedBonus("def", a.def ?? 0)),
        spe: sh(computeStat(species.baseStats.spe, inst.ivs.spe, lv, e.spe ?? 0) + allocatedBonus("spe", a.spe ?? 0)),
        spc: sh(computeStat(species.baseStats.spc, inst.ivs.spc, lv, e.spc ?? 0) + allocatedBonus("spc", a.spc ?? 0)),
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
    // CHOIX DE GAME-DESIGN (assumé) : paralysie = Vitesse ÷2. Le strict Gen 1 fait
    // ÷4 (25%) ; on garde ÷2 (valeur moderne) pour une paralysie moins punitive.
    if (key === "spe" && status === "PARALYSIS") v = Math.floor(v / 2)
    return Math.max(1, v)
}
