// LECTURE SEULE — dump de la table ArenaChampion (équipes gelées de joueurs par arène) pour curer
// les 5 boss FIGÉS du run 3 (un vrai joueur par arène, mêmes pour tous).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const BADGES = ["plante", "roche", "feu", "elec", "eau"]

async function main() {
    const ac = (prisma as unknown as { arenaChampion: { findMany: (a: unknown) => Promise<Array<{ nickname: string; badgeId: string; team: string; wonAt: Date }>> } }).arenaChampion
    let rows: Array<{ nickname: string; badgeId: string; team: string; wonAt: Date }> = []
    try { rows = await ac.findMany({ orderBy: { wonAt: "asc" } }) } catch (e) { console.log("table ArenaChampion absente / erreur:", (e as Error).message); return }
    console.log(`Total lignes ArenaChampion : ${rows.length}\n`)
    for (const badge of BADGES) {
        const forBadge = rows.filter((r) => r.badgeId === badge || r.badgeId === `ngplus:${badge}`)
        console.log(`=== ARÈNE badge "${badge}" (${forBadge.length} champions) ===`)
        for (const r of forBadge) {
            let team: Array<{ speciesId?: string; level?: number; shiny?: boolean }> = []
            try { team = JSON.parse(r.team) } catch { /* ignore */ }
            const summary = team.map((m) => `${m.speciesId ?? "?"}${m.shiny ? "✨" : ""} L${m.level ?? "?"}`).join(", ")
            const sumLv = team.reduce((a, m) => a + (m.level ?? 0), 0)
            console.log(`  ${r.badgeId.padEnd(14)} ${r.nickname.padEnd(10)} [Σlv=${sumLv}] ${summary}`)
        }
        console.log("")
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
