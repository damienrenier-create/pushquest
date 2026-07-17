// src/app/api/gamebook/yellow/run-scores/route.ts
//
// Nexus Jaune Éclair — LEADERBOARD des scores de RUN (concours), partagé.
//  POST : un joueur signale son score de run 2 (NOTE GLOBALE /1000, cf. score/runScore) ou run 3 (Σ niveaux vaincus).
//         - RUN 2 : on garde le DERNIER score (courant). La note /1000 n'est PAS monotone (elle monte avec le
//           Pokédex/niveaux mais baisse avec l'énergie/pas dépensés) → le classement reflète l'état ACTUEL de
//           chaque joueur, live à chaque connexion. Le « meilleur du run » reste un stat perso montré au recap
//           de fin de run 2 (côté client), pas au classement.
//         - RUN 3 : score monotone (Σ niveaux de Daemons vaincus, cumulatif) → on garde le MAX (jamais de régression).
//         Pseudo trusté serveur.
//  GET  : renvoie les classements run2 + run3 — MAIS seulement si le SPECTATEUR a fini le run 1 (>=5 badges).
//
// Même pattern gaté que arena-champions/ : (prisma as any).yellowRunScore → COMPILE avant db:push, et les
// try/catch rendent la feature NEUTRE tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { run3Score, run3MaxScore } from "@/lib/gamebook/yellow/data/run3Score"
import { computeGrade, leagueRepsFactor, type ScoreFactor } from "@/lib/gamebook/yellow/score/runScoreCompute"

const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0)

/** Recalcule le score RUN 2 (/1000) + le détail des facteurs d'un joueur DEPUIS le blob de son monde run 2
 *  (flags.ngplusWorld). Renvoie null si le monde run 2 est absent (joueur pas encore en run 2, ou déjà fusionné). */
function run2FromWorld(w: unknown): { score: number; factors: ScoreFactor[]; leagueReps: number } | null {
    if (!w || typeof w !== "object") return null
    const world = w as { stats?: Record<string, unknown>; team?: Array<{ level?: unknown }>; caughtThisRun?: unknown }
    const stats = world.stats ?? {}
    const team = Array.isArray(world.team) ? world.team : []
    // Pokédex du SCORE = captures du RUN 2 uniquement (caughtThisRun), PAS le pokédex global cumulatif (qui inclut
    //   le run 1). stats/team sont déjà per-world (run-2-exclusifs). → les 5 facteurs sont 100% run 2.
    const caught = Array.isArray(world.caughtThisRun) ? (world.caughtThisRun as string[]) : []
    const teamLevels = team.reduce((s, m) => s + num(m?.level), 0)
    const { grade, factors } = computeGrade({
        wins: num(stats.wins), teamKos: num(stats.teamKos), caught, teamLevels,
        energyConsumed: num(stats.energySpent), steps: num(stats.steps),
    })
    const leagueReps = num(stats.leagueEnergySpent)
    return { score: grade, factors: [...factors, leagueRepsFactor(leagueReps)], leagueReps }
}

/** Récupère les reps dépensés en Ligue depuis un blob de facteurs stocké (ligne info « info:league_reps »). 0 si absent. */
function leagueRepsFromFactors(factors: unknown): number {
    if (!Array.isArray(factors)) return 0
    const f = factors.find((x) => x && typeof x === "object" && (x as { key?: unknown }).key === "info:league_reps") as { points?: unknown } | undefined
    return typeof f?.points === "number" ? f.points : 0
}

/** Recalcule le score RUN 3 (Σ niveaux des Daemons vaincus) DEPUIS flags.run3World.run3Defeated. null si absent/vide. */
function run3FromWorld(w: unknown): number | null {
    if (!w || typeof w !== "object") return null
    const def = (w as { run3Defeated?: unknown }).run3Defeated
    if (!Array.isArray(def) || def.length === 0) return null
    return run3Score(def as Parameters<typeof run3Score>[0])
}

interface LeaderEntry { nickname: string; score: number; wonAt: Date | null; factors: unknown; live: boolean; leagueReps?: number }

