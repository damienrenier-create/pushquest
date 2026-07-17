// LECTURE SEULE — état des scores leaderboard run 2 (avant bascule énergie→note /1000).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rs = (prisma as any).yellowRunScore
    const rows = await rs.findMany({ where: { run: "run2" }, orderBy: { score: "desc" }, select: { id: true, nickname: true, score: true, wonAt: true } })
    console.log(`=== ${rows.length} scores run 2 ===`)
    for (const r of rows) console.log(`   ${r.nickname} : ${r.score} (${new Date(r.wonAt).toISOString().slice(0, 10)})  id=${r.id}`)
    const legacy = rows.filter((r: any) => r.score > 1000)
    console.log(`\n${legacy.length} score(s) > 1000 (= énergie brute legacy, à supprimer pour repartir sur la note /1000)`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
