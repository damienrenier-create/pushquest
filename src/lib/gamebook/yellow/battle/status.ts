// src/lib/gamebook/yellow/battle/status.ts
//
// Nexus Jaune Éclair — statuts majeurs (non-volatils, exclusifs) + dégâts de fin de tour.
// Les statuts volatils (confusion, flinch, seeded…) sont gérés au niveau du moteur de tour.

import type { MajorStatus, PokeType } from "./types"
import type { Rng } from "./rng"

/** Immunités de type aux statuts majeurs (règles classiques). */
const STATUS_TYPE_IMMUNITY: Partial<Record<Exclude<MajorStatus, "NONE">, PokeType[]>> = {
    BURN: ["FEU"],
    FREEZE: ["GLACE"],
    POISON: [], // (PLANTE/ACIER seraient immunisés si ces types existaient ici)
    TOXIC: [],
    PARALYSIS: ["ELEC"],
    SLEEP: [],
}

/**
 * Peut-on infliger ce statut majeur ?
 * - exclusivité : seulement si la cible n'a pas déjà un statut majeur ;
 * - immunité de type.
 */
export function canInflictStatus(
    current: MajorStatus,
    incoming: Exclude<MajorStatus, "NONE">,
    targetTypes: PokeType[],
): boolean {
    if (current !== "NONE") return false
    const immuneTypes = STATUS_TYPE_IMMUNITY[incoming] ?? []
    return !targetTypes.some((t) => immuneTypes.includes(t))
}

/** Compteur initial d'un statut (sommeil 1..3 tours, toxic palier 1). */
export function initialStatusCounter(status: MajorStatus, rng: Rng): number {
    if (status === "SLEEP") return rng.int(1, 3)
    if (status === "TOXIC") return 1
    return 0
}

export interface ResidualResult {
    damage: number
    message: string | null
}

/** Dégâts de fin de tour dus au statut (brûlure 1/16, poison 1/8, toxic n/16). */
export function residualDamage(
    status: MajorStatus,
    maxHp: number,
    name: string,
    toxicStage: number,
): ResidualResult {
    if (status === "BURN") return { damage: floorDiv(maxHp, 16), message: `${name} souffre de sa brûlure !` }
    if (status === "POISON") return { damage: floorDiv(maxHp, 8), message: `${name} souffre du poison !` }
    if (status === "TOXIC") {
        return { damage: Math.max(1, Math.floor((maxHp * Math.min(15, toxicStage)) / 16)), message: `${name} souffre gravement du poison !` }
    }
    return { damage: 0, message: null }
}

function floorDiv(a: number, b: number): number {
    return Math.max(1, Math.floor(a / b))
}

// ============================================================
// Empêchements d'action (consultés par le moteur de tour)
// ============================================================

/** Paralysie : 25% de chance de ne PAS pouvoir agir ce tour. */
export function paralysisSkips(rng: Rng): boolean {
    return rng.chance(25)
}

/**
 * Gel : 20% de chance de dégeler (et d'agir) à chaque tour.
 * CHOIX DE GAME-DESIGN (assumé) : le strict Gen 1 rend le gel DÉFINITIF (on ne
 * dégèle que si touché par une attaque Feu). On garde un dégel auto 20%/tour
 * (comportement Gen 2+) pour éviter un gel quasi-permanent frustrant en prod.
 */
export function freezeThaws(rng: Rng): boolean {
    return rng.chance(20)
}

/** Confusion : 33% de chance de se blesser soi-même. */
export function confusionSelfHit(rng: Rng): boolean {
    return rng.chance(33)
}

/** Libellé FR d'application d'un statut. */
export function statusApplyMessage(status: MajorStatus, name: string): string {
    switch (status) {
        case "BURN": return `${name} est brûlé !`
        case "POISON": return `${name} est empoisonné !`
        case "TOXIC": return `${name} est gravement empoisonné !`
        case "PARALYSIS": return `${name} est paralysé ! Il aura du mal à attaquer !`
        case "SLEEP": return `${name} s'endort !`
        case "FREEZE": return `${name} est gelé !`
        default: return ""
    }
}
