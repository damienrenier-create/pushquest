import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()
async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "embi", mode: "insensitive" } }, select: { id: true } })
    const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u!.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = (row?.flags ?? {}) as any
    const cd = (f.customDaemons ?? [])[0]
    const chain = buildCustomSpecies(cd.spec, cd.ownerId)
    for (const s of chain) console.log(`${s.name}: growthRate=${s.growthRate} baseExp=${s.baseExp} secretTalent=${s.secretTalent} role="${s.role}"`)
    console.log("da:", cd.spec.da, "| daFinal:", cd.spec.daFinal, "| character:", cd.spec.character)
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
