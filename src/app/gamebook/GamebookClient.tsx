"use client"

// src/app/gamebook/GamebookClient.tsx
//
// Wrapper du Gamebook v3.1.
// - Affiche un écran noir 10s à la PREMIÈRE arrivée (hasSeenWelcomeScreen === false en DB)
// - Charge l'état initial du joueur + ses reps du jour
// - Monte MapClient une fois prêt

import { useEffect, useState } from "react"
import BlackScreen from "./BlackScreen"
import FrozenScreen from "./FrozenScreen"
import MapClient from "./MapClient"
import type { PlayerMapState } from "@/lib/gamebook/mapEngine"

interface Props {
    nickname: string
    userId: string
}

interface StatePayload {
    state: PlayerMapState
    todayReps: number
    availableEnergy: number
    energySpentToday: number
    // v3.6 — anti-cheat
    frozen?: boolean
    frozenUntil?: string | null
}

export default function GamebookClient({ nickname, userId }: Props) {
    const [payload, setPayload] = useState<StatePayload | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showBlack, setShowBlack] = useState<boolean | null>(null)
    // v3.6 — incrémenté quand le countdown frozen atteint 0, force un refetch du state
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const res = await fetch("/api/gamebook/state", { cache: "no-store" })
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const json = (await res.json()) as StatePayload
                    if (cancelled) return
                    // Garantir que les champs v3.1 + v3.3 ont une valeur par défaut côté client
                    const safeState: PlayerMapState = {
                        ...json.state,
                        treeObstacleCleared: json.state.treeObstacleCleared ?? false,
                        pioneerBadgeAwarded: json.state.pioneerBadgeAwarded ?? false,
                        bridgePnjDefeated: Array.isArray(json.state.bridgePnjDefeated)
                            ? json.state.bridgePnjDefeated
                            : [],
                        bridgePnjLastBeatenDate:
                            json.state.bridgePnjLastBeatenDate &&
                            typeof json.state.bridgePnjLastBeatenDate === "object"
                                ? json.state.bridgePnjLastBeatenDate
                                : {},
                        gymGuyEnergyGiven: json.state.gymGuyEnergyGiven ?? false,
                        npcsTalkedTo: Array.isArray(json.state.npcsTalkedTo)
                            ? json.state.npcsTalkedTo
                            : [],
                    }
                    setPayload({
                        ...json,
                        state: safeState,
                        availableEnergy: json.availableEnergy ?? json.todayReps ?? 0,
                        energySpentToday: json.energySpentToday ?? 0,
                    })
                    setShowBlack(!safeState.hasSeenWelcomeScreen)
                } catch (e) {
                    if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue")
                }
            })()
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const handleBlackDone = async () => {
        if (!payload) return
        const newState: PlayerMapState = { ...payload.state, hasSeenWelcomeScreen: true }
        try {
            await fetch("/api/gamebook/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newState),
            })
        } catch (e) {
            console.warn("[GamebookClient] save hasSeenWelcomeScreen failed", e)
        }
        setPayload({ ...payload, state: newState })
        setShowBlack(false)
    }

    if (error) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#111",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Courier New', monospace",
                    padding: 20,
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <div style={{ color: "#f88" }}>Erreur : {error}</div>
                <a href="/" style={{ color: "#9bf" }}>Retour</a>
            </div>
        )
    }

    if (!payload || showBlack === null) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#000",
                    color: "#222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 10,
                    letterSpacing: 4,
                }}
            >
                ...
            </div>
        )
    }

    if (showBlack) {
        return <BlackScreen onDone={handleBlackDone} />
    }

    // v3.6 — Si le user est frozen (anti-triche actif), afficher l'overlay au lieu du jeu
    if (payload.frozen && payload.frozenUntil) {
        return (
            <FrozenScreen
                frozenUntil={payload.frozenUntil}
                onUnfrozen={() => setReloadKey((k) => k + 1)}
            />
        )
    }

    return (
        <MapClient
            nickname={nickname}
            userId={userId}
            initialState={payload.state}
            initialTodayReps={payload.todayReps}
            initialAvailableEnergy={payload.availableEnergy}
            initialEnergySpent={payload.energySpentToday}
        />
    )
}
