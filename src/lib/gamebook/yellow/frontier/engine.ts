// src/lib/gamebook/yellow/frontier/engine.ts
//
// ZONE DE COMBAT (Battle Frontier) — cœur déterministe, réutilisable par les 3 salles
// (Tour / Usine / Dôme). PURE LOGIC : génération d'adversaires (par tier BST, RNG seedé),
// règles de niveau, remboursement d'énergie, récompense en Jetons de Combat (JC), cadence des boss.
// Cf. GDD : Documents/PushQuest-Pokedex/GDD-ZoneDeCombat.md. Aucune dépendance map/UI/save ici.

import { SPECIES } from "../data/species"
import { baseSpeciesOf, speciesAtLevel } from "../data/ace"
import type { Rng } from "../battle/rng"

// ============================================================
// Types & constantes
// ============================================================
export type FrontierMode = "TOWER" | "FACTORY" | "DOME"
/** Règle de niveau choisie par le joueur (les 3 dispos dans chaque salle). */
export type LevelRule = "L50" | "L100" | "ADAPT"
/** Spécification d'un Daemon adverse (le moteur de combat en fera une instance). */
export interface OpponentSpec { speciesId: string; level: number }

export const BOSS_EVERY = 7            // un boss (Cerveau) tous les 7 combats (Tour)
export const DEFAULT_TEAM_SIZE = 3     // équipes de 3 (cohérent ACE/Ligue)

// Remboursement d'énergie : croissant avec l'énergie dépensée, de 10 % à 100 % (paliers de 10).
export const E_REF = 60                // énergie de référence d'un "gros" combat 3v3 (à calibrer)

// Jetons de Combat par victoire selon le mode (multiplicateur croissant 50 < ADAPT < 100).
export const JC_PER_WIN: Record<LevelRule, number> = { L50: 2, ADAPT: 3, L100: 4 }
export const JC_BOSS_MULT = 5          // un boss rapporte ×5

// Les 5 Daemons "uniques" jamais tirés aléatoirement (bosses dédiés / scénario).
//  → on s'appuie sur le flag `exclusive` des données (goshendofy, gekroc, orcaline, sylvebarbe, tonytony).

// ============================================================
// Niveau effectif
// ============================================================
/** Résout le niveau de combat selon la règle choisie. ADAPT = niveau du Daemon le plus haut du joueur. */
export function resolveFrontierLevel(rule: LevelRule, playerTopLevel: number): number {
    if (rule === "L50") return 50
    if (rule === "L100") return 100
    const lvl = Math.floor(playerTopLevel) || 50
    return Math.max(5, Math.min(100, lvl))
}

// ============================================================
// Génération d'adversaires (par tier BST, indexée sur la série)
// ============================================================
function bstOf(id: string): number {
    const s = SPECIES[id] as any
    if (!s) return 0
    const b = s.baseStats
    return b.hp + b.atk + b.def + b.spe + b.spc
}

/** Bande de BST autorisée selon la série (la difficulté monte avec le streak). */
export function bstBandForStreak(streak: number): [number, number] {
    if (streak <= 6) return [250, 400]
    if (streak <= 13) return [350, 460]
    if (streak <= 27) return [400, 520]
    return [460, 590]
}

// Cache des "formes existant au niveau L" (forme = stade d'évolution atteint à ce niveau).
const _formsCache = new Map<number, string[]>()
function formsAtLevel(level: number): string[] {
    const hit = _formsCache.get(level)
    if (hit) return hit
    const set = new Set<string>()
    for (const id of Object.keys(SPECIES)) set.add(speciesAtLevel(baseSpeciesOf(id), level))
    const arr = [...set]
    _formsCache.set(level, arr)
    return arr
}

function pickDistinct(rng: Rng, pool: string[], n: number): string[] {
    const arr = [...pool]
    const out: string[] = []
    for (let i = 0; i < n && arr.length > 0; i++) {
        const idx = rng.int(0, arr.length - 1)
        out.push(arr.splice(idx, 1)[0])
    }
    return out
}

interface GenOpts { streak: number; level: number; size?: number; boss?: boolean }

/** Génère une équipe adverse déterministe (RNG seedé) : espèces DISTINCTES, au bon stade pour le niveau,
 *  filtrées par la bande de BST de la série. Les Daemons `exclusive` ne sont jamais tirés. */
export function generateFrontierTeam(rng: Rng, opts: GenOpts): OpponentSpec[] {
    const size = opts.size ?? DEFAULT_TEAM_SIZE
    const level = opts.level
    let [lo, hi] = bstBandForStreak(opts.streak)
    if (opts.boss) { lo = Math.max(470, lo); hi = 999 } // boss = haut du panier

    const eligible = formsAtLevel(level).filter((id) => {
        const s = SPECIES[id] as any
        return s && !s.exclusive
    })
    let pool = eligible.filter((id) => { const b = bstOf(id); return b >= lo && b <= hi })

    // Élargit la bande si trop peu de candidats (garantit toujours assez d'espèces distinctes).
    let guard = 0
    while (pool.length < size && guard < 8) {
        lo -= 40; hi += 40
        pool = eligible.filter((id) => { const b = bstOf(id); return b >= lo && b <= hi })
        guard++
    }
    if (pool.length < size) pool = eligible // filet ultime

    return pickDistinct(rng, pool, size).map((speciesId) => ({ speciesId, level }))
}

/** Équipe de boss (Cerveau) : même moteur, bande relevée. */
export function generateBossTeam(rng: Rng, streak: number, level: number, size = DEFAULT_TEAM_SIZE): OpponentSpec[] {
    return generateFrontierTeam(rng, { streak, level, size, boss: true })
}

// ============================================================
// Cadence des boss
// ============================================================
/** Vrai si la N-ième victoire correspond à un combat de boss (Cerveau). */
export function isBossWave(winNumber: number): boolean {
    return winNumber > 0 && winNumber % BOSS_EVERY === 0
}

// ============================================================
// Remboursement d'énergie (à la VICTOIRE uniquement)
// ============================================================
/** % d'énergie remboursée : croît avec l'énergie dépensée, de 10 % à 100 %, arrondi aux paliers de 10. */
export function frontierRefundPct(energySpent: number): number {
    const e = Math.max(0, energySpent)
    const raw = 10 + 90 * Math.min(1, e / E_REF)
    const rounded = Math.round(raw / 10) * 10
    return Math.max(10, Math.min(100, rounded))
}
/** Quantité d'énergie rendue à la victoire (0 à la défaite — géré par l'appelant). */
export function frontierEnergyRefund(energySpent: number): number {
    return Math.floor(Math.max(0, energySpent) * frontierRefundPct(energySpent) / 100)
}
/** Coût net d'énergie après remboursement de victoire. */
export function frontierNetEnergyCost(energySpent: number): number {
    return Math.max(0, energySpent) - frontierEnergyRefund(energySpent)
}

// ============================================================
// Récompense en Jetons de Combat
// ============================================================
/** JC gagnés pour la N-ième victoire d'une série, selon le mode (boss = ×5). */
export function jcRewardForWin(rule: LevelRule, winNumber: number): number {
    const base = JC_PER_WIN[rule] ?? JC_PER_WIN.L50
    return isBossWave(winNumber) ? base * JC_BOSS_MULT : base
}
