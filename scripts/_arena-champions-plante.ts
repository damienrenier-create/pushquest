// LECTURE SEULE — liste les équipes de champions d'arène (badge plante + ngplus:plante) pour re-curer un
// boss d'arène 1 run 3 PLUS FAIBLE. Trie par somme de niveaux croissante.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.arenaChampion.findMany({
        where: { badgeId: { in: ["plante", "ngplus:plante", "feu", "eau", "roche", "elec"] } },
        select: { nickname: true, badgeId: true, team: true },
    })
    if (rows[0]) console.log("STRUCTURE team[0] =", JSON.stringify(rows[0].team).slice(0, 200), "\n")
    const scored = rows.map((r) => {
        let raw: unknown = r.team
        if (typeof raw === "string") { try { raw = JSON.parse(raw) } catch { raw = [] } }
        const team = (Array.isArray(raw) ? raw : (raw && typeof raw === "object" && Array.isArray((raw as { team?: unknown }).team) ? (raw as { team: unknown[] }).team : [])) as Array<{ speciesId?: string; level?: number }>
        const sum = team.reduce((a, m) => a + (m.level ?? 0), 0)
        const maxLvl = team.reduce((a, m) => Math.max(a, m.level ?? 0), 0)
        return { nickname: r.nickname, badge: r.badgeId, n: team.length, sum, maxLvl, team: team.map((m) => `${m.speciesId} L${m.level}`) }
    }).sort((a, b) => a.sum - b.sum)
    console.log(`=== ${scored.length} équipes de champions (triées par Σ niveaux croissante) ===`)
    for (const s of scored.slice(0, 14)) {
        console.log(`\n[${s.badge}] ${s.nickname} — ${s.n} Daemons · Σ${s.sum} · max L${s.maxLvl}`)
        console.log(`   ${s.team.join(", ")}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
