// LECTURE SEULE — vérifie que le Guizer CUSTOM de Task1 résout désormais les VRAIS sprites (plus missingno).
import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies } from "../src/lib/gamebook/yellow/create/customSpecies"
const prisma = new PrismaClient()
async function main() {
    const user = await prisma.user.findFirst({ where: { nickname: { equals: "Task1", mode: "insensitive" } }, select: { id: true } })
    const sav = await prisma.gamebookProgress.findFirst({ where: { chapterId: "yellow", userId: user!.id }, select: { flags: true } })
    const customs = ((sav!.flags as any).customDaemons ?? []) as { ownerId: string; spec: any }[]
    for (const c of customs) {
        console.log(`\nLignée « ${c.spec.name} » (owner ${c.ownerId}) :`)
        for (const s of buildCustomSpecies(c.spec, c.ownerId)) console.log(`  ${s.id.padEnd(40)} → ${s.sprite}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
