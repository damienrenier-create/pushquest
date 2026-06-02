/**
 * quota.ts — Calcul du total de reps comptant pour le QUOTA d'un joueur,
 * en tenant compte des reps offertes (cadeau).
 *
 * Règles :
 * - Les reps OFFERTES par un joueur (offeredToUserId != null) ne comptent PAS
 *   dans le quota du donneur (mais restent dans son volume/XP — géré ailleurs).
 * - Les reps offertes À un joueur remplissent son quota, capées à ce qui lui manque
 *   (on ne peut pas offrir plus que son quota du jour).
 *
 * NB : ne touche QUE le calcul "reps du jour vs quota" (amendes, assiduité).
 * Le volume, les records et l'XP continuent de compter tous les sets du donneur.
 */

interface SetLike {
    date: string;
    exercise: string;
    reps: number;
    offeredToUserId?: string | null;
}

/** Effort d'un set (PLANK compté en secondes /5). */
export function setEffort(s: SetLike): number {
    return s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps;
}

/** Total des reps PROPRES du joueur (hors reps offertes à autrui) à une date. */
export function ownQuotaTotal(ownSets: SetLike[], dateISO: string): number {
    return (ownSets || [])
        .filter(s => s.date === dateISO && !s.offeredToUserId)
        .reduce((sum, s) => sum + setEffort(s), 0);
}

/** Total des reps OFFERTES au joueur à une date (avant cap). */
export function receivedGiftTotal(giftSets: SetLike[], dateISO: string): number {
    return (giftSets || [])
        .filter(s => s.date === dateISO)
        .reduce((sum, s) => sum + setEffort(s), 0);
}

/**
 * Total comptant pour le quota du joueur à une date.
 * `ownSets`  = sets du joueur (les reps offertes à autrui sont automatiquement exclues).
 * `giftSets` = sets offerts AU joueur (vide pour un joueur non-bénéficiaire).
 * `quota`    = quota du jour, sert à caper la contribution des cadeaux.
 */
export function quotaTotalWithGifts(
    ownSets: SetLike[],
    giftSets: SetLike[],
    dateISO: string,
    quota: number
): number {
    const own = ownQuotaTotal(ownSets, dateISO);
    const gifts = receivedGiftTotal(giftSets, dateISO);
    const giftsCapped = Math.min(gifts, Math.max(0, quota - own));
    return own + giftsCapped;
}
