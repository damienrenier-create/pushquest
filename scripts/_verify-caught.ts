// LECTURE SEULE — VÉRIF de l'extraction `caught` : compte par user + sanity checks sur des espèces attendues.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function caughtOf(f: any): Set<string> {
    const out = new Set<string>()
    for (const arr of [f?.pokedex?.caught, f?.ngplusWorld?.pokedex?.caught, f?.run3World?.pokedex?.caught]) {
        if (Array.isArray(arr)) for (const id of arr) out.add(id)
    }
    return out
}

async function main() {
    const rows = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { userId: true, flags: true } })
    const union = new Set<string>()
    console.log("Par joueur (nickname · nb caught) :")
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const c = caughtOf(f)
        for (const id of c) union.add(id)
        const nick = f?.nickname ?? (await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } }))?.nickname ?? "?"
        console.log(`  ${String(nick).padEnd(12)} · ${c.size}${f?.pokedex ? "" : "  ⚠️ pas de pokedex top-level"}`)
    }
    console.log(`\nUnion totale : ${union.size} espèces distinctes capturées (au moins 1 user)`)
    const probe = ["feuillichot", "gouttiny", "braisille", "plumiot", "cailloutchi", "pantheon", "goshendofy", "pyrokoss", "razmaree", "mimimoy"]
    console.log("\nSanity (espèce → capturée par au moins 1 user ?) :")
    for (const id of probe) console.log(`  ${id.padEnd(14)} → ${union.has(id) ? "OUI" : "NON"}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
