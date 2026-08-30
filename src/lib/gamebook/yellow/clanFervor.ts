// src/lib/gamebook/yellow/clanFervor.ts
//
// FERVEUR DE CLAN — helpers SERVEUR : lire le clan du MONDE ACTIF d'un joueur (le pacte est per-monde) et recenser
// les ALLIÉS (même clan, run en cours). Sert aux dons de ferveur : shiny ×3, Super Pasta au badge, high-five.

import { parseSave, type YellowSave } from "./storage/save"
import { YELLOW_CHAPTER_ID } from "./featureFlag"
import type { ClanKey } from "./data/clans"

/** Clan du MONDE ACTIF d'une save (live/ngplus/run3). Le REJEU (bulle jetable) ne compte pas → aucun clan. */
export function activeClanOf(s: YellowSave): ClanKey | null {
    const world = s.activeWorld === "ngplus" ? s.ngplusWorld
        : s.activeWorld === "run3" ? s.run3World
        : s.activeWorld === "replay" ? null
        : s // "live"
    const clan = world?.clan
    return clan === "air" || clan === "combat" || clan === "roche" ? clan : null
}

/** Recense les userId des ALLIÉS du même clan actif que `myUserId` (hors moi). Renvoie aussi mon clan (null si aucun). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sameClanUserIds(prisma: any, myUserId: string): Promise<{ myClan: ClanKey | null; userIds: string[] }> {
    const rows = (await prisma.gamebookProgress.findMany({
        where: { chapterId: YELLOW_CHAPTER_ID }, select: { userId: true, flags: true },
    })) as { userId: string; flags: unknown }[]
    let myClan: ClanKey | null = null
    const byUser: { userId: string; clan: ClanKey | null }[] = []
    for (const r of rows) {
        const c = activeClanOf(parseSave(r.flags))
        byUser.push({ userId: r.userId, clan: c })
        if (r.userId === myUserId) myClan = c
    }
    if (!myClan) return { myClan: null, userIds: [] }
    return { myClan, userIds: byUser.filter((u) => u.userId !== myUserId && u.clan === myClan).map((u) => u.userId) }
}
