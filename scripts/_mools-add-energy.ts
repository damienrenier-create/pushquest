// AJOUT +4000 énergie à Mools (autorisé) : il a lancé son run 2 avec 6000 ; la nouvelle base est 10000.
// On ajoute donc 4000 à son énergie RUN 2 (flags.ngplusWorld.reps) + on relève son plafond de 4000.
// Dry-run par défaut ; --write pour appliquer. Backup + relecture immédiate.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const WRITE = process.argv.includes("--write")
const ADD = 4000
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-energy-backup.json"

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    if (!prog) { console.log("pas de save"); return }
    const save = prog.flags as Record<string, unknown>
    writeFileSync(BACKUP, JSON.stringify(save, null, 2)); console.log(`Backup: ${BACKUP}`)

    const w = save.ngplusWorld as Record<string, unknown> | null
    if (!w) { console.log("⚠️ Pas de ngplusWorld — ABORT"); return }
    const reps = (w.reps as number) ?? 0
    const cap = (w.repsCap as number) ?? 1000
    console.log(`activeWorld=${save.activeWorld} · ngplusWorld : reps=${reps} · repsCap=${cap}`)
    const newCap = cap + ADD
    const newReps = Math.min(reps + ADD, newCap)
    console.log(`→ reps ${reps} → ${newReps}  ·  repsCap ${cap} → ${newCap}`)

    if (!WRITE) { console.log("\n[DRY-RUN] Rien écrit. Relance avec --write."); return }
    w.reps = newReps; w.repsCap = newCap
    save.ngplusWorld = w
    const before = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { updatedAt: true } })
    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: save as never } })
    const after = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const wa = (after?.flags as { ngplusWorld?: { reps?: number; repsCap?: number } })?.ngplusWorld
    console.log(`\n✅ ÉCRIT. Relecture : reps=${wa?.reps} repsCap=${wa?.repsCap}. Mools doit RECHARGER (et ne pas jouer pendant l'écriture).`)
    console.log(`   updatedAt avant=${before?.updatedAt?.toISOString()}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
