// LECTURE SEULE — diagnostic de l'état de save de Task1 (bloqué salle Dragon / Peter).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({ where: { nickname: { contains: "task", mode: "insensitive" } }, select: { id: true, nickname: true } })
    console.log("Utilisateurs 'task*' :", users.map((u) => `${u.nickname} (${u.id})`).join(" · ") || "aucun")
    for (const u of users) {
        const rows = await prisma.gamebookProgress.findMany({ where: { userId: u.id, chapterId: "yellow" }, select: { flags: true, updatedAt: true } })
        for (const r of rows) {
            const f: any = r.flags ?? {}
            console.log(`\n===== ${u.nickname} (maj ${new Date(r.updatedAt).toISOString().slice(0, 16)}) =====`)
            console.log("clés top-level:", Object.keys(f).join(", "))
            const aw = f.activeWorld ?? "live"
            console.log(`activeWorld=${aw}`)
            console.log(`POSITION: mapId=${f.mapId} pos=(${f.posX},${f.posY}) dir=${f.direction}`)
            // le monde actif : plat (live) sinon imbriqué
            const world = aw === "ngplus" ? f.ngplusWorld : aw === "run3" ? f.run3World : f
            const team: any[] = world?.team ?? f.team ?? []
            console.log("BADGES:", (world?.badges ?? f.badges ?? []).join(", "))
            console.log("ÉQUIPE:")
            for (const m of team) console.log(`  - ${m.speciesId} N.${m.level}  PV=${m.currentHp}  (statut ${m.status ?? "?"})`)
            const dt: string[] = world?.defeatedTrainers ?? f.defeatedTrainers ?? []
            const ligue = dt.filter((t) => t.startsWith("y_ligue_"))
            console.log("DRESSEURS LIGUE battus:", ligue.join(", ") || "aucun")
            console.log("isChampion=", world?.isChampion ?? f.isChampion)
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
