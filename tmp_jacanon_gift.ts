import { PrismaClient } from "@prisma/client"
import fs from "fs"

// 🎂 CADEAU D'ANNIVERSAIRE DE JACANON (decision Sartay 15/10/2026) — A EXECUTER APRES DEPLOIEMENT du build qui
// connait les effets casino_uncap / shiny_frenzy (sinon le lot reste en attente, non acquitte, et sort au prochain
// chargement apres deploiement : c'est prevu, mais autant ne pas le faire attendre).
//   1. casino_uncap  : leve le plafond casino (ex-voeu « casino_restricted »)
//   2. shiny_frenzy  : 50 % de shiny pendant 24 h, jusqu'a 3 CAPTURES
//   + le petit mot du Dieu Spaghetti (canal energyGrantNote, montant 0 : le mot est independant du montant).
const prisma = new PrismaClient()
const JAC = "cmsat15v80001wvyo5agqw4m4"
const SCRATCH = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad"

const avant: any = await (prisma as any).frontierProfile.findUnique({ where: { userId: JAC } })
fs.writeFileSync(`${SCRATCH}/jacanon_frontier_backup.json`, JSON.stringify(avant, null, 2))
console.log(`  backup -> scratchpad/jacanon_frontier_backup.json`)
if (avant?.pendingEffects) console.log(`  ATTENTION : des effets sont deja en attente (${avant.pendingEffects}) -> on ECRASE (meme lot)`)
if (avant?.energyGrantNote) console.log(`  ATTENTION : un mot est deja en attente -> remplace`)

const EFFETS = JSON.stringify([
    { kind: "casino_uncap" },
    { kind: "shiny_frenzy", hours: 24, captures: 3 },
])

const MOT = [
    "*Un gâteau de pâtes flambées surgit sur la table, et une silhouette immense souffle les bougies à ta place.*",
    "« JOYEUX ANNIVERSAIRE, Jacanon ! Un Maître de la Chimère, un vétéran du casino… et un sacré client. Ça se fête. »",
    "🎰 « Premier cadeau : ta vieille malédiction du casino est LEVÉE. Plus de plafond. Mise ce que tu veux, perds ce que tu veux — je ne regarde plus. »",
    "✨ « Deuxième cadeau, et il est gros : pendant 24 HEURES, UN Daemon sauvage sur DEUX sera CHROMATIQUE. Cinquante pour cent. Les étoiles vont pleuvoir. »",
    "« Mais écoute bien la règle : ce qui compte, ce n'est pas combien tu en croises — c'est combien tu en CAPTURES. Quand tu en auras attrapé TROIS, les étoiles reprendront leur rythme normal, même avant la fin des 24 h. Et à minuit demain, fini aussi. Choisis bien tes proies. »",
    "« Allez, file chasser. Et bon anniversaire, mortel. 🍝 »",
]

const saved: any = await (prisma as any).frontierProfile.upsert({
    where: { userId: JAC },
    create: { userId: JAC, jc: 0, towerBest: 0, factoryBest: 0, domeBest: 0, symbols: [], pendingEffects: EFFETS, energyGrantNote: MOT.join("\n") },
    update: { pendingEffects: EFFETS, energyGrantNote: MOT.join("\n") },
    select: { pendingEffects: true, energyGrantNote: true, energyGrantPending: true, jc: true },
})
console.log(`\n  effets en attente : ${saved.pendingEffects}`)
console.log(`  mot : ${saved.energyGrantNote.split("\n").length} repliques | don energie : ${saved.energyGrantPending} (inchange) | jc=${saved.jc} (inchange)`)
console.log(`\n  --- ce qu'il lira ---`)
for (const l of MOT) console.log(`    ${l}`)
await prisma.$disconnect()
