// MIGRATION (ÉCRITURE PROD) — Mools : custom Ibiscus → Gavillus canonique (starter run 2 + pokédex + customDaemons).
// Backup complet AVANT, vérif APRÈS. À lancer UNE fois, quand Mools NE JOUE PAS (sinon race d'écrasement).
//   npx tsx scripts/_mools-migrate-ibiscus.ts
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "fs"
const prisma = new PrismaClient()

const BACKUP = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/mools-ibiscus-backup.json"
const STAGE_MAP: Record<string, string> = { "1": "gavillus", "2": "crocodaillus", "3": "alirocaillus" }
const IBI_RE = /_ibiscus_s([123])(?![0-9])/ // matche l'id de lignée custom ibiscus (stade 1/2/3), même en préfixe d'uid
const mapSpecies = (id: string): string | null => { const m = IBI_RE.exec(id); return m ? STAGE_MAP[m[1]] : null }

function migrateMons(list: any[]): number {
    let n = 0
    for (const m of list ?? []) {
        if (!m || typeof m.speciesId !== "string") continue
        const canon = mapSpecies(m.speciesId)
        if (!canon) continue
        m.speciesId = canon
        if (typeof m.uid === "string") m.uid = m.uid.replace(/custom_[a-z0-9]+_ibiscus_s[123]/, canon) // uid propre
        if (typeof m.nickname === "string" && m.nickname.toLowerCase() === "ibiscus") delete m.nickname
        n++
    }
    return n
}
function migrateDex(dex: any) {
    for (const key of ["seen", "caught"]) {
        if (!Array.isArray(dex?.[key])) continue
        dex[key] = [...new Set(dex[key].map((id: string) => (typeof id === "string" ? mapSpecies(id) ?? id : id)))]
    }
}
const stripIbi = (cds: any[]): any[] => (cds ?? []).filter((c) => !(c?.spec?.name && String(c.spec.name).toLowerCase() === "ibiscus"))

function migrateWorld(w: any, label: string) {
    if (!w) { console.log(`  ${label}: (absent)`); return }
    const t = migrateMons(w.team), p = migrateMons(w.pc)
    migrateDex(w.pokedex)
    const before = (w.customDaemons ?? []).length
    w.customDaemons = stripIbi(w.customDaemons)
    console.log(`  ${label}: team ${t} migré(s), pc ${p} migré(s), customDaemons ${before}→${w.customDaemons.length}`)
}
function scanIbiscus(node: any, path: string, hits: string[]) {
    if (node == null) return
    if (typeof node === "string") { if (node.toLowerCase().includes("ibiscus")) hits.push(`${path} = "${node}"`); return }
    if (typeof node !== "object") return
    if (Array.isArray(node)) { node.forEach((v, i) => scanIbiscus(v, `${path}[${i}]`, hits)); return }
    for (const k of Object.keys(node)) scanIbiscus(node[k], path ? `${path}.${k}` : k, hits)
}

async function main() {
    const u = await prisma.user.findFirst({ where: { nickname: "Mools" }, select: { id: true } })
    if (!u) { console.log("Mools introuvable"); return }
    const where = { userId_chapterId: { userId: u.id, chapterId: "yellow" } }
    const gp = await prisma.gamebookProgress.findUnique({ where, select: { flags: true } })
    if (!gp?.flags) { console.log("Save introuvable"); return }

    // 1) BACKUP (état exact avant)
    writeFileSync(BACKUP, JSON.stringify(gp.flags, null, 2), "utf8")
    console.log(`✅ Backup écrit : ${BACKUP}`)

    // 2) MIGRATION (sur un clone)
    const flags = JSON.parse(JSON.stringify(gp.flags))
    console.log("Migration :")
    migrateWorld(flags, "top-level (live)")
    migrateWorld(flags.ngplusWorld, "ngplusWorld (run 2)")

    // 3) ÉCRITURE
    await prisma.gamebookProgress.update({ where, data: { flags } })
    console.log("✅ Save migrée écrite en base.")

    // 4) VÉRIF (relecture)
    const after = await prisma.gamebookProgress.findUnique({ where, select: { flags: true } })
    const hits: string[] = []
    scanIbiscus(after?.flags, "", hits)
    const f = after?.flags as any
    const ngTeam = (f?.ngplusWorld?.team ?? []).map((m: any) => `${m.speciesId} L${m.level}`).join(" | ")
    console.log(`\nRésidus "ibiscus" restants : ${hits.length}`)
    for (const h of hits) console.log("  " + h)
    console.log(`\nÉquipe run 2 après migration : ${ngTeam}`)
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
