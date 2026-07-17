// LECTURE SEULE — qui a joué AUJOURD'HUI (Nexus yellow) : énergie restante + équipe active. Aucune écriture.
//   npx tsx scripts/_who-today.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Mon = { speciesId?: string; level?: number; shiny?: boolean; currentHp?: number }
type Save = {
    nickname?: string; team?: Mon[]; reps?: number; repsCap?: number; activeWorld?: string; isChampion?: boolean
    ngplusWorld?: { team?: Mon[]; reps?: number } | null
    run3World?: { team?: Mon[]; reps?: number } | null
}

function activeTeam(f: Save): { team: Mon[]; reps: number | undefined } {
    if (f.activeWorld === "ngplus" && f.ngplusWorld?.team) return { team: f.ngplusWorld.team, reps: f.ngplusWorld.reps ?? f.reps }
    if (f.activeWorld === "run3" && f.run3World?.team) return { team: f.run3World.team, reps: f.run3World.reps ?? f.reps }
    return { team: f.team ?? [], reps: f.reps }
}

async function main() {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, updatedAt: true, user: { select: { nickname: true } } },
        orderBy: { updatedAt: "desc" },
    })
    const today = rows.filter((r) => new Date(r.updatedAt) >= startOfDay)
    console.log(`AUJOURD'HUI (${startOfDay.toISOString().slice(0,10)}) — ${today.length} joueur(s) actif(s) sur ${rows.length} au total\n`)
    for (const r of today) {
        const f = (r.flags ?? {}) as Save
        const nick = r.user?.nickname ?? f.nickname ?? "?"
        const { team, reps } = activeTeam(f)
        const hrs = ((now.getTime() - new Date(r.updatedAt).getTime()) / 3.6e6).toFixed(1)
        const world = f.activeWorld ?? "live"
        const energy = `${reps ?? "?"} / ${f.repsCap ?? "?"} ⚡`
        console.log(`━━ ${nick}  ·  il y a ${hrs} h  ·  monde ${world}${f.isChampion ? " · 🏆" : ""}`)
        console.log(`   Énergie : ${energy}`)
        const t = team.map((m) => `${m.speciesId} N${m.level}${m.shiny ? "✨" : ""}`).join(", ") || "—"
        console.log(`   Équipe  : ${t}\n`)
    }
    if (!today.length) {
        console.log("Personne aujourd'hui. Dernières activités :")
        for (const r of rows.slice(0, 6)) {
            const d = ((now.getTime() - new Date(r.updatedAt).getTime()) / 3.6e6).toFixed(1)
            console.log(`  ${(r.user?.nickname ?? "?").padEnd(12)} · il y a ${d} h`)
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect())
