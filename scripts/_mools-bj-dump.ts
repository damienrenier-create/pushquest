// LECTURE SEULE — état blackjack/CT run 2 de Mools, pour décider quoi nettoyer.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const BOSS_CTS = ["ct53", "ct54", "ct55", "ct56", "ct57"]

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const save = prog?.flags as Record<string, unknown> | undefined
    if (!save) { console.log("pas de save"); return }
    console.log(`activeWorld = ${save.activeWorld}`)
    const w = save.ngplusWorld as Record<string, unknown> | undefined
    if (!w) { console.log("⚠️ pas de ngplusWorld"); return }

    const owned = (w.ownedCts as string[]) ?? []
    const ld = (w.labDefi as Record<string, unknown>) ?? {}
    const team = (w.team as Array<{ speciesId?: string; nickname?: string; moves?: string[] }>) ?? []
    console.log("=== Mools ngplusWorld ===")
    console.log(`ownedCts (${owned.length}) : ${owned.join(", ")}`)
    console.log(`  → CT de boss possédées : ${owned.filter((c) => BOSS_CTS.includes(c)).join(", ") || "aucune"}`)
    console.log(`labDefi.blackjackNgplusPicks = ${ld.blackjackNgplusPicks}`)
    console.log(`labDefi.blackjackWon = ${ld.blackjackWon}`)
    console.log(`defeatedTrainers = ${JSON.stringify(w.defeatedTrainers ?? [])}`)
    console.log(`rematchedTrainers = ${JSON.stringify(w.rematchedTrainers ?? [])}`)
    // Les moves de boss (ct53-57) ont-ils déjà été enseignés à un Daemon d'équipe ?
    const BOSS_MOVES = ["serres_aube", "onde_cerebrale", "danse_fauve", "essaim_vorace", "frappe_atlas"]
    for (const m of team) {
        const bm = (m.moves ?? []).filter((mv) => BOSS_MOVES.includes(mv))
        if (bm.length) console.log(`  ⚠️ ${m.nickname ?? m.speciesId} connaît déjà : ${bm.join(", ")}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
