// src/lib/gamebook/tamagotchi.ts
//
// v3.14 — Mécanique Tamagotchi adoptable chez le vétérinaire de Macaron'île (V3T).
//
// Principe :
//   - Le joueur adopte un tamagotchi pour 50 reps. Choix du nom.
//   - Le nourrir (feed) coûte 20 reps et lui rend +30 happiness.
//   - La happiness décroît avec le temps : -1 par tranche de 6h depuis lastFedAt.
//     Plancher à 0 (jamais de mort).
//   - Le tamagotchi grandit selon le nombre de feedings cumulés :
//       0..4 → "egg"   (œuf)
//       5..14 → "baby" (bébé)
//       15+   → "adult" (adulte)
//   - Une fois "adult", le tamagotchi pourra accompagner le joueur dans les hautes herbes du sud
//     (utilisé en v3.15 — pour l'instant juste un flag, pas de mécanique d'accompagnement).
//
// Aucune dépendance Prisma : ce fichier est utilisable côté serveur ET client.

export type TamagotchiStage = "egg" | "baby" | "adult"

export interface Tamagotchi {
    name: string
    adoptedAt: string       // ISO timestamp
    lastFedAt: string       // ISO timestamp
    happiness: number       // 0..100, recalculé au read avec decay
    feedCount: number       // cumulé depuis adoption
    stage: TamagotchiStage  // dérivé de feedCount, recalculé au read
}

// Constantes (centralisées pour ajustement facile)
export const TAMAGOTCHI_ADOPT_COST = 50
export const TAMAGOTCHI_FEED_COST = 20
export const TAMAGOTCHI_FEED_HAPPINESS_BOOST = 30
export const TAMAGOTCHI_HAPPINESS_MAX = 100
/** Heures entre chaque -1 de happiness. */
export const TAMAGOTCHI_DECAY_INTERVAL_HOURS = 6
/** Seuils de feedCount pour passer de stage en stage. */
export const TAMAGOTCHI_STAGE_THRESHOLDS = {
    baby: 5,
    adult: 15,
}

export function parseTamagotchi(raw: unknown): Tamagotchi | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.name !== "string" || o.name.length === 0) return null
    if (typeof o.adoptedAt !== "string") return null
    if (typeof o.lastFedAt !== "string") return null
    const happinessRaw = typeof o.happiness === "number" && Number.isFinite(o.happiness) ? o.happiness : 0
    const feedCountRaw = typeof o.feedCount === "number" && Number.isFinite(o.feedCount) ? o.feedCount : 0
    const stageRaw = (o.stage === "egg" || o.stage === "baby" || o.stage === "adult") ? o.stage : "egg"
    return {
        name: o.name,
        adoptedAt: o.adoptedAt,
        lastFedAt: o.lastFedAt,
        happiness: Math.max(0, Math.min(TAMAGOTCHI_HAPPINESS_MAX, Math.floor(happinessRaw))),
        feedCount: Math.max(0, Math.floor(feedCountRaw)),
        stage: stageRaw,
    }
}

/**
 * Stage dérivé du feedCount (toujours recalculé pour cohérence).
 */
export function deriveStage(feedCount: number): TamagotchiStage {
    if (feedCount >= TAMAGOTCHI_STAGE_THRESHOLDS.adult) return "adult"
    if (feedCount >= TAMAGOTCHI_STAGE_THRESHOLDS.baby) return "baby"
    return "egg"
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
 * Renvoie une "vue" du tamagotchi avec happiness et stage recalculés.
 * Idéal pour le payload renvoyé au client.
 */
export function viewTamagotchi(tam: Tamagotchi, nowMs: number = Date.now()): Tamagotchi {
    return {
        ...tam,
        happiness: effectiveHappiness(tam, nowMs),
        stage: deriveStage(tam.feedCount),
    }
}

/**
 * Crée un tamagotchi tout neuf au moment de l'adoption.
 */
export function createTamagotchi(name: string, nowMs: number = Date.now()): Tamagotchi {
    const iso = new Date(nowMs).toISOString()
    return {
        name: name.slice(0, 16),
        adoptedAt: iso,
        lastFedAt: iso,
        happiness: TAMAGOTCHI_HAPPINESS_MAX,
        feedCount: 0,
        stage: "egg",
    }
}

/**
 * Applique une nourrissage (feed) : +30 happiness (clamp 100), feedCount++, lastFedAt = now.
 * Renvoie le nouveau tamagotchi à persister.
 */
export function applyFeed(tam: Tamagotchi, nowMs: number = Date.now()): Tamagotchi {
    const currentHappiness = effectiveHappiness(tam, nowMs)
    const newHappiness = Math.min(TAMAGOTCHI_HAPPINESS_MAX, currentHappiness + TAMAGOTCHI_FEED_HAPPINESS_BOOST)
    const newFeedCount = tam.feedCount + 1
    return {
        ...tam,
        lastFedAt: new Date(nowMs).toISOString(),
        happiness: newHappiness,
        feedCount: newFeedCount,
        stage: deriveStage(newFeedCount),
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
