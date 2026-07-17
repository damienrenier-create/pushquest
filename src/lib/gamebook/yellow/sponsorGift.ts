// src/lib/gamebook/yellow/sponsorGift.ts
//
// PARRAINAGE — fan-out des BONUS MUTUELS parrain↔filleul (côté serveur). Quand un joueur accomplit un
// exploit (arène conquise / shiny capturé), on crée un don `SponsorGift` pour son parrain ET chacun de
// ses filleuls (réclamé au login, cf. route sponsor-gift). Best-effort : NEUTRE si la table n'existe pas.
//
// Pattern gaté (prisma as any).sponsorGift → COMPILE avant db:push.

import type { PrismaClient } from "@prisma/client"

/** Renvoie les userId liés au joueur par parrainage : son parrain (sponsorId) + tous ses filleuls (sponsored). */
export async function linkedSponsorUserIds(prisma: PrismaClient, userId: string): Promise<string[]> {
    try {
        const me = await prisma.user.findUnique({
            where: { id: userId },
            select: { sponsorId: true, sponsored: { select: { id: true } } },
        })
        const set = new Set<string>()
        if (me?.sponsorId) set.add(me.sponsorId)
        for (const s of me?.sponsored ?? []) set.add(s.id)
        set.delete(userId) // jamais soi-même (garde-fou)
        return [...set]
    } catch {
        return []
    }
}

/** Crée un don parrain↔filleul pour chaque pote lié. `energy` : shiny = 500 (fixe) ; arène = 0 (1/10 de la
 *  jauge du bénéficiaire, calculé au claim). Renvoie le nombre de dons créés (0 = pas de pote / table absente). */
export async function fanOutSponsorGift(
    prisma: PrismaClient,
    fromUserId: string,
    fromNickname: string,
    kind: "arena" | "shiny",
    energy: number,
    detail: string,
): Promise<number> {
    try {
        const targets = await linkedSponsorUserIds(prisma, fromUserId)
        if (targets.length === 0) return 0
        const sg = (prisma as any).sponsorGift // table gated (créée par db:push)
        await sg.createMany({
            data: targets.map((toUserId) => ({ toUserId, fromUserId, fromNickname, kind, energy, detail })),
        })
        return targets.length
    } catch {
        return 0 // table pas encore créée / erreur → neutre
    }
}
