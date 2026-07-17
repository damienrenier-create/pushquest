// LECTURE SEULE — dump COMPLET du Daemon créé par Franss (pour générer les sprites).
import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies, customLineageBaseId } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Franss", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.error("❌ Franss introuvable"); return }
    const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true, updatedAt: true } })
    const customs = ((row?.flags as any)?.customDaemons ?? []) as Array<{ ownerId: string; spec: any }>
    if (!customs.length) { console.log("Franss n'a PAS encore de Daemon créé (customDaemons vide)."); return }
    for (const c of customs) {
        const spec = c.spec
        const baseId = customLineageBaseId(c)
        console.log("═".repeat(72))
        console.log(`  DAEMON DE FRANSS  ·  baseId = ${baseId}`)
        console.log("═".repeat(72))
        console.log(`  Nom (stade 1) : ${spec.name}`)
        console.log(`  Stages        : ${JSON.stringify(spec.stageNames ?? "—")}`)
        console.log(`  Créateur      : ${spec.creatorName ?? "—"}`)
        console.log(`  DA (base)     : ${spec.da ?? "—"}`)
        console.log(`  DA (final)    : ${spec.daFinal ?? "—"}`)
        console.log(`  Types (spec)  : base=${JSON.stringify(spec.baseTypes ?? spec.types ?? "?")} final=${JSON.stringify(spec.finalTypes ?? "?")}`)
        console.log("  ── LIGNÉE RÉSOLUE (buildCustomSpecies) ──")
        try {
            const chain = buildCustomSpecies(spec, c.ownerId)
            chain.forEach((s: any, i: number) => {
                const bst = Object.values(s.baseStats).reduce((a: number, b: any) => a + b, 0)
                console.log(`   [${i}] ${s.id}  « ${s.name} »  ${s.types.join("/")}  BST ${bst}  sprite: ${s.sprite}`)
            })
        } catch (e) { console.log("   (build échoué:", String((e as any).message).slice(0, 60), ")") }
        console.log(`\n  SPRITES À GÉNÉRER → 3 PNG, chemins attendus :`)
        console.log(`     /yellow/sprites/dex/${baseId.replace("custom_", "")}_s1.png  (ou noms canoniques au choix)`)
        console.log(`  Puis je canonise : CANONIZED_CUSTOM_SPRITES["${baseId}"] = [s1, s2, s3]`)
        console.log(`\n  spec brute :\n${JSON.stringify(spec, null, 2)}`)
    }
    console.log(`\n(save maj: ${new Date(row!.updatedAt).toISOString()})`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
