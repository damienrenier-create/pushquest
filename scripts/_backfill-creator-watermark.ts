// Backfill du WATERMARK créateur : pose spec.creatorName = pseudo du propriétaire sur chaque customDaemon
// qui n'en a pas. DRY-RUN par défaut (liste seulement) ; passe "apply" en argument pour écrire en prod.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const APPLY = process.argv[2] === "apply"

async function main() {
    const users = await prisma.user.findMany({ select: { id: true, nickname: true } })
    const nickById = new Map(users.map((u) => [u.id, u.nickname ?? "?"]))
    const saves = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true } })
    let touched = 0, daemons = 0
    for (const s of saves) {
        const f: any = s.flags
        const cds: any[] = Array.isArray(f?.customDaemons) ? f.customDaemons : []
        if (cds.length === 0) continue
        const owner = nickById.get(s.userId) ?? "?"
        let changed = false
        for (const d of cds) {
            if (!d?.spec) continue
            daemons++
            const has = typeof d.spec.creatorName === "string" && d.spec.creatorName.trim().length > 0
            console.log(`  ${owner.padEnd(12)} · « ${d.spec.name ?? "?"} »  → creatorName ${has ? `= "${d.spec.creatorName}"` : "ABSENT → « " + owner + " »"}`)
            if (!has) { d.spec.creatorName = owner; changed = true }
        }
        if (changed && APPLY) {
            await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: s.userId, chapterId: "yellow" } }, data: { flags: f } })
            touched++
        }
    }
    console.log(`\n${daemons} Daemon(s) custom trouvés · ${APPLY ? `${touched} save(s) mise(s) à jour ✅` : "DRY-RUN (relance avec 'apply' pour écrire)"}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
