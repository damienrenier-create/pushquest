"use client"

// L'ARCHIVISTE (Collectionneur du dex) — PNJ scripté UNIQUE qui erre sur la Ville Jaune (yellow_entrance).
//   Position = une case walkable ALÉATOIRE re-tirée à chaque entrée sur la map (roamingSpots, comme les reflets),
//   stable tant qu'on reste sur la carte (useMemo [active, mapId]) → « pop au hasard » sur des dizaines de cases.
//   Son équipe n'est PAS calculée ici (elle dépend de dex.seen/getPlayer) : elle est construite au clic par le
//   launcher (handleArenaClick) via buildArchivisteTeam. Rendu par <ArenaOpponentSprite> (shape {userId,nickname,x,y}).

import { useMemo } from "react"
import { roamingSpots } from "../data/playerArena"
import { ARCHIVISTE_ID, ARCHIVISTE_NAME, ARCHIVISTE_MAP } from "../data/collectionneurNpc"

export interface ArchivisteNpc { userId: string; nickname: string; x: number; y: number; avatar?: string }

/** Renvoie [L'Archiviste] sur la Ville Jaune (sinon []). Nouvelle case aléatoire à chaque visite. */
export function useArchiviste(mapId: string): ArchivisteNpc[] {
    const active = mapId === ARCHIVISTE_MAP
    return useMemo<ArchivisteNpc[]>(() => {
        if (!active) return []
        const [pos] = roamingSpots(mapId, 1, Math.random) // 1 case walkable aléatoire (Ville Jaune = des centaines de cases libres)
        if (!pos) return []
        return [{ userId: ARCHIVISTE_ID, nickname: ARCHIVISTE_NAME, x: pos[0], y: pos[1] }]
    }, [active, mapId])
}
