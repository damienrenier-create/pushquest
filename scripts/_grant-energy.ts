// CADEAU D'ÉNERGIE (admin) : crédite AMOUNT reps HORS-PLAFOND à un joueur (repsCap += AMOUNT ET reps += AMOUNT,
// façon grantBonusEnergyUncapped → le don n'est pas raboté au plafond). Backup de l'ORIGINAL dans history.
// Dry-run par défaut. Écriture réelle avec CONFIRM=yes.
//   Dry-run : PLAYER=Guillaume AMOUNT=2000 npx tsx scripts/_grant-energy.ts
//   Réel    : PLAYER=Guillaume AMOUNT=2000 CONFIRM=yes npx tsx scripts/_grant-energy.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const NAME = process.env.PLAYER || ""
const AMOUNT = Math.max(0, Math.floor(Number(process.env.AMOUNT || "0")))

async function main() {
    if (!NAME || AMOUNT <= 0) { console.error("❌ PLAYER=<nom> AMOUNT=<n> requis."); return }
    const users = await prisma.user.findMany({ where: { nickname: { equals: NAME, mode: "insensitive" } }, select: { id: true, nickname: true, email: true } })
    if (users.length !== 1) { console.error(`❌ ${users.length} joueur(s) « ${NAME} » (attendu 1) :`, users.map((u) => u.nickname)); return }
    const u = users[0]
    const row = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        select: { flags: true, history: true, updatedAt: true },
    })
    if (!row?.flags) { console.error("❌ Pas de save yellow."); return }
    const original = JSON.parse(JSON.stringify(row.flags))
    const flags = row.flags as { reps?: number; repsCap?: number }
    const beforeReps = typeof flags.reps === "number" ? flags.reps : 0
    const beforeCap = typeof flags.repsCap === "number" ? flags.repsCap : 1000
    flags.reps = beforeReps + AMOUNT
    flags.repsCap = beforeCap + AMOUNT // hors-plafond → le don entier est utilisable
    console.log(`${u.nickname} <${u.email}> · maj ${new Date(row.updatedAt).toISOString()}`)
    console.log(`  reps  ${beforeReps} → ${flags.reps}`)
    console.log(`  cap   ${beforeCap} → ${flags.repsCap}   (+${AMOUNT} hors-plafond)`)
    if (process.env.CONFIRM !== "yes") { console.log("\n🟡 DRY-RUN — aucune écriture. Relance avec CONFIRM=yes pour appliquer."); return }
    const prevHist = Array.isArray(row.history) ? (row.history as unknown[]) : []
    const history = [...prevHist, { at: new Date().toISOString(), reason: `admin-gift-energy-${AMOUNT}`, flags: original }].slice(-6)
    await prisma.gamebookProgress.update({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        data: { flags: flags as object, history: history as unknown as object },
    })
    console.log(`\n✅ +${AMOUNT}⚡ crédités à ${u.nickname}. Original conservé dans history (réversible). Il doit RECHARGER le jeu pour voir le crédit.`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
