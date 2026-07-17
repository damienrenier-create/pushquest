// LECTURE SEULE — état de complétion du run 2 de Mools (diagnostic bug "gagné sans battre l'ancienne équipe").
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true, updatedAt: true } })
    const s = prog?.flags as Record<string, unknown> | undefined
    if (!s) { console.log("pas de save"); return }
    console.log(`updatedAt = ${prog?.updatedAt?.toISOString()}`)
    console.log(`=== TOP-LEVEL (= monde run 1 / live) ===`)
    console.log(`activeWorld = ${s.activeWorld}`)
    console.log(`ngplusUsed = ${s.ngplusUsed} · run3Used = ${s.run3Used}`)
    console.log(`ngplusWorld présent ? ${s.ngplusWorld ? "OUI" : "NON (⚠️ fusionné/absent)"}`)
    console.log(`run3World présent ? ${s.run3World ? "OUI" : "non"}`)
    const oldTeam = s.ngplusOldTeam as Array<{ speciesId?: string; level?: number }> | null
    console.log(`ngplusOldTeam = ${oldTeam ? `${oldTeam.length} Daemons [${oldTeam.map((m) => `${m.speciesId} L${m.level}`).join(", ")}]` : "NULL ⚠️"}`)
    console.log(`isChampion (top/run1) = ${s.isChampion}`)

    const ng = s.ngplusWorld as Record<string, unknown> | undefined
    if (ng) {
        console.log(`\n=== ngplusWorld (run 2) ===`)
        console.log(`isChampion = ${ng.isChampion}`)
        console.log(`badges = ${JSON.stringify(ng.badges)}`)
        const team = (ng.team as Array<{ speciesId?: string; level?: number }>) ?? []
        console.log(`équipe run 2 = ${team.map((m) => `${m.speciesId} L${m.level}`).join(", ")}`)
        const dt = (ng.defeatedTrainers as string[]) ?? []
        console.log(`y_ligue_maitre battu ? ${dt.includes("y_ligue_maitre") ? "OUI" : "non"}`)
        console.log(`dresseurs Ligue battus : ${dt.filter((t) => t.includes("ligue")).join(", ") || "aucun"}`)
        console.log(`reps=${ng.reps}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
