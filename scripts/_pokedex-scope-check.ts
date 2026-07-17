// LECTURE SEULE — le Pokédex du score run 2 est-il global (run1+run2) ou run-2-only ?
//   npx tsx scripts/_pokedex-scope-check.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, user: { select: { nickname: true } } },
    })
    for (const row of rows) {
        const f = (row.flags ?? {}) as any
        const ng = f.ngplusWorld
        if (!ng) continue // seulement les joueurs EN run 2
        const nick = row.user?.nickname ?? "?"
        const globalCaught = Array.isArray(ng.pokedex?.caught) ? ng.pokedex.caught.length : 0
        const globalSeen = Array.isArray(ng.pokedex?.seen) ? ng.pokedex.seen.length : 0
        const caughtThisRun = Array.isArray(ng.caughtThisRun) ? ng.caughtThisRun.length : "(absent)"
        // comparons aussi le pokedex du monde run1 (top-level) pour voir le recouvrement
        const run1Caught = Array.isArray(f.pokedex?.caught) ? f.pokedex.caught.length : 0
        console.log(`\n${nick} (activeWorld=${f.activeWorld}) :`)
        console.log(`  ngplusWorld.pokedex.caught (GLOBAL ?) : ${globalCaught}   · seen ${globalSeen}`)
        console.log(`  ngplusWorld.caughtThisRun (run2 only) : ${caughtThisRun}`)
        console.log(`  top-level pokedex.caught (run1)        : ${run1Caught}`)
        if (Array.isArray(ng.caughtThisRun) && Array.isArray(ng.pokedex?.caught)) {
            const set2 = new Set(ng.caughtThisRun)
            const onlyRun2 = ng.caughtThisRun.length
            const inGlobalNotRun2 = ng.pokedex.caught.filter((x: string) => !set2.has(x)).length
            console.log(`  → run2 = ${onlyRun2} capturés ; ${inGlobalNotRun2} autres viennent d'AVANT (dans le global mais pas run2)`)
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
