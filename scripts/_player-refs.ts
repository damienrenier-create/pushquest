// LECTURE SEULE — reconstitue ce qu'un joueur a PERDU : compare sa save yellow ACTUELLE aux SNAPSHOTS
// serveur gelés (ArenaChampion = équipe à chaque badge, LeagueChampion = équipe au sacre). Aucune écriture.
//   PLAYER=Franss npx tsx scripts/_player-refs.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const NAME = process.env.PLAYER || "Franss"

type Mon = { speciesId?: string; level?: number; nickname?: string; moves?: unknown }
function line(m: Mon): string {
    const mv = Array.isArray(m.moves) ? (m.moves as unknown[]).map((x) => (typeof x === "string" ? x : (x as { moveId?: string })?.moveId)).join("/") : ""
    return `${m.speciesId} N${m.level}${m.nickname ? ` "${m.nickname}"` : ""}${mv ? ` [${mv}]` : ""}`
}
function teamLines(team: Mon[] | undefined): string {
    if (!team?.length) return "    —"
    return team.map((m) => "    " + line(m)).join("\n")
}

async function main() {
    const users = await prisma.user.findMany({ where: { nickname: { equals: NAME, mode: "insensitive" } }, select: { id: true, nickname: true, email: true } })
    for (const u of users) {
        console.log(`\n████ ${u.nickname} <${u.email}> (${u.id}) ████`)
        // Save actuelle
        const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true, updatedAt: true } })
        const cur = row?.flags as { team?: Mon[]; isChampion?: boolean } | null
        console.log(`\n── SAVE ACTUELLE (maj ${row ? new Date(row.updatedAt).toISOString() : "?"}, champion=${cur?.isChampion === true}) ──`)
        console.log(teamLines(cur?.team))

        // LeagueChampion (sacres) — la référence la plus forte
        const lc = await (prisma as any).leagueChampion.findMany({ where: { userId: u.id }, orderBy: { wonAt: "desc" } })
        console.log(`\n── LeagueChampion : ${lc.length} sacre(s) ──`)
        for (const r of lc) {
            let team: Mon[] = []
            try { team = JSON.parse(r.team) } catch { /* */ }
            console.log(`  🏆 sacre ${new Date(r.wonAt).toISOString()} :`)
            console.log(teamLines(team))
        }

        // ArenaChampion (chaque badge) — photos datées de l'équipe
        const ac = await (prisma as any).arenaChampion.findMany({ where: { userId: u.id }, orderBy: { wonAt: "desc" } })
        console.log(`\n── ArenaChampion : ${ac.length} badge(s) gelé(s) ──`)
        for (const r of ac) {
            let team: Mon[] = []
            try { team = JSON.parse(r.team) } catch { /* */ }
            console.log(`  🥇 badge "${r.badgeId}" ${new Date(r.wonAt).toISOString()} :`)
            console.log(teamLines(team))
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
