// src/lib/gamebook/yellow/data/fusionSpecies.ts
//
// FUSION DE DAEMONS — « Autel de la Chimère » (Nexus Jaune). MODULE PUR : calcule le profil d'une fusion de 2
// Daemons (génétique dominant/récessif sur 5 stats — Spéciale UNIQUE incluse —, typage stat-fidèle, nom mot-valise).
// AUCUN store, AUCUNE écriture save, AUCUNE touche au moteur → 100 % testable et réutilisable. La construction du
// BattleMon éphémère + la salle + le PvP viennent brancher CE module.
//
// Règles FIGÉES (décisions Sartay, MAJ 04/08 : 3 dominantes / 2 récessives sur les 5 stats, Spéciale incluse) :
//   • Stats (5 : hp/atk/déf/vit/spc) : sur chaque parent, classer ses 5 stats → 3 hautes DOMINANTES (×0,6), 2 basses
//     RÉCESSIVES (×0,45). fusion[s] = poidsA·A[s] + poidsB·B[s] pour TOUTES les stats (Spéciale comprise). Dom+dom
//     = 120 % (peut DÉPASSER les parents), dom+réc = 105 %, réc+réc = 90 %. Départage déterministe (hp>atk>déf>vit>spc).
//   • Spéciale : UNE seule (offense = défense), soumise à la MÊME génétique 3/2 que les 4 autres (plus de split SpA/SpD).
//   • Niveau = max(parents). Les stats reçues sont les stats FINALES réelles (le module est agnostique base/finale).
//   • Types (RÈGLE Sartay) : UN type de CHAQUE parent = pour chaque parent, son type le plus fidèle à ses GROSSES
//     STATS (stat-représentative du type). JAMAIS 2 types d'un parent + 0 de l'autre. Si les deux parents pointent
//     vers le MÊME type (partagé), on garde ce type commun + le 2e type le plus stat-fidèle du couple (reste bi-type ;
//     le type partagé représente déjà les DEUX parents). Mono uniquement si aucun autre type dispo.
//   • Nom : 1re moitié du nom du 1er parent (dominant) + « - » + 2e moitié du 2e.

import { SPECIES } from "./species"
import type { PokeType, StatKey } from "../battle/types"

/** Un parent de fusion : stats FINALES (leveled) en usage réel — base en test. `types[0]` = type primaire. */
export interface FusionParent {
    name: string
    types: readonly PokeType[]
    stats: Readonly<Record<StatKey, number>>
    level: number
    moves: readonly string[]   // ids des attaques ACTUELLES du parent (ordre = slots 1..4)
    heldItem?: string          // objet tenu (id) — le fusionné hérite de ceux de ses parents
    speciesId?: string         // id d'espèce — sert aux FUSIONS SPÉCIALES + synergies (panthères, mimimoy). Optionnel (repli : génétique normale).
    shiny?: boolean            // parent SHINY — si les DEUX parents sont shiny → génétique 0.8/0.6 + fusion dorée.
}

/** Bloc de stats du fusionné : 5 stats classiques (une SEULE Spéciale, comme tout Daemon — pas de split SpA/SpD). */
export interface FusionStats { hp: number; atk: number; def: number; spe: number; spc: number }

export interface FusionResult {
    name: string
    types: PokeType[]
    stats: FusionStats
    level: number
    moves: string[]            // 2 premières du parent rapide + 2 dernières du lent (dédup, complété à 4)
    heldItems: string[]        // 0, 1 ou 2 objets tenus hérités des parents (le fusionné peut en tenir DEUX)
    parents: [string, string]
}

/** Le parent « rapide » puis le « lent » (par vitesse ; égalité départagée par la spc la plus haute → intrinsèque,
 *  indépendant de l'ordre). Sert au MOVESET (2 premières du rapide + 2 dernières du lent). */
export function bySpeed(a: FusionParent, b: FusionParent): [FusionParent, FusionParent] {
    const aFast = a.stats.spe > b.stats.spe || (a.stats.spe === b.stats.spe && a.stats.spc >= b.stats.spc)
    return aFast ? [a, b] : [b, a]
}

// Les 5 stats soumises à la génétique dom/récessif — Spéciale INCLUSE dans le classement (choix Sartay 04/08).
const STATS5: readonly StatKey[] = ["hp", "atk", "def", "spe", "spc"]

