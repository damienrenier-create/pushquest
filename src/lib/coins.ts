/**
 * coins.ts — Logique métier des Embercoins (EC)
 * Solde, historique, prix des QuotaModifiers
 */

import prisma from "@/lib/prisma";

// ─── SOLDE EC ────────────────────────────────────────────────────────────────

/**
 * Calcule le solde EC courant d'un utilisateur.
 * Somme de tous ses CoinAdjustment.
 */
export async function getCoinBalance(userId: string): Promise<number> {
    const adjustments = await (prisma as any).coinAdjustment.findMany({
        where: { userId }
    });
    return adjustments.reduce((sum: number, a: any) => sum + a.amount, 0);
}

// ─── PRIX DES QUOTA MODIFIERS ────────────────────────────────────────────────

/**
 * Calcule le multiplicateur de demande pour cibler un utilisateur.
 * Basé sur le nombre d'actions du mois glissant (30 jours).
 * Formule : 1.5 ^ nbActionsPrecedentes
 */
export async function getDemandMultiplier(
    sourceUserId: string,
    targetUserId: string
): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];

    const previousActions = await (prisma as any).quotaModifier.count({
        where: {
            sourceUserId,
            targetUserId,
            targetDateISO: { gte: thirtyDaysAgoISO },
            status: { not: "CANCELLED" }
        }
    });

    return Math.pow(1.5, previousActions);
}

/**
 * Calcule le coût EC d'un QuotaModifier.
 * 10 EC = 1 rep. Multiplié par le multiplicateur de demande.
 */
export async function calculateQuotaModifierCost(
    sourceUserId: string,
    targetUserId: string,
    repsAbsolute: number // nombre de reps en valeur absolue
): Promise<{ ecCost: number; demandMultiplier: number; baseEcPerRep: number }> {
    const BASE_EC_PER_REP = 10;
    const demandMultiplier = await getDemandMultiplier(sourceUserId, targetUserId);
    const ecCost = Math.ceil(repsAbsolute * BASE_EC_PER_REP * demandMultiplier);
    return { ecCost, demandMultiplier, baseEcPerRep: BASE_EC_PER_REP };
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

/**
 * Vérifie qu'un utilisateur a assez d'EC pour une dépense.
 */
export async function hasEnoughCoins(userId: string, amount: number): Promise<boolean> {
    const balance = await getCoinBalance(userId);
    return balance >= amount;
}
