// src/lib/gamebook/yellow/battle/stats.ts
//
// Nexus Jaune Éclair — calcul des stats (STRICT Gen 1 : 5 stats, IV/"DV" 0..15).
// Pas d'EV/Nature (volontaire, documenté). Le Spécial (spc) sert d'attaque ET de
// défense spéciale.

import type { SpeciesData, StatKey, StageKey, MonInstance, MajorStatus } from "./types"
import { allocatedBonus } from "../data/saiyanConfig"
import { evStatBonus } from "../data/evConfig"
import { heldStatMult } from "../data/heldItems"
import { talentSpeedMult } from "./talentEffects"

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
    inst: Pick<MonInstance, "level" | "ivs" | "allocated" | "ev" | "shiny" | "frozenStats" | "signatureItem"> & { speciesId?: string; heldItem?: string; heldItem2?: string; sigActive?: boolean },
    species: SpeciesData,
): Record<StatKey, number> {
    // STATS FIGÉES (Hall of Fame) : le champion combat avec ses stats EXACTES du sacre — aucun recalcul.
    if (inst.frozenStats) return { ...inst.frozenStats }
    const lv = inst.level
    const a = inst.allocated ?? {}
    const e = inst.ev ?? {}
    // SHINY = "un peu plus que parfait" : +10% sur CHAQUE stat finale (en plus des IV parfaits posés
    // au spawn). Choix de Sartay (flex assumé pour 7 joueurs) — appliqué ici → propage à maxHpOf + combat.
    const sh = (n: number) => (inst.shiny ? Math.floor(n * 1.1) : n)
    // OBJET TENU : multiplicateur de stat (signatures, ex. +20% Vit). Respecte le verrou d'espèce.
    // + TALENT Réflexes : ×Vitesse (folded dans hm.spe).
    const hm = { ...heldStatMult(inst) }
    const tsm = talentSpeedMult(inst)
    if (tsm !== 1) hm.spe = (hm.spe ?? 1) * tsm
    // ARTISANE — objet signature : PV TOUJOURS actif (per-combat) ; atk/def/spe/spc seulement si `sigActive` (jet PAR
    // TOUR, posé par le moteur). L'esquive (eva) n'est pas une base-stat → gérée dans accuracy.ts (incomingAccMult).
    const sig = inst.signatureItem
    if (sig && sig.stat !== "eva" && (sig.stat === "hp" || inst.sigActive === true)) {
        const k = sig.stat as StatKey
        hm[k] = (hm[k] ?? 1) * (1 + sig.pct / 100)
    }
    const it = (n: number, k: StatKey) => sh(Math.floor(n * (hm[k] ?? 1)))
    return {
        hp: it(maxHp(species, lv, inst.ivs.hp, e.hp ?? 0) + allocatedBonus("hp", a.hp ?? 0), "hp"),
        atk: it(computeStat(species.baseStats.atk, inst.ivs.atk, lv, e.atk ?? 0) + allocatedBonus("atk", a.atk ?? 0), "atk"),
        def: it(computeStat(species.baseStats.def, inst.ivs.def, lv, e.def ?? 0) + allocatedBonus("def", a.def ?? 0), "def"),
        spe: it(computeStat(species.baseStats.spe, inst.ivs.spe, lv, e.spe ?? 0) + allocatedBonus("spe", a.spe ?? 0), "spe"),
        spc: it(computeStat(species.baseStats.spc, inst.ivs.spc, lv, e.spc ?? 0) + allocatedBonus("spc", a.spc ?? 0), "spc"),
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
