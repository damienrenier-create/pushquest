// src/app/api/gamebook/yellow/espion/route.ts
//
// USINE DE COMBAT — L'ESPION. Le joueur paie des Jetons de Combat (coût PERSO croissant, jamais reset) pour
//   consulter la FICHE COMPLÈTE des Daemons d'un AUTRE joueur (équipe + PC : espèce, niveau, IV, EV, Saiyan,
//   moveset, shiny…). Lecture SEULE des saves d'autrui (aucune mutation) → zéro risque de corruption.
//
//  GET               → liste des joueurs espionnables (userId, pseudo, taille d'équipe), hors soi-même.
//  POST { target }   → débite le coût JC (SPY_BASE × (spyCount+1)) + incrémente spyCount, renvoie le roster de la cible.
//
// Pattern GATÉ `(prisma as any).frontierProfile` (JC + spyCount) : compile avant db:push. Si la table/colonne
//   n'existe pas encore, le débit dégrade proprement (espionnage GRATUIT) — jamais bloquant.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const SPY_BASE_COST = 60 // JC du 1er espionnage ; ×(spyCount+1) ensuite → 60, 120, 180… (croissant, sans cap)

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

/** Extrait le roster (équipe + PC) depuis le blob `flags` d'une save (per-world live). Renvoie des tableaux bruts
 *  (le client les hydrate via parseMon). PC borné à 60 pour limiter la charge. */
function rosterFromFlags(flags: unknown): { team: unknown[]; pc: unknown[] } {
    const f = (flags && typeof flags === "object" ? flags : {}) as { team?: unknown; pc?: unknown }
    const team = Array.isArray(f.team) ? f.team : []
    const pc = Array.isArray(f.pc) ? f.pc.slice(0, 60) : []
    return { team, pc }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const saves = await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID, userId: { not: auth.userId } },
            select: { userId: true, flags: true, user: { select: { nickname: true } } },
        })
        const players = saves
            .map((s) => {
                const { team } = rosterFromFlags(s.flags)
                return { userId: s.userId, nickname: s.user?.nickname ?? "Dresseur", teamSize: team.length }
            })
            .filter((p) => p.teamSize > 0)
            .sort((a, b) => a.nickname.localeCompare(b.nickname))
        return NextResponse.json({ ok: true, players })
    } catch {
        return NextResponse.json({ ok: true, players: [] }) // table absente / erreur → liste vide (neutre)
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const target = typeof body?.target === "string" ? body.target : ""
    if (!target || target === auth.userId) return NextResponse.json({ error: "Bad target" }, { status: 400 })

    // 1) Cible : lecture SEULE de sa save (équipe + PC).
    let roster: { team: unknown[]; pc: unknown[] } = { team: [], pc: [] }
    let nickname = "Dresseur"
    try {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: target, chapterId: YELLOW_CHAPTER_ID } },
            select: { flags: true, user: { select: { nickname: true } } },
        })
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
        roster = rosterFromFlags(row.flags)
        nickname = row.user?.nickname ?? "Dresseur"
    } catch {
        return NextResponse.json({ error: "Read failed" }, { status: 500 })
    }

    // 2) Débit JC progressif (spyCount). Dégrade en GRATUIT si la table/colonne n'existe pas encore.
    let cost = 0, jc = 0, spyCount = 0
    try {
        const fp = (prisma as any).frontierProfile
        const existing = await fp.findUnique({ where: { userId: auth.userId } })
        spyCount = Math.max(0, Math.floor(Number(existing?.spyCount) || 0))
        jc = Math.max(0, Math.floor(Number(existing?.jc) || 0))
        cost = SPY_BASE_COST * (spyCount + 1)
        if (jc < cost) return NextResponse.json({ ok: false, reason: "insufficient", jc, cost }, { status: 200 })
        // Débit JC (toujours possible). spyCount best-effort (colonne peut manquer avant db:push).
        await fp.update({ where: { userId: auth.userId }, data: { jc: jc - cost } })
        jc = jc - cost
        try {
            await fp.update({ where: { userId: auth.userId }, data: { spyCount: spyCount + 1 } })
            spyCount = spyCount + 1
        } catch { /* colonne spyCount pas encore migrée → coût reste au palier de base, non bloquant */ }
    } catch {
        // table FrontierProfile absente → espionnage gratuit (dégradation propre, comme le rejeu no-table)
        cost = 0
    }

    return NextResponse.json({ ok: true, nickname, team: roster.team, pc: roster.pc, cost, jc, spyCount })
}