export const dynamic = "force-dynamic"

const MAX_SCORE = 1_000_000
const VALID_RUNS = new Set(["run2", "run3"])

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

/** Le spectateur a-t-il fini le run 1 (>=5 badges) ? Les badges du run 1 = champ PLAT `badges` de la save
 *  (jamais ngplusWorld.badges). Lecture directe du blob GamebookProgress.flags (défensif). */
async function viewerHasFinishedRun1(userId: string): Promise<boolean> {
    try {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
            select: { flags: true },
        })
        const flags = row?.flags as { badges?: unknown } | null
        return Array.isArray(flags?.badges) && (flags!.badges as unknown[]).length >= 5
    } catch { return false }
}

// GET — classements run2 + run3. Gaté : le SPECTATEUR a fini le run 1 (>=5 badges).
//
// Modèle « PULL » : on RECALCULE le score de chaque joueur DEPUIS sa save (monde run2 = flags.ngplusWorld, run3 =
// flags.run3World) → le classement est peuplé et LIVE sans attendre qu'un joueur déclenche un POST. La table poussée
// `yellowRunScore` sert de FALLBACK pour les joueurs FUSIONNÉS (méga-fusion de fin de run 3 → sous-mondes effacés,
// score plus recalculable ; leur dernier POST reste la seule trace). Le LIVE (save) a toujours priorité sur la table.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    if (!(await viewerHasFinishedRun1(auth.userId))) {
        return NextResponse.json({ ok: true, gated: true, run2: [], run3: [], duels: [] }) // pas encore ≥5 badges run 1
    }

    const run2Map = new Map<string, LeaderEntry>()
    const run3Map = new Map<string, LeaderEntry>()
    const duelsMap = new Map<string, { nickname: string; wins: number }>() // classement « Duelliste » : reflets battus (cumul cross-run)

    // 1) PULL — recalcule depuis la save, MAIS uniquement pour le monde ACTIVEMENT joué (flags.activeWorld) → score
    //    réellement LIVE. On NE recalcule PAS un monde GELÉ : le Pokédex est global-cumulatif (norm() réécrit le
    //    pokédex de chaque monde stashé avec le pokédex global), donc le score d'un run2 gelé DÉRIVERAIT avec les
    //    captures faites en run3. Les mondes gelés viennent du FALLBACK table (POST figé à la bascule / clôture).
    try {
        const saves = await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID },
            select: { userId: true, flags: true, user: { select: { nickname: true } } },
        })
        for (const s of saves) {
            const f = (s.flags ?? {}) as Record<string, unknown>
            const nickname = s.user?.nickname ?? "?"
            const world = f.activeWorld // "ngplus" (run2) | "run3" | "live" | undefined
            if (world === "ngplus") {
                const r2 = run2FromWorld(f.ngplusWorld)
                if (r2) run2Map.set(s.userId, { nickname, score: r2.score, wonAt: null, factors: r2.factors, live: true, leagueReps: r2.leagueReps })
            }
            if (world === "run3") {
                const r3 = run3FromWorld(f.run3World)
                if (r3 !== null) run3Map.set(s.userId, { nickname, score: r3, wonAt: null, factors: null, live: true })
            }
            // Duels : reflets battus = SOMME du compteur sur les 3 mondes (les duels se jouent surtout en run 1/2).
            const dw = (w: unknown) => num((w as { stats?: { duelWinsTotal?: unknown } } | null | undefined)?.stats?.duelWinsTotal)
            const duels = num((f.stats as { duelWinsTotal?: unknown } | undefined)?.duelWinsTotal) + dw(f.ngplusWorld) + dw(f.run3World)
            if (duels > 0) duelsMap.set(s.userId, { nickname, wins: duels })
        }
    } catch { /* lecture saves impossible → on s'appuiera sur la table seule */ }

    // 2) FALLBACK — table poussée, seulement pour les joueurs ABSENTS du pull (fusionnés). Ordre wonAt desc → 1re vue = plus récente.
    try {
        const rs = (prisma as any).yellowRunScore // table gated (créée par db:push)
        const rows = (await rs.findMany({
            orderBy: { wonAt: "desc" }, take: 400,
            select: { userId: true, nickname: true, run: true, score: true, wonAt: true, factors: true },
        })) as { userId: string; nickname: string; run: string; score: number; wonAt: Date; factors: unknown }[]
        for (const r of rows) {
            const map = r.run === "run2" ? run2Map : r.run === "run3" ? run3Map : null
            if (!map || map.has(r.userId)) continue // le LIVE prime ; la 1re ligne vue (plus récente) gagne le fallback
            map.set(r.userId, { nickname: r.nickname, score: r.score, wonAt: r.wonAt, factors: r.factors ?? null, live: false, leagueReps: r.run === "run2" ? leagueRepsFromFactors(r.factors) : undefined })
        }
    } catch { /* table pas encore créée → pull seul */ }

    const toList = (m: Map<string, LeaderEntry>) =>
        [...m.values()].sort((a, b) => b.score - a.score).map((e) => ({ nickname: e.nickname, score: e.score, wonAt: e.wonAt, factors: e.factors, live: e.live, leagueReps: e.leagueReps }))
    const duels = [...duelsMap.values()].sort((a, b) => b.wins - a.wins)

    return NextResponse.json({ ok: true, run2: toList(run2Map), run3: toList(run3Map), duels })
}

