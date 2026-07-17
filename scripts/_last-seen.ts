// LECTURE SEULE — dernière connexion Nexus (yellow) de chaque joueur = dernière écriture de save.
//   npx tsx scripts/_last-seen.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Mon = { speciesId?: string; level?: number }
function summary(f: unknown): string {
    const o = f as { team?: Mon[]; badges?: unknown[]; pokedex?: { caught?: unknown[] }; isChampion?: boolean } | null
    if (!o || typeof o !== "object") return "vide"
    const maxLvl = (o.team ?? []).reduce((mx, m) => Math.max(mx, m.level ?? 0), 0)
    return `team ${o.team?.length ?? 0} (maxN${maxLvl}) · ${(o.badges ?? []).length} badges · ${o.pokedex?.caught?.length ?? 0} caught${o.isChampion ? " · 🏆CHAMPION" : ""}`
}

async function main() {
    const now = Date.now()
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, updatedAt: true, user: { select: { nickname: true } } },
        orderBy: { updatedAt: "desc" },
    })
    console.log(`${rows.length} joueur(s) avec une save Nexus (yellow). Aujourd'hui = ${new Date(now).toISOString()}\n`)
    for (const r of rows) {
        const ageH = (now - new Date(r.updatedAt).getTime()) / 3_600_000
        const ago = ageH < 24 ? `il y a ${ageH.toFixed(1)} h` : `il y a ${(ageH / 24).toFixed(1)} j`
        const name = (r.user?.nickname ?? "?").padEnd(12)
        console.log(`${name} ${new Date(r.updatedAt).toISOString().slice(0, 16).replace("T", " ")}  (${ago})  ${summary(r.flags)}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
