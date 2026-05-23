// src/lib/gamebook/creator.ts
//
// v3.8.5+ — Helpers godmode pour les comptes "créateur" (isSystem=true).
//
// Côté DB, on garde les vraies valeurs (energySpentToday, etc.) intactes.
// Côté API, on renvoie au client une `availableEnergy` paddée à un minimum
// fixe pour que le HUD affiche toujours assez d'énergie pour tester.
//
// Tous les checks "ai-je assez d'énergie ?" passent côté serveur car on
// padde aussi la valeur AVANT le check.

import prisma from "@/lib/prisma"

export const CREATOR_MIN_ENERGY = 1000

/**
 * Renvoie true si le user est un compte "créateur" (isSystem=true).
 * Cache absent — chaque appel fait une query (peu fréquent en pratique).
 */
export async function isCreatorAccount(userId: string): Promise<boolean> {
    const u = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    return u?.isSystem === true
}

/**
 * Padde la valeur d'énergie disponible à `CREATOR_MIN_ENERGY` si le user
 * est un créateur. Sinon retourne la valeur telle quelle.
 */
export function padAvailableEnergyForCreator(real: number, isCreator: boolean): number {
    if (!isCreator) return real
    return Math.max(real, CREATOR_MIN_ENERGY)
}
