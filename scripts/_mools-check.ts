// LECTURE SEULE — diagnostic de la save de Mools + backups history (aucune écriture).
//   npx tsx scripts/_mools-check.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function summ(f: unknown): string {
    const o = f as { team?: unknown[]; badges?: unknown[]; pokedex?: { caught?: unknown[] }; reps?: number; repsCap?: number; ownedCts?: unknown[] } | null
    if (!o || typeof o !== "object") return "vide/null"
    return `team ${o.team?.length ?? 0} · badges ${JSON.stringify(o.badges ?? [])} · caught ${o.pokedex?.caught?.length ?? 0} · CT ${o.ownedCts?.length ?? 0} · reps ${o.reps ?? "?"} · cap ${o.repsCap ?? "?"}`
}
function teamOf(f: unknown): string {
    const o = f as { team?: Array<{ speciesId?: string; level?: number }> } | null
    if (!o?.team?.length) return "—"
    return o.team.map((m) => `${m.speciesId} N${m.level}`).join(", ")
}

async function main() {
    const users = await prisma.user.findMany({
        where: { nickname: { contains: "mool", mode: "insensitive" } },
        select: { id: true, nickname: true, email: true },
    })
    console.log("Utilisateur(s) « Mools » :", users)
    for (const u of users) {
        const rows = await prisma.gamebookProgress.findMany({
            where: { userId: u.id },
            select: { chapterId: true, flags: true, history: true, updatedAt: true },
        })
        for (const row of rows) {
            console.log(`\n══════ ${u.nickname} · chapitre "${row.chapterId}" · maj ${new Date(row.updatedAt).toISOString()} ══════`)
            console.log("  SAVE ACTUELLE :", summ(row.flags))
            console.log("     équipe     :", teamOf(row.flags))
            const hist = (Array.isArray(row.history) ? row.history : []) as Array<{ at?: string; reason?: string; flags?: unknown }>
            console.log(`  HISTORY : ${hist.length} backup(s)`)
            hist.forEach((h, i) => {
                console.log(`   [${i}] at=${h?.at} reason=${h?.reason}`)
                console.log(`        →`, summ(h?.flags))
                console.log(`        équipe:`, teamOf(h?.flags))
            })
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
