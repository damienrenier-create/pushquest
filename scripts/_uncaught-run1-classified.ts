// LECTURE SEULE — RE-CLASSE les espèces run 1 jamais présentes dans aucun Pokédex, en tenant compte du fait
// que le Pokédex NE MARQUE PAS : (a) un starter au moment du choix, ni (b) un stade évolué "sauté".
// → "pas dans le dex" ≠ "jamais obtenu" pour les BASES. On sépare les buckets par fiabilité.
import { PrismaClient } from "@prisma/client"
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
const prisma = new PrismaClient()

const STARTERS_R1 = new Set(["feuillichot", "gouttiny", "braisille"])

async function main() {
    const run1 = Object.values(SPECIES).filter((s: any) => !s.runTwoOnly && !s.runThreeOnly)

    const rows = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { flags: true } })
    const caught = new Set<string>()
    for (const r of rows) {
        const f: any = r.flags ?? {}
        for (const arr of [f?.pokedex?.caught, f?.ngplusWorld?.pokedex?.caught, f?.run3World?.pokedex?.caught])
            if (Array.isArray(arr)) for (const id of arr) caught.add(id)
    }

    const hasPreEvo = (id: string) => Object.values(SPECIES).some((x: any) => x.evolution?.toId === id)
    const hasEvo = (id: string) => !!(SPECIES[id] as any)?.evolution

    const stageOf = (id: string): "STANDALONE" | "BASE" | "MID" | "FINAL" => {
        const pre = hasPreEvo(id), post = hasEvo(id)
        if (!pre && !post) return "STANDALONE"
        if (!pre && post) return "BASE"
        if (pre && post) return "MID"
        return "FINAL"
    }

    const never = run1.filter((s: any) => !caught.has(s.id)).sort((a: any, b: any) => (a.dexNo ?? 0) - (b.dexNo ?? 0))

    // Buckets de fiabilité de la conclusion "jamais obtenu par personne".
    const buckets: Record<string, any[]> = { CERTAIN: [], FORT: [], INCONCLUANT: [] }
    for (const s of never as any[]) {
        const stg = stageOf(s.id)
        const excl = !!s.exclusive
        // CERTAIN : direct-capture only (standalone / légendaire) — aucun autre moyen de l'avoir sans le marquer.
        // FORT    : FINAL non-exclusif — marqué à l'évolution ; absent = personne n'a atteint le sommet de la lignée.
        // INCONCLUANT : BASE (starter/évolué-sauté non marqué) ou MID (peut être sauté).
        let bucket: string
        if (stg === "STANDALONE") bucket = "CERTAIN"
        else if (stg === "FINAL") bucket = "FORT"
        else bucket = "INCONCLUANT"
        const tags = [excl && "EXCLUSIF/légendaire", STARTERS_R1.has(s.id) && "STARTER", s.postLeague && "postLigue", s.hiddenUntilCaught && "caché"].filter(Boolean)
        buckets[bucket].push(`  #${String(s.dexNo).padStart(3)} ${String(s.name).padEnd(16)} [${stg}]${tags.length ? " — " + tags.join(", ") : ""}`)
    }

    console.log(`Run 1 : ${run1.length} espèces · saves : ${rows.length} · union capturée : ${caught.size}`)
    console.log(`Jamais dans aucun Pokédex : ${never.length}\n`)
    console.log(`=== 🟥 CERTAIN — jamais obtenu (direct-capture only : standalone/légendaire) : ${buckets.CERTAIN.length} ===`)
    console.log(buckets.CERTAIN.join("\n") || "  (aucun)")
    console.log(`\n=== 🟧 FORT — final non atteint par personne (marqué à l'évo, donc absent = jamais évolué jusque-là) : ${buckets.FORT.length} ===`)
    console.log(buckets.FORT.join("\n") || "  (aucun)")
    console.log(`\n=== ⬜ INCONCLUANT — base/mid : le dex ne marque pas le starter choisi ni un stade sauté : ${buckets.INCONCLUANT.length} ===`)
    console.log(buckets.INCONCLUANT.join("\n") || "  (aucun)")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
