// LECTURE SEULE — dump de la save EMBI pour comprendre la bourde du troc (shiny Roctaur perdu).
// Montre les 2 mondes (live + ngplus), les Roctaur/Rochison/Morrow (level/shiny/statPoints/uid),
// et l'historique des backups (pour retrouver un état PRÉ-troc contenant le shiny). Aucune écriture.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Mon = { uid?: string; speciesId?: string; level?: number; shiny?: boolean; statPoints?: number }
type World = { team?: Mon[]; pc?: Mon[]; activeWorld?: string; ngplusWorld?: World | null }

const WATCH = new Set(["roctaur", "rochison", "morrow"])

function line(m: Mon): string {
    return `${m.speciesId}${m.shiny ? " ✨SHINY" : ""} L${m.level} sp=${m.statPoints ?? 0} uid=${m.uid}`
}

function dumpWorld(tag: string, w: World | null | undefined) {
    if (!w) { console.log(`  ${tag}: (vide)`); return }
    const team = w.team ?? [], pc = w.pc ?? []
    const all = [...team.map((m) => ["team", m] as const), ...pc.map((m) => ["pc", m] as const)]
    const watched = all.filter(([, m]) => WATCH.has(m.speciesId ?? ""))
    console.log(`  ${tag}: team=${team.length} pc=${pc.length} | Roctaur/Rochison/Morrow = ${watched.length}`)
    for (const [where, m] of watched) console.log(`      [${where}] ${line(m)}`)
    // shiny n'importe où ?
    const shinies = all.filter(([, m]) => m.shiny)
    if (shinies.length) console.log(`      ✨ shiny TOTAL (toutes espèces) : ${shinies.map(([, m]) => m.speciesId).join(", ")}`)
}

async function main() {
    const users = await prisma.user.findMany({ where: { nickname: { contains: "mbi", mode: "insensitive" } }, select: { id: true, nickname: true, email: true } })
    console.log("Candidats:", users.map((u) => `${u.nickname} <${u.email ?? "?"}> (${u.id})`).join(" | ") || "AUCUN")
    for (const u of users) {
        const r = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
            select: { flags: true, history: true, updatedAt: true },
        })
        if (!r) { console.log(`\n=== ${u.nickname} : pas de save yellow ===`); continue }
        const f = r.flags as unknown as World
        console.log(`\n=== ${u.nickname} === maj: ${new Date(r.updatedAt).toISOString()} | activeWorld=${f?.activeWorld ?? "?"}`)
        dumpWorld("LIVE (flat)", f)
        dumpWorld("NG+ (nested)", f?.ngplusWorld)
        const hist = (Array.isArray(r.history) ? r.history : []) as Array<{ at?: string; flags?: World }>
        console.log(`  HISTORIQUE: ${hist.length} backup(s)`)
        hist.forEach((h, i) => {
            const w = h?.flags
            const team = [...(w?.team ?? []), ...(w?.pc ?? []), ...(w?.ngplusWorld?.team ?? []), ...(w?.ngplusWorld?.pc ?? [])]
            const roc = team.filter((m) => m.speciesId === "roctaur")
            const shinyRoc = roc.filter((m) => m.shiny)
            const shinies = team.filter((m) => m.shiny)
            console.log(`    hist[${i}] ${h?.at}: Roctaur=${roc.length} (shiny=${shinyRoc.length}) · shiny total=${shinies.length} [${shinies.map((m) => m.speciesId).join(",")}]`)
        })
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
