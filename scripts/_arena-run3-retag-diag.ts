// LECTURE SEULE — diagnostic : entrées ArenaChampion contenant un exclusif RUN 3 mais NON préfixées "run3:"
// (donc affichées à tort en run 1/2). Le tell infaillible = une espèce runThreeOnly dans l'équipe.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const RUN3_ONLY = new Set([
    "elefer", "barrisfer", "colosfer", "cornaive", "astracorne", "lunarque",
    "coccipoing", "coccombat", "coccimperatrice", "magnetor", "gekosmic",
    "hypnoppo", "teleppo", "omnhippo", "karmaki", "otama", "gamaruto", "uzumaro", "wistree",
])

async function main() {
    const ac = (prisma as any).arenaChampion
    const rows = (await ac.findMany({ select: { id: true, nickname: true, badgeId: true, team: true, wonAt: true } })) as any[]
    console.log(`Total ArenaChampion : ${rows.length}`)
    let mis = 0
    for (const r of rows) {
        let team: any[] = []; try { team = JSON.parse(r.team) } catch {}
        const species: string[] = team.map((m: any) => m.speciesId)
        const hasRun3 = species.some((s) => RUN3_ONLY.has(s))
        if (hasRun3 && !r.badgeId.startsWith("run3:")) {
            mis++
            console.log(`\nMAL TAGUÉ  id=${r.id}`)
            console.log(`   ${r.nickname} · badge="${r.badgeId}" · ${new Date(r.wonAt).toISOString().slice(0, 10)}`)
            console.log(`   équipe : ${species.join(", ")}`)
            console.log(`   tell   : ${species.filter((s) => RUN3_ONLY.has(s)).join(", ")}`)
        }
    }
    console.log(`\n=> ${mis} entrée(s) à re-taguer "run3:"`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
