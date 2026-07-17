// ÉCRITURE PROD — re-tag du sacre Ligue run 2 de Mools (Ukognos/Alirocaillus, 09/07) : world "live" → "ngplus".
// 22/06 et 06/07 = run 1 (confirmé par Sartay) → INCHANGÉS. Ciblé par id, backup + readback.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const TARGET_ID = "cmrdxmtm100595y1v0nel5bmi" // 09/07 · ukognos, alirocaillus, ... = run 2

async function main() {
    const lc = (prisma as any).leagueChampion
    const before = await lc.findUnique({ where: { id: TARGET_ID }, select: { id: true, wonAt: true, world: true, team: true } })
    if (!before) { console.log(`❌ Sacre ${TARGET_ID} introuvable — abandon`); return }
    let team: any[] = []; try { team = JSON.parse(before.team) } catch {}
    const species = team.map((m: any) => m.speciesId).join(", ")
    console.log(`AVANT : ${new Date(before.wonAt).toISOString().slice(0, 10)} · world=${before.world}`)
    console.log(`   équipe : ${species}`)
    if (!species.includes("ukognos")) { console.log("⚠️  Garde-fou : l'équipe ne contient pas ukognos — abandon (mauvaise ligne ?)"); return }
    if (before.world === "ngplus") { console.log("✅ Déjà taggé ngplus — rien à faire"); return }

    await lc.update({ where: { id: TARGET_ID }, data: { world: "ngplus" } })
    const after = await lc.findUnique({ where: { id: TARGET_ID }, select: { world: true } })
    console.log(`APRÈS : world=${after?.world}`)
    console.log(after?.world === "ngplus" ? "✅ Re-tag réussi (09/07 → RUN 2)" : "❌ Re-tag NON confirmé")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
