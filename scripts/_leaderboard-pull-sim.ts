// LECTURE SEULE — simule le nouveau GET « pull » (calcul depuis les saves) pour voir le classement réel.
//   npx tsx scripts/_leaderboard-pull-sim.ts
import { PrismaClient } from "@prisma/client"
import { computeGrade } from "../src/lib/gamebook/yellow/score/runScoreCompute"
import { run3Score } from "../src/lib/gamebook/yellow/data/run3Score"
const prisma = new PrismaClient()
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0)

function run2FromWorld(w: any) {
    if (!w || typeof w !== "object") return null
    const stats = w.stats ?? {}
    const team = Array.isArray(w.team) ? w.team : []
    const caught = Array.isArray(w.caughtThisRun) ? w.caughtThisRun : [] // run-2 uniquement
    const teamLevels = team.reduce((s: number, m: any) => s + num(m?.level), 0)
    const { grade } = computeGrade({ wins: num(stats.wins), teamKos: num(stats.teamKos), caught, teamLevels, energyConsumed: num(stats.energySpent), steps: num(stats.steps) })
    return { grade, leagueReps: num(stats.leagueEnergySpent) }
}

async function main() {
    const saves = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true, user: { select: { nickname: true } } } })
    const run2: any[] = [], run3: any[] = []
    for (const s of saves) {
        const f = (s.flags ?? {}) as any
        const nick = s.user?.nickname ?? "?"
        const world = f.activeWorld
        if (world === "ngplus") {
            const r2 = run2FromWorld(f.ngplusWorld)
            if (r2) run2.push({ nick, score: r2.grade, leagueReps: r2.leagueReps, live: true })
        }
        if (world === "run3") {
            const def = f.run3World?.run3Defeated
            if (Array.isArray(def) && def.length) run3.push({ nick, score: run3Score(def), live: true })
        }
    }
    // fallback table (fusionnés)
    const rs = (prisma as any).yellowRunScore
    const rows = await rs.findMany({ orderBy: { wonAt: "desc" }, select: { userId: true, nickname: true, run: true, score: true } })
    const has = (arr: any[], nick: string) => arr.some(e => e.nick === nick)
    for (const r of rows) {
        const arr = r.run === "run2" ? run2 : r.run === "run3" ? run3 : null
        if (arr && !has(arr, r.nickname)) arr.push({ nick: r.nickname, score: r.score, live: false })
    }
    console.log("\n🏅 CLASSEMENT RUN 2 (/1000) :")
    run2.sort((a, b) => b.score - a.score).forEach((e, i) => console.log(`  ${i + 1}. ${e.nick.padEnd(10)} ${String(e.score).padStart(4)} /1000  ${e.live ? "🟢live" : "⚪figé"}  (reps Ligue: ${e.leagueReps ?? "?"})`))
    console.log("\n🏆 CLASSEMENT RUN 3 (pts) :")
    run3.sort((a, b) => b.score - a.score).forEach((e, i) => console.log(`  ${i + 1}. ${e.nick.padEnd(10)} ${String(e.score).padStart(5)} pts  ${e.live ? "🟢live" : "⚪figé"}`))
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
