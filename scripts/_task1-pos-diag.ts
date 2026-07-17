// LECTURE SEULE — dump COMPLET de la ligne GamebookProgress de Task1 (colonnes scalaires = position).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Task1", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Task1 introuvable"); return }
    const rows = await prisma.gamebookProgress.findMany({ where: { userId: u.id } })
    for (const r of rows as any[]) {
        console.log(`\n===== chapterId=${r.chapterId} (maj ${new Date(r.updatedAt).toISOString().slice(0, 16)}) =====`)
        for (const [k, v] of Object.entries(r)) {
            if (k === "flags") { console.log("  flags: [JSON]"); continue }
            console.log(`  ${k} = ${JSON.stringify(v)}`)
        }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
