// LECTURE SEULE — qui est ENTRÉ dans la Ligue AUJOURD'HUI sans la battre ?
// "Entré" = a battu ≥1 dresseur du Conseil 4 (y_ligue_1..4) OU a 5 badges (porte ouverte) dans un monde.
// "Sans la battre" = PAS champion de ce monde (Maître non battu). "Aujourd'hui" = GamebookProgress.updatedAt = today.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const CONSEIL = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter"]
const SHORT: Record<string, string> = { y_ligue_1_olga: "Olga", y_ligue_2_aldo: "Aldo", y_ligue_3_agatha: "Agatha", y_ligue_4_peter: "Peter" }
const today = new Date().toISOString().slice(0, 10)

function worldState(s: any) {
    const badges: string[] = Array.isArray(s?.badges) ? s.badges : []
    const defeated: string[] = Array.isArray(s?.defeatedTrainers) ? s.defeatedTrainers : []
    const conseil = CONSEIL.filter((id) => defeated.includes(id)).map((id) => SHORT[id])
    const maitre = defeated.includes("y_ligue_maitre")
    const entered = conseil.length > 0 || badges.length >= 5
    return { badges: badges.length, conseil, maitre, isChampion: !!s?.isChampion, entered }
}

async function main() {
    const rows = await prisma.gamebookProgress.findMany({
        where: { chapterId: "yellow" },
        select: { userId: true, flags: true, updatedAt: true, user: { select: { nickname: true } } },
    })
    console.log(`=== ${rows.length} saves yellow · AUJOURD'HUI = ${today} ===\n`)

    const enteredNoWin: string[] = []
    const wonToday: string[] = []
    for (const r of rows) {
        const s = r.flags as any
        const upd = new Date(r.updatedAt).toISOString().slice(0, 10)
        if (upd !== today) continue // actif aujourd'hui seulement
        const nick = r.user?.nickname ?? "?"
        const hh = new Date(r.updatedAt).toISOString().slice(11, 16)
        const worlds: [string, any][] = [["RUN1", s], ["RUN2", s?.ngplusWorld], ["RUN3", s?.run3World]]
        for (const [tag, w] of worlds) {
            if (!w) continue
            const st = worldState(w)
            if (st.entered && !st.isChampion && !st.maitre) {
                enteredNoWin.push(`• ${nick} [${tag}] — ${st.badges}/5 badges · Conseil battu: [${st.conseil.join(", ") || "aucun"}] · Maître: NON · (save màj ${hh} UTC, active="${s?.activeWorld ?? "live"}")`)
            }
            if (st.isChampion || st.maitre) wonToday.push(`• ${nick} [${tag}] — 👑 champion (save màj ${hh} UTC)`)
        }
    }

    console.log(`>>> ENTRÉS dans la Ligue aujourd'hui SANS la battre : ${enteredNoWin.length}`)
    console.log(enteredNoWin.join("\n") || "  (aucun)")
    console.log(`\n(pour info) Champions/Maître battu dont la save est màj aujourd'hui : ${wonToday.length}`)
    console.log(wonToday.join("\n") || "  (aucun)")

    // Sacres serveur du jour (LeagueChampion.wonAt = today).
    try {
        const lc = (prisma as any).leagueChampion
        const champs = await lc.findMany({ orderBy: { wonAt: "desc" }, take: 30, select: { nickname: true, wonAt: true, world: true } })
        const todayChamps = champs.filter((c: any) => new Date(c.wonAt).toISOString().slice(0, 10) === today)
        console.log(`\n=== Sacres LeagueChampion enregistrés AUJOURD'HUI : ${todayChamps.length} ===`)
        for (const c of todayChamps) console.log(`  👑 ${c.nickname} (world=${c.world}) — ${new Date(c.wonAt).toISOString().slice(11, 16)} UTC`)
    } catch { console.log("\n(LeagueChampion indisponible)") }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
