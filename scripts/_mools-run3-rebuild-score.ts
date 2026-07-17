// ÉCRITURE PROD (autorisée) — reconstruit le run3Defeated de Mools pour les arènes 1 (plante) & 2 (roche)
// qu'il a battues AVANT le déploiement du tracking. Le score = Σ niveaux des Daemons de BOSS vaincus (le
// système ne compte QUE les boss + la Ligue, pas les gardiens). BACKUP + READBACK.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
import { run3ArenaBossTeam } from "../src/lib/gamebook/yellow/data/run3Bosses"
import { bossEnemyKey, run3Score } from "../src/lib/gamebook/yellow/data/run3Score"
const prisma = new PrismaClient()
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-flags-backup-run3-score.json"

function bossEntries(badge: string) {
    return run3ArenaBossTeam(badge).map((m, i) => ({ key: bossEnemyKey(badge, i), level: m.level }))
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const s = prog?.flags as Record<string, any> | undefined
    if (!s) { console.log("pas de save"); return }
    writeFileSync(BACKUP, JSON.stringify(s, null, 2))
    const r3 = s.run3World as Record<string, any> | undefined
    if (!r3) { console.log("⚠️ Pas en run 3 — rien à faire"); return }

    // Arènes 1 & 2 = badges plante + roche (il les a : badges = ["plante","roche"]).
    const entries = [...bossEntries("plante"), ...bossEntries("roche")]
    console.log(`Boss plante+roche : ${entries.length} Daemons · niveaux = ${entries.map((e) => e.level).join(", ")}`)
    console.log(`Score reconstruit = ${run3Score(entries)}`)
    console.log(`AVANT : run3Defeated = ${(r3.run3Defeated as any[])?.length ?? 0} entrées`)

    // Fusion (dédup par clé) avec l'existant éventuel — au cas où le tracking aurait déjà crédité quelque chose.
    const existing = Array.isArray(r3.run3Defeated) ? r3.run3Defeated as { key: string; level: number }[] : []
    const seen = new Set(existing.map((e) => e.key))
    r3.run3Defeated = [...existing, ...entries.filter((e) => !seen.has(e.key))]

    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: s } })

    const back = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const rb = (back?.flags as any).run3World
    console.log(`APRÈS : run3Defeated = ${(rb.run3Defeated as any[]).length} entrées · score = ${run3Score(rb.run3Defeated)}`)
    console.log(`Préservé : reps=${rb.reps} · badges=${JSON.stringify(rb.badges)} · équipe=${(rb.team as any[])?.length}`)
    console.log("✅ Score de Mools reconstruit (arènes 1-2)")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
