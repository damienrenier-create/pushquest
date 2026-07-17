// LECTURE SEULE — état des arènes RUN 2 de Mools (monde ngplusWorld) : quels dresseurs d'arène battus,
// badges run 2, CT possédées, revanches déjà faites. Sert à décider du reset sans dupliquer les récompenses.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const ARENA_MAPS = ["yellow_arena", "yellow_arena_roche", "yellow_arena_feu", "yellow_arena_elec", "yellow_arena_eau"]

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = prog?.flags as { activeWorld?: string; ngplusWorld?: Record<string, unknown> } | undefined
    const w = f?.ngplusWorld
    if (!w) { console.log("Pas de ngplusWorld"); return }
    const arenaLike = (id: string) => id.includes("arena")
    const defeated = (w.defeatedTrainers as string[] ?? [])
    const rematched = (w.rematchedTrainers as string[] ?? [])
    console.log(`activeWorld=${f?.activeWorld}`)
    console.log(`ngplusWorld.badges = ${JSON.stringify(w.badges ?? [])}`)
    console.log(`ngplusWorld.ownedCts = ${JSON.stringify(w.ownedCts ?? [])}`)
    console.log(`ngplusWorld dresseurs d'ARÈNE battus (${defeated.filter(arenaLike).length}) : ${defeated.filter(arenaLike).join(", ") || "(aucun)"}`)
    console.log(`ngplusWorld revanches faites (rematched, arène) : ${rematched.filter(arenaLike).join(", ") || "(aucune)"}`)
    // Tickets roulette en file (labDefi.grantedTickets)
    const ld = (w.labDefi as Record<string, unknown>) ?? {}
    console.log(`ngplusWorld tickets en file = ${JSON.stringify(ld.grantedTickets ?? [])}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
