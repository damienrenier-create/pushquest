// src/lib/gamebook/yellow/data/fusionSpecies.ts
//
// FUSION DE DAEMONS — « Autel de la Chimère » (Nexus Jaune). MODULE PUR : calcule le profil d'une fusion de 2
// Daemons (génétique dominant/récessif, Spéciale scindée en SpA/SpD, typage stat-fidèle, nom mot-valise). AUCUN
// store, AUCUNE écriture save, AUCUNE touche au moteur → 100 % testable et réutilisable. La construction du
// BattleMon éphémère + la salle + le PvP viendront brancher CE module (Inc.1+).
//
// Règles FIGÉES (décisions Sartay, cf. spec) :
//   • Stats hp/atk/déf/vit : sur chaque parent, classer ses 4 stats (spc EXCLUE) → 2 hautes DOMINANTES (×0,6),
//     2 basses RÉCESSIVES (×0,4). fusion[s] = poidsA·A[s] + poidsB·B[s]. Dom+dom = 120 % (peut DÉPASSER les
//     parents), dom+réc = 100 %, réc+réc = 80 %. Départage déterministe (ordre hp>atk>déf>vit).
//   • Spéciale : SpA = spc du parent le plus RAPIDE, SpD = spc du plus LENT (valeurs pleines).
//   • Niveau = max(parents). Les stats reçues sont les stats FINALES réelles (le module est agnostique base/finale).
//   • Types : 2 mono → bi-type ; sinon garder les 2 types les plus fidèles aux plus grosses stats (table stat-
//     représentative par type, DIVERSIFIÉE = 2 dimensions distinctes ; un type spécial matche sur la SpA seule).
//   • Nom : 1re moitié du nom du 1er parent (dominant) + « - » + 2e moitié du 2e.

import { SPECIES } from "./species"
import type { PokeType, StatKey } from "../battle/types"

/** Un parent de fusion : stats FINALES (leveled) en usage réel — base en test. `types[0]` = type primaire. */
export interface FusionParent {
    name: string
    types: readonly PokeType[]
    stats: Readonly<Record<StatKey, number>>
    level: number
}

/** Bloc de stats « next-gen » du fusionné : la Spéciale unique est scindée en attaque (spcAtk) et défense (spcDef). */
export interface FusionStats { hp: number; atk: number; def: number; spe: number; spcAtk: number; spcDef: number }

export interface FusionResult {
    name: string
    types: PokeType[]
    stats: FusionStats
    level: number
    parents: [string, string]
}

// Les 4 stats soumises à la génétique dom/récessif (la spc est traitée à part par le split).
const STATS4: readonly StatKey[] = ["hp", "atk", "def", "spe"]

/** Poids par stat pour un parent : 2 plus hautes des 4 stats = 0,6 (dominantes), 2 plus basses = 0,4 (récessives).
 *  Égalité de valeur départagée par l'ordre fixe hp > atk > déf > vit (déterministe). */
export function fusionWeights(stats: Readonly<Record<StatKey, number>>): Record<string, number> {
    const order = [...STATS4].sort((a, b) => stats[b] - stats[a] || STATS4.indexOf(a) - STATS4.indexOf(b))
    const w: Record<string, number> = {}
    order.forEach((k, i) => (w[k] = i < 2 ? 0.6 : 0.4))
    return w
}

/** Génétique des 4 stats + split de la Spéciale par la vitesse (rapide → SpA, lent → SpD ; égalité → parent A). */
export function fuseStats(a: FusionParent, b: FusionParent): FusionStats {
    const wA = fusionWeights(a.stats), wB = fusionWeights(b.stats)
    const s = (k: StatKey) => Math.round(wA[k] * a.stats[k] + wB[k] * b.stats[k])
    const [fast, slow] = a.stats.spe >= b.stats.spe ? [a, b] : [b, a]
    return { hp: s("hp"), atk: s("atk"), def: s("def"), spe: s("spe"), spcAtk: fast.stats.spc, spcDef: slow.stats.spc }
}

/** Table stat-représentative par type = la stat où le type dépasse LE PLUS la moyenne globale du roster (le
 *  « caractère » du type). Calculée UNE fois depuis SPECIES (données statiques → déterministe), puis mémoïsée. */
let _repTable: Record<string, StatKey> | null = null
export function typeRepStat(): Record<string, StatKey> {
    if (_repTable) return _repTable
    const all = Object.values(SPECIES)
    const keys: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
    const global: Record<string, number> = {}
    for (const k of keys) global[k] = all.reduce((acc, m) => acc + m.baseStats[k], 0) / (all.length || 1)
    const rep: Record<string, StatKey> = {}
    for (const t of new Set(all.flatMap((m) => m.types))) {
        const mons = all.filter((m) => m.types.includes(t))
        let best: StatKey = "atk", bestRatio = -Infinity
        for (const k of keys) {
            const avg = mons.reduce((acc, m) => acc + m.baseStats[k], 0) / mons.length
            const ratio = global[k] > 0 ? avg / global[k] : 0
            if (ratio > bestRatio) { bestRatio = ratio; best = k }
        }
        rep[t] = best
    }
    _repTable = rep
    return rep
}

/** Valeur du fusionné pour la stat représentative d'un type (un type SPÉCIAL → SpA seule, décision Sartay). */
function repValue(type: PokeType, fused: FusionStats): number {
    const r = typeRepStat()[type] ?? "atk"
    return r === "spc" ? fused.spcAtk : fused[r]
}

/** Typage du fusionné : union dédupliquée des types parents ; si > 2, on garde les 2 les plus fidèles aux plus
 *  grosses stats, en DIVERSIFIANT (2 dimensions de stat distinctes → évite 2 types du même axe, ex. atk+atk). */
export function fuseTypes(a: FusionParent, b: FusionParent, fused: FusionStats): PokeType[] {
    const cand = [...new Set([...a.types, ...b.types])]
    if (cand.length <= 2) return cand
    const rep = typeRepStat()
    const scored = cand
        .map((t) => ({ t, rep: rep[t] ?? "atk", val: repValue(t, fused) }))
        .sort((x, y) => y.val - x.val || cand.indexOf(x.t) - cand.indexOf(y.t))
    const picked: typeof scored = []
    const usedReps = new Set<string>()
    for (const it of scored) { if (picked.length >= 2) break; if (usedReps.has(it.rep)) continue; picked.push(it); usedReps.add(it.rep) }
    for (const it of scored) { if (picked.length >= 2) break; if (!picked.includes(it)) picked.push(it) } // complète si < 2 dimensions
    return picked.slice(0, 2).map((it) => it.t)
}

/** Nom mot-valise : 1re moitié du 1er parent (dominant) + « - » + 2e moitié du 2e. Simple, déterministe, cosmétique. */
export function fusionName(a: FusionParent, b: FusionParent): string {
    const head = a.name.slice(0, Math.ceil(a.name.length / 2))
    const tail = b.name.slice(Math.floor(b.name.length / 2))
    return `${head}-${tail}`
}

/** Calcule le profil complet de la fusion de A (dominant/tête) et B. Pur. */
export function computeFusion(a: FusionParent, b: FusionParent): FusionResult {
    const stats = fuseStats(a, b)
    return {
        name: fusionName(a, b),
        types: fuseTypes(a, b, stats),
        stats,
        level: Math.max(a.level, b.level),
        parents: [a.name, b.name],
    }
}
