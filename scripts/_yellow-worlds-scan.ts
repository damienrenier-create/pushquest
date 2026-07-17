// LECTURE SEULE — état de tous les joueurs yellow : monde actif, badges, présence de données run2/run3.
// Sert à comprendre pourquoi le classement des concours est vide (qui pourrait le peupler).
//   npx tsx scripts/_yellow-worlds-scan.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, updatedAt: true, user: { select: { nickname: true } } },
    })
    console.log(`${rows.length} save(s) yellow\n`)
    const now = Date.now()
    for (const row of rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))) {
        const f = (row.flags ?? {}) as any
        const nick = row.user?.nickname ?? "?"
        const badges = Array.isArray(f.badges) ? f.badges.length : 0
        const world = f.activeWorld ?? "(live?)"
        const hasNg = !!f.ngplusWorld
        const hasR3 = !!f.run3World
        const daysAgo = ((now - +new Date(row.updatedAt)) / 86400000).toFixed(1)
        // run2 score exploitable ? (stats du monde ngplus)
        const ngStats = f.ngplusWorld?.stats
        const r3Defeated = f.run3World?.run3Defeated ?? f.run3Defeated
        console.log(
            `${nick.padEnd(10)} | monde=${String(world).padEnd(7)} | badges=${badges} | champ=${f.isChampion ? "O" : "-"} ngUsed=${f.ngplusUsed ? "O" : "-"} ` +
            `| ngplusWorld=${hasNg ? "O" : "-"} run3World=${hasR3 ? "O" : "-"} | run3Defeated=${Array.isArray(r3Defeated) ? r3Defeated.length : "-"} | maj il y a ${daysAgo}j`
        )
        if (ngStats) console.log(`             ↳ ngplusWorld.stats.leagueEnergySpent=${ngStats.leagueEnergySpent ?? "(absent)"} energySpent=${ngStats.energySpent ?? "?"}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
