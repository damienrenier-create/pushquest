// src/lib/gamebook/yellow/multiplayer/usePlayerArena.ts
//
// Nexus Jaune Éclair — alimente les ARÈNES JOUEURS (hub Eau + miroir Élec).
// Charge le registre des dresseurs et renvoie les 6 adversaires à afficher (les plus proches
// de notre niveau), placés sur les cases libres de l'arène — uniquement si on a TOUS les badges.

import { useEffect, useMemo, useState } from "react"
import { ARENA_MAPS, ARENA_POSITIONS, ARENA_OPPONENTS, ROAMING_ARENA_MAPS, ROUTE_NORD_MAP_ID, ROUTE_NORD_SPOT_COUNT, roamingSpots, rankClosest, arenaActive, mirrorName, registerRegistryCustoms, type ArenaMode, type RegistryPlayer } from "../data/playerArena"

export interface ArenaOpponent {
    userId: string
    nickname: string
    x: number
    y: number
    avatar?: string // skin adopté (chosenAvatar) → le reflet l'affiche partout
    clan?: "air" | "combat" | "roche" | null // FERVEUR DE CLAN — badge de clan affiché au-dessus du nom sur la carte
    player: RegistryPlayer
}

export function usePlayerArena(mapId: string, badges: readonly string[], myUserId: string, myLevel: number, myGameMode?: string): {
    mode: ArenaMode | null
    opponents: ArenaOpponent[]
} {
    const mode = ARENA_MAPS[mapId] ?? null
    const roaming = ROAMING_ARENA_MAPS.has(mapId)
    // ROUTE NORD (comptes FUN uniquement) : reflets d'AUTRES comptes fun dans les hautes herbes, DÈS le run 1
    //   (sans badge). Activation par gameMode → les comptes non-fun n'y voient rien (arenaActive renvoie false ici).
    const isFunRouteNord = mapId === ROUTE_NORD_MAP_ID && myGameMode === "fun"
    // Gate par map (cf. arenaActive) : Viridian = reflets EXACTS dès le 1er badge ;
    // arène eau = reflets INVERSÉS une fois ONDINE vaincue.
    const active = isFunRouteNord || arenaActive(mapId, badges)
    const [players, setPlayers] = useState<RegistryPlayer[] | null>(null)

    useEffect(() => {
        if (!active) return
        let cancel = false
        fetch("/api/gamebook/yellow/registry")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
            .then((j) => {
                if (cancel) return
                const players = (j.players ?? []) as RegistryPlayer[]
                // Enregistre les Daemons CUSTOM des adversaires AVANT de bâtir les reflets → leur espèce se résout
                //   (sprite + combat), au lieu d'être jetée (Franss/Shady & co. apparaissent enfin).
                registerRegistryCustoms(players)
                setPlayers(players)
            })
            .catch(() => { if (!cancel) setPlayers([]) })
        return () => { cancel = true }
    }, [active, mapId])

    // Positions : ROAMING = cases aléatoires RE-TIRÉES à chaque entrée de map (mapId change → effet
    // « hasardeux ») ; arène fixe = cases prédéfinies. useMemo → stable tant qu'on reste sur la map.
    const positions = useMemo<[number, number][]>(
        () => (!active ? []
            : isFunRouteNord ? roamingSpots(mapId, ROUTE_NORD_SPOT_COUNT, Math.random, "grassTall") // hautes herbes, >= 10 cases
            : roaming ? roamingSpots(mapId, ARENA_OPPONENTS, Math.random)
            : ARENA_POSITIONS[mapId] ?? []),
        [active, roaming, isFunRouteNord, mapId],
    )

    if (!active || !players) return { mode, opponents: [] }
    // ROUTE NORD fun : on ne montre QUE les reflets d'autres comptes fun (entre-soi des invités simplifiés).
    const pool = isFunRouteNord ? players.filter((p) => p.gameMode === "fun") : players
    // En mode MIROIR, le PSEUDO de l'adversaire s'affiche à l'envers (et NON le nom du Daemon).
    const opponents = rankClosest(pool, myUserId, myLevel, positions.length).map((p, i) => ({
        userId: p.userId,
        nickname: mode === "mirror" ? mirrorName(p.nickname) : p.nickname,
        x: positions[i][0],
        y: positions[i][1],
        avatar: p.chosenAvatar ?? undefined,
        clan: p.clan ?? null,
        player: p,
    }))
    return { mode, opponents }
}
