// Nexus II "jaune éclair" — feature flag helper
//
// Double-gate :
//   1. user.isSystem === true (créateur — Sartay sur son compte)
//   2. process.env.NEXUS_YELLOW_ENABLED === "true" (active la suite narrative)
//
// Si l'un des deux est faux → Nexus II invisible côté serveur (403 sur les routes /api/gamebook/yellow/*).
// Tant que la feature flag est OFF en prod Vercel, les joueurs ne voient strictement rien
// même si le code est déployé.

import prisma from "@/lib/prisma"

export async function isNexusYellowEnabled(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false
    if (process.env.NEXUS_YELLOW_ENABLED !== "true") return false

    const u = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    return u?.isSystem === true
}

export const YELLOW_CHAPTER_ID = "yellow"
export const YELLOW_ENTRANCE_MAP_ID = "yellow_entrance"
