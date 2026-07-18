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
import { computeGrade, leagueRepsFactor, energyInfoFactor, type ScoreFactor } from "@/lib/gamebook/yellow/score/runScoreCompute"

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

/** Recalcule le score RUN 1 (/1000, SANS frugalité) DEPUIS le monde run 1 = niveau PLAT de la save (stats/team/
 *  caughtThisRun). Frozen pour les joueurs en run 2/3 (anti-wipe), live pour les joueurs en run 1. */
function run1FromWorld(f: Record<string, unknown>): { score: number; factors: ScoreFactor[] } | null {
    const stats = (f.stats ?? {}) as Record<string, unknown>
    const team = Array.isArray(f.team) ? (f.team as Array<{ level?: unknown }>) : []
    // Pokédex run 1 = pokédex GLOBAL (≠ caughtThisRun qui vaut 0 pour les saves d'avant son suivi) : pour un joueur
    //   ENCORE en run 1 = ses captures run 1 ; pour un gradué (run 2/3) = crédite le dex qu'il a complété au run 1.
    const caught = Array.isArray((f.pokedex as { caught?: unknown } | undefined)?.caught) ? ((f.pokedex as { caught: string[] }).caught) : []
    const teamLevels = team.reduce((s, m) => s + num(m?.level), 0)
    const energyConsumed = num(stats.energySpent)
    const { grade, factors } = computeGrade({
        wins: num(stats.wins), teamKos: num(stats.teamKos), caught, teamLevels, energyConsumed, steps: num(stats.steps),
    }, { run1: true })
    return { score: grade, factors: [...factors, energyInfoFactor(energyConsumed)] } // énergie = info séparée (hors note)
}

/** Recalcule le score RUN 3 (Σ niveaux des Daemons vaincus) DEPUIS flags.run3World.run3Defeated. null si absent/vide. */
function run3FromWorld(w: unknown): number | null {
    if (!w || typeof w !== "object") return null
    const def = (w as { run3Defeated?: unknown }).run3Defeated
    if (!Array.isArray(def) || def.length === 0) return null
    return run3Score(def as Parameters<typeof run3Score>[0])
}

/** REJEU (« run bis ») — score de la BULLE (`flags.replayWorld`) selon le run rejoué. run2/run3 réutilisent leurs
 *  scorers (déjà run-scopés) ; run1 utilise caughtThisRun de la bulle (PAS le pokédex global — sinon le score serait
 *  gonflé par les captures cumulées). Renvoie null si vide/absent. */
function replayScoreFromBubble(w: unknown, run: string): { score: number; factors: ScoreFactor[] | null; leagueReps?: number } | null {
    if (!w || typeof w !== "object") return null
    if (run === "run2") { const r = run2FromWorld(w); return r ? { score: r.score, factors: r.factors, leagueReps: r.leagueReps } : null }
    if (run === "run3") { const s = run3FromWorld(w); return s === null ? null : { score: s, factors: null } }
    // run1 : score run-scopé sur caughtThisRun de la bulle.
    const world = w as { stats?: Record<string, unknown>; team?: Array<{ level?: unknown }>; caughtThisRun?: unknown }
    const stats = world.stats ?? {}
    const team = Array.isArray(world.team) ? world.team : []
    const caught = Array.isArray(world.caughtThisRun) ? (world.caughtThisRun as string[]) : []
    const teamLevels = team.reduce((s, m) => s + num(m?.level), 0)
    const energyConsumed = num(stats.energySpent)
    const { grade, factors } = computeGrade({ wins: num(stats.wins), teamKos: num(stats.teamKos), caught, teamLevels, energyConsumed, steps: num(stats.steps) }, { run1: true })
    return { score: grade, factors: [...factors, energyInfoFactor(energyConsumed)] }
}

interface LeaderEntry { nickname: string; score: number; wonAt: Date | null; factors: unknown; live: boolean; leagueReps?: number }

export const dynamic = "force-dynamic"

