// LECTURE SEULE — prouve que CHAQUE facteur du score run 2 est bien pris sur le MONDE run 2 (per-world),
// pas cumulé avec le run 1. + check sprites custom d'Embi.
//   npx tsx scripts/_run2-factors-audit.ts
import { PrismaClient } from "@prisma/client"
import { existsSync } from "fs"
const prisma = new PrismaClient()
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0)

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, user: { select: { nickname: true } } },
    })
    for (const row of rows) {
        const f = (row.flags ?? {}) as any
        if (!f.ngplusWorld) continue
        const nick = row.user?.nickname ?? "?"
        const w = f.ngplusWorld
        const s2 = w.stats ?? {}, s1 = f.stats ?? {} // run2 (per-world) vs run1 (top-level)
        const team2 = Array.isArray(w.team) ? w.team.reduce((a: number, m: any) => a + num(m.level), 0) : 0
        const team1 = Array.isArray(f.team) ? f.team.reduce((a: number, m: any) => a + num(m.level), 0) : 0
        console.log(`\n═══ ${nick} — facteur : RUN 2 (utilisé) | run 1 (exclu) ═══`)
        console.log(`  🏆 victoires/KO : ${num(s2.wins)}/${num(s2.teamKos)}   |   run1 ${num(s1.wins)}/${num(s1.teamKos)}`)
        console.log(`  📖 caughtThisRun: ${Array.isArray(w.caughtThisRun) ? w.caughtThisRun.length : 0}   |   pokédex global ${Array.isArray(w.pokedex?.caught) ? w.pokedex.caught.length : 0} (exclu)`)
        console.log(`  💪 Σ niveaux eq : ${team2}   |   run1 ${team1}`)
        console.log(`  ⚡ energySpent  : ${num(s2.energySpent)}   |   run1 ${num(s1.energySpent)}`)
        console.log(`  👟 steps        : ${num(s2.steps)}   |   run1 ${num(s1.steps)}`)
        console.log(`  🏟️ leagueEnergySpent (podium Ligue) : ${s2.leagueEnergySpent ?? "(absent → 0)"}`)
    }

    // Sprites custom d'Embi (Bidouzen)
    console.log("\n═══ Sprites custom (fichiers en place ?) ═══")
    for (const p of ["bidouzen", "medisciple", "karatame", "sepulcru", "macabour", "condombre"]) {
        const path = `public/yellow/sprites/dex/${p}.png`
        console.log(`  ${existsSync(path) ? "✅" : "❌"} ${path}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
