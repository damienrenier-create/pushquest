// src/lib/gamebook/yellow/battle/capture.ts
//
// Nexus Jaune Éclair — système de capture. React-free, pur, seedable.
// A = hpFactor × catchRate × ballBonus × statut × rareté × extra
// proba = min(1, A / CALIBRATION). Les bonus/coefficients vivent dans
// data/captureConfig.ts (édition sans toucher à la logique).

import type { MajorStatus } from "./types"
import type { Rng } from "./rng"
import { statusBonusOf, rarityBonusOf, CAPTURE_CALIBRATION } from "../data/captureConfig"

export interface CaptureInput {
    catchRate: number       // 0..255 (espèce)
    currentHp: number
    maxHp: number
    status: MajorStatus
    ballBonus: number       // multiplicateur de la Ball
    rarityBonus?: number    // coefficient de rareté (défaut 1)
    extraBonus?: number     // bonus situationnel : quota PushQuest, etc. (défaut 1)
}

/** Bonus de statut (cf. config). Conservé exporté pour lisibilité/tests. */
export function statusCatchBonus(status: MajorStatus): number {
    return statusBonusOf(status)
}

/** Facteur PV : 1/3 (PV pleins) → 1 (1 PV). Plus les PV baissent, plus c'est facile. */
export function hpFactor(currentHp: number, maxHp: number): number {
    const max = Math.max(1, maxHp)
    const cur = Math.max(0, Math.min(max, currentHp))
    return (3 * max - 2 * cur) / (3 * max)
}

/** Valeur de capture "A" (0..255+). Plus c'est haut, plus c'est facile. */
export function captureValue(i: CaptureInput): number {
    return i.catchRate
        * i.ballBonus
        * hpFactor(i.currentHp, i.maxHp)
        * statusBonusOf(i.status)
        * (i.rarityBonus ?? 1)
        * (i.extraBonus ?? 1)
}

export interface CaptureResult {
    caught: boolean
    /** Nombre de "secousses" (0..3) — pour l'animation/les messages. */
    shakes: number
    value: number
}

/**
 * Tente une capture. proba = min(1, A / CALIBRATION) décidée par UN jet ;
 * les secousses sont cosmétiques. value ≥ CALIBRATION → capture garantie.
 */
export function tryCapture(i: CaptureInput, rng: Rng): CaptureResult {
    const value = captureValue(i)
    if (value >= CAPTURE_CALIBRATION) return { caught: true, shakes: 3, value }
    const p = Math.max(0, Math.min(1, value / CAPTURE_CALIBRATION))
    const caught = rng.next() < p
    let shakes = caught ? 3 : 0
    if (!caught) { for (let s = 0; s < 3; s++) { if (rng.next() < p) shakes++; else break } }
    return { caught, shakes, value }
}
