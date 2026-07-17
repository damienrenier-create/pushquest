// ÉCRITURE PROD — re-tag des 3 entrées ArenaChampion de Mools (run 3, tell = barrisfer) : badge "X" → "run3:X".
// Ciblé par id + garde-fou (l'équipe DOIT contenir barrisfer, exclusif run 3) + backup + readback.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const TARGETS = [
    "cmrf1c6ti004qdd1q15pzyt7h", // plante (barrisfer, belunode, tamanpousse, glaceer, lavapetit, plumiot)
    "cmrf2dej6001k16zc1tx54j7j", // roche  (faukon, sonarque, fourmilierre, glaceer, fissuralave, barrisfer)
    "cmrf4959h00027du0qr3ylrnj", // feu    (sonarque, glaceer, faukon, fourmilierre, fissuralave, barrisfer)
]

async function main() {
    const ac = (prisma as any).arenaChampion
    for (const id of TARGETS) {
        const before = await ac.findUnique({ where: { id }, select: { id: true, nickname: true, badgeId: true, team: true, wonAt: true } })
        if (!before) { console.log(`❌ ${id} introuvable — skip`); continue }
        let team: any[] = []; try { team = JSON.parse(before.team) } catch {}
        const species: string[] = team.map((m: any) => m.speciesId)
        if (!species.includes("barrisfer")) { console.log(`⚠️  ${id} (${before.nickname}, ${before.badgeId}) ne contient PAS barrisfer — garde-fou, skip`); continue }
        if (before.badgeId.startsWith("run3:")) { console.log(`✅ ${id} déjà "run3:" — rien à faire`); continue }
        const next = `run3:${before.badgeId}`
        console.log(`\nAVANT : ${before.nickname} · "${before.badgeId}" · ${new Date(before.wonAt).toISOString().slice(0, 10)}`)
        console.log(`   équipe : ${species.join(", ")}`)
        await ac.update({ where: { id }, data: { badgeId: next } })
        const after = await ac.findUnique({ where: { id }, select: { badgeId: true } })
        console.log(`APRÈS : "${after?.badgeId}" ${after?.badgeId === next ? "✅ re-tag RUN 3 confirmé" : "❌ NON confirmé"}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
