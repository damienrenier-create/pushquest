// LECTURE SEULE — récompense croisée de la Ligue : qui a reçu un don d'énergie (leagueEnergyGrant) + montant estimé
// (+1/3 de leur repsCap). Confirme "est-ce le cas de tout le monde ?".
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const eg = (prisma as any).leagueEnergyGrant
    const grants = await eg.findMany({ orderBy: { createdAt: "desc" }, take: 40, select: { fromNickname: true, toUserId: true, claimed: true, createdAt: true } })
    console.log(`Dons d'énergie de Ligue (leagueEnergyGrant), 40 plus récents :\n`)
    // repsCap par joueur (pour estimer +1/3)
    const saves = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true } })
    const capByUser = new Map<string, { nick: string; cap: number; reps: number }>()
    for (const s of saves) {
        const f: any = s.flags ?? {}
        capByUser.set(s.userId, { nick: f?.nickname ?? "?", cap: Math.round(f?.repsCap ?? 0), reps: Math.round(f?.reps ?? 0) })
    }
    for (const g of grants) {
        const to = capByUser.get(g.toUserId)
        const bonus = to ? Math.floor(to.cap / 3) : "?"
        const when = new Date(g.createdAt).toISOString().slice(0, 16).replace("T", " ")
        console.log(`  ${when} · de ${String(g.fromNickname).padEnd(12)} → ${String(to?.nick ?? g.toUserId).padEnd(14)} · +1/3 quota ≈ ${bonus} ⚡ (cap ${to?.cap ?? "?"}) · ${g.claimed ? "réclamé" : "en attente"}`)
    }
    console.log(`\nTotal dons listés : ${grants.length}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
