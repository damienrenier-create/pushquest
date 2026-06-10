// src/lib/gamebook/yellow/data/captureConfig.ts
//
// Nexus Jaune Éclair — CONFIG de capture (données, séparées de la logique).
// Tout est éditable ici sans toucher au moteur : bonus de statut, coefficient de
// rareté, constante de calibration, bonus situationnels (quota PushQuest).

import type { MajorStatus } from "../battle/types"

/** A = hpFactor × catchRate × ball × statut × NIVEAU × extra ; proba = min(plafondPV, A / CALIBRATION).
 *  255 → 170 → 130 : capture plus généreuse (et compense la rareté retirée du DÉFAUT, cf. plus bas).
 *  ⚠️ la RARETÉ est déjà portée par le catchRate de l'espèce (commun ~128, rare ~45) : on ne la
 *  recompte plus par défaut (le rarityBonus ci-dessous reste dispo pour des captures scriptées). */
export const CAPTURE_CALIBRATION = 130

/**
 * Facteur NIVEAU : bas niveau = capture plus facile, haut niveau = plus dure.
 * clamp(1.5 − niv/50 ; 0.5 ; 1.5) → ×1.5 à niv 0 · ×1 à niv 25 · ×0.5 à niv 50+.
 */
export const CAP_LEVEL_NEUTRAL = 25 // niveau où le facteur vaut 1 (défaut si non fourni)
export function levelCatchFactor(level: number): number {
    return Math.max(0.5, Math.min(1.5, 1.5 - level / 50))
}

/** Bonus si le joueur a atteint son quota PushQuest du jour (capture facilitée). */
export const QUOTA_CAPTURE_BONUS = 1.3

/** Statut → multiplicateur (sommeil/gel forts ; para/brûlure/poison moyens). */
export const STATUS_BONUS: Record<MajorStatus, number> = {
    NONE: 1,
    SLEEP: 2.5,
    FREEZE: 2.5,
    PARALYSIS: 1.5,
    BURN: 1.5,
    POISON: 1.5,
    TOXIC: 1.5,
}
export function statusBonusOf(status: MajorStatus): number {
    return STATUS_BONUS[status] ?? 1
}

/** Rareté → coefficient (plus c'est rare, plus c'est dur). Clés = valeurs de `Rarity`
 *  + paliers réservés (very_rare / boss) pour de futurs contenus scriptés. */
export const RARITY_BONUS: Record<string, number> = {
    COMMON: 1.0,
    UNCOMMON: 0.85,
    RARE: 0.65,
    VERY_RARE: 0.45,
    BOSS: 0.2,
    LEGENDARY: 0.1,
}
export function rarityBonusOf(rarity: string | undefined): number {
    return (rarity && RARITY_BONUS[rarity]) || 1
}
