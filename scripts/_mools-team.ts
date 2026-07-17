// LECTURE SEULE — dump détaillé de l'équipe yellow de Mools (chaque Daemon + ses attaques + shiny/niveau).
// Sert à localiser précisément un move à corriger. Aucune écriture.
//   npx tsx scripts/_mools-team.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Mon = { speciesId?: string; nickname?: string; level?: number; shiny?: boolean; currentHp?: number; moves?: Array<{ moveId?: string; pp?: number; ppMax?: number }> }

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Mools", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.error("❌ Mools introuvable."); return }
    const row = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        select: { flags: true, updatedAt: true },
    })
    const f = row?.flags as { team?: Mon[]; pc?: Mon[] } | null
    if (!f?.team) { console.error("❌ Pas d'équipe."); return }
    console.log(`Mools · yellow · maj ${row ? new Date(row.updatedAt).toISOString() : "?"}\n`)
    const dump = (label: string, list: Mon[] | undefined) => {
        if (!list?.length) { console.log(`${label} : —`); return }
        console.log(`=== ${label} (${list.length}) ===`)
        list.forEach((m, i) => {
            const mv = (m.moves ?? []).map((x) => `${x.moveId}(${x.pp}/${x.ppMax})`).join(", ")
            console.log(`  [${i}] ${m.speciesId} N${m.level}${m.shiny ? " ✨" : ""} — ${mv}`)
        })
    }
    dump("ÉQUIPE", f.team)
    dump("PC", f.pc)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
