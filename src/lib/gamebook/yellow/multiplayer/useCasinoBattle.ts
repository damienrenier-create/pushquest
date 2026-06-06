"use client"

// Nexus Jaune Éclair — RÉSEAU du combat PvP (Phase 3).
//
// Une fois un défi accepté, ce hook orchestre le combat sur le canal privé du
// match `gamebook-yellow_battle_<battleId>` :
//   1. échange des équipes + du seed (battle:hello, le challenger A fournit le seed)
//   2. construction du MÊME état CANONIQUE des 2 côtés (A="player", B="enemy")
//   3. relai des actions (battle:action) → le store résout en dual-déterministe
//   4. abandon (battle:forfeit) à la déconnexion / sortie
//
// ⚠️ RISQUE — voir note mémoire casino-pvp :
//   - déterminisme : les 2 équipes doivent être IDENTIQUES des 2 côtés (round-trip
//     JSON). Toute divergence d'équipe/seed = désync.
//   - taille des messages Pusher (~10 Ko) : on envoie l'équipe complète au hello.

import { useEffect, useRef } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { getPlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { createBattle, type PlayerAction } from "@/lib/gamebook/yellow/battle/engine"
import {
    startPvpBattle, setPvpSendHandler, receivePvpAction, pvpForfeit, getSnapshot,
} from "@/lib/gamebook/yellow/store/battleStore"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"
import type { BattleStart } from "./useCasinoChallenge"

interface BattleMsg {
    type: string
    userId?: string
    data?: {
        team?: MonInstance[]
        seed?: number
        seq?: number
        action?: PlayerAction
    }
}

function postBattle(battleId: string, type: string, data?: BattleMsg["data"]) {
    try {
        void fetch("/api/gamebook/yellow/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: `yellow_battle_${battleId}`, type, battleId, data }),
        })
    } catch { /* best-effort */ }
}

/** Pseudo-aléatoire 31 bits pour le seed (généré par le challenger A uniquement). */
function makeSeed(): number {
    return Math.floor(Math.random() * 0x7fffffff) >>> 0
}

export function useCasinoBattle(session: BattleStart | null, myUserId: string) {
    // Réfs de session (collecte équipes + seed avant de démarrer).
    const startedRef = useRef(false)
    const oppTeamRef = useRef<MonInstance[] | null>(null)
    const seedRef = useRef<number | null>(null)

    useEffect(() => {
        startedRef.current = false
        oppTeamRef.current = null
        seedRef.current = null
        if (!session || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return

        const { battleId, role, oppUserId, oppNickname } = session
        const myTeam = getPlayer().team
        if (role === "A") seedRef.current = makeSeed()

        const channelName = `gamebook-yellow_battle_${battleId}`
        const channel = client.subscribe(channelName)

        const tryStart = () => {
            if (startedRef.current) return
            const opp = oppTeamRef.current
            const seed = seedRef.current
            if (!opp || seed == null) return
            startedRef.current = true
            // État CANONIQUE identique des 2 côtés : A="player", B="enemy".
            const teamA = role === "A" ? myTeam : opp
            const teamB = role === "A" ? opp : myTeam
            const battle = createBattle(teamA, teamB, { isWild: false, seed, pvp: true })
            startPvpBattle(battle, { battleId, role, myUserId, oppUserId, oppNickname })
            // Pont d'envoi : chaque action locale est relayée à l'adversaire.
            setPvpSendHandler((seq, action) => postBattle(battleId, "battle:action", { seq, action }))
        }

        const onHello = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            if (d.data?.team) oppTeamRef.current = d.data.team
            if (role === "B" && typeof d.data?.seed === "number") seedRef.current = d.data.seed
            // Renvoie mon hello (au cas où l'adversaire s'est abonné après mon 1er envoi).
            if (!startedRef.current) {
                postBattle(battleId, "battle:hello", { team: myTeam, seed: role === "A" ? seedRef.current ?? undefined : undefined })
            }
            tryStart()
        }
        const onAction = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            if (typeof d.data?.seq === "number" && d.data.action) receivePvpAction(d.data.seq, d.data.action)
        }
        const onForfeit = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            pvpForfeit(false) // l'adversaire a quitté → je gagne
        }

        channel.bind("battle:hello", onHello)
        channel.bind("battle:action", onAction)
        channel.bind("battle:forfeit", onForfeit)

        // J'annonce mon équipe (+ seed si je suis A).
        postBattle(battleId, "battle:hello", { team: myTeam, seed: role === "A" ? seedRef.current ?? undefined : undefined })

        return () => {
            // Si je quitte alors que le combat est toujours en cours → abandon.
            const snap = getSnapshot()
            if (snap.pvpCtx && snap.battle && snap.battle.phase !== "ended") {
                postBattle(battleId, "battle:forfeit")
                pvpForfeit(true)
            }
            setPvpSendHandler(null)
            channel.unbind("battle:hello", onHello)
            channel.unbind("battle:action", onAction)
            channel.unbind("battle:forfeit", onForfeit)
            client.unsubscribe(channelName)
        }
    }, [session, myUserId])
}
