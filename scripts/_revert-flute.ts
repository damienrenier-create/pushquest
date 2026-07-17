// ÉCRITURE PROD (autorisée par Sartay) — revert du don automatique de Daemonflûte en run 2.
//   Franss : daemonflute=0 + sylvebarbeAwake=false (Sylvebarbe/arbre remis dans le chemin).
//   Task1 & Embi : daemonflute retiré du sac (non utilisé).
//   npx tsx scripts/_revert-flute.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const targets: Record<string, { removeFlute?: boolean; relockSylvebarbe?: boolean }> = {
        frans: { removeFlute: true, relockSylvebarbe: true },
        task: { removeFlute: true },
        embi: { removeFlute: true },
    }
    for (const [nick, act] of Object.entries(targets)) {
        const u = await prisma.user.findFirst({ where: { nickname: { contains: nick, mode: "insensitive" } }, select: { id: true, nickname: true } })
        if (!u) { console.log(`${nick}: introuvable`); continue }
        const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
        const flags = structuredClone(row!.flags) as any
        const ng = flags.ngplusWorld
        if (!ng) { console.log(`${u.nickname}: pas de ngplusWorld, skip`); continue }
        const before = `flûte ${ng.items?.daemonflute ?? 0} · sylvebarbeAwake ${ng.sylvebarbeAwake}`
        if (act.removeFlute && ng.items) ng.items.daemonflute = 0
        if (act.relockSylvebarbe) ng.sylvebarbeAwake = false
        await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags } })
        console.log(`✅ ${u.nickname.padEnd(8)} : ${before}  →  flûte ${ng.items?.daemonflute ?? 0} · sylvebarbeAwake ${ng.sylvebarbeAwake}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
