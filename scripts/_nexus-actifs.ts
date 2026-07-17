// LECTURE SEULE — joueurs du Nexus (yellow) triés par assiduité (combats), avec dernière connexion. Aucune écriture.
//   npx tsx scripts/_nexus-actifs.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, flags: true, updatedAt: true },
    })
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, nickname: true } })
    const nick = new Map(users.map((u) => [u.id, u.nickname ?? "?"]))
    const now = Date.now()
    const data = rows.map((r) => {
        const f = (r.flags ?? {}) as Record<string, unknown>
        const st = (f.stats ?? {}) as Record<string, number>
        const ng = (f.ngplusWorld ?? null) as Record<string, unknown> | null
        const ngSt = (ng?.stats ?? {}) as Record<string, number>
        const battles = (st.battles ?? 0) + (ngSt.battles ?? 0) // run 1 + run 2
        const steps = (st.steps ?? 0) + (ngSt.steps ?? 0)
        return { nick: nick.get(r.userId) ?? "?", battles, steps, world: f.activeWorld ?? "live", champ: !!f.isChampion, last: new Date(r.updatedAt) }
    }).sort((a, b) => b.battles - a.battles)

    console.log(`Nexus (yellow) — ${data.length} joueurs · triés par COMBATS (assiduité) · combats/pas = run1+run2\n`)
    console.log("#  Pseudo         Combats   Pas     Monde   Champion  Dernière connexion")
    data.slice(0, 10).forEach((d, i) => {
        const days = Math.floor((now - d.last.getTime()) / 86400000)
        const when = `${d.last.toISOString().slice(0, 16).replace("T", " ")}  (il y a ${days}j)`
        console.log(`${String(i + 1).padStart(2)} ${d.nick.padEnd(14)} ${String(d.battles).padStart(6)}  ${String(d.steps).padStart(6)}  ${String(d.world).padEnd(6)} ${d.champ ? "  ✓    " : "       "}  ${when}`)
    })
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
