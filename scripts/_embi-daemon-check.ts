// LECTURE SEULE — Embi a-t-il créé son daemon ? état d'éligibilité au créateur.
//   npx tsx scripts/_embi-daemon-check.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: { nickname: { contains: "embi", mode: "insensitive" } },
        select: { id: true, nickname: true },
    })
    for (const u of users) {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
            select: { flags: true, updatedAt: true },
        })
        const f = (row?.flags ?? {}) as any
        const customs = Array.isArray(f.customDaemons) ? f.customDaemons : []
        console.log(`\n══════ ${u.nickname} · maj ${row ? new Date(row.updatedAt).toISOString() : "—"} ══════`)
        console.log("  activeWorld     :", f.activeWorld ?? "(live?)")
        console.log("  badges (plat)   :", JSON.stringify(f.badges), "· isChampion:", f.isChampion, "· ngplusUsed:", f.ngplusUsed)
        console.log("  customDaemons   :", customs.length, customs.map((c: any) => `${c.id ?? c.speciesId ?? "?"} "${c.name ?? c.baseName ?? "?"}"`))
        console.log("  run3Used        :", f.run3Used, "· ngplusWorld?", !!f.ngplusWorld, "· run3World?", !!f.run3World)
        // Éligibilité créateur (post-Ligue) telle qu'observée : champion + pas encore de custom + pas encore fusionné
        const eligible = f.isChampion === true && customs.length === 0
        console.log("  → ÉLIGIBLE au créateur (champion & 0 custom) :", eligible ? "✅ OUI (le wizard doit s'ouvrir au chargement)" : "non")
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