// ═══════ FUSIONS SPÉCIALES & SYNERGIES (07/08) — génétique BOOSTÉE + types forcés ═══════
/** Poids (dominant, récessif) par TIER de génétique. normal = base ; boosted = paires/synergies ; shiny = 2 shiny. */
export type FusionWeightMode = "normal" | "boosted" | "shiny" | "all"
const WEIGHTS: Record<Exclude<FusionWeightMode, "all">, [number, number]> = {
    normal: [0.6, 0.45], boosted: [0.7, 0.5], shiny: [0.8, 0.6],
}
/** Les 6 PANTHÈRES évoluées : fusionner DEUX d'entre elles = synergie boostée. (Panthéon-base exclu, choix Sartay.) */
const PANTHERE_IDS: ReadonlySet<string> = new Set(["florapanthe", "panthegel", "pyropanthe", "ombrapanthe", "aquapanthe", "voltapanthe"])
const MIMIMOY_ID = "mimimoy" // parent Mimimoy → TOUTES ses stats à 0,7 (révèle son potentiel aux croisements)
/** Clé de paire indépendante de l'ordre. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
/** Paires de SYNERGIE (boost only, nom auto conservé). */
const SYNERGY_PAIRS: ReadonlySet<string> = new Set([pairKey("merorem", "tonytony")]) // piliers casino
interface SpecialFusion { name: string; forcedType?: PokeType }
/** Fusions INÉDITES nommées (nom curé + éventuel type MONO forcé). Toutes boostées (0,7/0,5). */
const SPECIAL_FUSION_PAIRS: Record<string, SpecialFusion> = {
    [pairKey("sylvapuce", "pyrokoss")]: { name: "Cendrecerf", forcedType: "TENEBRES" }, // plante × feu → charbon
    [pairKey("sylvapuce", "razmaree")]: { name: "Bourbicerf", forcedType: "SOL" },       // plante × eau → boue
    [pairKey("pyrokoss", "razmaree")]: { name: "Vaporêve", forcedType: "SPECTRE" },      // feu × eau → nuage
    [pairKey("crocavern", "alirocaillus")]: { name: "Crocaroc" },                         // croisement des crocos (type calculé)
}
/** Fusion INÉDITE nommée pour cette paire de parents (ordre indifférent), ou null. */
export function specialFusionFor(a: FusionParent, b: FusionParent): SpecialFusion | null {
    if (!a.speciesId || !b.speciesId) return null
    return SPECIAL_FUSION_PAIRS[pairKey(a.speciesId, b.speciesId)] ?? null
}
/** Génétique BOOSTÉE (0,7/0,5) ? = fusion inédite nommée OU 2 panthères OU paire de synergie. */
function isBoostedFusion(a: FusionParent, b: FusionParent): boolean {
    if (specialFusionFor(a, b)) return true
    if (!a.speciesId || !b.speciesId) return false
    if (PANTHERE_IDS.has(a.speciesId) && PANTHERE_IDS.has(b.speciesId)) return true
    return SYNERGY_PAIRS.has(pairKey(a.speciesId, b.speciesId))
}
/** La fusion est-elle DORÉE (2 parents shiny → tier max 0,8/0,6) ? */
export function isShinyFusion(a: FusionParent, b: FusionParent): boolean {
    return !!a.shiny && !!b.shiny
}

/** Poids par stat pour un parent selon le `mode` : "all" (Mimimoy) = 0,7 partout ; sinon 3 plus HAUTES = hi,
 *  2 plus basses = lo (hi/lo selon le tier). Égalité départagée par l'ordre fixe hp>atk>déf>vit>spé (déterministe). */
export function fusionWeights(stats: Readonly<Record<StatKey, number>>, mode: FusionWeightMode = "normal"): Record<string, number> {
    if (mode === "all") { const w: Record<string, number> = {}; for (const k of STATS5) w[k] = 0.7; return w }
    const [hi, lo] = WEIGHTS[mode]
    const order = [...STATS5].sort((a, b) => stats[b] - stats[a] || STATS5.indexOf(a) - STATS5.indexOf(b))
    const w: Record<string, number> = {}
    order.forEach((k, i) => (w[k] = i < 3 ? hi : lo))
    return w
}

/** Génétique des 5 stats (Spéciale COMPRISE) : chaque stat du fusionné = poids_A × parentA + poids_B × parentB, où
 *  le poids vaut 0,6 si la stat est parmi les 3 plus hautes du parent, 0,45 sinon. Une stat dominante des DEUX côtés
 *  atteint 1,2 (peut dépasser les deux parents). Totalement INDÉPENDANT de l'ordre des parents (PvP déterministe). */
export function fuseStats(a: FusionParent, b: FusionParent): FusionStats {
    // Tier de la fusion : 2 shiny (0,8/0,6) > inédite/synergie (0,7/0,5) > normal (0,6/0,45). Mimimoy = 0,7 partout (par parent).
    const tier: FusionWeightMode = isShinyFusion(a, b) ? "shiny" : isBoostedFusion(a, b) ? "boosted" : "normal"
    const modeFor = (p: FusionParent): FusionWeightMode => (p.speciesId === MIMIMOY_ID ? "all" : tier)
    const wA = fusionWeights(a.stats, modeFor(a)), wB = fusionWeights(b.stats, modeFor(b))
    const s = (k: StatKey) => Math.round(wA[k] * a.stats[k] + wB[k] * b.stats[k])
    return { hp: s("hp"), atk: s("atk"), def: s("def"), spe: s("spe"), spc: s("spc") }
}

