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
import { run3MaxScore } from "@/lib/gamebook/yellow/data/run3Score"

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

// GET — classements run2 + run3 (meilleur score par joueur, décroissant). Gaté : ≥5 badges run 1.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    if (!(await viewerHasFinishedRun1(auth.userId))) {
        return NextResponse.json({ ok: true, gated: true, run2: [], run3: [] }) // pas encore ≥5 badges run 1
    }
    try {
        const rs = (prisma as any).yellowRunScore // table gated (créée par db:push)
        const rows = (await rs.findMany({
            orderBy: { score: "desc" },
            take: 400,
            select: { userId: true, nickname: true, run: true, score: true, wonAt: true, factors: true },
        })) as { userId: string; nickname: string; run: string; score: number; wonAt: Date; factors: unknown }[]
        // Dédup serveur : garde le MEILLEUR score par (userId, run) — déjà trié desc, donc le 1er vu gagne.
        const best = (run: string) => {
            const seen = new Set<string>()
            const out: { nickname: string; score: number; wonAt: Date; factors: unknown }[] = []
            for (const r of rows) {
                if (r.run !== run || seen.has(r.userId)) continue
                seen.add(r.userId)
                out.push({ nickname: r.nickname, score: r.score, wonAt: r.wonAt, factors: r.factors ?? null })
            }
            return out
        }
        return NextResponse.json({ ok: true, run2: best("run2"), run3: best("run3") })
    } catch {
        return NextResponse.json({ ok: true, run2: [], run3: [] }) // table pas encore créée → neutre
    }
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
        const existing = (await rs.findFirst({ where: { userId: auth.userId, run }, select: { id: true, score: true } })) as { id: string; score: number } | null
        if (!existing) {
            await rs.create({ data: { userId: auth.userId, nickname: me.nickname, run, score, factors: factors ?? undefined } })
        } else if (run === "run3" ? score > existing.score : true) {
            await rs.update({ where: { id: existing.id }, data: { score, nickname: me.nickname, wonAt: new Date(), factors: factors ?? undefined } })
        }
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
