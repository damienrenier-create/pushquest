// RESET (autorisé) des ARÈNES 1-3 run 2 de Mools : il les re-fait DEPUIS LE DÉBUT (combat re-typé + revanche).
// - ngplusWorld.defeatedTrainers : retire les 15 dresseurs des arènes 1-3 (plante/roche/feu) → re-combattables.
// - ngplusWorld.labDefi.grantedTickets : retire 1×10 + 1×20 + 1×30 (= tickets re-typés qu'il re-gagnera) → pas
//   de double récompense (les CT ne se dupliquent pas : grantCt idempotent).
// GARDE : badges, ownedCts, équipe, énergie, arènes 4-5, tout le reste. Dry-run par défaut ; --write pour écrire.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const WRITE = process.argv.includes("--write")
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-backup.json"

const isArena13 = (id: string) => /^y_(arena|rocharena|feuarena)_/.test(id) // plante/roche/feu (PAS élec/eau)

/** Retire une occurrence de chaque valeur cible d'un tableau de tickets + du tableau d'origines aligné. */
function removeTickets(tickets: number[], origins: string[], toRemove: number[]): { tickets: number[]; origins: string[]; removed: number[] } {
    const t = [...tickets], o = [...origins], removed: number[] = []
    for (const val of toRemove) {
        const i = t.indexOf(val)
        if (i >= 0) { t.splice(i, 1); if (i < o.length) o.splice(i, 1); removed.push(val) }
    }
    return { tickets: t, origins: o, removed }
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    if (!prog) { console.log("pas de save"); return }
    const save = prog.flags as Record<string, unknown>
    writeFileSync(BACKUP, JSON.stringify(save, null, 2)); console.log(`Backup: ${BACKUP}`)

    const w = save.ngplusWorld as Record<string, unknown> | null
    if (!w) { console.log("⚠️ Pas de ngplusWorld — ABORT"); return }

    const defeated = (w.defeatedTrainers as string[]) ?? []
    const removed = defeated.filter(isArena13)
    const keptDefeated = defeated.filter((id) => !isArena13(id))
    console.log(`\ndefeatedTrainers : retire ${removed.length} dresseurs (arènes 1-3) → ${removed.join(", ")}`)
    console.log(`  reste ${keptDefeated.length} (dont arènes 4-5 : ${keptDefeated.filter((id) => /arena/.test(id)).join(", ") || "aucun"})`)

    const ld = (w.labDefi as Record<string, unknown>) ?? {}
    const tickets = (ld.grantedTickets as number[]) ?? []
    const origins = (ld.grantedTicketOrigins as string[]) ?? []
    const { tickets: newTickets, origins: newOrigins, removed: removedT } = removeTickets(tickets, origins, [10, 20, 30])
    console.log(`\ntickets : ${tickets.length} → ${newTickets.length} (retirés : ${removedT.join(", ") || "aucun"})`)

    if (!WRITE) { console.log("\n[DRY-RUN] Rien écrit. Relance avec --write."); return }
    w.defeatedTrainers = keptDefeated
    ;(w.labDefi as Record<string, unknown>) = { ...ld, grantedTickets: newTickets, grantedTicketOrigins: newOrigins }
    save.ngplusWorld = w
    const before = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { updatedAt: true } })
    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: save as never } })
    const after = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const wa = (after?.flags as { ngplusWorld?: { defeatedTrainers?: string[] } })?.ngplusWorld
    const stillArena = (wa?.defeatedTrainers ?? []).filter(isArena13).length
    console.log(`\n✅ ÉCRIT. Relecture : dresseurs arène 1-3 restants = ${stillArena} (attendu 0). Mools doit RECHARGER (et ne pas jouer pendant l'écriture).`)
    console.log(`   updatedAt avant=${before?.updatedAt?.toISOString()}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
