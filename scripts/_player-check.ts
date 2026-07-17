// LECTURE SEULE — diagnostic complet de la save yellow d'UN joueur : save actuelle + TOUS les backups history
// (équipe avec niveaux, badges, caught, reps, dates). Aucune écriture.
//   PLAYER=Franss npx tsx scripts/_player-check.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const NAME = process.env.PLAYER || "Franss"

type Mon = { speciesId?: string; level?: number; currentHp?: number }
function teamStr(f: unknown): string {
    const o = f as { team?: Mon[]; badges?: unknown[]; pokedex?: { caught?: unknown[] }; reps?: number; repsCap?: number; isChampion?: boolean } | null
    if (!o || typeof o !== "object") return "vide/null"
    const team = (o.team ?? []).map((m) => `${m.speciesId} N${m.level}`).join(", ") || "—"
    const maxLvl = (o.team ?? []).reduce((mx, m) => Math.max(mx, m.level ?? 0), 0)
    return `team ${o.team?.length ?? 0} (maxN${maxLvl}) · badges ${JSON.stringify(o.badges ?? [])} · caught ${o.pokedex?.caught?.length ?? 0} · reps ${o.reps ?? "?"}/${o.repsCap ?? "?"} · champ ${o.isChampion === true}\n        ${team}`
}

async function main() {
    const users = await prisma.user.findMany({ where: { nickname: { contains: NAME, mode: "insensitive" } }, select: { id: true, nickname: true, email: true } })
    console.log(`Joueur(s) « ${NAME} » :`, users.map((u) => `${u.nickname} <${u.email}> ${u.id.slice(-6)}`))
    for (const u of users) {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
            select: { flags: true, history: true, updatedAt: true },
        })
        if (!row) { console.log(`\n${u.nickname} : pas de save yellow.`); continue }
        console.log(`\n══════ ${u.nickname} · maj ${new Date(row.updatedAt).toISOString()} ══════`)
        console.log("  ACTUELLE :", teamStr(row.flags))
        const pc = (row.flags as { pc?: Mon[] } | null)?.pc ?? []
        console.log(`  PC (${pc.length}) : ${pc.map((m) => `${m.speciesId} N${m.level}`).join(", ") || "—"}`)
        const hist = (Array.isArray(row.history) ? row.history : []) as Array<{ at?: string; reason?: string; flags?: unknown }>
        console.log(`  HISTORY : ${hist.length} backup(s)`)
        hist.forEach((h, i) => console.log(`   [${i}] at=${h?.at} reason=${h?.reason}\n        ${teamStr(h?.flags)}`))
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
