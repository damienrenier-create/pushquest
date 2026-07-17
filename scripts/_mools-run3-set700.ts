// ÉCRITURE PROD (autorisée) — Mools a battu l'arène 3 : nouvelle règle → reps = 700 (plafond arène 3),
// repsCap = 1000 (le repsCap avait été gonflé à 1250 par le bonus badge, désormais neutralisé en run 3).
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-flags-backup-run3-set700.json"

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const s = prog?.flags as Record<string, any> | undefined
    if (!s) { console.log("pas de save"); return }
    writeFileSync(BACKUP, JSON.stringify(s, null, 2))
    const r3 = s.run3World as Record<string, any> | undefined
    if (!r3) { console.log("⚠️ Pas en run 3 — rien à faire"); return }
    console.log(`AVANT : reps=${r3.reps} · repsCap=${r3.repsCap} · badges=${JSON.stringify(r3.badges)}`)

    r3.reps = Math.min(700, r3.reps ?? 700) < 700 ? 700 : 700 // reps = 700 pile (plafond arène 3)
    r3.reps = 700
    r3.repsCap = 1000

    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: s } })
    const back = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const rb = (back?.flags as any).run3World
    console.log(`APRÈS : reps=${rb.reps} · repsCap=${rb.repsCap} · badges=${JSON.stringify(rb.badges)} · équipe=${(rb.team as any[])?.length}`)
    console.log(rb.reps === 700 && rb.repsCap === 1000 ? "✅ Mools : 700⚡ / plafond 1000" : "❌ ÉCHEC")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
