// LECTURE SEULE — dump des sacres LeagueChampion de Mools (id, date, world, équipe) pour identifier run 1 vs run 2.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const lc = (prisma as any).leagueChampion
    const rows = await lc.findMany({ where: { userId: u.id }, orderBy: { wonAt: "asc" }, select: { id: true, wonAt: true, world: true, team: true } })
    console.log(`=== ${rows.length} sacres de ${u.nickname} ===`)
    for (const r of rows) {
        let team: any[] = []
        try { team = JSON.parse(r.team) } catch {}
        const species = team.map((m: any) => `${m.speciesId} N${m.level}`).join(", ")
        console.log(`\nid=${r.id}`)
        console.log(`   ${new Date(r.wonAt).toISOString().slice(0, 10)} · world=${r.world}`)
        console.log(`   équipe: ${species}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
