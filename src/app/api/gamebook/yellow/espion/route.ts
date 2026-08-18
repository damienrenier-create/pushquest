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

const FEE_STEP = 10 // « frais de dossier » : 10 JC à la 1re révélation, +10 à chaque suivante (10, 20, 30…), en plus du niveau du Daemon

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

const teamLevelSum = (team: RawMon[]) => team.reduce((n, m) => n + Math.max(1, Math.floor(Number(m.level) || 1)), 0)

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    // LISTE des joueurs espionnables : accès Zone de Combat (Sylvebarbe battu) + équipe non vide.
    //   accessCost = SOMME des niveaux de l'équipe → frais pour OUVRIR la vitrine du joueur (payé une fois par ouverture).
    try {
        const saves = await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID, userId: { not: auth.userId } },
            select: { userId: true, flags: true, user: { select: { nickname: true } } },
        })
        const players = saves
            .map((s) => { const { team, sylvebarbeAwake } = flagsOf(s.flags); return { userId: s.userId, nickname: s.user?.nickname ?? "Dresseur", teamSize: team.length, accessCost: teamLevelSum(team), sylvebarbeAwake } })
            .filter((p) => p.sylvebarbeAwake && p.teamSize > 0)
            .map(({ userId, nickname, teamSize, accessCost }) => ({ userId, nickname, teamSize, accessCost }))
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
    const action = typeof body?.action === "string" ? body.action : ""
    const uid = typeof body?.uid === "string" ? body.uid : ""
    if (!target || target === auth.userId) return NextResponse.json({ error: "Bad request" }, { status: 400 })

    // === ACCÈS À LA VITRINE : payer la SOMME des niveaux de l'équipe → débloque les sprites + le droit de révéler. ===
    if (action === "access") {
        let team: RawMon[] = [], nick = "Dresseur"
        try {
            const row = await prisma.gamebookProgress.findUnique({ where: { userId_chapterId: { userId: target, chapterId: YELLOW_CHAPTER_ID } }, select: { flags: true, user: { select: { nickname: true } } } })
            if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
            team = flagsOf(row.flags).team; nick = row.user?.nickname ?? "Dresseur"
        } catch { return NextResponse.json({ error: "Read failed" }, { status: 500 }) }
        const accessCost = teamLevelSum(team)
        let jc = 0, spyCount = 0
        try {
            const fp = (prisma as any).frontierProfile
            const p = await fp.findUnique({ where: { userId: auth.userId } })
            jc = Math.max(0, Math.floor(Number(p?.jc) || 0)); spyCount = Math.max(0, Math.floor(Number(p?.spyCount) || 0))
            if (jc < accessCost) return NextResponse.json({ ok: false, reason: "insufficient", jc, cost: accessCost }, { status: 200 })
            await fp.update({ where: { userId: auth.userId }, data: { jc: jc - accessCost } })
            jc = jc - accessCost
        } catch { /* table FrontierProfile absente → accès gratuit (dégradation propre) */ }
        const mons = team.map((m) => vitrineMon(m, "team")).filter((m) => m.uid && m.speciesId)
        return NextResponse.json({ ok: true, nickname: nick, mons, spyCount, jc, cost: accessCost })
    }

    if (!uid) return NextResponse.json({ error: "Bad request" }, { status: 400 })

    // 1) Retrouver LE Daemon ciblé (par uid) dans la save de la cible — lecture seule.
    let mon: RawMon | null = null
    let nickname = "Dresseur"
    try {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: target, chapterId: YELLOW_CHAPTER_ID } },
            select: { flags: true, user: { select: { nickname: true } } },
        })
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
        const { team } = flagsOf(row.flags)
        mon = team.find((m) => String(m.uid ?? "") === uid) ?? null // équipe seulement (pas le PC)
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
        // Coût = 1 JC par NIVEAU du Daemon + FRAIS DE DOSSIER croissants (10, 20, 30… = 10×(spyCount+1)).
        const monLevel = Math.max(1, Math.floor(Number((mon as any).level) || 1))
        cost = monLevel + FEE_STEP * (spyCount + 1)
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
