// src/lib/gamebook/userLevel.ts
//
// v3.15 — Helper qui renvoie le level/animal XP courant d'un utilisateur, utilisé
// par les routes Tamagotchi pour synchroniser l'animal du tamagotchi avec celui
// affiché sur le dashboard de l'app (cf. lib/xp.ts / XP_ANIMALS).
//
// On reproduit la logique du dashboard : on fetch les users de la league de l'utilisateur,
// on calcule les XP globalement (pour avoir les bonus records corrects), puis on extrait
// le level du user cible.
//
// Cette opération est relativement coûteuse (fetch + agg). Elle est appelée seulement
// quand le joueur interagit avec le vétérinaire (adopt/feed) ou ouvre le state — pas
// sur chaque mouvement.

import prisma from "@/lib/prisma"
import { calculateAllUsersXP } from "@/lib/xp"
import { getUserSummaries } from "@/lib/badges"

/**
 * Renvoie le level XP courant du user (1..100). Fallback à 1 si quelque chose échoue.
 */
export async function getUserLevelForGamebook(userId: string): Promise<number> {
    try {
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: { league: true, isSystem: true },
        })
        if (!user) return 1
        const league = user.league || "POMPES"

        const allUsers = (await (prisma.user as any).findMany({
            where: {
                nickname: { not: "modo" },
                league,
                isSystem: false, isGuest: false,
            },
            select: {
                id: true,
                nickname: true,
                email: true,
                image: true,
                buyoutPaid: true,
                buyoutPaidAt: true,
                sets: true,
                fines: true,
                sallyUps: true,
                medicalCertificates: true,
                potEvents: true,
                xpAdjustments: true,
                league: true,
                onboardingStartedAt: true,
                createdAt: true,
            },
        })) as any[]

        // v3.15 — les comptes isSystem (créateur) sont filtrés ci-dessus.
        // On les inclut quand même via une seconde requête s'il faut.
        let usersToScore = allUsers
        if (user.isSystem === true) {
            const creator = (await (prisma.user as any).findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    nickname: true,
                    email: true,
                    image: true,
                    buyoutPaid: true,
                    buyoutPaidAt: true,
                    sets: true,
                    fines: true,
                    sallyUps: true,
                    medicalCertificates: true,
                    potEvents: true,
                    xpAdjustments: true,
                    league: true,
                    onboardingStartedAt: true,
                    createdAt: true,
                },
            })) as any
            if (creator) usersToScore = [...allUsers, creator]
        }

        const allTorchAndStealEvents = await (prisma as any).badgeEvent.findMany({
            where: { eventType: { in: ["STEAL", "TORCH_CLAIM"] } },
        })
        const summaries = getUserSummaries(usersToScore, allTorchAndStealEvents)
        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany()

        const scores = await calculateAllUsersXP(usersToScore, badgeOwnerships, summaries)
        const me = scores.find((s) => s.id === userId)
        if (!me) return 1
        return Math.max(1, Math.min(100, Math.floor(me.level)))
    } catch (e) {
        console.warn("[getUserLevelForGamebook] failed, defaulting to 1", e)
        return 1
    }
}
