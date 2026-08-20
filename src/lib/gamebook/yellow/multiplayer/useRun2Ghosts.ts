"use client"

// PNJ-JOUEURS RUN 2 (Grotte du Nexus 1F) — chaque PNJ = l'ÉQUIPE GELÉE avec laquelle un autre joueur a gagné le
//   RUN 2 (Hall of Fame, world="ngplus"). Jusqu'à 5, placés à des coords fixes. XP DOUBLÉE (trainerId "run2ghost:").
//   Victoire UNIQUE → le PNJ disparaît + offre un RAPPEL (câblé dans battleStore.finishBattle). Fetch client-only.
//   Les coords libres restent VIDES tant que peu de joueurs ont terminé le run 2 (elles se remplissent ensuite).

import { useEffect, useState } from "react"
import type { ChampionMon } from "../storage/save"

export const RUN2_GHOST_MAP_ID = "yellow_grotte_nexus" // Grotte 1F
export const RUN2_GHOST_TRAINER_PREFIX = "run2ghost:"
// Coords fixes des 5 PNJ sur la Grotte 1F (choix Sartay).
const GHOST_POSITIONS: readonly [number, number][] = [[7, 15], [45, 27], [29, 38], [7, 25], [21, 4]]

export interface Run2Ghost {
    userId: string
    nickname: string
    x: number
    y: number
    avatar?: string // skin adopté (chosenAvatar) → le PNJ-joueur l'affiche partout (pas un Red générique)
    team: ChampionMon[]
}

interface ChampionEntry { userId?: string; nickname: string; wonAt: string; team: ChampionMon[]; world?: string; avatar?: string | null }

/** Renvoie les PNJ-joueurs run 2 à afficher sur la Grotte 1F (vide ailleurs). 1 équipe run-2 par joueur (la plus
 *  récente), soi-même exclu, jusqu'à 5 placées aux coords fixes. */
export function useRun2Ghosts(mapId: string, myUserId: string): Run2Ghost[] {
    const active = mapId === RUN2_GHOST_MAP_ID
    const [ghosts, setGhosts] = useState<Run2Ghost[]>([])
    useEffect(() => {
        if (!active) { setGhosts([]); return }
        let cancel = false
        fetch("/api/gamebook/yellow/hall-of-fame")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
            .then((j) => {
                if (cancel) return
                const champions = (j.champions ?? []) as ChampionEntry[]
                // rows triées wonAt desc → la 1re ligne d'un joueur = son sacre run-2 le PLUS RÉCENT.
                const seen = new Set<string>()
                const list: Run2Ghost[] = []
                for (const c of champions) {
                    if ((c.world ?? "live") !== "ngplus") continue
                    const uid = c.userId
                    if (!uid || uid === myUserId || seen.has(uid)) continue
                    if (!Array.isArray(c.team) || c.team.length === 0) continue
                    const pos = GHOST_POSITIONS[list.length]
                    if (!pos) break // déjà 5 → on s'arrête (les autres attendront une place)
                    seen.add(uid)
                    list.push({ userId: uid, nickname: c.nickname, x: pos[0], y: pos[1], avatar: c.avatar ?? undefined, team: c.team })
                }
                setGhosts(list)
            })
            .catch(() => { if (!cancel) setGhosts([]) })
        return () => { cancel = true }
    }, [active, mapId, myUserId])
    return active ? ghosts : []
}
