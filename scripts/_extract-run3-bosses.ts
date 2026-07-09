// LECTURE SEULE — extrait les 5 équipes de boss FIGÉES choisies pour le run 3 → dump dans un fichier scratch.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()
const OUT = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/run3-bosses.json"

// arène slot → (nickname, badgeId source)
const PICKS: { slot: string; nickname: string; badgeId: string }[] = [
    { slot: "plante", nickname: "Mools", badgeId: "ngplus:plante" },
    { slot: "roche", nickname: "Task1", badgeId: "roche" },
    { slot: "feu", nickname: "Neuneu", badgeId: "feu" },
    { slot: "elec", nickname: "Embi", badgeId: "eau" }, // EMBI n'a pas de team elec → sa (seule) team eau tient le slot elec
    { slot: "eau", nickname: "Franss", badgeId: "eau" },
]

async function main() {
    const ac = (prisma as unknown as { arenaChampion: { findFirst: (a: unknown) => Promise<{ nickname: string; badgeId: string; team: string } | null> } }).arenaChampion
    const out: Record<string, { nickname: string; team: unknown[] }> = {}
    for (const p of PICKS) {
        const row = await ac.findFirst({ where: { nickname: p.nickname, badgeId: p.badgeId }, orderBy: { wonAt: "asc" } })
        if (!row) { console.log(`⚠️ introuvable : ${p.nickname} / ${p.badgeId}`); continue }
        let team: unknown[] = []
        try { team = JSON.parse(row.team) } catch { /* ignore */ }
        out[p.slot] = { nickname: row.nickname, team }
        console.log(`${p.slot.padEnd(7)} ← ${row.nickname} (${p.badgeId}) : ${team.length} Daemons`)
    }
    // Affiche la structure d'UN mon pour comprendre le format.
    const firstMon = (Object.values(out)[0]?.team ?? [])[0]
    console.log("\n=== STRUCTURE d'un mon gelé ===\n" + JSON.stringify(firstMon, null, 2))
    writeFileSync(OUT, JSON.stringify(out, null, 2))
    console.log(`\n✅ Écrit : ${OUT}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
