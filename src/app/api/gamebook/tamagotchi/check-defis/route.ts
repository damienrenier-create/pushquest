// src/app/api/gamebook/tamagotchi/check-defis/route.ts
//
// v3.19 — POST : valide les 7 défis d'adoption du tamagotchi.
//
// Pré-requis : adopté + sur mapId "veterinaire" (la validation se fait chez V3T).
//
// Le serveur évalue chacun des 7 défis :
//   0 VISIT       — auto-validé (le simple fait d'appeler la route chez V3T compte)
//   1 DRINK       — flask vide ou bue récemment (event tracking simple : on accepte si on voit
//                   un evt de "drink" récent — pour MVP on accepte tant que la gourde a été utilisée)
//   2 PATES       — corned_pates consommé récemment chez V3T (idem : pour MVP on check que
//                   le joueur n'a PAS corned_pates dans son inventaire mais en a déjà eu un)
//   3 DAY_HALVES  — lastMorningVisitDate == lastAfternoonVisitDate == today
//   4 PLANK_180   — somme reps PLANK today >= 180 * ratio
//   5 PUSHUP_200  — somme reps PUSHUP today (createdAt > firstPlankToday.createdAt) >= 200 * ratio
//   6 SQUAT_300   — somme reps SQUAT today (createdAt > firstPushupPostPlank.createdAt) >= 300 * ratio
//
// MVP note : défis 1 et 2 sont simplifiés. Le tracking précis (timestamp d'utilisation
// d'item AT V3T) demandera un système d'événements ultérieur. Pour l'instant on les
// laisse passer si l'utilisateur a déjà utilisé l'item (heuristique pragmatique).
//
// Update tamagotchi.defiProgress + lastMorningVisitDate/lastAfternoonVisitDate.
// Renvoie la vue mise à jour + delta des défis venant d'être complétés.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseTamagotchi, viewTamagotchi, CANONICAL_DEFIS } from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"
import { parseInventory, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface ExSet { id: string; exercise: string; reps: number; createdAt: Date }

async function getTodaySets(userId: string): Promise<ExSet[]> {
    const today = getTodayISO()
    // v4.0 — Tie-break par id (cuid séquentiel par insertion) pour gérer le
    // cas où plusieurs sets sont encodés au même createdAt (batch typique).
    // Sans ça, les défis #5/#6 ne pouvaient JAMAIS se valider pour un joueur
    // qui encode son entraînement complet en un seul clic — le check
    // strict > sur createdAt était toujours false.
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
        select: { id: true, exercise: true, reps: true, createdAt: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    return sets
}

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "veterinaire") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas chez le vétérinaire." })
    }

    const tam = parseTamagotchi(progress.tamagotchi)
    if (!tam) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas encore adopté de tamagotchi." })
    }
    if (tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà récupéré ton animal." })
    }

    const ratio = await getUserDifficultyRatio(userId)
    const sets = await getTodaySets(userId)
    const today = getTodayISO()

    // ===== Évaluation des 7 défis =====
    const prevProgress = tam.defiProgress ?? {}
    const newProgress: Record<string, true> = { ...prevProgress }
    const newlyCompleted: number[] = []

    function markDone(idx: number) {
        if (newProgress[String(idx)] === true) return
        newProgress[String(idx)] = true
        newlyCompleted.push(idx)
    }

    // 0 VISIT — auto-validé (on est chez V3T avec tamagotchi adopté)
    markDone(0)

    // 3 DAY_HALVES — track matin/après-midi, update si pas encore fait aujourd'hui
    const hour = new Date().getHours()
    const isMorning = hour < 12
    const isAfternoon = hour >= 12
    let lastMorning = tam.lastMorningVisitDate
    let lastAfternoon = tam.lastAfternoonVisitDate
    if (isMorning && lastMorning !== today) lastMorning = today
    if (isAfternoon && lastAfternoon !== today) lastAfternoon = today
    if (lastMorning === today && lastAfternoon === today) {
        markDone(3)
    }

    // 4 PLANK_180 — somme reps PLANK today
    const plankSets = sets.filter((s) => s.exercise === "PLANK")
    const plankSum = plankSets.reduce((a, s) => a + s.reps, 0)
    const plankThreshold = applyRatio(180, ratio)
    if (plankSum >= plankThreshold) markDone(4)

    // 5 PUSHUP_200 — somme des pompes du jour
    // 6 SQUAT_300 — somme des squats du jour
    //
    // v4.0 — Mode PERMISSIF : on ne contraint plus l'ordre temporel (plank →
    //        pompes → squats). L'app PushQuest n'insère pas toujours les sets
    //        dans l'ordre physique réel du joueur (batch saisie), ce qui rendait
    //        les défis #5 et #6 quasi impossibles à valider. Maintenant : tu as
    //        fait 200 pompes ET 300 squats aujourd'hui ? Validé, peu importe l'ordre.
    //        Le défi #4 (plank 180s) reste, ce qui garde la dimension "entraînement
    //        complet" (besoin des 3 exos sur la journée).
    const pushupSum = sets.filter((s) => s.exercise === "PUSHUP").reduce((a, s) => a + s.reps, 0)
    const pushupThreshold = applyRatio(200, ratio)
    if (pushupSum >= pushupThreshold) markDone(5)

    const squatSum = sets.filter((s) => s.exercise === "SQUAT").reduce((a, s) => a + s.reps, 0)
    const squatThreshold = applyRatio(300, ratio)
    if (squatSum >= squatThreshold) markDone(6)

    // 1 DRINK — MVP : vrai si la gourde a déjà été usée (heuristique : si stored < maxCapacity OU drinkable)
    // Pour MVP : on accepte si la gourde a stored=0 (donc bue au moins une fois ou jamais remplie).
    // Plus précis : on attendrait un tracking lastDrinkAt. Acceptable pour v3.19a.
    const inventory = parseInventory(progress.inventory)
    const flaskEntry = inventory.find((e) => e.itemKey === "flask" || e.itemKey === "grande_gourde")
    if (flaskEntry) {
        const data = flaskEntry.data
        const stored = data && typeof data === "object" && "stored" in data
            ? (typeof (data as { stored?: unknown }).stored === "number" ? (data as { stored: number }).stored : 0)
            : 0
        const maxCap = data && typeof data === "object" && "maxCapacity" in data
            ? (typeof (data as { maxCapacity?: unknown }).maxCapacity === "number" ? (data as { maxCapacity: number }).maxCapacity : 100)
            : 100
        // Heuristique : la gourde a déjà servi si stored < maxCap (au moins remplie ou bue)
        if (stored < maxCap) markDone(1)
    }

    // 2 PATES — MVP : vrai si le joueur n'a PAS de corned_pates dans son inventaire
    // (signifie qu'il en a déjà consommé une, ou n'en a jamais acheté — heuristique imparfaite)
    // Plus précis : tracker un lastPatesUseAt. Pour MVP : on accepte si pas dans inventaire.
    if (!hasIntactItem(inventory, "corned_pates")) {
        // Hint : ne pas auto-valider si le joueur n'a JAMAIS acheté → on regarde si on a déjà eu une trace
        // Simplification : on valide si pas dans inventaire (assume il en a eu un et l'a consommé).
        // Pour éviter abus initial : on ne valide ce défi que si le tamagotchi a au moins 1 feed.
        const feedCount = (tam as { feedCount?: number }).feedCount ?? 0
        if (feedCount > 0 || (tam.defiProgress?.[String(0)] === true)) {
            // Le joueur a déjà interagi avec V3T (au moins le 1er défi) — on assume bonne foi
            markDone(2)
        }
    }

    // ===== Persistance =====
    const updatedTam = {
        ...tam,
        defiProgress: newProgress,
        lastMorningVisitDate: lastMorning,
        lastAfternoonVisitDate: lastAfternoon,
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: updatedTam,
            lastSeen: new Date(),
        },
    })

    const userLevel = await getUserLevelForGamebook(userId)
    const view = viewTamagotchi(updatedTam, userLevel)

    return NextResponse.json({
        ok: true,
        tamagotchi: view,
        newlyCompleted,
    })
}
