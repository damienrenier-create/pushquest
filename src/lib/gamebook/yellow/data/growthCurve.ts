// src/lib/gamebook/yellow/data/growthCurve.ts
//
// Nexus Jaune Éclair — COURBE DE PROGRESSION PAR ESPÈCE.
// On NE modifie PAS l'XP gagnée : on multiplie l'XP NÉCESSAIRE pour monter de niveau
// selon la PUISSANCE de la lignée (BST du stade FINAL), pas la rareté. Un commun qui
// évolue en colosse (ex. Mottoche → Mégalithe 535) est donc lent ; un rare qui finit
// faible est rapide. Calé sur la Gen 1 : le plus lent ne demande que ~1.56× le plus
// rapide (Lent 1 250 000 / Rapide 800 000 pour atteindre le niveau 100).
//
// EXCEPTION `growthByStage` : pour les lignées à très gros écart base→final (lignée golem
// Mottoche→Mégalithe), le palier suit le BST du STADE COURANT — on monte vite quand on est
// petit, le grind n'arrive qu'au sommet. La courbe rebascule à chaque évolution qui change
// de palier (le Daemon garde son niveau ; sa barre vers le niveau suivant se recale).
//
// FUTURE-PROOF : tout nouveau Daemon est classé automatiquement (BST final, ou courant si
// `growthByStage`) ; le `fallback` "solide" garantit qu'aucune espèce inconnue ne casse le calcul.

import { SPECIES } from "./species"
import type { SpeciesData } from "../battle/types"

export type GrowthTier = "colossal" | "puissant" | "solide" | "modeste" | "frele"

export interface GrowthInfo {
    tier: GrowthTier
    mult: number
    /** BST réellement utilisé pour le palier : stade courant si `growthByStage`, sinon stade final. */
    bst: number
    exclusive: boolean
    /** true si l'espèce utilise la courbe par stade courant (cf. growthByStage). */
    byStage: boolean
}

/** Multiplicateur d'XP NÉCESSAIRE par palier (×1.0 = la courbe historique). */
const TIER_MULT: Record<GrowthTier, number> = {
    colossal: 1.25, // BST final ≥ 500 — les golems Roche/Sol (→535) : le plus lent
    puissant: 1.1, //  BST final 460-499 — dragons, Orcaline, Sylvebarbe…
    solide: 1.0, //    BST final 435-459 — la norme (= courbe d'avant)
    modeste: 0.9, //   BST final 400-434 — la majorité
    frele: 0.8, //     BST final < 400 — Panthéon, lignée Hibouh : le plus rapide
}

/** Plancher des Daemons EXCLUSIFS (offerts/uniques) : jamais plus rapide que ×1.10.
 *  Mais le BST peut pousser plus haut → un exclusif colossal (Goshendofy 590) prend ×1.25. */
const EXCLUSIVE_FLOOR = 1.1

/** OVERRIDE de courbe par ESPÈCE (prime sur le tier-BST) — pour les « late-bloomers » voulus dont le BST ne reflète
 *  pas la lenteur souhaitée. Ex. Jerbiwat (BST 435 = "solide") est un canon psy tardif → forcé à ×1.25 (= colosses). */
const GROWTH_MULT_OVERRIDE: Record<string, number> = {
    jerbiwat: 1.25,
    // LIGNÉES SIGNATURES DES 3 CLANS (Chapelle de Nouillon) — même BST (455) mais courbes distinctes.
    // Air (picidés) = ×0.8 rapide ; Roche (pandas) = ×1.25 lente. Combat (lapins) = ×1.0 → défaut (pas d'override).
    pivinci: 0.8, vengbec: 0.8, picassault: 0.8,
    fujipanda: 1.25, kilipanda: 1.25, pandapurna: 1.25,
}

/** Tier correspondant à un multiplicateur (reverse-lookup pour le libellé d'une espèce à courbe forcée). */
function tierFromMult(m: number): GrowthTier {
    return (Object.keys(TIER_MULT) as GrowthTier[]).find((t) => TIER_MULT[t] === m) ?? "solide"
}

function bstOf(sp: SpeciesData): number {
    const b = sp.baseStats
    return b.hp + b.atk + b.def + b.spe + b.spc
}

/** BST du STADE FINAL de la lignée (suit evolution.toId jusqu'au bout ; garde-fou anti-boucle). */
function finalBst(sp: SpeciesData): number {
    let cur: SpeciesData | undefined = sp
    const seen = new Set<string>()
    while (cur?.evolution?.toId && SPECIES[cur.evolution.toId] && !seen.has(cur.id)) {
        seen.add(cur.id)
        cur = SPECIES[cur.evolution.toId]
    }
    return bstOf(cur ?? sp)
}

function tierFromBst(fb: number): GrowthTier {
    if (fb >= 500) return "colossal"
    if (fb >= 460) return "puissant"
    if (fb >= 435) return "solide"
    if (fb >= 400) return "modeste"
    return "frele"
}

const CACHE = new Map<string, GrowthInfo>()

/** Infos de courbe d'une espèce (palier + multiplicateur + BST final + flag exclusif). Mémoïsé. */
export function growthInfo(speciesId: string): GrowthInfo {
    const hit = CACHE.get(speciesId)
    if (hit) return hit
    const sp = SPECIES[speciesId]
    if (!sp) {
        const fallback: GrowthInfo = { tier: "solide", mult: 1.0, bst: 0, exclusive: false, byStage: false }
        CACHE.set(speciesId, fallback)
        return fallback
    }
    const byStage = sp.growthByStage === true
    // Par stade courant (lignées golem) ou par stade final (défaut).
    const b = byStage ? bstOf(sp) : finalBst(sp)
    const exclusive = sp.exclusive === true
    // OVERRIDE par espèce (prime sur tout) → sinon tier-BST (+ plancher exclusif).
    const override = GROWTH_MULT_OVERRIDE[speciesId]
    const tier = override != null ? tierFromMult(override) : tierFromBst(b)
    const mult = override ?? (exclusive ? Math.max(EXCLUSIVE_FLOOR, TIER_MULT[tier]) : TIER_MULT[tier])
    const info: GrowthInfo = { tier, mult, bst: b, exclusive, byStage }
    CACHE.set(speciesId, info)
    return info
}

/** Multiplicateur d'XP NÉCESSAIRE d'une espèce (1.0 si inconnue). */
export function growthMult(speciesId: string): number {
    return growthInfo(speciesId).mult
}

const TIER_LABEL: Record<GrowthTier, string> = {
    colossal: "Colossale (×1.25, très lente)",
    puissant: "Puissante (×1.10, lente)",
    solide: "Solide (×1.00, normale)",
    modeste: "Modeste (×0.90, rapide)",
    frele: "Frêle (×0.80, très rapide)",
}

/** Libellé FR de la courbe pour le Pokédex (reflète le multiplicateur RÉEL en jeu). */
export function growthLabel(speciesId: string): string {
    const info = growthInfo(speciesId)
    if (info.exclusive && info.tier !== "colossal") return "Exclusive (×1.10, lente)"
    return TIER_LABEL[info.tier]
}
