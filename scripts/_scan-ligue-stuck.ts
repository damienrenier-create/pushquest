// LECTURE SEULE — détecte les joueurs coincés comme Task1 : position dans une salle de Ligue PROFONDE
// alors que leur progression Ligue (defeatedTrainers) est insuffisante pour y être (désync position↔flags).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

// salle → nb de dresseurs Ligue qu'on DOIT avoir battus pour s'y trouver légitimement.
const REQUIRED: Record<string, number> = {
    yellow_ligue_glace: 0, yellow_ligue_combat: 1, yellow_ligue_spectre: 2, yellow_ligue_dragon: 3, yellow_ligue_rival: 4,
}

async function main() {
    const rows = (await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, mapId: true, posX: true, posY: true, flags: true, updatedAt: true },
    })) as any[]
    console.log(`Saves yellow scannées : ${rows.length}`)
    let stuck = 0
    for (const r of rows) {
        const req = REQUIRED[r.mapId]
        if (req === undefined || req === 0) continue // hors Ligue, ou salle d'entrée (0 requis)
        const f: any = r.flags ?? {}
        const aw = f.activeWorld ?? "live"
        const world = aw === "ngplus" ? f.ngplusWorld : aw === "run3" ? f.run3World : f
        const dt: string[] = world?.defeatedTrainers ?? f.defeatedTrainers ?? []
        const beaten = dt.filter((t) => t.startsWith("y_ligue_") && t !== "y_ligue_maitre").length
        if (beaten < req) {
            stuck++
            const u = await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } })
            console.log(`\n⚠️  COINCÉ : ${u?.nickname ?? r.userId} · ${r.mapId} (${r.posX},${r.posY}) · Ligue battus=${beaten}/${req} requis · maj ${new Date(r.updatedAt).toISOString().slice(0, 16)}`)
        }
    }
    console.log(`\n=> ${stuck} joueur(s) potentiellement coincé(s) en Ligue`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
