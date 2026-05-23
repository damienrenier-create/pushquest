// src/app/api/gamebook/state/route.ts
//
// GET  /api/gamebook/state  -> lit (ou crée) le GamebookProgress + reps du jour
// POST /api/gamebook/state  -> sauvegarde le nouvel état
// DELETE /api/gamebook/state -> reset (debug)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { INITIAL_SPAWN } from "@/lib/gamebook/maps"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { ensureCreatorBootstrap } from "@/lib/gamebook/creator"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

// v3.8.5 — Comptes "créateur" (isSystem=true) : godmode pour tester la map
// sans affecter les classements (isSystem est filtré partout ailleurs).
const CREATOR_MIN_ENERGY = 1000

async function isCreatorAccount(userId: string): Promise<boolean> {
    const u = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    return u?.isSystem === true
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })

    // v3.13 — Auto-bootstrap des comptes créateur (isSystem) avec les flags narratifs
    // majeurs (piaffiniRescued, firstSwimDone) et les items équipement (swim_set).
    // Idempotent : si déjà fait, no-op.
    if (progress) {
        progress = await ensureCreatorBootstrap(userId, progress)
    }

    if (!progress) {
        progress = await prisma.gamebookProgress.create({
            data: {
                userId,
                chapterId: CHAPTER_ID,
                currentNodeId: "map",
                mapId: INITIAL_SPAWN.mapId,
                posX: INITIAL_SPAWN.posX,
                posY: INITIAL_SPAWN.posY,
                direction: INITIAL_SPAWN.direction,
                phase: "explore",
                introStep: 0,
                hasEnteredTallGrass: false,
                monsterCaveRevealed: false,
                hasSeenWelcomeScreen: false,
                treeObstacleCleared: false,
                pioneerBadgeAwarded: false,
                bridgePnjDefeated: [],
                bridgePnjLastBeatenDate: {},
                gymGuyEnergyGiven: false,
                npcsTalkedTo: [],
            },
        })
    } else {
        await prisma.gamebookProgress.update({
            where: { id: progress.id },
            data: { lastSeen: new Date() },
        })
    }

    const todayReps = await getTodayReps(userId)

    // === v3.4a : calcul de l'énergie consommée du jour (reset à minuit) ===
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    // Si la date stockée n'est pas aujourd'hui, le compteur est obsolète → reset à 0
    const energySpentToday = storedDate === today ? storedSpent : 0
    // v3.8 : pas de plafond — energySpentToday peut être négatif si la gourde a été bue.
    // Énergie réellement disponible = reps totales - énergie déjà consommée
    let availableEnergy = todayReps - energySpentToday

    // v3.8.5 — Mode créateur (isSystem) : énergie minimum 1000 pour tester la map.
    // Ne touche pas aux données réelles : on override juste la valeur renvoyée au client.
    const isCreator = await isCreatorAccount(userId)
    if (isCreator && availableEnergy < CREATOR_MIN_ENERGY) {
        availableEnergy = CREATOR_MIN_ENERGY
    }

    // v3.6 — expose frozenUntil pour que le client puisse afficher l'overlay anti-triche
    const frozenUntil = (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil ?? null
    const frozen = isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })

    // v3.8 — inventaire et hasBag
    const inventory = (progress as { inventory?: unknown }).inventory ?? []
    const hasBag = (progress as { hasBag?: boolean }).hasBag === true
    // v3.8.1 — fruits cueillis aujourd'hui (par user, reset à minuit côté take-fruit)
    const fruitsTaken = (progress as { fruitsTaken?: unknown }).fruitsTaken ?? {}
    // v3.8.2 — plus haut étage atteint dans la Tour des Pâtes Aiguës (1..5)
    const towerFloorReached = (progress as { towerFloorReached?: number }).towerFloorReached ?? 1
    // v3.10 — Ratio de difficulté (1.0 vétéran, < 1.0 onboarding).
    // Le client multiplie tous les coûts par ce ratio pour afficher des valeurs adaptées.
    const { getUserDifficultyRatio } = await import("@/lib/gamebook/difficulty")
    const difficultyRatio = await getUserDifficultyRatio(userId)

    // v3.14 — Tamagotchi : on renvoie la vue (happiness + level recalculés) ou null
    // v3.15 — Le level est aligné sur le level XP réel du joueur (catch-up si happy)
    const { parseTamagotchi, viewTamagotchi } = await import("@/lib/gamebook/tamagotchi")
    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    let tamagotchi = null
    if (tam) {
        const { getUserLevelForGamebook } = await import("@/lib/gamebook/userLevel")
        const userLevel = await getUserLevelForGamebook(userId)
        tamagotchi = viewTamagotchi(tam, userLevel)
    }

    return NextResponse.json({
        state: {
            mapId: progress.mapId,
            posX: progress.posX,
            posY: progress.posY,
            direction: progress.direction,
            phase: progress.phase,
            introStep: progress.introStep,
            hasEnteredTallGrass: progress.hasEnteredTallGrass,
            monsterCaveRevealed: progress.monsterCaveRevealed,
            hasSeenWelcomeScreen: progress.hasSeenWelcomeScreen,
            treeObstacleCleared: progress.treeObstacleCleared,
            pioneerBadgeAwarded: progress.pioneerBadgeAwarded,
            bridgePnjDefeated: progress.bridgePnjDefeated,
            bridgePnjLastBeatenDate: progress.bridgePnjLastBeatenDate,
            gymGuyEnergyGiven: (progress as { gymGuyEnergyGiven?: boolean }).gymGuyEnergyGiven ?? false,
            npcsTalkedTo: (progress as { npcsTalkedTo?: string[] }).npcsTalkedTo ?? [],
            gamebookFrozenUntil: frozenUntil,
            // v3.11 — PIAFFINI sauvé (débloque dialogues post-quête JOJO/JOJETTE)
            piaffiniRescued: (progress as { piaffiniRescued?: boolean }).piaffiniRescued === true,
            // v3.12 — Première baignade faite (débloque traversée canal seul)
            firstSwimDone: (progress as { firstSwimDone?: boolean }).firstSwimDone === true,
            // v3.17c — Flags one-shot polish (papa boost, défi nageur, case cachée casino)
            papaBoostClaimed: (progress as { papaBoostClaimed?: boolean }).papaBoostClaimed === true,
            nageurDefiCompleted: (progress as { nageurDefiCompleted?: boolean }).nageurDefiCompleted === true,
            bourgCasinoCoinsFound: (progress as { bourgCasinoCoinsFound?: boolean }).bourgCasinoCoinsFound === true,
            luck: (progress as { luck?: number }).luck ?? 0,
            // v3.19b — Bestioles attack mechanic
            bestiolesFirstEncountered: (progress as { bestiolesFirstEncountered?: boolean }).bestiolesFirstEncountered === true,
            bestiolesSpeciesName: (progress as { bestiolesSpeciesName?: string | null }).bestiolesSpeciesName ?? null,
            // v3.21 — Casino mini-jeu : compteur paris du jour + lastLuckTalkDate
            casinoBetsDate: (progress as { casinoBetsDate?: string }).casinoBetsDate ?? "",
            casinoBetsToday: (progress as { casinoBetsToday?: number }).casinoBetsToday ?? 0,
            lastLuckTalkDate: (progress as { lastLuckTalkDate?: string }).lastLuckTalkDate ?? "",
        },
        todayReps,
        energySpentToday,
        availableEnergy,
        frozen,
        frozenUntil,
        // v3.8
        inventory,
        hasBag,
        // v3.8.1
        fruitsTaken,
        // v3.8.2
        towerFloorReached,
        // v3.10 — facteur de difficulté pour l'affichage côté client
        difficultyRatio,
        // v3.14 — Tamagotchi (null si pas adopté)
        tamagotchi,
    })
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const mapId = typeof body.mapId === "string" ? body.mapId : null
    const posX = typeof body.posX === "number" ? body.posX : null
    const posY = typeof body.posY === "number" ? body.posY : null
    const direction = typeof body.direction === "string" ? body.direction : null
    const phase = typeof body.phase === "string" ? body.phase : null

    if (
        !mapId ||
        posX === null ||
        posY === null ||
        !direction ||
        !phase ||
        // v3.8 — Pépiteville et ses bâtiments + v3.8.2 — Hautes-Pâtes et tour des Pâtes Aiguës + v3.12 — Macaron'île + v3.13 — bâtiments Macaron'île + v3.15 — bibliothèque + v3.16 — Hautes herbes du sud + Muscuville
        !["bourgpates", "gym", "casino", "cave", "route1", "pepiteville", "gym_pepite", "casino_pepite", "shop_interior", "hautespates", "tower_floor_1", "tower_floor_2", "tower_floor_3", "tower_floor_4", "tower_floor_5", "macaron_ile", "shop_macaron", "veterinaire", "bibliotheque", "grass_sud", "muscuville", "la_mer"].includes(mapId) ||
        !["up", "down", "left", "right"].includes(direction) ||
        !["explore", "introMonster", "playing"].includes(phase) ||
        posX < 0 || posX > 30 ||
        posY < 0 || posY > 30
    ) {
        return NextResponse.json({ error: "Invalid state" }, { status: 400 })
    }

    const introStep = typeof body.introStep === "number" ? body.introStep : 0
    const hasEnteredTallGrass = body.hasEnteredTallGrass === true
    const monsterCaveRevealed = body.monsterCaveRevealed === true
    const hasSeenWelcomeScreen = body.hasSeenWelcomeScreen === true
    const treeObstacleCleared = body.treeObstacleCleared === true
    const pioneerBadgeAwarded = body.pioneerBadgeAwarded === true
    // v3.11 — flag piaffiniRescued (one-way : false → true, jamais l'inverse)
    const piaffiniRescued = body.piaffiniRescued === true
    // v3.12 — flag firstSwimDone (one-way : false → true, jamais l'inverse)
    const firstSwimDone = body.firstSwimDone === true
    const bridgePnjDefeated = Array.isArray(body.bridgePnjDefeated)
        ? (body.bridgePnjDefeated as string[]).filter((x) => typeof x === "string")
        : []
    const bridgePnjLastBeatenDate =
        body.bridgePnjLastBeatenDate &&
        typeof body.bridgePnjLastBeatenDate === "object" &&
        !Array.isArray(body.bridgePnjLastBeatenDate)
            ? (body.bridgePnjLastBeatenDate as Record<string, string>)
            : {}
    const gymGuyEnergyGiven = body.gymGuyEnergyGiven === true
    const npcsTalkedTo = Array.isArray(body.npcsTalkedTo)
        ? (body.npcsTalkedTo as string[]).filter((x) => typeof x === "string")
        : []

    // v3.6 — Si frozen, ne pas appliquer le write (mais renvoyer l'état actuel sans erreur)
    const existing = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (existing && isGamebookFrozen(existing as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            frozen: true,
            frozenUntil: (existing as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
            reason: "Gamebook gelé suite à une suppression de reps.",
            state: existing,
        })
    }

    // v3.11 — On préserve piaffiniRescued=true si déjà true en DB (one-way flag).
    const existingPiaffini = (existing as { piaffiniRescued?: boolean })?.piaffiniRescued === true
    const finalPiaffiniRescued = existingPiaffini || piaffiniRescued
    // v3.12 — Idem pour firstSwimDone (one-way)
    const existingFirstSwim = (existing as { firstSwimDone?: boolean })?.firstSwimDone === true
    const finalFirstSwimDone = existingFirstSwim || firstSwimDone

    // Cast en `any` pour le `data` afin de bypasser le check TS strict sur les nouveaux
    // champs Prisma tant que le client n'est pas régénéré côté CI. Le pattern est cohérent
    // avec le reste du code qui utilise `(prisma as any)` régulièrement.
    const updated = await (prisma as any).gamebookProgress.upsert({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
        update: {
            mapId,
            posX,
            posY,
            direction,
            phase,
            introStep,
            hasEnteredTallGrass,
            monsterCaveRevealed,
            hasSeenWelcomeScreen,
            treeObstacleCleared,
            pioneerBadgeAwarded,
            bridgePnjDefeated,
            bridgePnjLastBeatenDate,
            gymGuyEnergyGiven,
            npcsTalkedTo,
            piaffiniRescued: finalPiaffiniRescued,
            firstSwimDone: finalFirstSwimDone,
            lastSeen: new Date(),
        },
        create: {
            userId,
            chapterId: CHAPTER_ID,
            currentNodeId: "map",
            mapId,
            posX,
            posY,
            direction,
            phase,
            introStep,
            hasEnteredTallGrass,
            monsterCaveRevealed,
            hasSeenWelcomeScreen,
            treeObstacleCleared,
            pioneerBadgeAwarded,
            bridgePnjDefeated,
            bridgePnjLastBeatenDate,
            gymGuyEnergyGiven,
            npcsTalkedTo,
            piaffiniRescued: finalPiaffiniRescued,
            firstSwimDone: finalFirstSwimDone,
        },
    })

    // (variable `existing` est référencée ci-dessus pour préserver piaffiniRescued)
    void existing
    return NextResponse.json({ ok: true, state: updated })
}

export async function DELETE() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    await prisma.gamebookProgress.deleteMany({
        where: { userId, chapterId: CHAPTER_ID },
    })

    return NextResponse.json({ ok: true })
}
