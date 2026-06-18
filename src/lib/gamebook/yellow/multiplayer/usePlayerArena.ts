// src/lib/gamebook/yellow/multiplayer/usePlayerArena.ts
//
// Nexus Jaune Éclair — alimente les ARÈNES JOUEURS (hub Eau + miroir Élec).
// Charge le registre des dresseurs et renvoie les 6 adversaires à afficher (les plus proches
// de notre niveau), placés sur les cases libres de l'arène — uniquement si on a TOUS les badges.

import { useEffect, useMemo, useState } from "react"
import { ARENA_MAPS, ARENA_POSITIONS, ARENA_OPPONENTS, ROAMING_ARENA_MAPS, roamingSpots, rankClosest, hasAllBadges, mirrorName, type ArenaMode, type RegistryPlayer } from "../data/playerArena"

export interface ArenaOpponent {
    userId: string
    nickname: string
    x: number
    y: number
    player: RegistryPlayer
}

export function usePlayerArena(mapId: string, badges: readonly string[], myUserId: string, myLevel: number): {
    mode: ArenaMode | null
    opponents: ArenaOpponent[]
} {
    const mode = ARENA_MAPS[mapId] ?? null
    const roaming = ROAMING_ARENA_MAPS.has(mapId)
    // ROAMING (Ville Jaune) : accessible TÔT — dès le 1er badge, pas besoin de TOUS les badges.
    // Arènes FIXES (ex. Tour Hertz) : gate « tous les badges » (contenu de fin de jeu).
    const active = mode !== null && (roaming ? badges.length >= 1 : hasAllBadges(badges))
    const [players, setPlayers] = useState<RegistryPlayer[] | null>(null)

    useEffect(() => {
        if (!active) return
        let cancel = false
        fetch("/api/gamebook/yellow/registry")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
            .then((j) => { if (!cancel) setPlayers((j.players ?? []) as RegistryPlayer[]) })
            .catch(() => { if (!cancel) setPlayers([]) })
        return () => { cancel = true }
    }, [active, mapId])

    // Positions : ROAMING = cases aléatoires RE-TIRÉES à chaque entrée de map (mapId change → effet
    // « hasardeux ») ; arène fixe = cases prédéfinies. useMemo → stable tant qu'on reste sur la map.
    const positions = useMemo<[number, number][]>(
        () => (!active ? [] : roaming ? roamingSpots(mapId, ARENA_OPPONENTS, Math.random) : ARENA_POSITIONS[mapId] ?? []),
        [active, roaming, mapId],
    )

    if (!active || !players) return { mode, opponents: [] }
    // En mode MIROIR, le PSEUDO de l'adversaire s'affiche à l'envers (et NON le nom du Daemon).
    const opponents = rankClosest(players, myUserId, myLevel, positions.length).map((p, i) => ({
        userId: p.userId,
        nickname: mode === "mirror" ? mirrorName(p.nickname) : p.nickname,
        x: positions[i][0],
        y: positions[i][1],
        player: p,
    }))
    return { mode, opponents }
}