// POST {run, score} — enregistre le score du joueur (garde le meilleur par run).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { run?: unknown; score?: unknown; factors?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const run = typeof body.run === "string" && VALID_RUNS.has(body.run) ? body.run : null
    // RUN 2 : détail des 5 axes (display-only, propre au joueur, gated par auth) → stocké tel quel, borné à 8 entrées.
    const factors = run === "run2" && Array.isArray(body.factors) ? (body.factors as unknown[]).slice(0, 8) : null
    // Borne PAR RUN (anti-triche : le score vient d'un POST client). run3 = Σ max réellement atteignable (dérivé) +
    //   marge. run2 = NOTE GLOBALE /1000 (computeRunScores) → plafond STRICT à 1000. Fallback MAX_SCORE si run inconnu.
    const runCap = run === "run3" ? run3MaxScore() + 200 : run === "run2" ? 1000 : MAX_SCORE
    const score = typeof body.score === "number" && isFinite(body.score) ? Math.max(0, Math.min(runCap, Math.floor(body.score))) : null
    if (!run || score === null) return NextResponse.json({ error: "Bad params" }, { status: 400 })

    try {
        const rs = (prisma as any).yellowRunScore // table gated, créée par db:push
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        // RUN 2 = score COURANT (on écrase toujours, note non monotone) ; RUN 3 = MAX (score cumulatif, jamais de régression).
        // On récupère TOUTES les lignes du joueur (pas findFirst) pour COLLAPSE d'éventuels doublons de POST concurrents
        // (mount + arrière-plan) → garantit UNE seule ligne par (joueur, run), sans quoi le GET pourrait figer un doublon périmé.
        const rows = (await rs.findMany({ where: { userId: auth.userId, run }, orderBy: { wonAt: "desc" }, select: { id: true, score: true } })) as { id: string; score: number }[]
        if (rows.length === 0) {
            await rs.create({ data: { userId: auth.userId, nickname: me.nickname, run, score, factors: factors ?? undefined } })
        } else {
            // Ligne conservée : run2 = la PLUS RÉCENTE (rows[0]) ; run3 = celle du MEILLEUR score.
            const keep = run === "run3" ? rows.reduce((a, b) => (b.score > a.score ? b : a)) : rows[0]
            const newScore = run === "run3" ? Math.max(keep.score, score) : score // run2 écrase, run3 ne régresse jamais
            await rs.update({ where: { id: keep.id }, data: { score: newScore, nickname: me.nickname, wonAt: new Date(), factors: factors ?? undefined } })
            if (rows.length > 1) await rs.deleteMany({ where: { userId: auth.userId, run, id: { not: keep.id } } }) // écrase les doublons
        }
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
