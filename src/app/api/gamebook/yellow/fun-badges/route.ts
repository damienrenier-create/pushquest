// src/app/api/gamebook/yellow/fun-badges/route.ts
//
// Nexus Jaune Éclair — 🏅 MÉDAILLES DE RAPIDITÉ (mode fun). Grave la 1re fois qu'un joueur FUN décroche un haut
// fait du RUN 1 ; le RANG d'obtention (par badgeId, `at` croissant) donne la médaille : 1er = OR, 2e = ARGENT,
// 3e = BRONZE, ensuite rien. Concept RÉSERVÉ aux comptes fun (gameMode="fun").
//   POST { badges: string[] } : enregistre les badges NOUVELLEMENT gravés (idempotent) → { medals, newlyEarned }.
//   GET  : { medals } — la médaille du joueur pour chacun de ses badges déjà gravés (affichage).
//
// Table gated (prisma as any).yellowFunBadgeEarn → COMPILE avant db:push, try/catch → feature NEUTRE tant que la
// table n'existe pas. NB : l'ordre n'est pas récupérable rétroactivement → le compteur démarre au 1er POST de chacun.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { RUN1_FUN_BADGE_IDS, medalForRank, type FunMedal } from "@/lib/gamebook/yellow/data/run1Badges"

export const dynamic = "force-dynamic"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

/** Médaille du joueur pour chaque badge donné, calculée depuis l'ORDRE d'obtention (par badgeId, `at` croissant). */
async function computeMedals(userId: string, badgeIds: string[]): Promise<Record<string, Exclude<FunMedal, null>>> {
    const out: Record<string, Exclude<FunMedal, null>> = {}
    if (badgeIds.length === 0) return out
    const rows = (await (prisma as any).yellowFunBadgeEarn.findMany({
        where: { badgeId: { in: badgeIds } },
        select: { userId: true, badgeId: true },
        orderBy: [{ badgeId: "asc" }, { at: "asc" }, { id: "asc" }],
    })) as { userId: string; badgeId: string }[]
    const byBadge = new Map<string, string[]>() // badgeId → userIds ordonnés par date d'obtention
    for (const r of rows) { const a = byBadge.get(r.badgeId) ?? []; a.push(r.userId); byBadge.set(r.badgeId, a) }
    for (const [badgeId, users] of byBadge) {
        const rank = users.indexOf(userId)
        if (rank < 0) continue
        const m = medalForRank(rank)
        if (m) out[badgeId] = m
    }
    return out
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { gameMode: true } })
        if (me?.gameMode !== "fun") return NextResponse.json({ ok: true, medals: {} }) // médailles = fun uniquement
        const mine = (await (prisma as any).yellowFunBadgeEarn.findMany({ where: { userId: auth.userId }, select: { badgeId: true } })) as { badgeId: string }[]
        const medals = await computeMedals(auth.userId, mine.map((r) => r.badgeId))
        // NB d'obtenteurs PAR BADGE (tous joueurs fun) → le panel en déduit les PLACES DE MÉDAILLE restantes
        //   (3 premiers = or/argent/bronze). Petit volume (≈ joueurs fun × badges) → findMany + comptage JS.
        const all = (await (prisma as any).yellowFunBadgeEarn.findMany({ select: { badgeId: true } })) as { badgeId: string }[]
        const medalCounts: Record<string, number> = {}
        for (const r of all) medalCounts[r.badgeId] = (medalCounts[r.badgeId] ?? 0) + 1
        return NextResponse.json({ ok: true, medals, medalCounts })
    } catch {
        return NextResponse.json({ ok: true, medals: {} }) // table pas encore créée → neutre
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true, gameMode: true } })
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
    if (me.gameMode !== "fun") return NextResponse.json({ ok: true, medals: {}, newlyEarned: [] }) // médailles = fun uniquement

    let body: { badges?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const raw = Array.isArray(body.badges) ? body.badges : []
    // On ne garde que des badges fun VALIDES du RUN 1 (les médailles de rapidité = run 1 uniquement ; le run 2 se
    //   classe à la performance /1000 et récompense les hauts faits en REPS, pas en médailles). Anti-triche : POST client.
    const badges = [...new Set(raw.filter((b): b is string => typeof b === "string" && RUN1_FUN_BADGE_IDS.has(b)))].slice(0, 100)
    if (badges.length === 0) return NextResponse.json({ ok: true, medals: {}, newlyEarned: [] })

    try {
        const t = (prisma as any).yellowFunBadgeEarn
        const have = (await t.findMany({ where: { userId: auth.userId, badgeId: { in: badges } }, select: { badgeId: true } })) as { badgeId: string }[]
        const haveSet = new Set(have.map((r) => r.badgeId))
        const toAdd = badges.filter((b) => !haveSet.has(b))
        let newlyEarned: string[] = []
        if (toAdd.length) {
            await t.createMany({ data: toAdd.map((badgeId) => ({ userId: auth.userId, nickname: me.nickname, badgeId })), skipDuplicates: true })
            newlyEarned = toAdd
        }
        const medals = await computeMedals(auth.userId, badges)
        return NextResponse.json({ ok: true, medals, newlyEarned })
    } catch {
        return NextResponse.json({ ok: true, medals: {}, newlyEarned: [] }) // table pas encore créée → neutre
    }
}
