// LECTURE SEULE — vérif brute : les marqueurs (gekroc/tonytony/aceWins) sont-ils cachés quelque part
// dans la save Mools (actuelle + history) ? Aucune écriture.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function probe(tag: string, f: unknown) {
    const raw = JSON.stringify(f ?? {})
    const o = f as Record<string, unknown> | null
    const ld = (o?.labDefi ?? {}) as Record<string, unknown>
    console.log(`  ${tag}: gekroc=${raw.includes("gekroc")} tonytony=${raw.includes("tonytony")} · aceWins=${(o?.aceWins as number) ?? "∅"} · labDefi.aceWins=${(ld?.aceWins as number) ?? "∅"} · len=${raw.length}`)
    if (o) console.log(`        clés: ${Object.keys(o).join(", ")}`)
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: "Mools" }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const r = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } },
        select: { flags: true, history: true, updatedAt: true },
    })
    if (!r) { console.log("pas de save yellow"); return }
    console.log("maj:", new Date(r.updatedAt).toISOString())
    probe("ACTUELLE", r.flags)
    const hist = (Array.isArray(r.history) ? r.history : []) as Array<{ at?: string; flags?: unknown }>
    hist.forEach((h, i) => probe(`hist[${i}] ${h?.at}`, h?.flags))
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
