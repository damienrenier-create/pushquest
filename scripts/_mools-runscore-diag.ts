// LECTURE SEULE — le score /1000 run 2 (et run 3) de Mools est-il en base (yellowRunScore) ? + son champ badges plat.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { equals: "Mools", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    try {
        const rs = (prisma as any).yellowRunScore
        const mine = (await rs.findMany({ where: { userId: u.id }, select: { run: true, score: true, wonAt: true } })) as any[]
        console.log(`Scores de ${u.nickname} en base :`, mine.length ? "" : "AUCUN")
        for (const r of mine) console.log(`  • ${r.run} = ${r.score}  (${new Date(r.wonAt).toISOString().slice(0, 10)})`)
        const all2 = (await rs.findMany({ where: { run: "run2" }, select: { nickname: true, score: true } })) as any[]
        console.log(`\nClassement run 2 complet (${all2.length}) :`, all2.map((r) => `${r.nickname}:${r.score}`).join(" · ") || "vide")
    } catch (e) { console.log("Table yellowRunScore indisponible :", (e as Error).message) }
    // badges plat (gate ≥5 du GET)
    const row = (await prisma.gamebookProgress.findFirst({ where: { userId: u.id, chapterId: "yellow" }, select: { flags: true } })) as any
    const badges = (row?.flags?.badges ?? []) as string[]
    console.log(`\nbadges (plat) : [${badges.join(", ")}] → gate ≥5 : ${badges.length >= 5 ? "OK ✅" : "BLOQUÉ ❌"}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
