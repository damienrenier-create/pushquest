// LECTURE SEULE — qui a BATTU la Ligue du RUN 1 ? Signal save : isChampion(live) || ngplusUsed || run3Used.
// Recoupé avec le Hall of Fame LeagueChampion (world="live").
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = (await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true } })) as any[]
    console.log(`Saves yellow : ${rows.length}\n`)
    const beaten: { nick: string; via: string }[] = []
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const isChamp = f.isChampion === true
        const ng = f.ngplusUsed === true
        const r3 = f.run3Used === true
        if (isChamp || ng || r3) {
            const u = await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } })
            const via = [isChamp && "isChampion(live)", ng && "run2 lancé", r3 && "run3 lancé"].filter(Boolean).join(" + ")
            beaten.push({ nick: u?.nickname ?? r.userId, via })
        }
    }
    console.log("=== Ont BATTU la Ligue run 1 (signal save) ===")
    for (const b of beaten.sort((a, b) => a.nick.localeCompare(b.nick))) console.log(`  • ${b.nick}  (${b.via})`)
    console.log(`  → total : ${beaten.length}`)

    // Recoupement Hall of Fame (world="live" = sacre run 1).
    try {
        const lc = (prisma as any).leagueChampion
        const hof = (await lc.findMany({ where: { world: "live" }, select: { nickname: true, wonAt: true } })) as any[]
        console.log("\n=== Hall of Fame LIGUE — sacres run 1 (world=live) ===")
        for (const h of hof) console.log(`  • ${h.nickname}  (${new Date(h.wonAt).toISOString().slice(0, 10)})`)
        console.log(`  → total : ${hof.length}`)
    } catch (e) { console.log("(LeagueChampion indisponible)") }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
