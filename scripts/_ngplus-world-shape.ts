// LECTURE SEULE — structure d'un monde run2 (ngplusWorld) et run3, pour voir si le score est calculable côté serveur.
//   npx tsx scripts/_ngplus-world-shape.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function keys(o: unknown): string { return o && typeof o === "object" ? Object.keys(o as object).join(", ") : String(o) }

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, user: { select: { nickname: true } } },
    })
    for (const row of rows) {
        const f = (row.flags ?? {}) as any
        const nick = row.user?.nickname ?? "?"
        if (f.ngplusWorld) {
            const w = f.ngplusWorld
            console.log(`\n═══ ${nick} · ngplusWorld ═══`)
            console.log("  clés monde :", keys(w))
            console.log("  stats      :", keys(w.stats), "→", JSON.stringify(w.stats))
            console.log("  team       :", Array.isArray(w.team) ? w.team.map((m: any) => `${m.speciesId} N${m.level}`).join(", ") : w.team)
            console.log("  pokedex    :", keys(w.pokedex), "· caught =", w.pokedex?.caught?.length)
            console.log("  playtimeMs :", w.playtimeMs, "· badges =", JSON.stringify(w.badges), "· ligueEntered?", w.ligueEntered ?? w.leagueEntered ?? "(champ inconnu)")
        }
        if (f.run3World) {
            const w = f.run3World
            console.log(`\n═══ ${nick} · run3World ═══`)
            console.log("  clés monde :", keys(w))
            console.log("  run3Defeated =", Array.isArray(w.run3Defeated) ? w.run3Defeated.length : w.run3Defeated)
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
