// src/lib/gamebook/happinessChanges.ts
//
// v3.37 — Helper centralisé pour modifier le bonheur du tamagotchi.
//
// Règles configurables (v3.37) :
//   a. 24h sans connexion (lastSeen) → -10
//   b. -1 happiness tous les 50 pas (steps counter)
//   c. Donner à manger (corned_pates) → +30 (existant)
//   d. Réussir un défi PNJ → +10
//   e. Boire ta gourde → -1 si l'animal est dans le sac, -3 s'il est visible
//   f1. Animal rangé en sac > 24h → -1 par 24h
//   f3. Marcher sur happyFlower → +30 (1×/jour)
//   f4. Croiser une brute lâchée Vegas → -2
//   f5. Manger un fruit poison → -5
//   f6. Stop ou encore CRASH → -3
//
// Toutes les opérations passent par applyHappinessDelta() qui :
//   - parse le tamagotchi (no-op si absent)
//   - clamp 0..100
//   - retourne le nouveau tamagotchi (à persister par l'appelant)

import { parseTamagotchi, TAMAGOTCHI_HAPPINESS_MAX, type Tamagotchi } from "./tamagotchi"

export const HAPPINESS_DELTAS = {
    DAILY_DECAY: -10,                  // a — 24h sans connexion
    STEP_DECAY: -1,                    // b — toutes les 50 cases
    STEP_THRESHOLD: 50,                // b
    PNJ_CHALLENGE_WIN: +10,            // d
    DRINK_VISIBLE: -3,                 // e — boire si animal visible
    DRINK_IN_BAG: -1,                  // e — boire si animal en sac
    IN_BAG_DAILY: -1,                  // f1 — par 24h dans le sac
    HAPPY_FLOWER: +30,                 // f3 — happyFlower de grass_sud
    BRUTE_ENCOUNTER: -2,               // f4 — brute lâchée
    POISON_FRUIT: -5,                  // f5 — fruit Maléfica mangé
    STOP_CRASH: -3,                    // f6 — Stop ou encore CRASH
} as const

/**
 * Applique un delta sur le happiness du tamagotchi (clamp 0..100).
 * Retourne null si pas de tamagotchi.
 *
 * NOTE : ne modifie PAS lastFedAt (le decay temps reste basé sur la
 * dernière nourriture). Pour reset le decay temps, appeler avec
 * `resetFedAt: true` (ex : nourriture, véto, hôtel).
 */
export function applyHappinessDelta(
    rawTam: unknown,
    delta: number,
    opts?: { resetFedAt?: boolean }
): Tamagotchi | null {
    const tam = parseTamagotchi(rawTam)
    if (!tam) return null
    const newHappiness = Math.max(0, Math.min(TAMAGOTCHI_HAPPINESS_MAX, tam.happiness + delta))
    return {
        ...tam,
        happiness: newHappiness,
        ...(opts?.resetFedAt ? { lastFedAt: new Date().toISOString() } : {}),
    }
}

/**
 * Compte le nombre de jours complets écoulés depuis une date ISO.
 * Utilisé pour : f1 (animal en sac depuis X jours) + a (24h sans connexion).
 */
export function fullDaysSince(isoDate: string | null | undefined): number {
    if (!isoDate) return 0
    const past = new Date(isoDate).getTime()
    if (!Number.isFinite(past)) return 0
    const diffMs = Date.now() - past
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}
