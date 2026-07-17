// CORRECTION (autorisée) : l'entrée ArenaChampion de Mools pour l'arène 1 gagnée EN RUN 2 (équipe L12-23
// avec crocodaillus) a été enregistrée en "plante" (run 1) car gagnée avant le fix. On la re-tague en
// "ngplus:plante" → elle n'apparaît plus que dans le HoF des joueurs run 2. Dry-run par défaut ; --write pour appliquer.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const WRITE = process.argv.includes("--write")
const TARGET_ID = "cmrb2ekxd000ii1v2nkji4bbk" // entrée [plante] 2026-07-07 (identifiée par dump)

async function main() {
    const ac = (prisma as any).arenaChampion
    const row = await ac.findUnique({ where: { id: TARGET_ID }, select: { id: true, nickname: true, badgeId: true, team: true, wonAt: true } })
    if (!row) { console.log("⚠️ Entrée introuvable — déjà corrigée ?"); return }
    let team: Array<{ speciesId?: string; level?: number }> = []
    try { team = JSON.parse(row.team) } catch { /* ignore */ }
    console.log(`Cible: [${row.badgeId}] ${row.nickname} ${new Date(row.wonAt).toISOString()}`)
    console.log(`  équipe: ${team.map((m) => `${m.speciesId} L${m.level}`).join(", ")}`)

    if (row.badgeId !== "plante") { console.log(`⚠️ badgeId = "${row.badgeId}" (attendu "plante") — ABORT par sécurité.`); return }
    // Garde-fou : confirmer que c'est bien une équipe RUN 2 (bas niveau / crocodaillus), pas la team run 1.
    const looksRun2 = team.some((m) => m.speciesId === "crocodaillus") || team.every((m) => (m.level ?? 99) <= 30)
    if (!looksRun2) { console.log("⚠️ L'équipe ne ressemble PAS à un run 2 — ABORT."); return }

    console.log(`\n→ Re-tag: "plante"  ⇒  "ngplus:plante"`)
    if (!WRITE) { console.log("[DRY-RUN] Rien écrit. Relance avec --write."); return }
    await ac.update({ where: { id: TARGET_ID }, data: { badgeId: "ngplus:plante" } })
    const after = await ac.findUnique({ where: { id: TARGET_ID }, select: { badgeId: true } })
    console.log(`✅ ÉCRIT. badgeId = "${after?.badgeId}"`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
