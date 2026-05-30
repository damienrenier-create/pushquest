// Nexus II — types partagés du moteur de jeu.
//
// Tout le state v2 est sérialisable : un PlayerState peut être JSON.stringify
// et restauré. Aucune référence à React, Prisma, ou la BDD ici — uniquement
// les types métier.

export type Direction = "up" | "down" | "left" | "right"

export interface PlayerState {
    mapId: string
    posX: number
    posY: number
    direction: Direction
}

export function createInitialPlayer(
    mapId: string,
    x: number,
    y: number,
    direction: Direction = "down",
): PlayerState {
    return { mapId, posX: x, posY: y, direction }
}
