// src/lib/gamebook/yellow/frontier/engine.ts
//
// ZONE DE COMBAT (Battle Frontier) — cœur déterministe, réutilisable par les 3 salles
// (Tour / Usine / Dôme). PURE LOGIC : génération d'adversaires (par tier BST, RNG seedé),
// règles de niveau, remboursement d'énergie, récompense en Jetons de Combat (JC), cadence des boss.
// Cf. GDD : Documents/PushQuest-Pokedex/GDD-ZoneDeCombat.md. Aucune dépendance map/UI/save ici.

import { SPECIES } from "../data/species"
import { baseSpeciesOf, speciesAtLevel } from "../data/ace"
import { typeMultiplier } from "../battle/typeChart"
import { POKE_TYPES, type PokeType } from "../battle/types"
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
export function bstOf(id: string): number {
    const s = SPECIES[id] as any
    if (!s) return 0
    const b = s.baseStats
    return b.hp + b.atk + b.def + b.spe + b.spc
}

/** Types qui frappent cette espèce en ×2 ou plus (faiblesses), calculés via la vraie table. */
export function weakTypesOf(speciesId: string): PokeType[] {
    const s = SPECIES[speciesId] as any
    if (!s) return []
    const out: PokeType[] = []
    for (const atk of POKE_TYPES) {
        let m = 1
        for (const d of s.types) m *= typeMultiplier(atk, d as PokeType)
        if (m >= 2) out.push(atk)
    }
    return out
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
export function formsAtLevel(level: number): string[] {
    const hit = _formsCache.get(level)
    if (hit) return hit
    const set = new Set<string>()
    for (const id of Object.keys(SPECIES)) set.add(speciesAtLevel(baseSpeciesOf(id), level))
    const arr = [...set]
    _formsCache.set(level, arr)
    return arr
}

/** Seuil de série (« hautes sphères ») à partir duquel les gardiens/boss run 2/3 (FRONTIER_UNLOCKS) apparaissent. */
export const FRONTIER_EXCLUSIVE_MIN_STREAK = 14

/** Daemons « boss-tier » (`exclusive`) rendus affrontables comme adversaires NORMAUX du frontier dans les hautes
 *  sphères : les GARDIENS Gékraise (Centrale run 2) & Gékosmic (Centrale run 3) + Merorem (casino NG+). Ukognos
 *  (légendaire) est à part (Cerveau thématique). Morrow n'a aucun flag → déjà éligible. Leur BST les place dans
 *  la bonne bande (bstBandForStreak). */
export const FRONTIER_UNLOCKS = new Set(["gekraise", "gekosmic", "merorem"])

/** Une espèce est-elle tirable comme adversaire du frontier à cette série ? Exclut les `exclusive` (bosses
 *  dédiés / scénario) SAUF FRONTIER_UNLOCKS (affrontables dans les hautes sphères). Choix Sartay : PLUS
 *  d'anti-spoiler — les inédits run 2/3 (runTwoOnly/runThreeOnly, NON-`exclusive`) sont visibles par TOUS
 *  (« montrer ce qu'ils ont raté »), simplement bornés par la bande de BST (les finals = hautes sphères). */
export function frontierEligible(id: string, streak: number): boolean {
    const s = SPECIES[id] as any
    if (!s) return false
    if (FRONTIER_UNLOCKS.has(id)) return streak >= FRONTIER_EXCLUSIVE_MIN_STREAK // gardiens/boss run2/3 : hautes sphères
    return !s.exclusive // tout le reste (dont runTwoOnly/runThreeOnly) : visible par tous, BST-bandé
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

interface GenOpts { streak: number; level: number; size?: number; boss?: boolean; avoid?: readonly string[] }

/** Génère une équipe adverse déterministe (RNG seedé) : espèces DISTINCTES, au bon stade pour le niveau,
 *  filtrées par la bande de BST de la série. Les Daemons `exclusive` ne sont jamais tirés. */
export function generateFrontierTeam(rng: Rng, opts: GenOpts): OpponentSpec[] {
    const size = opts.size ?? DEFAULT_TEAM_SIZE
    const level = opts.level
    let [lo, hi] = bstBandForStreak(opts.streak)
    if (opts.boss) { lo = Math.max(470, lo); hi = 999 } // boss = haut du panier

    const eligible = formsAtLevel(level).filter((id) => frontierEligible(id, opts.streak))
    let pool = eligible.filter((id) => { const b = bstOf(id); return b >= lo && b <= hi })

    // Élargit la bande si trop peu de candidats (garantit toujours assez d'espèces distinctes).
    let guard = 0
    while (pool.length < size && guard < 8) {
        lo -= 40; hi += 40
        pool = eligible.filter((id) => { const b = bstOf(id); return b >= lo && b <= hi })
        guard++
    }
    if (pool.length < size) pool = eligible // filet ultime

    // VARIÉTÉ : évite de recroiser une espèce des DERNIÈRES vagues — mais seulement si ça laisse assez
    // d'espèces distinctes (sinon on garde le pool complet plutôt que d'échouer).
    if (opts.avoid && opts.avoid.length) {
        const fresh = pool.filter((id) => !opts.avoid!.includes(id))
        if (fresh.length >= size) pool = fresh
    }

    return pickDistinct(rng, pool, size).map((speciesId) => ({ speciesId, level }))
}

/** Équipe de boss (Cerveau) : même moteur, bande relevée. */
export function generateBossTeam(rng: Rng, streak: number, level: number, size = DEFAULT_TEAM_SIZE, avoid?: readonly string[]): OpponentSpec[] {
    return generateFrontierTeam(rng, { streak, level, size, boss: true, avoid })
}

// ============================================================
// Cerveaux THÉMATIQUES : un Daemon EXCLUSIF en ace d'une équipe d'identité (avec parcimonie)
// ============================================================
export interface ThemedBoss { exclusiveId: string; name: string; themeTypes: PokeType[]; minStreak: number }

// Palier d'apparition calé sur le BST (cf. bstBandForStreak) ; Goshendofy réservé à la toute fin.
const THEMED_BOSSES: ThemedBoss[] = [
    { exclusiveId: "gekroc", name: "Cerveau Court-Circuit", themeTypes: ["ELEC", "SOL"], minStreak: 7 },     // BST 410
    { exclusiveId: "tonytony", name: "Cerveau Inébranlable", themeTypes: ["NORMAL", "PSY"], minStreak: 7 },   // BST 415 (mur)
    { exclusiveId: "orcaline", name: "Cerveau Polaire", themeTypes: ["GLACE", "EAU"], minStreak: 14 },        // BST 465
    { exclusiveId: "sylvebarbe", name: "Cerveau Sylvestre", themeTypes: ["PLANTE", "SOL"], minStreak: 14 },   // BST 490
    { exclusiveId: "ukognos", name: "Grand Cerveau Astral", themeTypes: ["FEE"], minStreak: 28 }, // BST 555 — légendaire run 2, très hautes sphères (visible par tous)
    { exclusiveId: "goshendofy", name: "Grand Cerveau Draconique", themeTypes: ["DRAGON", "VOL"], minStreak: 35 }, // BST 590 — la toute fin
]
/** % des boss qui mettent en vedette un Daemon exclusif (parcimonie : on les découvre peu à peu). */
export const THEMED_BOSS_CHANCE = 35

export interface BossWave { opponent: OpponentSpec[]; bossName?: string }

/** Équipe d'un Cerveau thématique : l'exclusif en ACE (envoyé en dernier) + coéquipiers DU THÈME,
 *  au bon stade/niveau, distincts, en privilégiant ceux qui RÉSISTENT à une faiblesse de l'ace. */
function buildThemedBossTeam(rng: Rng, tb: ThemedBoss, streak: number, level: number, size: number): OpponentSpec[] {
    const [lo, hi] = bstBandForStreak(streak)
    const aceWeak = weakTypesOf(tb.exclusiveId)
    const resistsAceWeak = (id: string): boolean => {
        const s = SPECIES[id] as any
        if (!s) return false
        for (const w of aceWeak) { let m = 1; for (const d of s.types) m *= typeMultiplier(w, d as PokeType); if (m < 1) return true }
        return false
    }
    const inBand = (id: string) => { const b = bstOf(id); return b >= lo - 60 && b <= hi + 60 }
    const themed = formsAtLevel(level).filter((id) => {
        const s = SPECIES[id] as any
        return frontierEligible(id, streak) && id !== tb.exclusiveId && inBand(id) && (s.types as string[]).some((t) => (tb.themeTypes as string[]).includes(t))
    })
    const mates: string[] = pickDistinct(rng, themed.filter(resistsAceWeak), size - 1) // priorité : couvre une faiblesse de l'ace
    if (mates.length < size - 1) mates.push(...pickDistinct(rng, themed.filter((x) => !mates.includes(x)), size - 1 - mates.length))
    if (mates.length < size - 1) { // filet : n'importe quelle espèce du palier
        const any = formsAtLevel(level).filter((id) => frontierEligible(id, streak) && id !== tb.exclusiveId && inBand(id) && !mates.includes(id))
        mates.push(...pickDistinct(rng, any, size - 1 - mates.length))
    }
    return [...mates.map((speciesId) => ({ speciesId, level })), { speciesId: tb.exclusiveId, level }] // ace en dernier
}

/** Vague de BOSS : ~THEMED_BOSS_CHANCE % du temps, un Cerveau thématique (ace exclusif éligible selon la série,
 *  équipe cohérente) ; sinon un boss générique (puissance brute). `bossName` = nom du Cerveau pour l'annonce. */
export function generateBossWave(rng: Rng, streak: number, level: number, size = DEFAULT_TEAM_SIZE, avoid?: readonly string[]): BossWave {
    const eligible = THEMED_BOSSES.filter((b) => streak >= b.minStreak && !!(SPECIES[b.exclusiveId]))
    if (eligible.length > 0 && rng.chance(THEMED_BOSS_CHANCE)) {
        const tb = eligible[rng.int(0, eligible.length - 1)]
        return { opponent: buildThemedBossTeam(rng, tb, streak, level, size), bossName: tb.name } // Cerveau thématique : équipe imposée (pas d'avoid)
    }
    return { opponent: generateBossTeam(rng, streak, level, size, avoid) }
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

/** Multiplicateur d'XP en Zone de Combat : 1/3 du normal (récompense réduite, anti-farm sans risque). */
export const FRONTIER_EXP_MULT = 1 / 3

// ============================================================
// Récompense en Jetons de Combat
// ============================================================
/** JC gagnés pour la N-ième victoire d'une série, selon le mode (boss = ×5). */
export function jcRewardForWin(rule: LevelRule, winNumber: number): number {
    const base = JC_PER_WIN[rule] ?? JC_PER_WIN.L50
    return isBossWave(winNumber) ? base * JC_BOSS_MULT : base
}
