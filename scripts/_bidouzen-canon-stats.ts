// LECTURE SEULE — stats canoniques exactes de la lignée Bidouzen (telles qu'Embi les joue) via buildCustomSpecies.
import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()
async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "embi", mode: "insensitive" } }, select: { id: true } })
    const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u!.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = (row?.flags ?? {}) as any
    const cd = (f.customDaemons ?? [])[0]
    const chain = buildCustomSpecies(cd.spec, cd.ownerId)
    for (const s of chain) {
        const b: any = s.baseStats
        console.log(`${s.id}  ${s.name}  [${s.types.join("/")}]  hp${b.hp} atk${b.atk} def${b.def} spe${b.spe} spc${b.spc}  BST${b.hp+b.atk+b.def+b.spe+b.spc}  evo→${s.evolution?.method?.kind==="LEVEL"?("L"+(s.evolution.method as any).level):"—"}`)
    }
    console.log("learnset:", chain[0].learnset.map((l:any)=>`L${l.level} ${l.moveId}`).join(", "))
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
