// Corrige la save yellow de Mools : sur son TONYTONY uniquement, remplace le move `fulgurance` (mis par
// erreur via l'ancien bug d'apprentissage) par `focalisation`. Ne touche AUCUN autre Daemon (le zappeureal
// garde son fulgurance = STAB ÉLEC légitime). Backup de l'ORIGINAL dans history avant écriture (réversible).
// Dry-run par défaut. Écriture réelle avec CONFIRM=yes.
//   Dry-run : npx tsx scripts/_mools-fix-tonytony.ts
//   Réel    : CONFIRM=yes npx tsx scripts/_mools-fix-tonytony.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const CHAPTER = "yellow"
const FROM = "fulgurance"
const TO = "focalisation"
const TO_PP = 20 // pp de focalisation (cf. moves.ts)

type Mon = { speciesId?: string; moves?: Array<{ moveId?: string; pp?: number; ppMax?: number }> }

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Mools", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.error("❌ Mools introuvable."); return }
    const row = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: CHAPTER } },
        select: { flags: true, history: true, updatedAt: true },
    })
    if (!row?.flags) { console.error("❌ Pas de save yellow."); return }

    // Snapshot de l'ORIGINAL (deep copy) pour le backup — AVANT toute mutation.
    const original = JSON.parse(JSON.stringify(row.flags))
    const flags = row.flags as { team?: Mon[] }
    const tony = (flags.team ?? []).find((m) => m?.speciesId === "tonytony")
    if (!tony) { console.error("❌ Pas de tonytony dans l'équipe."); return }

    const before = (tony.moves ?? []).map((m) => m?.moveId).join(", ")
    const slot = (tony.moves ?? []).find((mv) => mv?.moveId === FROM)
    if (!slot) { console.log(`✅ Rien à faire : « ${FROM} » absent du tonytony (déjà corrigé ?). Moves : ${before}`); return }

    // Modif STRICTEMENT ciblée : ce slot, de CE tonytony.
    slot.moveId = TO; slot.pp = TO_PP; slot.ppMax = TO_PP
    const after = (tony.moves ?? []).map((m) => m?.moveId).join(", ")
    console.log(`tonytony AVANT : ${before}`)
    console.log(`tonytony APRÈS : ${after}`)

    if (process.env.CONFIRM !== "yes") { console.log("\n🟡 DRY-RUN — aucune écriture. Relance avec CONFIRM=yes pour appliquer."); return }

    const prevHist = Array.isArray(row.history) ? (row.history as unknown[]) : []
    const history = [...prevHist, { at: new Date().toISOString(), reason: "fix-tonytony-fulgurance-to-focalisation", flags: original }].slice(-6)
    await prisma.gamebookProgress.update({
        where: { userId_chapterId: { userId: u.id, chapterId: CHAPTER } },
        data: { flags: flags as object, history: history as unknown as object },
    })
    console.log("\n✅ Appliqué. Mools · tonytony : fulgurance → focalisation. Original conservé dans history (réversible).")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
