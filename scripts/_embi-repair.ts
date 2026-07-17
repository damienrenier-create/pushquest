// RÉPARATION EMBI (autorisée) : remplace le Morrow L33 de l'ÉQUIPE par un Roctaur ✨shiny L33
// (son shiny perdu lors du troc bugué). Garde le Morrow L27 (PC). Backup avant toute écriture.
// Dry-run par défaut ; passe --write pour écrire réellement en prod.
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
import { createMonInstance } from "../src/lib/gamebook/yellow/battle/factory"
import { toMonInstance } from "../src/lib/gamebook/yellow/storage/save"

const prisma = new PrismaClient()
const WRITE = process.argv.includes("--write")
const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/embi-backup.json"

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mbi", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!u) { console.log("EMBI introuvable"); return }
    const r = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    if (!r) { console.log("pas de save yellow"); return }
    const save = r.flags as Record<string, unknown>

    writeFileSync(BACKUP, JSON.stringify(save, null, 2))
    console.log(`Backup écrit: ${BACKUP}`)

    const team = (save.team ?? []) as Array<Record<string, unknown>>
    console.log("Team avant:", team.map((m) => `${m.speciesId}${m.shiny ? "✨" : ""} L${m.level} uid=${m.uid}`).join(" | "))
    const idx = team.findIndex((m) => m.speciesId === "morrow" && m.level === 33)
    if (idx < 0) { console.log("⚠️ Morrow L33 introuvable dans l'équipe — ABORT (état déjà modifié ?)"); return }

    // Roctaur ✨shiny L33 : moveset/ivs/PV LÉGITIMES via la factory du jeu.
    const roc = createMonInstance("roctaur", 33, { owned: true }) as unknown as Record<string, unknown>
    roc.shiny = true
    roc.uid = "roctaur-shiny-restored-embi"
    const stored = toMonInstance(roc as never) as unknown as Record<string, unknown>
    stored.shiny = true

    console.log("Roctaur reconstruit:", JSON.stringify({ speciesId: stored.speciesId, level: stored.level, shiny: stored.shiny, currentHp: stored.currentHp, moves: (stored.moves as Array<{ moveId: string }>).map((m) => m.moveId), uid: stored.uid }))

    team[idx] = stored
    save.team = team
    console.log("Team après:", team.map((m) => `${m.speciesId}${m.shiny ? "✨" : ""} L${m.level}`).join(" | "))

    if (!WRITE) { console.log("\n[DRY-RUN] Rien écrit. Relance avec --write pour appliquer."); return }
    const before = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { updatedAt: true } })
    await prisma.gamebookProgress.update({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, data: { flags: save as never } })
    // Relecture IMMÉDIATE (même process) : le Roctaur est-il bien persisté ?
    const after = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true, updatedAt: true } })
    const t0 = (after?.flags as { team?: Array<Record<string, unknown>> })?.team ?? []
    const rocBack = t0.find((m) => m.speciesId === "roctaur")
    console.log(`\n✅ ÉCRIT. Relecture immédiate → team[0..]=${t0.map((m) => m.speciesId).join(",")}`)
    console.log(rocBack ? `   Roctaur ${rocBack.shiny ? "✨" : ""}L${rocBack.level} présent ✔` : "   ⚠️ Roctaur ABSENT à la relecture — un autre write a déjà écrasé (EMBI en ligne).")
    console.log(`   updatedAt avant=${before?.updatedAt?.toISOString()} après=${after?.updatedAt?.toISOString()}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
