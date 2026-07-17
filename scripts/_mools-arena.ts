// LECTURE SEULE — entrées ArenaChampion (Hall of Fame d'arène) de Mools + son monde actuel.
// Sert à identifier une victoire RUN 2 enregistrée par erreur en run 1 (badge non préfixé "ngplus:").
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    console.log("User:", u.nickname, u.id)

    // Monde courant + existence run 2
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = prog?.flags as { activeWorld?: string; ngplusWorld?: unknown; badges?: string[]; ngplusUsed?: boolean } | undefined
    console.log(`Save: activeWorld=${f?.activeWorld ?? "?"} · ngplusUsed=${f?.ngplusUsed} · a un ngplusWorld=${!!f?.ngplusWorld} · badges(live)=${JSON.stringify(f?.badges ?? [])}`)

    try {
        const ac = (prisma as any).arenaChampion
        const rows = (await ac.findMany({
            where: { OR: [{ userId: u.id }, { nickname: u.nickname }] },
            orderBy: { wonAt: "desc" },
            take: 30,
            select: { id: true, nickname: true, badgeId: true, team: true, wonAt: true },
        })) as { id: string; nickname: string; badgeId: string; team: string; wonAt: Date }[]
        console.log(`\n${rows.length} entrée(s) ArenaChampion pour Mools :`)
        for (const r of rows) {
            let team: Array<{ speciesId?: string; level?: number }> = []
            try { team = JSON.parse(r.team) } catch { /* ignore */ }
            const teamStr = team.map((m) => `${m.speciesId}${m.level ? " L" + m.level : ""}`).join(", ")
            console.log(`  [${r.badgeId}] ${new Date(r.wonAt).toISOString()} id=${r.id}`)
            console.log(`      équipe: ${teamStr}`)
        }
    } catch (e) {
        console.log("table arenaChampion inaccessible:", (e as Error).message)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
