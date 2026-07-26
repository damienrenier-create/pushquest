// src/app/api/gamebook/yellow/player-badges/route.ts
//
// Nexus Jaune Éclair — PROFIL « hauts faits » d'un joueur, pour rendre les lignes du CLASSEMENT cliquables
// (voir les trophées débloqués par un autre joueur). Modèle PULL : lit le blob GamebookProgress.flags de la CIBLE
// et recalcule ses badges via evaluateBadges (module pur, importable serveur).
//
// ANTI-SPOILER (décision Sartay) : on ne renvoie que les hauts faits NON-SECRETS gagnés (par id) + un AGRÉGAT des
// secrets (compte, SANS les nommer) → un spectateur qui n'a pas encore découvert un secret (Goshendofy, Sylvebarbe…)
// ne l'apprend pas en consultant le profil d'un autre. Accessible dès le run 1 (comme l'onglet RUN 1 du classement).
//
// Gaté `isNexusYellowEnabled` (joueur Nexus Jaune). Aucune écriture. Aucune table dédiée (lit gamebookProgress).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { badgeInputFromSave, evaluateBadges, BADGES, TIER_POINTS } from "@/lib/gamebook/yellow/data/run1Badges"

export const dynamic = "force-dynamic"

const SECRET_IDS = new Set(BADGES.filter((b) => b.secret).map((b) => b.id))
const SECRET_TOTAL = SECRET_IDS.size
const MAX_POINTS = BADGES.reduce((s, b) => s + TIER_POINTS[b.tier], 0)

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

const EMPTY = { earnedIds: [] as string[], secretEarned: 0, secretTotal: SECRET_TOTAL, totalPoints: 0, earnedCount: 0, maxPoints: MAX_POINTS }

export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    const targetId = new URL(req.url).searchParams.get("userId")
    if (!targetId) return NextResponse.json({ error: "Bad params" }, { status: 400 })

    try {
        const row = await prisma.gamebookProgress.findUnique({
            where: { userId_chapterId: { userId: targetId, chapterId: YELLOW_CHAPTER_ID } },
            select: { flags: true, user: { select: { nickname: true } } },
        })
        const nickname = row?.user?.nickname ?? "?"
        if (!row?.flags) return NextResponse.json({ ok: true, nickname, ...EMPTY })

        const f = row.flags as Record<string, unknown>
        // Les 2 badges-ÉVÉNEMENTS peuvent être posés dans un monde imbriqué (run 2/3) → OR sur les 3 mondes
        // (même logique que run1FromWorld du leaderboard), sinon ils manqueraient avant fusion.
        const orFlag = (k: string) =>
            f[k] === true || (f.ngplusWorld as Record<string, unknown> | null)?.[k] === true || (f.run3World as Record<string, unknown> | null)?.[k] === true
        const result = evaluateBadges(badgeInputFromSave({
            ...(f as Parameters<typeof badgeInputFromSave>[0]),
            leagueSixShiny: orFlag("leagueSixShiny"),
            mirrorWinHigherLevel: orFlag("mirrorWinHigherLevel"),
        }))

        const earnedIds = result.badges.filter((b) => b.earned && !SECRET_IDS.has(b.id)).map((b) => b.id)
        const secretEarned = result.badges.filter((b) => b.earned && SECRET_IDS.has(b.id)).length

        return NextResponse.json({
            ok: true, nickname, earnedIds, secretEarned, secretTotal: SECRET_TOTAL,
            totalPoints: result.totalPoints, earnedCount: result.earnedCount, maxPoints: MAX_POINTS,
        })
    } catch {
        return NextResponse.json({ ok: true, nickname: "?", ...EMPTY }) // lecture impossible → profil vide (neutre)
    }
}