/** Moveset : 2 PREMIÈRES attaques du parent le plus RAPIDE + 2 DERNIÈRES du plus LENT. Dédup (pas de doublon) ;
 *  si le dédup laisse < 4 slots, on complète par les attaques restantes (rapide puis lent) jusqu'à 4 max. */
export function fuseMoves(a: FusionParent, b: FusionParent): string[] {
    const [fast, slow] = bySpeed(a, b)
    const out: string[] = []
    const add = (id: string) => { if (id && out.length < 4 && !out.includes(id)) out.push(id) }
    fast.moves.slice(0, 2).forEach(add)
    slow.moves.slice(-2).forEach(add)
    fast.moves.forEach(add); slow.moves.forEach(add) // complète si le dédup a laissé < 4
    return out
}

/** Objets tenus hérités : le fusionné porte les objets NON VIDES de ses parents (0, 1 ou 2 → il peut en tenir DEUX).
 *  ⚠️ L'APPLICATION de 2 objets en combat est une capacité moteur à ajouter (Inc.1+) — ici on ne fait que la liste. */
export function fuseHeldItems(a: FusionParent, b: FusionParent): string[] {
    return [a.heldItem, b.heldItem].filter((x): x is string => !!x)
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

/** Valeur du fusionné pour la stat représentative d'un type (spc = la Spéciale unique du fusionné). */
function repValue(type: PokeType, fused: FusionStats): number {
    const r = typeRepStat()[type] ?? "atk"
    return fused[r]
}

/** Type le plus fidèle aux GROSSES STATS d'un parent (repValue max sur ses propres types ; égalité → ordre du tableau reçu). */
function bestType(types: readonly PokeType[], fused: FusionStats): PokeType {
    const arr = [...new Set(types)]
    if (arr.length === 0) return "NORMAL" // défensif : un parent a TOUJOURS ≥1 type (garanti par les données) → évite un undefined
    return arr.reduce((best, t) => (repValue(t, fused) > repValue(best, fused) ? t : best), arr[0])
}

/** Typage du fusionné (RÈGLE Sartay) : UN type de CHAQUE parent = son type le plus stat-fidèle. JAMAIS 2 types
 *  d'un parent + 0 de l'autre. Si les deux parents pointent vers le MÊME type S (partagé), on garde S + le 2e type
 *  le plus stat-fidèle du couple (reste bi-type ; S représente déjà les DEUX parents → aucun parent à 0). Mono
 *  uniquement si aucun autre type. types[0] = type du parent TÊTE (a) ; ordre cosmétique (STAB agnostique à l'ordre).
 *  Le SET de types est INDÉPENDANT de l'ordre des parents (PvP déterministe) : dans la branche partagée, les types
 *  sont départagés (égalités de repValue) via un ordre CANONIQUE des parents (par nom), pas via l'ordre d'appel. */
export function fuseTypes(a: FusionParent, b: FusionParent, fused: FusionStats): PokeType[] {
    const aType = bestType(a.types, fused)
    const bType = bestType(b.types, fused)
    if (aType !== bType) return [aType, bType] // 1 type distinct de chaque parent (SET déjà indépendant de l'ordre)
    // Type partagé S : S + le meilleur AUTRE type. Parents classés par NOM (canonique) → le départage des égalités de
    // repValue ne dépend PAS de l'ordre d'appel → SET stable (déterministe pour le PvP + identité Fusiodex).
    const [p1, p2] = a.name <= b.name ? [a, b] : [b, a]
    const others = [...new Set([...p1.types, ...p2.types])].filter((t) => t !== aType)
    return others.length ? [aType, bestType(others, fused)] : [aType]
}

/** Nom mot-valise : 1re moitié du 1er parent (dominant) + « - » + 2e moitié du 2e. Simple, déterministe, cosmétique. */
export function fusionName(a: FusionParent, b: FusionParent): string {
    const head = a.name.slice(0, Math.ceil(a.name.length / 2))
    const tail = b.name.slice(Math.floor(b.name.length / 2))
    return `${head}-${tail}`
}

/** Calcule le profil complet de la fusion de A (dominant/tête) et B. Pur. Applique les FUSIONS INÉDITES
 *  (nom curé + type MONO forcé) ; les stats intègrent déjà les tiers boostés (fuseStats). */
export function computeFusion(a: FusionParent, b: FusionParent): FusionResult {
    const stats = fuseStats(a, b)
    const special = specialFusionFor(a, b)
    return {
        name: special?.name ?? fusionName(a, b),
        types: special?.forcedType ? [special.forcedType] : fuseTypes(a, b, stats),
        stats,
        level: Math.max(a.level, b.level),
        moves: fuseMoves(a, b),
        heldItems: fuseHeldItems(a, b),
        parents: [a.name, b.name],
    }
}
