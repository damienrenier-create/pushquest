// src/app/api/admin/tester/flag/route.ts
//
// Panneau testeur — toggle un flag (Boolean ou clé Json `flags`) du compte tester.
// GET            → liste les flags Boolean connus + leur valeur actuelle
// POST { flagName, value: boolean }  → écrit le flag

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// Liste des flags Boolean connus dans GamebookProgress.
// Source : prisma/schema.prisma (modèle GamebookProgress).
// Classification par zone pour le filtre côté UI.
export const BOOLEAN_FLAGS: { name: string; zone: string }[] = [
    // Intro
    { name: "hasSeenWelcomeScreen", zone: "intro" },
    { name: "hasBag", zone: "intro" },
    { name: "hasEnteredTallGrass", zone: "intro" },
    { name: "monsterCaveRevealed", zone: "intro" },
    { name: "grassSudCutsceneShown", zone: "intro" },
    { name: "isCompleted", zone: "intro" },
    // Bourg & Pont
    { name: "treeObstacleCleared", zone: "bourg" },
    { name: "pioneerBadgeAwarded", zone: "bourg" },
    { name: "gymGuyEnergyGiven", zone: "bourg" },
    { name: "bourgCasinoCoinsFound", zone: "bourg" },
    // Pépiteville / DURUM
    { name: "durumEnergyGiven", zone: "pepiteville" },
    { name: "jardinierArrosoirGiven", zone: "pepiteville" },
    { name: "jardinierMissionActive", zone: "pepiteville" },
    // Tour (TB)
    { name: "tbBossBeaten", zone: "tour" },
    { name: "tbBossKeyHeld", zone: "tour" },
    { name: "tbRewardClaimed", zone: "tour" },
    { name: "treeBookGiven", zone: "tour" },
    { name: "piaffiniRescued", zone: "tour" },
    { name: "papaBoostClaimed", zone: "tour" },
    // PIAFFINI / oiseau / nage
    { name: "firstSwimDone", zone: "macaron" },
    { name: "franssJokeBirdDone", zone: "tour" },
    { name: "ornithologueBirdBonusGiven", zone: "macaron" },
    { name: "nageurDefiCompleted", zone: "macaron" },
    // Macaron'île / véto
    { name: "tamagotchiInBag", zone: "macaron" },
    { name: "pereTalked", zone: "vegas" },
    // Mont / Contest
    { name: "montSummitReached", zone: "muscuville" },
    { name: "contestDefiPompatorDone", zone: "muscuville" },
    { name: "contestDefiSquatilusDone", zone: "muscuville" },
    { name: "contestDefiTiroirDone", zone: "muscuville" },
    { name: "muscuvilleInterpellatorTalked", zone: "muscuville" },
    { name: "muscuvilleRocksPassed", zone: "muscuville" },
    { name: "arenaUnlocked", zone: "muscuville" },
    // Bestioles
    { name: "bestiolesFirstEncountered", zone: "macaron" },
    // Pastagone
    { name: "pastagoneArrested", zone: "pastagone" },
    { name: "pastagoneEscaped", zone: "pastagone" },
    { name: "pastagoneBossBeaten", zone: "pastagone" },
    { name: "pastagoneBolognionFound", zone: "pastagone" },
    { name: "pastagoneCapolinoFleeShown", zone: "pastagone" },
    { name: "pastagoneCapolinoMidBeaten", zone: "pastagone" },
    { name: "pastagoneCoulterBeaten", zone: "pastagone" },
    { name: "pastagoneFaaGiftClaimed", zone: "pastagone" },
    // Casino
    { name: "lottoPouleWonToday", zone: "casino" },
]

export async function GET() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const flags = BOOLEAN_FLAGS.map((f) => ({
        name: f.name,
        zone: f.zone,
        value: progress[f.name] === true,
    }))
    return NextResponse.json({ ok: true, flags })
}

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const flagName = typeof body.flagName === "string" ? body.flagName : null
    const value = body.value === true

    const allowed = BOOLEAN_FLAGS.some((f) => f.name === flagName)
    if (!flagName || !allowed) {
        return NextResponse.json({ ok: false, reason: "flagName invalid or not in allowlist" }, { status: 400 })
    }

    await (prisma as any).gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
        data: { [flagName]: value },
    })
    return NextResponse.json({ ok: true, flagName, value })
}
