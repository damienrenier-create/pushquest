// LECTURE SEULE — Merorem de Mools (niveau + moves) dans ses 2 mondes, pour placer les nouveaux moves du
// learnset au bon niveau (juste au-dessus du sien → il les apprend en montant, sans édition de save).
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Mon = { speciesId?: string; level?: number; moves?: Array<{ moveId?: string }> }
function scan(tag: string, w: { team?: Mon[]; pc?: Mon[] } | null | undefined) {
    if (!w) return
    for (const [where, m] of [...(w.team ?? []).map((m) => ["team", m] as const), ...(w.pc ?? []).map((m) => ["pc", m] as const)]) {
        if (m.speciesId === "merorem") {
            console.log(`  [${tag}/${where}] Merorem L${m.level} — moves: ${(m.moves ?? []).map((mv) => mv.moveId).join(", ")}`)
        }
    }
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: { contains: "mool", mode: "insensitive" } }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const prog = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const f = prog?.flags as { team?: Mon[]; pc?: Mon[]; ngplusWorld?: { team?: Mon[]; pc?: Mon[] } } | undefined
    console.log("Merorem de Mools :")
    scan("live", f)
    scan("ngplus", f?.ngplusWorld)
    console.log("(rien ci-dessus = pas de Merorem capturé)")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
