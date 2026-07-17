// RESTAURATION de la save Mools depuis une branche Neon (PITR) vers la prod.
//   SOURCE_DB = connection string de la branche mools-recovery (LECTURE de la vraie save).
//   DATABASE_URL (.env) = prod (ÉCRITURE — uniquement la ligne de Mools).
// Dry-run par défaut (affiche source + prod, aucune écriture). Écriture réelle avec CONFIRM=yes.
//   Dry-run : SOURCE_DB="postgresql://…recovery…" npx tsx scripts/_mools-restore.ts
//   Réel    : SOURCE_DB="…" CONFIRM=yes npx tsx scripts/_mools-restore.ts
import { PrismaClient } from "@prisma/client"

const SOURCE = process.env.SOURCE_DB
if (!SOURCE) { console.error("❌ SOURCE_DB manquant (connection string de la branche Neon)."); process.exit(1) }

const src = new PrismaClient({ datasources: { db: { url: SOURCE } } })
const prod = new PrismaClient() // DATABASE_URL (.env) = prod
const CHAPTER = "yellow"

function summ(f: unknown): string {
    const o = f as { team?: Array<{ speciesId?: string; level?: number }>; badges?: unknown[]; pokedex?: { caught?: string[] }; aceWins?: number; reps?: number; repsCap?: number } | null
    if (!o || typeof o !== "object") return "vide/null"
    const caught = o.pokedex?.caught ?? []
    const tony = (o.team ?? []).some((m) => m.speciesId === "tonytony") || caught.includes("tonytony") ? " 🥚TONYTONY" : ""
    const gek = caught.includes("gekroc") ? " 🪨GÉKROC(capturé)" : ""
    const team = (o.team ?? []).map((m) => `${m.speciesId} N${m.level}`).join(", ") || "—"
    return `team ${o.team?.length ?? 0} · badges ${JSON.stringify(o.badges ?? [])} · caught ${caught.length} · ACE=${o.aceWins ?? 0} · reps ${o.reps ?? "?"} · cap ${o.repsCap ?? "?"}${tony}${gek}\n     équipe: ${team}`
}

async function main() {
    const u = await src.user.findFirst({ where: { nickname: "Mools" }, select: { id: true, nickname: true } })
    if (!u) { console.error("❌ Mools introuvable sur la branche source."); return }
    const srcRow = await src.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: CHAPTER } },
        select: { flags: true, updatedAt: true },
    })
    if (!srcRow?.flags) { console.error("❌ Pas de save yellow sur la branche source."); return }
    console.log(`\n=== SOURCE (branche PITR, maj ${new Date(srcRow.updatedAt).toISOString()}) ===`)
    console.log("  ", summ(srcRow.flags))

    // Même userId côté prod (c'est la même base, juste un instantané différent).
    const prodRow = await prod.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: u.id, chapterId: CHAPTER } },
        select: { flags: true, history: true, updatedAt: true },
    })
    console.log(`\n=== PROD ACTUELLE (maj ${prodRow ? new Date(prodRow.updatedAt).toISOString() : "∅"}) ===`)
    console.log("  ", summ(prodRow?.flags))

    if (process.env.CONFIRM !== "yes") {
        console.log("\n🟡 DRY-RUN — aucune écriture. Vérifie que la SOURCE a bien ta vraie save, puis relance avec CONFIRM=yes.")
        return
    }

    // Écriture : on sauvegarde d'abord l'état prod actuel dans history (réversible), puis on restaure la source.
    const prevHist = (Array.isArray(prodRow?.history) ? prodRow!.history : []) as unknown[]
    const history = [...prevHist, { at: new Date().toISOString(), reason: "pre-restore-pitr-20260701", flags: prodRow?.flags ?? null }].slice(-6)
    await prod.gamebookProgress.update({
        where: { userId_chapterId: { userId: u.id, chapterId: CHAPTER } },
        data: { flags: srcRow.flags as object, history: history as unknown as object },
    })
    console.log("\n✅ RESTAURÉ. La save de Mools (branche PITR) est réécrite en prod. L'état wipé est conservé dans history (réversible). Personne d'autre n'a été touché.")
}
main().then(() => Promise.all([src.$disconnect(), prod.$disconnect()])).catch(async (e) => { console.error(e); await src.$disconnect().catch(() => {}); await prod.$disconnect().catch(() => {}) })