const MAX_SCORE = 1_000_000
// run2/run3 = scores ORIGINAUX figés ; run1bis/run2bis/run3bis = scores FIGÉS d'un REJEU (« Pseudo² »), postés
// à la sortie de la bulle (le pull ne peut plus les recalculer — la bulle est jetée).
const VALID_RUNS = new Set(["run2", "run3", "run1bis", "run2bis", "run3bis"])
const isRun3Kind = (run: string) => run === "run3" || run === "run3bis" // score MONOTONE (Σ niveaux) → on garde le MAX
const isGradeKind = (run: string) => run === "run2" || run === "run1bis" || run === "run2bis" // note /1000 → détail des axes stocké

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
        return NextResponse.json({ ok: true, gated: true, run1: [], run2: [], run3: [], duels: [] }) // pas encore ≥5 badges run 1
    }

    const run1Map = new Map<string, LeaderEntry>()
    const run2Map = new Map<string, LeaderEntry>()
    const run3Map = new Map<string, LeaderEntry>()
    const duelsMap = new Map<string, { nickname: string; wins: number }>() // classement « Duelliste » : reflets battus (cumul cross-run)

    // 1) PULL — recalcule depuis la save. RUN 2/3 sont recalculés dès que leur MONDE existe (flags.ngplusWorld /
    //    flags.run3World), qu'il soit ACTIF ou GELÉ → un joueur qui a FINI son run garde son score FIGÉ visible
    //    (le point clé : « voir ce qu'ont fait ceux qui ont terminé »). Pas de dérive : run2FromWorld/run3FromWorld
    //    lisent caughtThisRun/stats/team/run3Defeated (GELÉS au stash), jamais le pokédex global (seul champ que
    //    norm() réécrit sur les mondes stashés). La table poussée reste un FALLBACK pour les joueurs FUSIONNÉS
    //    (méga-fusion de fin de run 3 → sous-mondes effacés → plus recalculables).
    try {
        const saves = await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID },
            select: { userId: true, flags: true, user: { select: { nickname: true } } },
        })
        for (const s of saves) {
            const f = (s.flags ?? {}) as Record<string, unknown>
            const nickname = s.user?.nickname ?? "?"
            const world = f.activeWorld // "ngplus" (run2) | "run3" | "live" | undefined
            // RUN 1 = niveau PLAT de la save (toujours présent). Live si le joueur est encore en run 1, sinon figé.
            const r1 = run1FromWorld(f)
            if (r1) run1Map.set(s.userId, { nickname, score: r1.score, wonAt: null, factors: r1.factors, live: world === "live" || world === undefined })
            // RUN 2 : dès que le monde run 2 existe (actif OU gelé). Live si activement en run 2, sinon figé (fini).
            const r2 = run2FromWorld(f.ngplusWorld)
            if (r2) run2Map.set(s.userId, { nickname, score: r2.score, wonAt: null, factors: r2.factors, live: world === "ngplus", leagueReps: r2.leagueReps })
            // RUN 3 : dès que le monde run 3 existe (actif OU gelé, avant méga-fusion). Live si activement en run 3.
            const r3 = run3FromWorld(f.run3World)
            if (r3 !== null) run3Map.set(s.userId, { nickname, score: r3, wonAt: null, factors: null, live: world === "run3" })
            // REJEU (« run bis ») : si le joueur est DANS une bulle de rejeu, on AJOUTE son score « Pseudo² » sous une
            //   clé distincte (userId:bis) → il COEXISTE avec l'original gelé (déjà pullé ci-dessus depuis les mondes
            //   réels stashés). Les deux scores s'affichent, comme demandé.
            if (world === "replay" && f.replayWorld && typeof f.replayRun === "string") {
                const rb = replayScoreFromBubble(f.replayWorld, f.replayRun)
                if (rb) {
                    const target = f.replayRun === "run3" ? run3Map : f.replayRun === "run2" ? run2Map : run1Map
                    target.set(s.userId + ":bis", { nickname: `${nickname}²`, score: rb.score, wonAt: null, factors: rb.factors, live: true, leagueReps: rb.leagueReps })
                }
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
            // REJEU : une ligne « <run>bis » = score figé d'un rejeu → clé userId:bis + pseudo² + map du run de BASE.
            const isBis = r.run.endsWith("bis")
            const baseRun = isBis ? r.run.slice(0, -3) : r.run // "run2bis" → "run2"
            const map = baseRun === "run2" ? run2Map : baseRun === "run3" ? run3Map : baseRun === "run1" ? run1Map : null
            if (!map) continue
            const key = isBis ? `${r.userId}:bis` : r.userId
            if (map.has(key)) continue // le LIVE prime ; la 1re ligne vue (plus récente) gagne le fallback
            map.set(key, { nickname: isBis ? `${r.nickname}²` : r.nickname, score: r.score, wonAt: r.wonAt, factors: r.factors ?? null, live: false, leagueReps: baseRun === "run2" ? leagueRepsFromFactors(r.factors) : undefined })
        }
    } catch { /* table pas encore créée → pull seul */ }

    const toList = (m: Map<string, LeaderEntry>) =>
        [...m.values()].sort((a, b) => b.score - a.score).map((e) => ({ nickname: e.nickname, score: e.score, wonAt: e.wonAt, factors: e.factors, live: e.live, leagueReps: e.leagueReps }))
    const duels = [...duelsMap.values()].sort((a, b) => b.wins - a.wins)

    return NextResponse.json({ ok: true, run1: toList(run1Map), run2: toList(run2Map), run3: toList(run3Map), duels })
}

// POST {run, score} — enregistre le score du joueur (garde le meilleur par run).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { run?: unknown; score?: unknown; factors?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const run = typeof body.run === "string" && VALID_RUNS.has(body.run) ? body.run : null
    // Note /1000 (run2 + les rejeux run1bis/run2bis) : détail des 5 axes (display-only) stocké tel quel, borné à 8.
    const factors = run && isGradeKind(run) && Array.isArray(body.factors) ? (body.factors as unknown[]).slice(0, 8) : null
    // Borne PAR RUN (anti-triche : le score vient d'un POST client). run3(bis) = Σ max atteignable + marge ;
    //   les notes /1000 → plafond STRICT 1000. Fallback MAX_SCORE si run inconnu.
    const runCap = !run ? MAX_SCORE : isRun3Kind(run) ? run3MaxScore() + 200 : 1000
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
            // MONOTONE (garde le MEILLEUR) pour run3 ET tous les rejeux « ...bis » (une bulle = une tentative TERMINÉE,
            //   jetée à la sortie → sa ligne de table EST le score, donc un rejeu trivial ne doit pas écraser un bon rejeu).
            //   Seul le run2 ORIGINAL reste keep-latest (le GET le recalcule EN LIVE depuis ngplusWorld → non destructif).
            const monotone = isRun3Kind(run) || run.endsWith("bis")
            const keep = monotone ? rows.reduce((a, b) => (b.score > a.score ? b : a)) : rows[0]
            const newScore = monotone ? Math.max(keep.score, score) : score
            // Ne met à jour les facteurs QUE si le nouveau score est retenu (sinon on garderait ceux d'un rejeu perdant).
            const takeNew = !monotone || score >= keep.score
            const data: Record<string, unknown> = { score: newScore, nickname: me.nickname, wonAt: new Date() }
            if (takeNew && factors) data.factors = factors
            await rs.update({ where: { id: keep.id }, data })
            if (rows.length > 1) await rs.deleteMany({ where: { userId: auth.userId, run, id: { not: keep.id } } }) // écrase les doublons
        }
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
