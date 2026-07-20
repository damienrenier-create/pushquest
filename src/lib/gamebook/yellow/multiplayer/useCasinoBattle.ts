"use client"

// Nexus Jaune Éclair — RÉSEAU du combat PvP (Phase 3 + garde-fous Lot 1).
//
// Une fois un défi accepté, ce hook orchestre le combat sur le canal privé du
// match `gamebook-yellow_battle_<battleId>` :
//   1. échange équipes + seed + VERSION (battle:hello ; A fournit le seed)
//   2. construction du MÊME état CANONIQUE des 2 côtés (A="player", B="enemy")
//   3. relai des actions + CHECKSUM (battle:action) → résolution dual-déterministe
//   4. abandon (battle:forfeit) à la déconnexion / sortie / bouton abandon
//
// Garde-fous : refus si versions différentes (#10), checksum de désync via le
// store (#1), abandon propre (#7). ⚠️ voir note mémoire casino-pvp.

import { useEffect, useRef, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { getPlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { createBattle, type PlayerAction } from "@/lib/gamebook/yellow/battle/engine"
import { registerCustomSpecies } from "@/lib/gamebook/yellow/data/species"
import {
    startPvpBattle, setPvpSendHandler, receivePvpAction, pvpForfeit, getSnapshot,
} from "@/lib/gamebook/yellow/store/battleStore"
import type { MonInstance, SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import type { BattleStart } from "./useCasinoChallenge"
import { MP_VERSION, mpLog } from "./mp"

/** PvP de FUSION : l'équipe de combat est constituée de fusions ÉPHÉMÈRES (pas la vraie équipe).
 *  Le hook demande à l'appelant de CONSTRUIRE mon équipe (enregistre les espèces custom) et de les DÉTRUIRE
 *  au démontage (miennes + celles de l'adversaire, reçues par le réseau). undefined = combat casino normal. */
export interface FusionPvpHooks {
    buildTeam: () => { team: MonInstance[]; species: SpeciesData[] }
    dispose: (speciesIds: string[]) => void
}

interface BattleMsg {
    type: string
    userId?: string
    data?: {
        team?: MonInstance[]
        species?: SpeciesData[] // FUSION : espèces éphémères à enregistrer chez le récepteur (sinon crash render)
        seed?: number
        version?: string
        seq?: number
        action?: PlayerAction
        checksum?: number
        deliberate?: boolean // forfeit : true = abandon volontaire (XP), false/absent = déconnexion (annulé)
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

function makeSeed(): number {
    return Math.floor(Math.random() * 0x7fffffff) >>> 0
}

export function useCasinoBattle(
    session: BattleStart | null,
    myUserId: string,
    onAbort?: (reason: string) => void,
    fusion?: FusionPvpHooks,
) {
    const startedRef = useRef(false)
    const oppTeamRef = useRef<MonInstance[] | null>(null)
    const seedRef = useRef<number | null>(null)
    const battleIdRef = useRef<string | null>(null)
    // FUSION dans un REF (callbacks recréés à chaque render côté appelant) → deps d'effet stables.
    const fusionRef = useRef(fusion)
    fusionRef.current = fusion
    // ⚠️ onAbort gardé dans un REF. Sinon (callback inline recréé à chaque render côté
    // appelant) l'effet réseau ci-dessous, qui l'a en dépendance, se relancerait à CHAQUE
    // rendu → (1) handshake remis à zéro en boucle (jamais le temps d'aboutir) et (2) quand
    // le combat démarre, le cleanup du cycle précédent voit un combat actif → l'ABANDONNE
    // aussitôt. D'où "le combat ne démarre jamais". Le ref stabilise les deps de l'effet.
    const onAbortRef = useRef(onAbort)
    onAbortRef.current = onAbort

    // Abandon explicite (bouton) : notifie l'adversaire puis quitte proprement.
    const forfeit = useCallback(() => {
        const id = battleIdRef.current
        if (id) postBattle(id, "battle:forfeit", { deliberate: true }) // abandon VOLONTAIRE → combat validé (XP)
        mpLog("forfeit", "abandon volontaire")
        pvpForfeit(true)
    }, [])

    useEffect(() => {
        startedRef.current = false
        oppTeamRef.current = null
        seedRef.current = null
        battleIdRef.current = session?.battleId ?? null
        if (!session || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return

        const { battleId, role, oppUserId, oppNickname } = session
        const fu = fusionRef.current
        // Équipe : FUSION (construite + espèces éphémères à envoyer) ou l'équipe réelle (casino).
        let myTeam: MonInstance[]
        let mySpecies: SpeciesData[] = []
        const mySpeciesIds: string[] = []
        const oppSpeciesIds: string[] = []
        if (fu) {
            const built = fu.buildTeam()
            myTeam = built.team
            mySpecies = built.species
            for (const s of built.species) mySpeciesIds.push(s.id)
        } else {
            myTeam = getPlayer().team
        }
        // FUSION : le roster a pu être VIDÉ entre le gate d'envoi/acceptation et ce build (le joueur ouvre
        // le PC et retire ses fusions pendant l'attente du défi). Sans équipe → createBattle planterait les
        // 2 clients. On abandonne PROPREMENT au lieu de crasher.
        if (fu && myTeam.length === 0) {
            fu.dispose(mySpeciesIds)
            onAbortRef.current?.("Ton équipe de fusion est vide — assemble au moins une fusion au 💻 avant de combattre.")
            return
        }
        if (role === "A") seedRef.current = makeSeed()
        mpLog("battle", "session", { battleId, role, opp: oppNickname, fusion: !!fu })

        const channelName = `gamebook-yellow_battle_${battleId}`
        const channel = client.subscribe(channelName)

        const sendHello = () => postBattle(battleId, "battle:hello", {
            team: myTeam,
            species: fu ? mySpecies : undefined,
            seed: role === "A" ? seedRef.current ?? undefined : undefined,
            version: MP_VERSION,
        })

        const tryStart = () => {
            if (startedRef.current) return
            const opp = oppTeamRef.current
            const seed = seedRef.current
            if (!opp || opp.length === 0 || seed == null) return // équipe adverse vide (roster vidé) → on attend/abandonne, pas de combat vide
            startedRef.current = true
            const teamA = role === "A" ? myTeam : opp
            const teamB = role === "A" ? opp : myTeam
            const battle = createBattle(teamA, teamB, { isWild: false, seed, pvp: true })
            startPvpBattle(battle, { battleId, role, myUserId, oppUserId, oppNickname, ephemeralTeam: !!fu })
            setPvpSendHandler((seq, action, checksum) => postBattle(battleId, "battle:action", { seq, action, checksum }))
        }

        const onHello = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            // ⚠️ #10 : versions différentes → on REFUSE le combat (désync garantie sinon).
            if (d.data?.version && d.data.version !== MP_VERSION) {
                mpLog("abort", "version mismatch", { mien: MP_VERSION, opp: d.data.version })
                onAbortRef.current?.("Versions du jeu différentes. Rechargez la page des deux côtés, puis réessayez.")
                return
            }
            if (d.data?.team) {
                if (fu && d.data.species) {
                    // FUSION : l'uid est un compteur LOCAL (pas global) → l'id de fusion adverse peut coïncider avec
                    // un des miens. On PRÉFIXE l'adversaire ("opp:") pour un espace de noms disjoint : 0 collision,
                    // et les TYPES sont conservés (envoyés) → dégâts identiques des 2 côtés (déterminisme intact).
                    const prefixed = d.data.species.map((s) => ({ ...s, id: `opp:${s.id}` }))
                    registerCustomSpecies(prefixed)
                    for (const s of prefixed) if (!oppSpeciesIds.includes(s.id)) oppSpeciesIds.push(s.id)
                    oppTeamRef.current = d.data.team.map((m) => ({ ...m, speciesId: `opp:${m.speciesId}` }))
                } else {
                    oppTeamRef.current = d.data.team
                }
            }
            if (role === "B" && typeof d.data?.seed === "number") seedRef.current = d.data.seed
            mpLog("hello↙", { from: d.userId, hasTeam: !!d.data?.team, seed: seedRef.current })
            if (!startedRef.current) sendHello() // echo (abonnement tardif éventuel)
            tryStart()
        }
        const onAction = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            if (typeof d.data?.seq === "number" && d.data.action) {
                receivePvpAction(d.data.seq, d.data.action, d.data.checksum)
            }
        }
        const onForfeit = (d: BattleMsg) => {
            if (!d.userId || d.userId === myUserId) return
            mpLog("forfeit↙", "adversaire a quitté", { deliberate: d.data?.deliberate === true })
            // abandon volontaire (deliberate) → je gagne + XP ; déconnexion → combat annulé (pas d'XP)
            pvpForfeit(false, d.data?.deliberate === true)
        }

        channel.bind("battle:hello", onHello)
        channel.bind("battle:action", onAction)
        channel.bind("battle:forfeit", onForfeit)
        sendHello()

        // #3 — RELANCE du hello (le seed est ré-émis par A à chaque fois) jusqu'au
        // démarrage : Pusher ne rejoue pas les events, donc si l'adversaire s'abonne
        // tard il manque le 1er hello → seed jamais reçu, combat fantôme. On répète
        // tant que le combat n'a pas démarré des deux côtés.
        const helloRetry = setInterval(() => {
            if (startedRef.current) { clearInterval(helloRetry); return }
            sendHello()
        }, 1500)
        // #11 — FILET : si le handshake n'aboutit pas (~15 s), on abandonne proprement
        // au lieu de laisser le joueur figé "en attente" sans aucun feedback.
        const helloTimeout = setTimeout(() => {
            if (!startedRef.current) {
                mpLog("abort", "handshake timeout (seed/équipe jamais reçus)")
                onAbortRef.current?.("La connexion au combat a échoué. Réessayez depuis le casino.")
            }
        }, 15000)

        return () => {
            clearInterval(helloRetry)
            clearTimeout(helloTimeout)
            // Si je quitte alors que le combat est en cours → abandon implicite.
            const snap = getSnapshot()
            if (snap.pvpCtx && snap.battle && snap.battle.phase !== "ended" && !snap.pvpCtx.desync) {
                postBattle(battleId, "battle:forfeit", { deliberate: false }) // départ involontaire (démontage/déco) → combat annulé chez l'adversaire
                pvpForfeit(true)
            }
            setPvpSendHandler(null)
            channel.unbind("battle:hello", onHello)
            channel.unbind("battle:action", onAction)
            channel.unbind("battle:forfeit", onForfeit)
            client.unsubscribe(channelName)
            // FUSION : détruire les espèces éphémères (miennes + celles reçues de l'adversaire, préfixées "opp:").
            if (fu) fu.dispose([...mySpeciesIds, ...oppSpeciesIds])
        }
    }, [session, myUserId])

    return { forfeit }
}
