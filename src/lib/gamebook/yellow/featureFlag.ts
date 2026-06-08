// Nexus II "jaune éclair" — accès au Chapitre 2.
//
// L'accès SE MÉRITE : il faut avoir fait évoluer son animal en DAEMON dans le
// Nexus 1 (Daemon slot 1 éveillé → unlockedAt renseigné par la route evolve-daemon).
// C'est la suite naturelle du teaser de fin de Chapitre 1.
//
// Le CRÉATEUR (isSystem) garde un accès permanent pour tester/administrer, même
// sans avoir évolué. Aucun flag d'env requis.

import prisma from "@/lib/prisma"

export async function isNexusYellowEnabled(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false

    const [daemon, user] = await Promise.all([
        (prisma as any).daemon.findUnique({
            where: { userId_slotIndex: { userId, slotIndex: 1 } },
            select: { unlockedAt: true },
        }),
        (prisma as any).user.findUnique({
            where: { id: userId },
            select: { isSystem: true, isGuest: true },
        }),
    ])
    // Daemon éveillé (Chapitre 1 terminé) OU créateur OU compte INVITÉ (accès direct au Ch.2).
    return !!daemon?.unlockedAt || user?.isSystem === true || user?.isGuest === true
}

export const YELLOW_CHAPTER_ID = "yellow"
export const YELLOW_ENTRANCE_MAP_ID = "yellow_entrance"
