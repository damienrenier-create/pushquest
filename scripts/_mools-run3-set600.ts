// ÉCRITURE PROD (autorisée) — Mools vient de battre l'arène 2 du run 3 → nouvelle règle : il repart avec 600⚡
// (recharge JUSQU'À 600, plafond du run 3 = 1000). BACKUP complet avant + READBACK après. Ne touche QU'au run3World.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-flags-backup-run3-set600.json"
const TARGET_REPS = 600
const TARGET_CAP = 1000

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const s = prog?.flags as Record<string, any> | undefined
    if (!s) { console.log("pas de save"); return }
    writeFileSync(BACKUP, JSON.stringify(s, null, 2))
    console.log(`Backup → ${BACKUP}`)
    console.log(`activeWorld = ${s.activeWorld} · run3World présent ? ${s.run3World ? "OUI" : "NON"}`)

    const r3 = s.run3World as Record<string, any> | undefined
    if (!r3) { console.log("⚠️ Pas en run 3 (run3World absent) — je NE touche à rien."); return }

    console.log(`AVANT : reps=${r3.reps} · repsCap=${r3.repsCap} · badges=${JSON.stringify(r3.badges)}`)

    // 600⚡ pile (plafond arène 2) + repsCap aligné sur le nouveau max du run 3 (1000). On NE touche PAS
    // à l'équipe/pokédex/badges/score.
    r3.reps = TARGET_REPS
    r3.repsCap = TARGET_CAP

    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: s } })
    console.log("Écriture faite.")

    const back = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const rb = (back?.flags as any).run3World
    console.log(`APRÈS : reps=${rb.reps} · repsCap=${rb.repsCap}`)
    console.log(`Préservé : équipe=${(rb.team as any[])?.length} Daemons · badges=${JSON.stringify(rb.badges)} · run3Defeated=${(rb.run3Defeated as any[])?.length ?? 0} entrées`)
    console.log(rb.reps === TARGET_REPS && rb.repsCap === TARGET_CAP ? "✅ Mools remis à 600⚡ (cap 1000)" : "❌ ÉCHEC")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
