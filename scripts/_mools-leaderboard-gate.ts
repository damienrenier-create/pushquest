// LECTURE SEULE — pourquoi Mools (post run 3) ne voit-il pas le classement des concours ?
// La gate GET = flags.badges (PLAT) length >= 5. On vérifie ça + l'état des mondes + les lignes yellowRunScore.
//   npx tsx scripts/_mools-leaderboard-gate.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: { nickname: { contains: "mool", mode: "insensitive" } },
        select: { id: true, nickname: true },
    })
    console.log("Utilisateur(s) « Mools » :", users.map(u => u.nickname))
    for (const u of users) {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
            select: { flags: true, updatedAt: true },
        })
        const f = (row?.flags ?? null) as Record<string, unknown> | null
        console.log(`\n══════ ${u.nickname} · maj ${row ? new Date(row.updatedAt).toISOString() : "—"} ══════`)
        if (!f) { console.log("  (pas de save yellow)"); continue }
        const badges = f.badges
        const badgesLen = Array.isArray(badges) ? badges.length : "PAS UN TABLEAU"
        console.log("  flags.badges (PLAT)     :", JSON.stringify(badges), "→ length =", badgesLen)
        console.log("  GATE viewerHasFinishedRun1 (>=5) :", Array.isArray(badges) && (badges as unknown[]).length >= 5 ? "✅ PASSE" : "❌ BLOQUE")
        // Indices d'état multi-mondes
        console.log("  activeWorld             :", (f as any).activeWorld ?? "(absent)")
        console.log("  a ngplusWorld ?         :", !!(f as any).ngplusWorld, " a run3World ?", !!(f as any).run3World, " a worlds ?", !!(f as any).worlds)
        console.log("  isChampion / ngplusUsed :", (f as any).isChampion, "/", (f as any).ngplusUsed)
        // Badges dans les sous-mondes (au cas où le run1 est là mais pas au plat)
        const ng = (f as any).ngplusWorld as Record<string, unknown> | undefined
        const r3 = (f as any).run3World as Record<string, unknown> | undefined
        if (ng) console.log("  ngplusWorld.badges      :", JSON.stringify(ng.badges))
        if (r3) console.log("  run3World.badges        :", JSON.stringify(r3.badges))
    }

    // État de la table de classement partagée
    const rs = (prisma as any).yellowRunScore
    try {
        const all = await rs.findMany({ select: { nickname: true, run: true, score: true, wonAt: true } })
        console.log(`\n══════ Table yellowRunScore : ${all.length} ligne(s) ══════`)
        for (const run of ["run2", "run3"]) {
            const rows = all.filter((r: any) => r.run === run).sort((a: any, b: any) => b.score - a.score)
            console.log(`  ${run} : ${rows.length} entrée(s)`)
            rows.forEach((r: any) => console.log(`     ${r.nickname} = ${r.score}  (maj ${new Date(r.wonAt).toISOString()})`))
        }
    } catch (e) {
        console.log("  (table yellowRunScore inaccessible :", (e as Error).message, ")")
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
