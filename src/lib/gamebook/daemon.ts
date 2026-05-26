// src/lib/gamebook/daemon.ts
//
// v4.0 — Helpers pour le système Daemon (refactor du tamagotchi vers équipe 1-N).
//
// Cohabite avec le système tamagotchi (Json dans GamebookProgress) pendant la migration
// progressive Phase 1.A-D. Les anciennes routes /api/gamebook/tamagotchi/* restent
// fonctionnelles. Les nouvelles routes /api/gamebook/daemon/* seront ajoutées en Phase 1.B.

import prisma from "@/lib/prisma"

// ============================================================
// Types
// ============================================================

export type DaemonType =
    | "Normal"        // au départ pour tous
    | "Feu" | "Eau" | "Plante"  // évolutions par pierres (post-Pastagone)
    | "Electrique" | "Vol" | "Psy"  // animaux orphelins du boss Pastagone
    | "Pate"  // Bolognion (créature mutante)
    | "Combat" | "Roche"  // animaux du rival CAPOLINO + futurs ennemis

export type Morphology = "crocs" | "bec" | "insecte" | "pattes" | "ecailles"

export interface DaemonBaseStats {
    force: number
    vitesse: number
    defense: number
    intelligence: number
    endurance: number
}

// ============================================================
// Cap constants
// ============================================================
export const DAEMON_STAT_MIN = 25
export const DAEMON_STAT_MAX = 100
export const DAEMON_BONUS_MAX = 80
export const DAEMON_LEVEL_MAX = 50
export const DAEMON_HAPPINESS_MAX = 100

// ============================================================
// Morphologie depuis level XP_ANIMALS
// ============================================================
/**
 * Mappe un level XP (1-100) sur une des 5 morphologies pour les variantes d'attaques.
 * Permet d'afficher "Morsure" pour les chiens, "Picpic" pour les oiseaux, etc.
 */
export function getMorphology(speciesLevel: number): Morphology {
    const l = Math.max(1, Math.min(100, Math.floor(speciesLevel)))
    // Insectes / arachnides (L1-L8)
    if (l <= 8) return "insecte"
    // Amphibiens / reptiles aquatiques (L9-L15)
    if (l <= 15) return "ecailles"
    // Oiseaux rapaces / chouettes (L16-L22)
    if (l <= 22) return "bec"
    // Carnivores à crocs (renards, loups, félins, hyènes...)
    if (l === 23 || (l >= 36 && l <= 53)) return "crocs"
    // Petits mammifères, marsupiaux, etc. (L24-L35 + grands singes 54-56)
    if ((l >= 24 && l <= 35) || (l >= 54 && l <= 56)) return "pattes"
    // Oiseaux atypiques (autruche, pélican, albatros, manchot)
    if (l >= 57 && l <= 60) return "bec"
    // Panda géant
    if (l === 61) return "pattes"
    // Reptiles + marins (serpents, tortues, crocodiles, requins, baleines...)
    if (l >= 62 && l <= 80) return "ecailles"
    // Grands mammifères (rhino, éléphant, girafe...)
    if (l >= 81 && l <= 90) return "pattes"
    // Mythiques (dragon, kraken, phoenix) → crocs par défaut
    return "crocs"
}

// ============================================================
// Stats de base : héritées des datas réelles du joueur (PushQuest)
// ============================================================
/**
 * Calcule les 5 stats de base du Daemon depuis les datas réelles du joueur.
 *   Force        = clamp(25 + totalPushups/100, 25, 100)
 *   Vitesse      = clamp(25 + log10(totalSteps+1)*15, 25, 100)
 *   Défense      = clamp(25 + 2 × nombreDeDéfisValidés, 25, 100)
 *   Intelligence = clamp(25 + totalShopSpend/50, 25, 100)
 *   Endurance    = clamp(25 + totalPlankSeconds/60, 25, 100)
 *
 * Plancher 25 = nouveaux joueurs ne sont pas désavantagés.
 * Plafond 100 = power-users ne sont pas dégoutants pour les autres.
 */
export async function computeDaemonBaseStats(userId: string): Promise<DaemonBaseStats> {
    // Sommes des ExerciseSet all-time par exercice
    const sets = await prisma.exerciseSet.findMany({
        where: { userId },
        select: { exercise: true, reps: true },
    })
    let totalPushups = 0
    let totalPlankSeconds = 0
    for (const s of sets) {
        if (s.exercise === "PUSHUP") totalPushups += s.reps
        else if (s.exercise === "PLANK") totalPlankSeconds += s.reps
    }

    // GamebookProgress pour les défis validés + tracking datas
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: "map_v3" } },
    })

    const totalSteps = (progress as { totalGamebookSteps?: number })?.totalGamebookSteps ?? 0
    const totalShopSpend = (progress as { totalShopSpend?: number })?.totalShopSpend ?? 0

    // Compte les défis validés (~30 flags + compteurs)
    const defisCount = countDefisValidated(progress)

    return {
        force:        clampStat(25 + Math.floor(totalPushups / 100)),
        vitesse:      clampStat(25 + Math.floor(Math.log10(totalSteps + 1) * 15)),
        defense:      clampStat(25 + 2 * defisCount),
        intelligence: clampStat(25 + Math.floor(totalShopSpend / 50)),
        endurance:    clampStat(25 + Math.floor(totalPlankSeconds / 60)),
    }
}

function clampStat(value: number): number {
    return Math.max(DAEMON_STAT_MIN, Math.min(DAEMON_STAT_MAX, Math.floor(value)))
}

