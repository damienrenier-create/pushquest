// LECTURE SEULE — état réel du score run 3 de Mools (run3Defeated + détail par arène).
import { PrismaClient } from "@prisma/client"
import { run3ArenaBossTeam } from "../src/lib/gamebook/yellow/data/run3Bosses"
import { bossEnemyKey, run3Score } from "../src/lib/gamebook/yellow/data/run3Score"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const r3 = (prog?.flags as any)?.run3World
    if (!r3) { console.log("pas en run 3"); return }
    const defeated = (r3.run3Defeated ?? []) as { key: string; level: number }[]
    console.log(`badges = ${JSON.stringify(r3.badges)} · reps=${r3.reps}`)
    console.log(`run3Defeated = ${defeated.length} entrées · SCORE = ${run3Score(defeated)}`)
    console.log(`clés :`)
    for (const e of defeated) console.log(`   ${e.key} (niv ${e.level})`)
    // Ce qu'on ATTEND s'il a bien battu les 3 boss (plante+roche+feu) :
    const expected = ["plante", "roche", "feu"].flatMap((b) => run3ArenaBossTeam(b).map((m, i) => ({ key: bossEnemyKey(b, i), level: m.level })))
    console.log(`\nATTENDU (boss plante+roche+feu) = ${expected.length} entrées · score ${run3Score(expected)}`)
    const have = new Set(defeated.map((e) => e.key))
    const missing = expected.filter((e) => !have.has(e.key))
    console.log(`MANQUANT dans sa save : ${missing.length} entrées → ${missing.map((e) => e.key).join(", ") || "aucune ✅"}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
