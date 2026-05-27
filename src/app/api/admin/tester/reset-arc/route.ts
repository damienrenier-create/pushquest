// src/app/api/admin/tester/reset-arc/route.ts
//
// Panneau testeur — reset les flags d'un arc narratif sans toucher au reste.
// Body : { arc: "intro" | "bourg" | "tour" | "macaron" | "muscuville" | "vegas" | "pastagone" }

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// Mapping arc → flags à reset (false pour Boolean, valeur de défaut pour autres).
const ARC_RESET_MAP: Record<string, Record<string, unknown>> = {
    intro: {
        hasSeenWelcomeScreen: false,
        hasBag: false,
        hasEnteredTallGrass: false,
        monsterCaveRevealed: false,
        grassSudCutsceneShown: false,
    },
    bourg: {
        treeObstacleCleared: false,
        pioneerBadgeAwarded: false,
        gymGuyEnergyGiven: false,
        bourgCasinoCoinsFound: false,
    },
    tour: {
        tbBossBeaten: false,
        tbBossKeyHeld: false,
        tbRewardClaimed: false,
        treeBookGiven: false,
        piaffiniRescued: false,
        papaBoostClaimed: false,
        franssJokeBirdDone: false,
    },
    macaron: {
        firstSwimDone: false,
        tamagotchiInBag: false,
        ornithologueBirdBonusGiven: false,
        nageurDefiCompleted: false,
        bestiolesFirstEncountered: false,
    },
    muscuville: {
        montSummitReached: false,
        contestDefiPompatorDone: false,
        contestDefiSquatilusDone: false,
        contestDefiTiroirDone: false,
        muscuvilleInterpellatorTalked: false,
        muscuvilleRocksPassed: false,
        arenaUnlocked: false,
    },
    vegas: {
        pereTalked: false,
    },
    pastagone: {
        pastagoneArrested: false,
        pastagoneEscaped: false,
        pastagoneBossBeaten: false,
        pastagoneBolognionFound: false,
        pastagoneCapolinoFleeShown: false,
        pastagoneCapolinoMidBeaten: false,
        pastagoneCoulterBeaten: false,
        pastagoneFaaGiftClaimed: false,
    },
    casino: {
        lottoPouleWonToday: false,
    },
}

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const arc = typeof body.arc === "string" ? body.arc : null
    if (!arc || !ARC_RESET_MAP[arc]) {
        return NextResponse.json({
            ok: false,
            reason: `arc invalide. Choisir parmi : ${Object.keys(ARC_RESET_MAP).join(", ")}`,
        }, { status: 400 })
    }

    await (prisma as any).gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
        data: ARC_RESET_MAP[arc],
    })
    return NextResponse.json({ ok: true, action: "reset-arc", arc, fieldsReset: Object.keys(ARC_RESET_MAP[arc]) })
}
