// LECTURE SEULE — quelles espèces du NEXUS 1 (run 1) n'ont JAMAIS été capturées par AUCUN joueur ?
// Rigueur maximale : union des `caught` de TOUS les users, sur TOUS les mondes (plat + ngplus + run3).
import { PrismaClient } from "@prisma/client"
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
const prisma = new PrismaClient()

async function main() {
    // Espèces run 1 = ni runTwoOnly ni runThreeOnly (le reste = exclusif run 2/3).
    const run1 = Object.values(SPECIES).filter((s: any) => !s.runTwoOnly && !s.runThreeOnly)

    const rows = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { flags: true } })
    const caughtUnion = new Set<string>()
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const sets = [f?.pokedex?.caught, f?.ngplusWorld?.pokedex?.caught, f?.run3World?.pokedex?.caught]
        for (const arr of sets) if (Array.isArray(arr)) for (const id of arr) caughtUnion.add(id)
    }

    // Une espèce est "obtenable par évolution" si une autre espèce évolue vers elle.
    const hasPreEvo = (id: string) => Object.values(SPECIES).some((x: any) => x.evolution?.toId === id)

    const never = run1.filter((s: any) => !caughtUnion.has(s.id)).sort((a: any, b: any) => (a.dexNo ?? 0) - (b.dexNo ?? 0))
    console.log(`Espèces run 1 : ${run1.length} · saves scannées : ${rows.length} · union capturée : ${caughtUnion.size} espèces distinctes`)
    console.log(`\n=== JAMAIS capturées par PERSONNE (${never.length}) ===`)
    for (const s of never as any[]) {
        const tags = [s.exclusive && "EXCLUSIF/légendaire", hasPreEvo(s.id) && "obtenable par ÉVOLUTION", s.postLeague && "postLigue", s.hiddenUntilCaught && "caché"].filter(Boolean)
        console.log(`  #${String(s.dexNo).padStart(3)} ${s.name.padEnd(16)} (${s.id})${tags.length ? "  — " + tags.join(", ") : ""}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
