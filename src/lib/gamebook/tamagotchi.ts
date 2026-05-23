// src/lib/gamebook/tamagotchi.ts
//
// v3.14 — Tamagotchi adoptable chez le vétérinaire (V3T) de Macaron'île.
// v3.15 — Rework : le tamagotchi n'évolue plus via feedCount, il suit l'animal
// du bestiaire (lib/xp.ts) correspondant au level XP réel du joueur.
//
// Règles :
//   - Adoption : 50 reps, choix du nom. currentLevel = level XP actuel du joueur.
//   - Feed : 20 reps. Happiness +30 (clamp 100). currentLevel = max(stored, userLevel).
//   - Decay : -1 happiness toutes les 6h depuis lastFedAt. Plancher à 0 (jamais de mort).
//   - Si happiness > 0 (au moment du read) : currentLevel suit le level XP du joueur (catch-up).
//   - Si happiness == 0 : currentLevel reste figé à sa valeur stockée → le tamagotchi REFUSE D'ÉVOLUER.
//
// L'animal affiché (nom + emoji + ceinture) provient de getLevelDetails(currentLevel) côté view.
// Cf. lib/xp.ts pour la liste XP_ANIMALS (100 animaux).

export interface Tamagotchi {
    name: string
    adoptedAt: string       // ISO timestamp
    lastFedAt: string       // ISO timestamp
    happiness: number       // 0..100 (valeur stockée, AVANT decay)
    /** Level du tamagotchi : suit le level XP du joueur quand happy, figé quand sad. */
    currentLevel: number
}

// Constantes
export const TAMAGOTCHI_ADOPT_COST = 50
export const TAMAGOTCHI_FEED_COST = 20
export const TAMAGOTCHI_FEED_HAPPINESS_BOOST = 30
export const TAMAGOTCHI_HAPPINESS_MAX = 100
/** Heures entre chaque -1 de happiness. */
export const TAMAGOTCHI_DECAY_INTERVAL_HOURS = 6

/**
 * Parse défensif : accepte aussi l'ancien format v3.14 (stage, feedCount) qu'on ignore.
 * Si currentLevel est absent (ancien format), on retombe sur 1.
 */
export function parseTamagotchi(raw: unknown): Tamagotchi | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.name !== "string" || o.name.length === 0) return null
    if (typeof o.adoptedAt !== "string") return null
    if (typeof o.lastFedAt !== "string") return null
    const happinessRaw = typeof o.happiness === "number" && Number.isFinite(o.happiness) ? o.happiness : 0
    const currentLevelRaw = typeof o.currentLevel === "number" && Number.isFinite(o.currentLevel)
        ? o.currentLevel
        : 1
    return {
        name: o.name,
        adoptedAt: o.adoptedAt,
        lastFedAt: o.lastFedAt,
        happiness: Math.max(0, Math.min(TAMAGOTCHI_HAPPINESS_MAX, Math.floor(happinessRaw))),
        currentLevel: Math.max(1, Math.min(100, Math.floor(currentLevelRaw))),
    }
}

/**
 * Recalcule la happiness courante en appliquant le decay depuis lastFedAt.
 * Ne modifie pas le tamagotchi en DB — c'est une valeur dérivée à afficher.
 */
export function effectiveHappiness(tam: Tamagotchi, nowMs: number = Date.now()): number {
    const lastFedMs = new Date(tam.lastFedAt).getTime()
    if (!Number.isFinite(lastFedMs)) return tam.happiness
    const elapsedHours = Math.max(0, (nowMs - lastFedMs) / (1000 * 60 * 60))
    const decay = Math.floor(elapsedHours / TAMAGOTCHI_DECAY_INTERVAL_HOURS)
    return Math.max(0, tam.happiness - decay)
}

/**
 * v3.15 — Calcule le level "affiché" du tamagotchi :
 *   - si happy (effectiveHappiness > 0) : suit le level XP du joueur (catch-up vers le haut)
 *   - si sad (happiness == 0) : reste figé à currentLevel stocké
 */
export function effectiveLevel(tam: Tamagotchi, userLevel: number, nowMs: number = Date.now()): number {
    const hap = effectiveHappiness(tam, nowMs)
    if (hap > 0) {
        return Math.max(tam.currentLevel, Math.max(1, Math.min(100, Math.floor(userLevel))))
    }
    return tam.currentLevel
}

export interface TamagotchiView extends Tamagotchi {
    /** Happiness recalculée avec decay (à afficher au client). */
    displayHappiness: number
    /** Level affiché (catch-up XP si happy, sinon figé). */
    displayLevel: number
    /** True si le tamagotchi est gelé (happiness=0) → refuse d'évoluer. */
    isFrozen: boolean
}

/**
 * Vue prête à afficher (happiness + level recalculés).
 * Ne dépend pas de xp.ts pour rester côté client safe (l'animal est résolu côté UI).
 */
export function viewTamagotchi(tam: Tamagotchi, userLevel: number, nowMs: number = Date.now()): TamagotchiView {
    const displayHappiness = effectiveHappiness(tam, nowMs)
    const displayLevel = effectiveLevel(tam, userLevel, nowMs)
    return {
        ...tam,
        happiness: displayHappiness,
        currentLevel: displayLevel,
        displayHappiness,
        displayLevel,
        isFrozen: displayHappiness === 0,
    }
}

/**
 * Crée un tamagotchi tout neuf au moment de l'adoption.
 */
export function createTamagotchi(name: string, userLevel: number, nowMs: number = Date.now()): Tamagotchi {
    const iso = new Date(nowMs).toISOString()
    return {
        name: name.slice(0, 16),
        adoptedAt: iso,
        lastFedAt: iso,
        happiness: TAMAGOTCHI_HAPPINESS_MAX,
        currentLevel: Math.max(1, Math.min(100, Math.floor(userLevel))),
    }
}

/**
 * Applique un nourrissage : +30 happiness (clamp 100), lastFedAt = now.
 * En plus, currentLevel se met à jour vers le level XP réel si supérieur.
 */
export function applyFeed(tam: Tamagotchi, userLevel: number, nowMs: number = Date.now()): Tamagotchi {
    const currentHappiness = effectiveHappiness(tam, nowMs)
    const newHappiness = Math.min(TAMAGOTCHI_HAPPINESS_MAX, currentHappiness + TAMAGOTCHI_FEED_HAPPINESS_BOOST)
    const safeUserLevel = Math.max(1, Math.min(100, Math.floor(userLevel)))
    return {
        ...tam,
        lastFedAt: new Date(nowMs).toISOString(),
        happiness: newHappiness,
        currentLevel: Math.max(tam.currentLevel, safeUserLevel),
    }
}

/**
 * Validation simple d'un nom de tamagotchi.
 * Pas vide, max 16 caractères, alphanumérique + espaces simples.
 */
export function isValidTamagotchiName(name: string): boolean {
    if (typeof name !== "string") return false
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 16) return false
    return /^[\p{L}\p{N} '-]+$/u.test(trimmed)
}
