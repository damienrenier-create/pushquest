// LECTURE SEULE — qui a tenté / atteint / gagné la Ligue Jaune ? Pour chaque joueur avec une save "yellow" :
// nb de badges (5 = porte de la Ligue ouverte), dresseurs de Ligue battus, isChampion, run 2/3.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const LIGUE_IDS = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter", "y_ligue_maitre"]
const LIGUE_SHORT: Record<string, string> = { y_ligue_1_olga: "Olga", y_ligue_2_aldo: "Aldo", y_ligue_3_agatha: "Agatha", y_ligue_4_peter: "Peter", y_ligue_maitre: "Maître" }

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, flags: true, user: { select: { nickname: true } } },
    })
    console.log(`=== ${rows.length} joueurs avec une save Nexus Jaune ===\n`)

    const summarize = (s: any) => {
        const badges: string[] = Array.isArray(s?.badges) ? s.badges : []
        const defeated: string[] = Array.isArray(s?.defeatedTrainers) ? s.defeatedTrainers : []
        const ligueBeaten = LIGUE_IDS.filter((id) => defeated.includes(id)).map((id) => LIGUE_SHORT[id])
        return { nBadges: badges.length, ligueBeaten, isChampion: !!s?.isChampion }
    }

    const report: string[] = []
    for (const r of rows) {
        const s = r.flags as any
        const run1 = summarize(s)                       // monde live (run 1) = champs plats
        const ng = s?.ngplusWorld ? summarize(s.ngplusWorld) : null  // run 2
        const r3 = s?.run3World ? summarize(s.run3World) : null       // run 3
        const nick = r.user?.nickname ?? "?"

        // "A tenté la Ligue" = a battu au moins UN dresseur de Ligue OU a 5 badges (porte ouverte) dans un monde.
        const tented =
            run1.ligueBeaten.length > 0 || run1.nBadges >= 5 ||
            (ng && (ng.ligueBeaten.length > 0 || ng.nBadges >= 5)) ||
            (r3 && (r3.ligueBeaten.length > 0 || r3.nBadges >= 5))
        if (!tented) continue

        let line = `• ${nick}\n    RUN 1 : ${run1.nBadges}/5 badges · Ligue battus: [${run1.ligueBeaten.join(", ") || "aucun"}]${run1.isChampion ? " · 👑 CHAMPION" : ""}`
        if (ng) line += `\n    RUN 2 : ${ng.nBadges}/5 badges · Ligue battus: [${ng.ligueBeaten.join(", ") || "aucun"}]${ng.isChampion ? " · 👑 CHAMPION" : ""}`
        if (r3) line += `\n    RUN 3 : ${r3.nBadges}/5 badges · Ligue battus: [${r3.ligueBeaten.join(", ") || "aucun"}]${r3.isChampion ? " · 👑 CHAMPION" : ""}`
        report.push(line)
    }

    console.log(`--- ${report.length} joueur(s) ont ATTEINT ou TENTÉ la Ligue (au moins un run) ---\n`)
    console.log(report.join("\n\n"))

    // Table LeagueChampion (sacres enregistrés côté serveur).
    try {
        const lc = (prisma as any).leagueChampion
        const champs = await lc.findMany({ orderBy: { wonAt: "desc" }, take: 50, select: { nickname: true, wonAt: true } })
        console.log(`\n=== Hall of Fame Ligue (LeagueChampion, ${champs.length} sacres enregistrés) ===`)
        for (const c of champs) console.log(`  👑 ${c.nickname} — ${new Date(c.wonAt).toLocaleDateString("fr-FR")}`)
    } catch (e) { console.log("\n(LeagueChampion indisponible)") }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
