// CLEANUP autorisé — Mools (run 2) : le blackjack lui avait donné 2 CT de boss (ct53, ct54) sous l'ANCIENNE
// règle. Nouvelle règle = 1 seule CT du MAGASIN au choix. On :
//   - retire ct53 + ct54 de ownedCts (CT de boss gagnées au blackjack) ; on GARDE ct57 (gift légitime du boss Eau) ;
//   - remet labDefi.blackjackNgplusPicks = 0 (récompense unique non encore réclamée) ;
//   - GARDE blackjackWon (1050 ≥ 500) → sa récompense unique (1 CT du magasin) sera dispo dès qu'il ouvre le blackjack.
// Dry-run par défaut ; --write pour appliquer. Backup + relecture immédiate.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const WRITE = process.argv.includes("--write")
const REMOVE = ["ct53", "ct54"]
const BOSS_MOVES = ["serres_aube", "onde_cerebrale", "danse_fauve", "essaim_vorace", "frappe_atlas"]
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-bj-backup.json"

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    if (!prog) { console.log("pas de save"); return }
    const save = prog.flags as Record<string, unknown>
    writeFileSync(BACKUP, JSON.stringify(save, null, 2)); console.log(`Backup: ${BACKUP}`)

    const w = save.ngplusWorld as Record<string, unknown> | null
    if (!w) { console.log("⚠️ Pas de ngplusWorld — ABORT"); return }
    const owned = ((w.ownedCts as string[]) ?? [])
    const ld = (w.labDefi as Record<string, unknown>) ?? {}
    console.log(`AVANT : ownedCts = ${owned.join(", ")}`)
    console.log(`        blackjackNgplusPicks = ${ld.blackjackNgplusPicks} · blackjackWon = ${ld.blackjackWon}`)

    // Sécurité : vérifier qu'aucun Daemon (équipe + PC) ne connaît un move de ct53/ct54 (sinon il le garde, on prévient).
    const boxes = [ ...(w.team as Array<{ nickname?: string; speciesId?: string; moves?: string[] }> ?? []),
                    ...(w.pc as Array<{ nickname?: string; speciesId?: string; moves?: string[] }> ?? []),
                    ...(w.box as Array<{ nickname?: string; speciesId?: string; moves?: string[] }> ?? []) ]
    for (const m of boxes) {
        const bm = (m.moves ?? []).filter((mv) => BOSS_MOVES.includes(mv))
        if (bm.length) console.log(`  ⚠️ ${m.nickname ?? m.speciesId} connaît déjà : ${bm.join(", ")} (le move RESTE, seule la CT est retirée)`)
    }

    const newOwned = owned.filter((c) => !REMOVE.includes(c))
    console.log(`APRÈS : ownedCts = ${newOwned.join(", ")}  (retirés : ${REMOVE.filter((c) => owned.includes(c)).join(", ") || "aucun"})`)
    console.log(`        blackjackNgplusPicks → 0 · blackjackWon inchangé (${ld.blackjackWon})`)

    if (!WRITE) { console.log("\n[DRY-RUN] Rien écrit. Relance avec --write."); return }
    w.ownedCts = newOwned
    w.labDefi = { ...ld, blackjackNgplusPicks: 0 }
    save.ngplusWorld = w
    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: save as never } })
    const after = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const wa = (after?.flags as { ngplusWorld?: { ownedCts?: string[]; labDefi?: { blackjackNgplusPicks?: number; blackjackWon?: number } } })?.ngplusWorld
    console.log(`\n✅ ÉCRIT. Relecture : ownedCts = ${(wa?.ownedCts ?? []).join(", ")} · picks = ${wa?.labDefi?.blackjackNgplusPicks} · won = ${wa?.labDefi?.blackjackWon}`)
    console.log("   Mools doit RECHARGER (et ne pas jouer pendant l'écriture).")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