/**
 * Compte le nombre de défis validés (flags Boolean true + counts d'arrays) dans
 * GamebookProgress. Utilisé pour la stat Défense.
 */
export function countDefisValidated(progress: unknown): number {
    if (!progress || typeof progress !== "object") return 0
    const p = progress as Record<string, unknown>
    let count = 0
    const booleanFlags = [
        "piaffiniRescued", "firstSwimDone", "papaBoostClaimed", "nageurDefiCompleted",
        "bourgCasinoCoinsFound", "monsterCaveRevealed", "treeObstacleCleared",
        "pioneerBadgeAwarded", "franssJokeBirdDone", "montSummitReached",
        "tbBossBeaten", "tbRewardClaimed",
        "contestDefiPompatorDone", "contestDefiSquatilusDone", "contestDefiTiroirDone",
        "jardinierArrosoirGiven", "grassSudCutsceneShown", "ornithologueBirdBonusGiven",
        "treeBookGiven", "muscuvilleRocksPassed", "pereTalked",
    ]
    for (const flag of booleanFlags) {
        if (p[flag] === true) count++
    }
    // Compteurs d'arrays (jusqu'à N défis cumulables)
    const arrayFlags = [
        "muscuvilleChampionsBeaten", "muscuvilleChampionsRevanche",
        "tbBarDefisDone", "tbBossDefisDone", "treesDiscovered",
    ]
    for (const flag of arrayFlags) {
        if (Array.isArray(p[flag])) count += (p[flag] as unknown[]).length
    }
    return count
}

// ============================================================
// HP combat dérivé d'Endurance + combatLevel (formule Pokémon Gen 1 adaptée)
// ============================================================
export function computeMaxHp(endurance: number, combatLevel: number, bonusEnd: number = 0): number {
    // ((Base + 10) × 2 × Level / 100) + Level + 10 + Bonus
    const effectiveEnd = endurance + bonusEnd
    return Math.floor(((effectiveEnd + 10) * 2 * combatLevel) / 100) + combatLevel + 10 + bonusEnd
}

// ============================================================
// Multiplicateur bonheur (×0.5 à ×1.5)
// ============================================================
export function happinessMultiplier(happiness: number): number {
    const h = Math.max(0, Math.min(DAEMON_HAPPINESS_MAX, happiness))
    return 1 + (h - 50) / 100
}

// ============================================================
// Taux de coup critique (cap 35%)
//   Base 6.25% (1/16) + Intelligence/500 + Bonheur/1000
// ============================================================
export function computeCritRate(intelligence: number, happiness: number): number {
    const rate = 0.0625 + intelligence / 500 + happiness / 1000
    return Math.min(0.35, rate)
}

// ============================================================
// Seuil XP pour atteindre un niveau (Pokémon Gen 1 — Medium Fast)
// ============================================================
export function xpForLevel(level: number): number {
    return Math.pow(level, 3)
}

export function levelFromXp(xp: number): number {
    let lvl = 1
    while (lvl < DAEMON_LEVEL_MAX && xpForLevel(lvl + 1) <= xp) lvl++
    return lvl
}

// ============================================================
// Auto-migration : tamagotchi (Json) → Daemon row slot=1
// ============================================================
/**
 * Si le joueur a un tamagotchi (Json) mais PAS de Daemon en slot 1,
 * crée le Daemon depuis les données Json. Idempotent.
 *
 * Appelée au GET /api/gamebook/state pour migrer progressivement chaque joueur
 * sans qu'il ait à faire d'action manuelle.
 */
export async function ensureDaemonForTamagotchi(
    userId: string,
    progress: unknown,
): Promise<void> {
    const p = progress as { tamagotchi?: unknown } | null
    if (!p?.tamagotchi || typeof p.tamagotchi !== "object") return

    const tam = p.tamagotchi as {
        name?: string
        currentLevel?: number
        happiness?: number
        recovered?: boolean
        lastFedAt?: string
    }
    if (!tam.name || typeof tam.currentLevel !== "number") return

    // Y a-t-il déjà un Daemon en slot 1 ?
    const existing = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (existing) return

    // Calcul stats de base depuis datas réelles
    const baseStats = await computeDaemonBaseStats(userId)

    await (prisma as any).daemon.create({
        data: {
            userId,
            slotIndex: 1,
            name: tam.name,
            speciesLevel: Math.max(1, Math.min(100, tam.currentLevel)),
            type: "Normal",
            morphology: getMorphology(tam.currentLevel),
            combatLevel: 1,
            combatXp: 0,
            baseFor: baseStats.force,
            baseVit: baseStats.vitesse,
            baseDef: baseStats.defense,
            baseInt: baseStats.intelligence,
            baseEnd: baseStats.endurance,
            currentHp: computeMaxHp(baseStats.endurance, 1, 0),
            happiness: tam.happiness ?? 50,
            recovered: tam.recovered === true,
            attacksKnown: ["charge"],
            attacksEquipped: ["charge"],
            origin: "pastavegas",
            lastFedAt: tam.lastFedAt ? new Date(tam.lastFedAt) : null,
            // v4.0 Phase 1.D.bis — grandfather : les compagnons existants
            // (avant que l'arc Pastagone/sérum existe) restent déverrouillés.
            // Les NOUVEAUX animaux adoptés via le flux mafia (post-arc) auront
            // unlockedAt = null jusqu'à use-serum.
            unlockedAt: new Date(),
        },
    })
}
