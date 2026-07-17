// LECTURE SEULE — scan de TOUS les comptes (chapitre yellow) pour retrouver la save avancée de Mools
// (marqueurs : Gékroc capturé, TonyTony, victoires ACE). Aucune écriture.
//   npx tsx scripts/_mools-scan.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function markers(f: unknown): string {
    const o = f as { team?: Array<{ speciesId?: string; level?: number }>; badges?: unknown[]; pokedex?: { caught?: string[] }; aceWins?: number; reps?: number } | null
    if (!o || typeof o !== "object") return "vide/null"
    const caught = o.pokedex?.caught ?? []
    const gek = caught.includes("gekroc") ? "🪨GÉKROC" : ""
    const tony = caught.includes("tonytony") || (o.team ?? []).some((m) => m.speciesId === "tonytony") ? "🥚TONYTONY" : ""
    const ace = o.aceWins != null ? `ACE=${o.aceWins}` : ""
    const team = (o.team ?? []).map((m) => `${m.speciesId} N${m.level}`).join(", ") || "—"
    return `team ${o.team?.length ?? 0} · badges ${(o.badges ?? []).length} · caught ${caught.length} · ${ace} ${gek} ${tony}\n        équipe: ${team}`
}

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, flags: true, history: true, updatedAt: true, user: { select: { nickname: true } } },
        orderBy: { updatedAt: "desc" },
    })
    console.log(`${rows.length} comptes avec save "yellow".\n`)
    for (const r of rows) {
        console.log(`══════ ${r.user?.nickname ?? "?"} (${r.userId.slice(-6)}) · maj ${new Date(r.updatedAt).toISOString()} ══════`)
        console.log("  ACTUELLE :", markers(r.flags))
        const hist = (Array.isArray(r.history) ? r.history : []) as Array<{ at?: string; reason?: string; flags?: unknown }>
        hist.forEach((h, i) => console.log(`   [${i}] ${h?.at} (${h?.reason}) :`, markers(h?.flags)))
        console.log()
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
