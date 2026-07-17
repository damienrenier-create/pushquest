// LECTURE SEULE — activité casino de joueurs ciblés (Task1, Embi) : indicateurs de fréquentation.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const TARGETS = ["Task1", "Embi"]

async function main() {
    const rows = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true, updatedAt: true } })
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const nick = f?.nickname ?? (await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } }))?.nickname ?? "?"
        if (!TARGETS.includes(String(nick))) continue
        const d: any = f?.labDefi ?? {}
        console.log(`=== ${nick} ===`)
        console.log(`  ⚡ reps ${Math.round(f?.reps ?? 0)}/${Math.round(f?.repsCap ?? 0)} · monde ${f?.activeWorld ?? "live"} · dernière activité ${new Date(r.updatedAt).toISOString().slice(0, 16).replace("T", " ")}`)
        console.log(`  🎰 casino : premier pari ? ${d.casinoFirstBetDone ? "oui" : "non"} · total gagné ${Math.round(d.casinoTotalWon ?? 0)} · winStreak ${d.casinoWinStreak ?? 0} · spinIndex ${d.casinoSpinIndex ?? 0}`)
        console.log(`  🃏 blackjack gagnés ${d.blackjackWon ?? 0} · CT blackjack réclamée ? ${d.blackjackCtClaimed ? "oui" : "non"} · picks NG+ ${d.blackjackNgplusPicks ?? 0}`)
        console.log(`  ♠️ poker 1re partie ? ${f?.pokerFirstGameDone ? "oui" : "non"} · roulette réclamées ${(f?.rouletteClaimed ?? []).length} · crédit roulette ${f?.rouletteCredit ?? 0}`)
        console.log(`  💸 énergie totale dépensée (attaques+boutique+casino) : ${Math.round(f?.energySpent ?? 0)}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
