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
    POISON: ["METAL"], // le métal ne rouille pas : MÉTAL immunisé au poison (comme l'Acier)
    TOXIC: ["METAL"],  // … y compris au poison grave (Toxik)
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

// SOMMEIL — durée à chaîne dégressive : la cible rate TOUJOURS au moins 1 tour, puis chance
// CONDITIONNELLE de prolonger à chaque tour suivant (75% → t2, 50% → t3, puis ÷2 : 25, 12.5,
// 6.25, 3.125, 1.5625). Au plus 8 tours d'incapacité → le 9e tour est TOUJOURS un réveil.
const SLEEP_CONTINUE = [0.75, 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625] as const

/** Nb de tours d'incapacité du sommeil (1..8) selon la chaîne dégressive. */
export function rollSleepTurns(rng: Rng): number {
    let turns = 1 // au moins 1 tour
    for (const p of SLEEP_CONTINUE) {
        if (rng.next() < p) turns += 1
        else break
    }
    return turns // 1..8
}

/** Compteur initial d'un statut. Sommeil = tours d'incapacité + 1 (réveille + agit quand il atteint 0).
 *  Gel = 1 tour GARANTI (puis 20%/tour de dégel). */
export function initialStatusCounter(status: MajorStatus, rng: Rng): number {
    if (status === "SLEEP") return rollSleepTurns(rng) + 1
    if (status === "FREEZE") return 0 // compteur = nb de tours DÉJÀ gelé → pilote la proba décroissante (cf. freezeStayFrozen)
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
 * Gel (refonte Sartay) : la cible RESTE gelée avec une probabilité DÉCROISSANTE selon le nombre de tours
 * DÉJÀ passés gelée — 100% (1er tour, incapacité garantie), puis 90, 80, 70, 60, 50, 40, 30, 20% ;
 * PLANCHER à 20% (ne descend jamais en dessous). En plus, une attaque de type FEU qui touche DÉGÈLE
 * instantanément (géré côté moteur, cf. dealMoveDamage). Renvoie true si la cible reste gelée ce tour.
 */
export function freezeStayFrozen(turnsFrozen: number, rng: Rng): boolean {
    return rng.chance(Math.max(20, 100 - 10 * turnsFrozen))
}

/** Confusion : 50% de chance de se blesser soi-même (façon Gen 1). */
export function confusionSelfHit(rng: Rng): boolean {
    return rng.chance(50)
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
