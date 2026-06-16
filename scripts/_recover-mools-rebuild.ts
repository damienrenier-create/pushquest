// RECONSTRUCTION de la save de Mools (perdue au reset). Dry-run par défaut (écrit le JSON pour
// inspection). Écrit en PROD uniquement avec CONFIRM=yes (et sauvegarde l'état courant dans history).
//   Dry-run : npx tsx scripts/_recover-mools-rebuild.ts
//   Réel    : CONFIRM=yes npx tsx scripts/_recover-mools-rebuild.ts
import { createMonInstance } from "../src/lib/gamebook/yellow/battle/factory"
import { emptySave } from "../src/lib/gamebook/yellow/storage/save"
import { mkdirSync, writeFileSync } from "fs"

const mk = (id: string, lvl: number) => {
    const m = createMonInstance(id, lvl, { owned: true })
    m.statPoints = lvl        // points Saiyan : approximation (à redistribuer librement)
    m.capturedLevel = Math.min(lvl, 5)
    return m
}
const team = [
    mk("sylvapuce", 45),  // Cerfeuillu
    mk("wyverion", 35),
    mk("diamantine", 42),  // Diamantine N42 (évo en Amadiam à 50, non atteinte)
    mk("escaroche", 25),  // Escargyle
    mk("herondee", 28),   // Hérondée
    mk("mycedruide", 33), // lampignon fraîchement évolué (évo niv 33)
]
const caught = ["feuillichot", "broutame", "sylvapuce", "piouflot", "herondee", "draclet", "wyverion", "sporbeo", "lampignon", "mycedruide", "diamantine", "limaroche", "escaroche"]

const save = emptySave()
save.team = team
save.badges = ["plante", "roche", "feu"]
save.repsCap = 1000 + save.badges.length * 250 // +250 par badge
save.ownedCts = ["ct17", "ct19", "ct21"] // CT cadeaux des boss plante/roche/feu
save.pokedex = { seen: [...caught], caught: [...caught] }
save.introSeen = true

console.log("=== SAVE RECONSTRUITE (Mools) ===")
for (const m of save.team) console.log(`  ${m.speciesId} N${m.level} — PV ${m.currentHp} — moves ${m.moves.map((x) => x.moveId).join(",")} — Saiyan ${m.statPoints}pts`)
console.log("  badges:", save.badges, "| CT:", save.ownedCts, "| pokédex caught:", save.pokedex.caught.length, "| repsCap:", save.repsCap)

mkdirSync("debug-maps", { recursive: true })
writeFileSync("debug-maps/_mools_rebuild.json", JSON.stringify(save, null, 2))
console.log("\n💾 JSON complet → debug-maps/_mools_rebuild.json")

if (process.env.CONFIRM !== "yes") { console.log("\n(DRY-RUN) — rien écrit en prod. Ajoute CONFIRM=yes pour injecter."); process.exit(0) }

;(async () => {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()
    try {
        const u = await prisma.user.findFirst({ where: { nickname: { contains: "mools", mode: "insensitive" } }, select: { id: true, nickname: true } })
        if (!u) throw new Error("Mools introuvable")
        const row: any = await (prisma as any).gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true, history: true } })
        const prevHist = Array.isArray(row?.history) ? row.history : []
        const history = [...prevHist, { at: new Date().toISOString(), reason: "pre-rebuild", flags: row?.flags ?? {} }].slice(-5)
        await (prisma as any).gamebookProgress.update({
            where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
            data: { flags: save as unknown as object, history: history as unknown as object },
        })
        console.log(`\n✅ Save de ${u.nickname} RÉINJECTÉE en prod (état précédent sauvé dans history). Il peut recharger le Nexus.`)
    } finally { await prisma.$disconnect() }
})()
