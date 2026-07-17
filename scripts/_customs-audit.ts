// LECTURE SEULE — tous les Daemons CRÉÉS par les joueurs (customDaemons) + statut sprite (canonisé vs MISSINGNO).
import { PrismaClient } from "@prisma/client"
import { CANONIZED_CUSTOM_SPRITES } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 16) || "daemon"
const baseIdOf = (ownerId: string, name: string) => `custom_${slug(ownerId)}_${slug(name)}`

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { flags: true, updatedAt: true, user: { select: { nickname: true } } },
    })
    let found = 0
    for (const r of rows) {
        const f = (r.flags ?? {}) as any
        const customs = (f.customDaemons ?? []) as Array<{ ownerId: string; spec: any }>
        if (!customs.length) continue
        for (const c of customs) {
            found++
            const base = baseIdOf(c.ownerId, c.spec?.name ?? "")
            const canon = !!CANONIZED_CUSTOM_SPRITES[base]
            console.log(`━━ ${r.user?.nickname ?? "?"} — « ${c.spec?.name ?? "?"} » (créateur: ${c.spec?.creatorName ?? "—"})`)
            console.log(`   baseId: ${base}`)
            console.log(`   types: ${JSON.stringify(c.spec?.types ?? c.spec?.baseTypes ?? "?")} · stades: ${JSON.stringify(c.spec?.stageNames ?? "—")}`)
            console.log(`   SPRITE: ${canon ? "✅ CANONISÉ (vrais sprites)" : "❌ MISSINGNO — sprites à générer + canoniser"}`)
            console.log(`   maj save: ${new Date(r.updatedAt).toISOString().slice(0,10)}\n`)
        }
    }
    if (!found) console.log("Aucun Daemon créé (customDaemons vide chez tous les joueurs).")
    else console.log(`TOTAL : ${found} lignée(s) créée(s).`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
