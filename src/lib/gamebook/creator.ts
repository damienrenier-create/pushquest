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

/**
 * v3.13 — Auto-bootstrap d'un compte créateur : s'assure que les flags narratifs
 * majeurs et les items équipements sont présents, pour ne pas avoir à refaire
 * toute la progression à la main lors d'un test.
 *
 * Quand : appelé dans state GET juste après le findUnique du progress.
 * Effet : si user.isSystem === true et qu'il manque l'un des flags/items, on
 *   met à jour la DB et on retourne le progress patché. Idempotent.
 *
 * Flags/items auto-init :
 *   - piaffiniRescued = true (débloque dialogues post-quête JOJO/JOJETTE)
 *   - firstSwimDone = true (débloque la traversée du canal)
 *   - swim_set dans inventory (équipement de nage de JOJO)
 */
export async function ensureCreatorBootstrap(userId: string, progress: any): Promise<any> {
    if (!progress) return progress
    const u = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    if (u?.isSystem !== true) return progress

    // Import dynamique pour éviter une cycle avec inventory/items qui pourraient
    // importer creator dans le futur.
    const { parseInventory, addItem, hasIntactItem } = await import("./inventory")
    const { getItem, getInitialItemData } = await import("./items")

    const currentInventory = parseInventory(progress.inventory)
    const hasSwimSet = hasIntactItem(currentInventory, "swim_set")
    const needsUpdate = !progress.piaffiniRescued || !progress.firstSwimDone || !hasSwimSet
    if (!needsUpdate) return progress

    let newInventory = currentInventory
    if (!hasSwimSet) {
        const def = getItem("swim_set")
        if (def) newInventory = addItem(currentInventory, "swim_set", getInitialItemData(def))
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            piaffiniRescued: true,
            firstSwimDone: true,
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    return {
        ...progress,
        piaffiniRescued: true,
        firstSwimDone: true,
        inventory: newInventory,
    }
}

