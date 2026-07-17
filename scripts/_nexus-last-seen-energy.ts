// LECTURE SEULE — dernières connexions Nexus (updatedAt ≈ dernière sauvegarde) + énergie (reps) pour voir
// si les joueurs inactifs sont à court d'énergie.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, flags: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 12,
    })
    const now = Date.now()
    console.log("Joueurs Nexus par dernière activité (updatedAt = dernière save ≈ dernière connexion) :\n")
    console.log("  " + "pseudo".padEnd(14) + " · dernière activité      · il y a   · ⚡ reps / cap · monde")
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const nick = f?.nickname ?? (await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } }))?.nickname ?? "?"
        const days = (now - new Date(r.updatedAt).getTime()) / 86400000
        const reps = typeof f?.reps === "number" ? Math.round(f.reps) : "?"
        const cap = typeof f?.repsCap === "number" ? Math.round(f.repsCap) : "?"
        const world = f?.activeWorld ?? "live"
        const when = new Date(r.updatedAt).toISOString().slice(0, 16).replace("T", " ")
        const flag = typeof reps === "number" && reps <= 5 ? "  ⛔ à sec" : ""
        console.log(`  ${String(nick).padEnd(14)} · ${when} · ${days.toFixed(1).padStart(5)} j · ${String(reps).padStart(5)} / ${String(cap).padEnd(4)} · ${world}${flag}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
