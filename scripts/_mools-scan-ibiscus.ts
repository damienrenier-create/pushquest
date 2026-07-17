// LECTURE SEULE — repère TOUTE occurrence de "ibiscus" (id custom ou nom) dans la save de Mools, avec chemin.
//   npx tsx scripts/_mools-scan-ibiscus.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function walk(node: any, path: string, hits: string[]) {
    if (node == null) return
    if (typeof node === "string") { if (node.toLowerCase().includes("ibiscus")) hits.push(`${path} = "${node}"`); return }
    if (typeof node !== "object") return
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, hits)); return }
    for (const k of Object.keys(node)) walk(node[k], path ? `${path}.${k}` : k, hits)
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: "Mools" }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const gp = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
    const hits: string[] = []
    walk(gp?.flags, "", hits)
    console.log(`Occurrences de "ibiscus" dans la save de Mools : ${hits.length}`)
    for (const h of hits) console.log("  " + h)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
