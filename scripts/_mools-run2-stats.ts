// LECTURE SEULE — stats run 2 de Mools (ngplusWorld) pour calibrer la formule de score /1000.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const w = (prog?.flags as { ngplusWorld?: Record<string, unknown> })?.ngplusWorld
    if (!w) { console.log("pas de ngplusWorld"); return }
    const s = (w.stats as Record<string, number>) ?? {}
    const team = (w.team as Array<{ level?: number }>) ?? []
    const dex = (w.pokedex as { caught?: string[] }) ?? {}
    const teamLevels = team.reduce((a, m) => a + (m.level ?? 0), 0)
    console.log("=== Mools RUN 2 ===")
    console.log(`reps=${w.reps} · repsCap=${w.repsCap} · playtimeMs=${w.playtimeMs}`)
    console.log(`stats: battles=${s.battles} wins=${s.wins} teamKos=${s.teamKos} steps=${s.steps}`)
    console.log(`équipe: ${team.length} Daemons, Σniveaux=${teamLevels}`)
    console.log(`espèces capturées (run 2)=${(dex.caught ?? []).length}`)
    const winRateBattles = s.battles ? (s.wins / s.battles) : 0
    const winRateDecisive = (s.wins + (s.teamKos ?? 0)) ? (s.wins / (s.wins + (s.teamKos ?? 0))) : 0
    console.log(`win% (wins/battles)=${(winRateBattles * 100).toFixed(1)}%  ·  win% (wins/(wins+défaites))=${(winRateDecisive * 100).toFixed(1)}%`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
