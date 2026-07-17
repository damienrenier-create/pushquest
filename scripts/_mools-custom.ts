// LECTURE SEULE — dump du/des Daemon(s) CUSTOM créé(s) par Mools (spec pour générer le sprite). Aucune écriture.
//   npx tsx scripts/_mools-custom.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Mools", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.error("❌ Mools introuvable."); return }
    const row = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        select: { flags: true, updatedAt: true },
    })
    const f = row?.flags as Record<string, unknown> | null
    if (!f) { console.error("❌ Pas de save yellow pour Mools."); return }
    console.log(`Mools · yellow · maj ${row ? new Date(row.updatedAt).toISOString() : "?"}`)
    console.log(`activeWorld=${f.activeWorld} · isChampion=${f.isChampion} · ngplusStartedAt=${f.ngplusStartedAt ?? "—"}`)
    const cds = (f.customDaemons as unknown[]) ?? []
    console.log(`\ncustomDaemons: ${cds.length}\n`)
    console.log(JSON.stringify(cds, null, 2))
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
