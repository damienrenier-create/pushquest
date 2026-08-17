// src/app/api/gamebook/yellow/espion/route.ts
//
// USINE DE COMBAT — L'ESPION. Vitrine + révélation payante PAR DAEMON.
//   • GET (liste)      : joueurs espionnables = ceux ayant ACCÈS à la Zone de Combat (ont battu Sylvebarbe :
//                        flags.sylvebarbeAwake), hors soi-même, équipe non vide.
//   • GET ?target=<id> : VITRINE (GRATUITE) — sprites seulement : { uid, speciesId, level, shiny, zone }. Aucune stat.
//   • POST { target, uid } : RÉVÈLE UN Daemon précis (celui cliqué) contre des JC (coût PERSO croissant via spyCount).
//                        Renvoie la fiche COMPLÈTE (mon brut) → le client l'hydrate (IV/EV/Saiyan/objet/moveset).
//
// Lecture SEULE des saves d'autrui (aucune mutation) → zéro risque. Pattern gaté `(prisma as any).frontierProfile`
//   pour le débit : dégrade en espionnage GRATUIT si la table/colonne n'existe pas encore (avant db:push).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const SPY_BASE_COST = 60 // JC de la 1re révélation ; ×(spyCount+1) ensuite → 60, 120, 180… (croissant, sans cap)

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

type RawMon = Record<string, unknown> & { uid?: unknown; speciesId?: unknown; level?: unknown; shiny?: unknown }
function asArray(v: unknown): RawMon[] { return Array.isArray(v) ? (v as RawMon[]) : [] }
function flagsOf(flags: unknown): { team: RawMon[]; pc: RawMon[]; sylvebarbeAwake: boolean } {
    const f = (flags && typeof flags === "object" ? flags : {}) as { team?: unknown; pc?: unknown; sylvebarbeAwake?: unknown }
    return { team: asArray(f.team), pc: asArray(f.pc), sylvebarbeAwake: f.sylvebarbeAwake === true }
}
/** Entrée de VITRINE (sprite only) : juste de quoi dessiner l'icône, aucune stat. */
function vitrineMon(m: RawMon, zone: "team" | "pc") {
    return { uid: String(m.uid ?? ""), speciesId: String(m.speciesId ?? ""), level: Number(m.level ?? 1), shiny: m.shiny === true, zone }
}

export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    const target = new URL(req.url).searchParams.get("target")

    // VITRINE d'un joueur : sprites seulement (gratuit).
    if (target) {
        try {
            const row = await prisma.gamebookProgress.findUnique({
                where: { userId_chapterId: { userId: target, chapterId: YELLOW_CHAPTER_ID } },
                select: { flags: true, user: { select: { nickname: true } } },
            })
            if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
            const { team, pc } = flagsOf(row.flags)
            const mons = [
                ...team.map((m) => vitrineMon(m, "team")),
                ...pc.slice(0, 60).map((m) => vitrineMon(m, "pc")),
            ].filter((m) => m.uid && m.speciesId)
            return NextResponse.json({ ok: true, nickname: row.user?.nickname ?? "Dresseur", mons })
        } catch {
            return NextResponse.json({ error: "Read failed" }, { status: 500 })
        }
    }

    // LISTE des joueurs espionnables : accès Zone de Combat (Sylvebarbe battu) + équipe non vide.
    try {
        const saves = await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID, userId: { not: auth.userId } },
            select: { userId: true, flags: true, user: { select: { nickname: true } } },
        })
        const players = saves
            .map((s) => { const { team, sylvebarbeAwake } = flagsOf(s.flags); return { userId: s.userId, nickname: s.user?.nickname ?? "Dresseur", teamSize: team.length, sylvebarbeAwake } })
            .filter((p) => p.sylvebarbeAwake && p.teamSize > 0)
            .map(({ userId, nickname, teamSize }) => ({ userId, nickname, teamSize }))
            .sort((a, b) => a.nickname.localeCompare(b.nickname))
        return NextResponse.json({ ok: true, players })
    } catch {
        return NextResponse.json({ ok: true, players: [] })
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const target = typeof body?.target === "string" ? body.target : ""
    const uid = typeof body?.uid === "string" ? body.uid : ""
    if (!target || target === auth.userId || !uid) return NextResponse.json({ error: "Bad request" }, { status: 400 })

    // 1) Retrouver LE Daemon ciblé (par uid) dans la save de la cible — lecture seule.
    let mon: RawMon | null = null
    let nickname = "Dresseur"
    try {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: target, chapterId: YELLOW_CHAPTER_ID } },
            select: { flags: true, user: { select: { nickname: true } } },
        })
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
        const { team, pc } = flagsOf(row.flags)
        mon = [...team, ...pc].find((m) => String(m.uid ?? "") === uid) ?? null
        nickname = row.user?.nickname ?? "Dresseur"
    } catch {
        return NextResponse.json({ error: "Read failed" }, { status: 500 })
    }
    if (!mon) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })

    // 2) Débit JC progressif (spyCount). Dégrade en GRATUIT si la table/colonne n'existe pas encore.
    let cost = 0, jc = 0, spyCount = 0
    try {
        const fp = (prisma as any).frontierProfile
        const existing = await fp.findUnique({ where: { userId: auth.userId } })
        spyCount = Math.max(0, Math.floor(Number(existing?.spyCount) || 0))
        jc = Math.max(0, Math.floor(Number(existing?.jc) || 0))
        cost = SPY_BASE_COST * (spyCount + 1)
        if (jc < cost) return NextResponse.json({ ok: false, reason: "insufficient", jc, cost }, { status: 200 })
        await fp.update({ where: { userId: auth.userId }, data: { jc: jc - cost } })
        jc = jc - cost
        try { await fp.update({ where: { userId: auth.userId }, data: { spyCount: spyCount + 1 } }); spyCount = spyCount + 1 }
        catch { /* colonne spyCount pas encore migrée → coût reste au palier de base, non bloquant */ }
    } catch {
        cost = 0 // table FrontierProfile absente → révélation gratuite (dégradation propre)
    }

    return NextResponse.json({ ok: true, nickname, mon, cost, jc, spyCount })
}
