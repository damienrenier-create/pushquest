// LECTURE SEULE — état de la save de Mools (run 2) : starter/team, customDaemons, pokedex des 2 mondes.
//   npx tsx scripts/_mools-run2-state.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const EXCL = ["gekraise", "ukognos", "merorem", "morrow"]
function dumpWorld(label: string, w: any) {
    if (!w) { console.log(`\n${label}: (absent)`); return }
    const team = (w.team ?? []).map((m: any) => `${m.speciesId}${m.nickname ? `«${m.nickname}»` : ""} L${m.level}`)
    const caught: string[] = w.pokedex?.caught ?? []
    console.log(`\n=== ${label} ===`)
    console.log(`  isChampion=${w.isChampion}  activeWorld(champ interne)=${w.activeWorld ?? "-"}  ngplusUsed=${w.ngplusUsed}`)
    console.log(`  team: ${team.join(" | ") || "(vide)"}`)
    console.log(`  pokedex.caught: ${caught.length} espèces — exclusifs présents: ${EXCL.filter((e) => caught.includes(e)).join(", ") || "AUCUN"}`)
    const cds = (w.customDaemons ?? []).map((c: any) => `${c.spec?.name}${c.spec?.stageNames ? ` (stageNames=${JSON.stringify(c.spec.stageNames)})` : ""} [${c.spec?.stages}st, owner=${c.ownerId}]`)
    console.log(`  customDaemons: ${cds.join(" | ") || "(aucun)"}`)
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: "Mools" }, select: { id: true, nickname: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const gp = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = (gp?.flags ?? {}) as any
    console.log(`Mools (userId=${u.id}) — TOP-LEVEL activeWorld=${f.activeWorld}`)
    dumpWorld("MONDE PLAT (top-level)", f)
    dumpWorld("MONDE NG+ imbriqué (ngplusWorld)", f.ngplusWorld)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
