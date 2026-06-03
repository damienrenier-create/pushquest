// src/lib/gamebook/yellow/battle/capture.ts
//
// Nexus Jaune Éclair — système de capture. React-free, pur.
// Formule type ancienne génération : plus l'adversaire a peu de PV, plus c'est facile ;
// un statut aide ; chaque Ball a son multiplicateur ; chaque espèce a son catchRate.

import type { MajorStatus } from "./types"
import type { Rng } from "./rng"

export interface CaptureInput {
    catchRate: number       // 0..255 (espèce)
    currentHp: number
    maxHp: number
    status: MajorStatus
    ballBonus: number       // multiplicateur de la Ball
}

/** Bonus de statut (sommeil/gel > poison/para/brûlure > rien). */
export function statusCatchBonus(status: MajorStatus): number {
    if (status === "SLEEP" || status === "FREEZE") return 2
    if (status === "NONE") return 1
    return 1.5
}

/** Valeur de capture "a" (0..~255+). Plus c'est haut, plus c'est facile. */
export function captureValue(i: CaptureInput): number {
    const max = Math.max(1, i.maxHp)
    const cur = Math.max(0, Math.min(max, i.currentHp))
    const hpFactor = (3 * max - 2 * cur) / (3 * max) // 1/3 (PV pleins) → 1 (1 PV)
    return i.catchRate * i.ballBonus * hpFactor * statusCatchBonus(i.status)
}

export interface CaptureResult {
    caught: boolean
    /** Nombre de "secousses" réussies (0..3) — pour l'animation/les messages. */
    shakes: number
    value: number
}

/**
 * Tente une capture. Modèle simplifié à 3 secousses : chaque secousse réussit avec
 * la probabilité min(1, value/255) ; capturé si les 3 passent (ou value ≥ 255).
 */
export function tryCapture(i: CaptureInput, rng: Rng): CaptureResult {
    const value = captureValue(i)
    if (value >= 255) return { caught: true, shakes: 3, value }
    const p = Math.max(0, Math.min(1, value / 255))
    let shakes = 0
    for (let s = 0; s < 3; s++) {
        if (rng.next() < p) shakes++
        else break
    }
    return { caught: shakes >= 3, shakes, value }
}
