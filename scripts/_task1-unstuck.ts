// ÉCRITURE PROD — débloque Task1 : il est figé à yellow_ligue_dragon (19,5), progression Ligue déjà resettée
// (defeatedTrainers vide), équipe soignée. On le remet là où le whiteout aurait dû l'envoyer : infirmerie (4,3).
// Garde-fou : on n'agit QUE s'il est bien dans une salle de Ligue. Backup (log avant) + readback.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Task1", mode: "insensitive" } }, select: { id: true } })
    if (!u) { console.log("❌ Task1 introuvable"); return }
    const row = (await prisma.gamebookProgress.findFirst({ where: { userId: u.id, chapterId: "yellow" } })) as any
    if (!row) { console.log("❌ save yellow introuvable"); return }
    console.log(`AVANT : mapId=${row.mapId} pos=(${row.posX},${row.posY}) dir=${row.direction}`)
    if (!String(row.mapId).startsWith("yellow_ligue_")) { console.log("⚠️  Pas dans une salle de Ligue — garde-fou, ABANDON (rien fait)"); return }
    await prisma.gamebookProgress.update({ where: { id: row.id }, data: { mapId: "yellow_infirmary", posX: 4, posY: 3, direction: "down" } })
    const after = (await prisma.gamebookProgress.findUnique({ where: { id: row.id }, select: { mapId: true, posX: true, posY: true, direction: true } })) as any
    console.log(`APRÈS : mapId=${after.mapId} pos=(${after.posX},${after.posY}) dir=${after.direction}`)
    console.log(after.mapId === "yellow_infirmary" ? "✅ Débloqué — Task1 réapparaîtra à l'infirmerie (équipe déjà soignée), Ligue à refaire depuis le début." : "❌ Échec")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
