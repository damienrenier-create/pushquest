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
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
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

    // v3.23e — Auto-heal : si un joueur a `franssJokeBirdDone = true` mais
    // `piaffiniRescued = false` (= bug v3.23e initial où la blague ne propageait
    // pas le rescue), on répare l'arc PIAFFINI silencieusement.
    if (
        progress
        && (progress as { franssJokeBirdDone?: boolean }).franssJokeBirdDone === true
        && (progress as { piaffiniRescued?: boolean }).piaffiniRescued !== true
    ) {
        try {
            const { parseInventory: parseInv, addItem: addInvItem, hasIntactItem: hasInvItem } = await import("@/lib/gamebook/inventory")
            const { getInitialItemData: getInitData, getItem: getItemDef } = await import("@/lib/gamebook/items")
            const currentInv = parseInv((progress as { inventory?: unknown }).inventory)
            let newInv = currentInv
            const swimSetDef = getItemDef("swim_set")
            if (swimSetDef && !hasInvItem(currentInv, "swim_set")) {
                newInv = addInvItem(currentInv, "swim_set", getInitData(swimSetDef))
            }
            progress = await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { piaffiniRescued: true, inventory: newInv },
            })
            // Best-effort badge + XP
            try {
                const def = await (prisma as any).badgeDefinition.findUnique({ where: { key: "gamebook_sauveur_piaffini" } })
                if (def) {
                    const existing = await (prisma as any).badgeEvent.findFirst({
                        where: { badgeKey: "gamebook_sauveur_piaffini", toUserId: userId, eventType: "UNIQUE_AWARDED" },
                    })
                    if (!existing) {
                        await (prisma as any).badgeEvent.create({
                            data: {
                                badgeKey: "gamebook_sauveur_piaffini",
                                fromUserId: null,
                                toUserId: userId,
                                eventType: "UNIQUE_AWARDED",
                                previousValue: 0,
                                newValue: 1,
                                metadata: JSON.stringify({ source: "autoheal_franss_joke_arc", xpReward: 200 }),
                            },
                        })
                    }
                }
                const existingXp = await (prisma as any).xpAdjustment.findFirst({
                    where: { userId, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK" },
                })
                if (!existingXp) {
                    await (prisma as any).xpAdjustment.create({
                        data: { userId, amount: 200, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK", date: getTodayISO() },
                    })
                }
            } catch (e) {
                console.warn("[state autoheal] PIAFFINI badge create failed", e)
            }
        } catch (e) {
            console.warn("[state autoheal] failed", e)
        }
    }

    // v3.23h — Snapshot du level XP au PREMIER passage chez V3T (mapId = "veterinaire").
    // Si vetFirstVisitLevel est null et qu'on est sur la map "veterinaire", on snapshot
    // le level actuel et on le stocke à vie. L'animal du tamagotchi sera figé à ce level.
    if (
        progress
        && (progress as { mapId?: string }).mapId === "veterinaire"
        && ((progress as { vetFirstVisitLevel?: number | null }).vetFirstVisitLevel ?? null) === null
    ) {
        try {
            const { getUserLevelForGamebook } = await import("@/lib/gamebook/userLevel")
            const levelNow = await getUserLevelForGamebook(userId)
            progress = await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { vetFirstVisitLevel: levelNow },
            })
        } catch (e) {
            console.warn("[state vetFirstVisitLevel snapshot] failed", e)
        }
    }

    if (!progress) {
        // Tous les comptes (y compris isTester) démarrent avec bonusSurplus = 0.
        // Le panneau testeur permettra à GUIGUI d'ajouter de l'énergie à la demande
        // via /api/admin/tester/energy.
        progress = await (prisma as any).gamebookProgress.create({
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
                bonusSurplus: 0,
            },
        })
    } else {
        await prisma.gamebookProgress.update({
            where: { id: progress.id },
            data: { lastSeen: new Date() },
        })
    }

    // v4.0 — Phase 1.A : auto-migration tamagotchi (Json) → Daemon row (slot 1).
    // Idempotente : si déjà migré, no-op. Permet de migrer progressivement tous les joueurs
    // sans intervention manuelle. L'ancien champ tamagotchi reste en place (coexistence).
    try {
        const { ensureDaemonForTamagotchi } = await import("@/lib/gamebook/daemon")
        await ensureDaemonForTamagotchi(userId, progress)
    } catch (e) {
        console.warn("[state GET] ensureDaemonForTamagotchi failed", e)
    }

    const todayReps = await getTodayReps(userId)

    // === v3.4a / v3.23f : calcul de l'énergie disponible ===
    // Modèle : availableEnergy = todayReps - energySpentToday + bonusSurplus
    //   - energySpentToday : reset à minuit (date check)
    //   - bonusSurplus     : persiste (jamais reset, fix bug v3.10)
    const today = getTodayISO()
    const { readEnergySnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const energySnap = readEnergySnapshot(progress, today)
    const energySpentToday = energySnap.energySpentToday
    const bonusSurplus = energySnap.bonusSurplus
    let availableEnergy = computeAvailableEnergy(todayReps, energySnap)

    // v3.8.5 — Mode créateur (isSystem) : énergie minimum 1000 pour tester la map.
    // Ne touche pas aux données réelles : on override juste la valeur renvoyée au client.
    //
    // Compte testeur (isTester) : AUCUN override d'énergie. Le testeur subit les mêmes
    // contraintes qu'un vrai joueur ; le panneau testeur (`/api/admin/tester/energy`)
    // lui permet d'ajuster son bonusSurplus à la demande.
    const userRow = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true, isTester: true },
    })
    const isCreator = userRow?.isSystem === true
    const isTester = userRow?.isTester === true
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

    const p: any = progress
    return NextResponse.json({
        state: {
            mapId: p.mapId,
            posX: p.posX,
            posY: p.posY,
            direction: p.direction,
            phase: p.phase,
            introStep: p.introStep,
            hasEnteredTallGrass: p.hasEnteredTallGrass,
            monsterCaveRevealed: p.monsterCaveRevealed,
            hasSeenWelcomeScreen: p.hasSeenWelcomeScreen,
            treeObstacleCleared: p.treeObstacleCleared,
            pioneerBadgeAwarded: p.pioneerBadgeAwarded,
            bridgePnjDefeated: p.bridgePnjDefeated,
            bridgePnjLastBeatenDate: p.bridgePnjLastBeatenDate,
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
            // v3.22 — Fast travel : villes débloquées
            visitedTowns: Array.isArray((progress as { visitedTowns?: unknown }).visitedTowns)
                ? (progress as { visitedTowns: string[] }).visitedTowns
                : [],
            // v3.24a — Bonus quotidien du capitaine d'équipe
            lastTeamCaptainBonusDate: (progress as { lastTeamCaptainBonusDate?: string }).lastTeamCaptainBonusDate ?? "",
            // v3.24b — Casino pattern Muscuville
            casinoPatternSpinIndex: (progress as { casinoPatternSpinIndex?: number }).casinoPatternSpinIndex ?? 0,
            casinoPatternWinStreak: (progress as { casinoPatternWinStreak?: number }).casinoPatternWinStreak ?? 0,
            casinoPatternBankruptUntil: (progress as { casinoPatternBankruptUntil?: Date | null }).casinoPatternBankruptUntil ?? null,
            // v3.23c — Sommet du Mont Pasta-Ventoux atteint
            montSummitReached: (progress as { montSummitReached?: boolean }).montSummitReached === true,
            // v3.23c-2 — Défis intersalle
            contestDefiPompatorDone: (progress as { contestDefiPompatorDone?: boolean }).contestDefiPompatorDone === true,
            contestDefiSquatilusDone: (progress as { contestDefiSquatilusDone?: boolean }).contestDefiSquatilusDone === true,
            contestDefiTiroirDone: (progress as { contestDefiTiroirDone?: boolean }).contestDefiTiroirDone === true,
            // v3.23e — Blague PIAFFINI unique (Franss only)
            franssJokeBirdDone: (progress as { franssJokeBirdDone?: boolean }).franssJokeBirdDone === true,
            // v3.25 — Pokédex des arbres
            treesDiscovered: Array.isArray((progress as { treesDiscovered?: unknown }).treesDiscovered)
                ? ((progress as { treesDiscovered?: unknown }).treesDiscovered as string[])
                : [],
            treeBookGiven: (progress as { treeBookGiven?: boolean }).treeBookGiven === true,
            // v3.27 — Animal follower : rangé dans le sac (caché de la map)
            tamagotchiInBag: (progress as { tamagotchiInBag?: boolean }).tamagotchiInBag === true,
            // v3.32 — Flag tester (GUIGUI) — affiche le popup recharge à 0 énergie
            isTester,
            // v3.28 — Cinématique fin Macaron'île (ouverture chemin Muscuville)
            grassSudCutsceneShown: (progress as { grassSudCutsceneShown?: boolean }).grassSudCutsceneShown === true,
            // v3.35 — Arène Muscuville (4 champions) + rochers de passage Vegas
            muscuvilleChampionsBeaten: Array.isArray((progress as { muscuvilleChampionsBeaten?: unknown }).muscuvilleChampionsBeaten)
                ? ((progress as { muscuvilleChampionsBeaten?: unknown }).muscuvilleChampionsBeaten as string[])
                : [],
            muscuvilleChampionsRevanche: Array.isArray((progress as { muscuvilleChampionsRevanche?: unknown }).muscuvilleChampionsRevanche)
                ? ((progress as { muscuvilleChampionsRevanche?: unknown }).muscuvilleChampionsRevanche as string[])
                : [],
            muscuvilleRocksPassed: (progress as { muscuvilleRocksPassed?: boolean }).muscuvilleRocksPassed === true,
            muscuvilleInterpellatorTalked: (progress as { muscuvilleInterpellatorTalked?: boolean }).muscuvilleInterpellatorTalked === true,
            // v4.0 Phase 4 — Arc Pastagone (flags narratifs)
            pastagoneArrested: (progress as { pastagoneArrested?: boolean }).pastagoneArrested === true,
            pastagoneEscaped: (progress as { pastagoneEscaped?: boolean }).pastagoneEscaped === true,
            pastagoneBossBeaten: (progress as { pastagoneBossBeaten?: boolean }).pastagoneBossBeaten === true,
            pastagoneCoulterBeaten: (progress as { pastagoneCoulterBeaten?: boolean }).pastagoneCoulterBeaten === true,
            pastagoneFaaGiftClaimed: (progress as { pastagoneFaaGiftClaimed?: boolean }).pastagoneFaaGiftClaimed === true,
            pastagoneCapolinoMidBeaten: (progress as { pastagoneCapolinoMidBeaten?: boolean }).pastagoneCapolinoMidBeaten === true,
            pastagoneCapolinoFleeShown: (progress as { pastagoneCapolinoFleeShown?: boolean }).pastagoneCapolinoFleeShown === true,
            pastagoneInterrogStart: (progress as { pastagoneInterrogStart?: Date | null }).pastagoneInterrogStart ?? null,
            pastagoneInterrogDefis: (progress as { pastagoneInterrogDefis?: unknown }).pastagoneInterrogDefis ?? {},
            pastagoneOrphanChosen: (progress as { pastagoneOrphanChosen?: string | null }).pastagoneOrphanChosen ?? null,
            pastagoneBolognionFound: (progress as { pastagoneBolognionFound?: boolean }).pastagoneBolognionFound === true,
            pastagoneCuisinePuzzle: (progress as { pastagoneCuisinePuzzle?: unknown }).pastagoneCuisinePuzzle ?? {},
            // v4.0 Phase 2.C — Battle en cours (resume après refresh / déco)
            activeBattle: (progress as { activeBattle?: unknown }).activeBattle ?? null,
            // v4.0 Phase 1.D.bis Option B — true si au moins un Daemon a reçu le sérum.
            // Sert au StartMenu pour afficher "🐾 ANIMAUX" (avant) vs "👾 DAEMON" (après).
            hasUnlockedDaemon: await (async () => {
                const d = await (prisma as any).daemon.findFirst({
                    where: { userId, unlockedAt: { not: null } },
                    select: { id: true },
                })
                return d !== null
            })(),
            // v4.0 — true si au moins un Daemon est officiellement adopté (recovered=true).
            // Avant ça, le Daemon row existe mais c'est juste un animal en cours d'adoption
            // chez V3T. L'entrée START DAEMON/ANIMAUX ne doit apparaître qu'après recovered=true.
            hasRecoveredDaemon: await (async () => {
                const d = await (prisma as any).daemon.findFirst({
                    where: { userId, recovered: true },
                    select: { id: true },
                })
                return d !== null
            })(),
        },
        todayReps,
        energySpentToday,
        bonusSurplus,
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
        // v4.0 Phase 2.C — flag créateur (pour bouton "Combat test" en debug)
        isCreator,
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
        !["bourgpates", "gym", "casino", "cave", "route1", "pepiteville", "gym_pepite", "casino_pepite", "shop_interior", "hautespates", "tower_floor_1", "tower_floor_2", "tower_floor_3", "tower_floor_4", "tower_floor_5", "macaron_ile", "shop_macaron", "veterinaire", "bibliotheque", "grass_sud", "muscuville", "la_mer", "bike_shop", "gym_muscuville", "casino_muscuville", "contest_hall", "mont_pasta_ventoux", "lasagnas_vegas", "lasagnas_construction", "lasagnas_hotel", "lasagnas_shop_habits", "lasagnas_shop_bouffe", "lasagnas_shop_rachat", "lasagnas_casino_a", "lasagnas_casino_b", "lasagnas_casino_c", "lasagnas_tb_bar", "lasagnas_tb_bureau", "arena_muscuville", "bibliotheque_muscuville", "mont_sommet",
            // v4.0 Phase 4 — Pastagone (outdoor pentagonal + 6 bâtiments + cellule)
            "pastagone", "pastagone_cellule", "pastagone_infirmerie", "pastagone_cuisine", "pastagone_armurerie", "pastagone_briefing", "pastagone_tour",
            // v4.0 — Tour Pullman PastaVegas (4 étages)
            "vegas_shoptower_1", "vegas_shoptower_2", "vegas_shoptower_3", "vegas_shoptower_4"].includes(mapId) ||
        !["up", "down", "left", "right"].includes(direction) ||
        !["explore", "introMonster", "playing"].includes(phase) ||
        posX < 0 || posX > 30 ||
        posY < 0 || posY > 30
    ) {
        return NextResponse.json({ error: "Invalid state" }, { status: 400 })
    }

    // v4.0 — Hardening anti-stuck : vérifie que la tile cible n'est pas bloquante.
    // Évite que le serveur stocke une position invalide (cas Gg-rem coincé sur shopCounter
    // ou autres tiles bloquantes via bug client ou ancienne position héritée).
    // Si la tile est bloquante : refuse + log pour debug.
    try {
        const { getMap } = await import("@/lib/gamebook/maps")
        const { isBlockingTile } = await import("@/lib/gamebook/mapEngine")
        const targetMap = getMap(mapId)
        const row = targetMap?.tiles?.[posY]
        const tile = row?.[posX]
        if (tile && isBlockingTile(tile)) {
            console.warn(`[POST /state] Blocked invalid position for userId=${userId}: mapId=${mapId} pos=(${posX},${posY}) tile=${tile}`)
            return NextResponse.json({
                error: "Invalid position — tile is blocking",
                tile,
                mapId,
                posX,
                posY,
            }, { status: 400 })
        }
    } catch (err) {
        console.warn("[POST /state] tile validation skipped (lazy import failed)", err)
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

    // v3.22 — Auto-track visitedTowns : on ajoute mapId à la liste si c'est une ville et qu'elle n'y est pas déjà
    const TRAVEL_TOWN_IDS_SERVER = new Set(["bourgpates", "pepiteville", "hautespates", "macaron_ile", "muscuville"])
    const existingVisited: string[] = Array.isArray((existing as { visitedTowns?: unknown })?.visitedTowns)
        ? (existing as { visitedTowns: string[] }).visitedTowns
        : []
    let finalVisitedTowns = existingVisited
    if (TRAVEL_TOWN_IDS_SERVER.has(mapId) && !existingVisited.includes(mapId)) {
        finalVisitedTowns = [...existingVisited, mapId]
    }

    // v3.37 — Application des règles de bonheur (a, b, f1, f3) au moment du save state.
    // On collecte un delta cumulé pour limiter les passes successives sur le tamagotchi.
    const { applyHappinessDelta, fullDaysSince, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
    let nextTamagotchi: unknown = (existing as { tamagotchi?: unknown }).tamagotchi
    let nextStepsCounter = (existing as { tamagotchiStepsCounter?: number })?.tamagotchiStepsCounter ?? 0
    let nextLastDailyDecayDate = (existing as { lastDailyDecayDate?: string })?.lastDailyDecayDate ?? ""
    let nextHappyFlowerLastDate = (existing as { happyFlowerLastDate?: string })?.happyFlowerLastDate ?? ""
    let nextInBagSince = (existing as { tamagotchiInBagSince?: Date | null })?.tamagotchiInBagSince ?? null
    // v4.0 — Tracking totalGamebookSteps (source de la stat Vitesse du Daemon)
    let nextTotalGamebookSteps = (existing as { totalGamebookSteps?: number })?.totalGamebookSteps ?? 0

    // v4.0 — détection mouvement avant le bloc tamagotchi (pour incrémenter totalSteps même sans daemon)
    const prevMapBeforeUpdate = (existing as { mapId?: string })?.mapId
    const prevXBeforeUpdate = (existing as { posX?: number })?.posX
    const prevYBeforeUpdate = (existing as { posY?: number })?.posY
    const movedGlobal = prevMapBeforeUpdate !== mapId || prevXBeforeUpdate !== posX || prevYBeforeUpdate !== posY
    if (movedGlobal) nextTotalGamebookSteps++

    if (nextTamagotchi) {
        const todayStr = (await import("@/lib/challenge")).getTodayISO()

        // (b) Decay sur les pas : détecter mouvement (mapId/posX/posY a changé)
        const prevMap = (existing as { mapId?: string })?.mapId
        const prevX = (existing as { posX?: number })?.posX
        const prevY = (existing as { posY?: number })?.posY
        const moved = prevMap !== mapId || prevX !== posX || prevY !== posY
        if (moved) {
            const c = nextStepsCounter + 1
            if (c >= HAPPINESS_DELTAS.STEP_THRESHOLD) {
                const decayed = applyHappinessDelta(nextTamagotchi, HAPPINESS_DELTAS.STEP_DECAY)
                if (decayed) nextTamagotchi = decayed
                nextStepsCounter = 0
            } else {
                nextStepsCounter = c
            }
        }

        // (a) Decay 24h sans connexion : compare lastSeen vs now, applique -10 si > 24h (1x/jour max)
        const prevLastSeen = (existing as { lastSeen?: Date | null })?.lastSeen ?? null
        if (prevLastSeen && fullDaysSince(prevLastSeen.toString()) >= 1 && nextLastDailyDecayDate !== todayStr) {
            const decayed = applyHappinessDelta(nextTamagotchi, HAPPINESS_DELTAS.DAILY_DECAY)
            if (decayed) nextTamagotchi = decayed
            nextLastDailyDecayDate = todayStr
        }

        // (f1) Animal en sac > 24h : appliquer un decay -1 par jour passé en sac
        const inBag = (existing as { tamagotchiInBag?: boolean })?.tamagotchiInBag === true
        if (inBag && nextInBagSince) {
            const daysInBag = fullDaysSince(nextInBagSince.toString())
            if (daysInBag >= 1) {
                const decayed = applyHappinessDelta(nextTamagotchi, HAPPINESS_DELTAS.IN_BAG_DAILY * daysInBag)
                if (decayed) nextTamagotchi = decayed
                nextInBagSince = new Date()  // reset le compteur
            }
        }
        if (inBag && !nextInBagSince) nextInBagSince = new Date()
        if (!inBag) nextInBagSince = null

        // (f3) happyFlower : si le joueur est sur la case (3, 6) de grass_sud, +30 (1×/jour)
        if (mapId === "grass_sud" && posX === 3 && posY === 6 && nextHappyFlowerLastDate !== todayStr) {
            const boosted = applyHappinessDelta(nextTamagotchi, HAPPINESS_DELTAS.HAPPY_FLOWER)
            if (boosted) nextTamagotchi = boosted
            nextHappyFlowerLastDate = todayStr
        }
    }

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
            // v3.37 — Mise à jour du tamagotchi + flags decay
            tamagotchi: nextTamagotchi,
            tamagotchiStepsCounter: nextStepsCounter,
            lastDailyDecayDate: nextLastDailyDecayDate,
            tamagotchiInBagSince: nextInBagSince,
            happyFlowerLastDate: nextHappyFlowerLastDate,
            // v4.0 — Tracking total steps Gamebook
            totalGamebookSteps: nextTotalGamebookSteps,
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
