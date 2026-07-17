import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()
async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Franss", mode: "insensitive" } }, select: { id: true } })
    const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u!.id, chapterId: "yellow" } }, select: { flags: true } })
    const c = ((row?.flags as any)?.customDaemons ?? [])[0]
    const chain = buildCustomSpecies(c.spec, c.ownerId) as any[]
    console.log("STATS de la lignée Shady (hp/atk/def/spe/spc) :")
    chain.forEach((s, i) => {
        const b = s.baseStats
        const bst = b.hp+b.atk+b.def+b.spe+b.spc
        console.log(`  [${i}] ${(s.name).padEnd(8)} ${s.types.join("/").padEnd(14)} PV ${String(b.hp).padStart(3)} · Atq ${String(b.atk).padStart(3)} · Déf ${String(b.def).padStart(3)} · Vit ${String(b.spe).padStart(3)} · Spé ${String(b.spc).padStart(3)}  = BST ${bst}`)
    })
    console.log("\ncurve:", c.spec.curve, "| bloomer:", c.spec.bloomer, "| role:", c.spec.role, "| talent caché:", c.spec.secretTalent ?? c.spec.hiddenTalent ?? "—")
    console.log("évolutions :", chain.map((s:any)=>s.evolution ? `${s.id}→${s.evolution.toId}@${JSON.stringify(s.evolution.method)}` : "final").join("  "))
}
main().catch(console.error).finally(()=>prisma.$disconnect())
