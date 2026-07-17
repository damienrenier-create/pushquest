// ÉCRITURE PROD (autorisée) — remet Mools à 500⚡ en run 3 + nettoie les fuites (ticket roulette, énergie poker,
// crédit roulette) qui n'auraient jamais dû exister. BACKUP complet avant + READBACK après. Ne touche QU'au run3World.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-flags-backup-run3.json"
const RUN3_START = 500

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
    if (!r3) { console.log("⚠️ Pas en run 3 (run3World absent) — je NE touche à rien. (dis-moi s'il faut agir ailleurs)"); return }

    const d = (r3.labDefi ?? {}) as Record<string, any>
    console.log(`AVANT : reps=${r3.reps} · repsCap=${r3.repsCap} · tickets=${JSON.stringify(d.grantedTickets)} · rouletteCredit=${d.rouletteCredit}`)

    // Reset : 500⚡ pile, on efface les fuites (tickets + crédit roulette). On NE touche PAS à l'équipe/pokédex/badges.
    r3.reps = RUN3_START
    if (d) {
        d.grantedTickets = []
        d.grantedTicketOrigins = []
        d.rouletteCredit = 0
        r3.labDefi = d
    }

    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: s } })
    console.log("Écriture faite.")

    const back = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const rb = (back?.flags as any).run3World
    const db = rb.labDefi ?? {}
    console.log(`APRÈS : reps=${rb.reps} · tickets=${JSON.stringify(db.grantedTickets)} · rouletteCredit=${db.rouletteCredit}`)
    console.log(`Préservé : équipe=${(rb.team as any[])?.length} Daemons · badges=${JSON.stringify(rb.badges)}`)
    console.log(rb.reps === RUN3_START ? "✅ Mools remis à 500⚡ (fuites effacées)" : "❌ ÉCHEC")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
