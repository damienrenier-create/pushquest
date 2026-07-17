// LECTURE SEULE — dump COMPLET du/des customDaemon(s) d'Embi (pour générer les sprites).
//   npx tsx scripts/_embi-daemon-dump.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "embi", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Embi introuvable"); return }
    const row = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        select: { flags: true },
    })
    const f = (row?.flags ?? {}) as any
    const customs = Array.isArray(f.customDaemons) ? f.customDaemons : []
    console.log(`${u.nickname} · ${customs.length} custom daemon(s)\n`)
    customs.forEach((c: any, i: number) => {
        console.log(`═══ custom #${i} ═══`)
        console.log(JSON.stringify(c, null, 2))
    })
    // aussi : son équipe run2 actuelle (pour voir le daemon en jeu)
    const team = f.ngplusWorld?.team ?? f.team
    if (Array.isArray(team)) {
        console.log("\n═══ équipe run 2 ═══")
        team.forEach((m: any) => console.log(`  ${m.speciesId} "${m.nickname ?? ""}" N${m.level}`))
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
