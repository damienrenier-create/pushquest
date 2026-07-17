// ÉCRITURE PROD (autorisée) — Mools a "gagné" la Ligue run 2 sans battre son ancienne équipe (ancien flux).
// Nouvelles règles : on n'est Maître qu'APRÈS avoir battu son ancienne équipe. On retire donc son flag champion
// du monde run 2 → il re-défie la Ligue proprement. BACKUP complet avant + READBACK après.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-flags-backup.json"

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const s = prog?.flags as Record<string, any> | undefined
    if (!s) { console.log("pas de save"); return }

    // 1) BACKUP intégral
    writeFileSync(BACKUP, JSON.stringify(s, null, 2))
    console.log(`Backup écrit (${JSON.stringify(s).length} octets) → ${BACKUP}`)

    const ng = s.ngplusWorld as Record<string, any> | undefined
    if (!ng) { console.log("⚠️ ngplusWorld absent — rien à faire"); return }
    console.log(`AVANT : ngplusWorld.isChampion=${ng.isChampion} · ngplusMaitreBeaten=${ng.ngplusMaitreBeaten} · activeWorld=${s.activeWorld}`)

    // 2) MODIF : retire le sacre + s'assure qu'aucun marqueur "combat final en attente" ne reste.
    ng.isChampion = false
    ng.ngplusMaitreBeaten = false
    // (on ne touche NI à l'équipe, NI aux badges, NI à ngplusOldTeam : il garde toute sa progression run 2)

    await prisma.gamebookProgress.update({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        data: { flags: s },
    })
    console.log("Écriture faite.")

    // 3) READBACK
    const back = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const sb = back?.flags as Record<string, any>
    const ngb = sb.ngplusWorld as Record<string, any>
    console.log(`APRÈS : ngplusWorld.isChampion=${ngb.isChampion} · ngplusMaitreBeaten=${ngb.ngplusMaitreBeaten}`)
    console.log(`Vérifs préservées : badges=${JSON.stringify(ngb.badges)} · équipe=${(ngb.team as any[])?.length} Daemons · ngplusOldTeam=${(sb.ngplusOldTeam as any[])?.length} Daemons · activeWorld=${sb.activeWorld}`)
    console.log(ngb.isChampion === false ? "✅ OK — Mools re-défiera la Ligue" : "❌ ÉCHEC")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
