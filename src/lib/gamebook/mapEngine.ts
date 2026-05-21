// src/lib/gamebook/mapEngine.ts
//
// Moteur PUR de la carte v3. Pas d'I/O, pas de DB, pas de React.
// Juste des types, des constantes et des fonctions pures de vérification.

export type Direction = "up" | "down" | "left" | "right"

export type TileType =
    // Extérieur
    | "grass" | "grassTall" | "path" | "water" | "tree" | "fence"
    | "flowerR" | "flowerY"
    | "treeObstacle"  // arbre tombé qui bloque le chemin (cost 150 reps)
    | "bridgePlank"   // planche du pont pépite d'Azuria
    | "ravine"        // ravin sous le pont (mort si on tombe)
    // Intérieurs - sol et murs
    | "floorWood" | "floorTile" | "rug"
    | "wallH" | "wallV" | "wallCorner"
    | "doorMat"
    // Salle de muscu
    | "machineSquat" | "machinePushup" | "machinePullup" | "machineCardio" | "machineGainage"
    // Casino
    | "table" | "chairBlueUp" | "chairBlueDown" | "chairRedUp" | "chairRedDown"
    | "rouletteWheel" | "slotMachine"
    // Grotte
    | "bookshelf" | "caveWall" | "caveFloor" | "potion" | "monsterDesk"

export interface Building {
    x: number
    y: number
    w: number
    h: number
    kind: "gym" | "casino" | "monsterCave"
    doorX: number
    doorY: number
    visible: boolean
}

export interface Sign {
    x: number
    y: number
    text: string
}

export interface MapData {
    id: string
    name: string
    tiles: TileType[][]
    width: number
    height: number
    // Pour les intérieurs : où on revient en marchant sur doorMat
    exitTarget?: { mapId: string; x: number; y: number }
}

// État sérialisable de la progression d'un joueur
export interface PlayerMapState {
    mapId: string
    posX: number
    posY: number
    direction: Direction
    phase: "explore" | "introMonster" | "playing"
    introStep: number
    hasEnteredTallGrass: boolean
    monsterCaveRevealed: boolean
    hasSeenWelcomeScreen: boolean
    // === v3.1 : Route 1 + Pont Pépite d'Azuria ===
    treeObstacleCleared: boolean       // l'arbre tombé est franchi (150 reps payées)
    pioneerBadgeAwarded: boolean       // badge "Pionnier" donné par le Monstre
    bridgePnjDefeated: string[]        // ids des PNJ du pont vaincus
    bridgePnjLastBeatenDate: Record<string, string>  // pnjId → YYYY-MM-DD du dernier passage
}

// Snapshot d'un autre joueur affiché sur la carte
export interface PlayerSnapshot {
    id: string
    nickname: string
    emoji: string
    animal: string
    level: number
    mapId: string
    posX: number
    posY: number
    direction: Direction
    lastSeenAgo: string  // "il y a 12 min", déjà formaté
    todayRank?: number   // classement reps du jour (1 = top)
    todayReps?: number
}

// ============================================================
// Tuiles bloquantes - liste exhaustive
// (Note : treeObstacle n'est pas listée ici car son blocage dépend
//  d'un flag par-joueur. Voir tryComputeMove qui le gère séparément.)
// ============================================================
export const BLOCKING_TILES: TileType[] = [
    "tree", "water", "fence",
    "ravine",  // ravin sous le pont = mortel/bloquant
    "wallH", "wallV", "wallCorner",
    "machineSquat", "machinePushup", "machinePullup", "machineCardio", "machineGainage",
    "table", "chairBlueUp", "chairBlueDown", "chairRedUp", "chairRedDown",
    "rouletteWheel", "slotMachine",
    "bookshelf", "caveWall", "potion", "monsterDesk",
]

export function isBlockingTile(tile: TileType): boolean {
    return BLOCKING_TILES.includes(tile)
}

// ============================================================
// Coûts énergétiques
// ============================================================
export const COST_MOVE = 10       // 10 reps pour bouger d'une case
export const COST_PUSH = 30       // 30 reps pour pousser un autre joueur
export const COST_TREE_OBSTACLE = 150  // arbre tombé sur la route 1

// ============================================================
// Formatage temps relatif "il y a X min"
// ============================================================
export function formatTimeAgo(date: Date | string): string {
    const past = typeof date === "string" ? new Date(date) : date
    const ms = Date.now() - past.getTime()
    const sec = Math.floor(ms / 1000)
    if (sec < 60) return "à l'instant"
    const min = Math.floor(sec / 60)
    if (min < 60) return `il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `il y a ${h} h`
    const d = Math.floor(h / 24)
    if (d < 7) return `il y a ${d} j`
    const w = Math.floor(d / 7)
    return `il y a ${w} sem`
}

// ============================================================
// Bâtiment à une position (extérieur uniquement)
// ============================================================
export function buildingAt(
    buildings: Building[],
    x: number,
    y: number
): Building | null {
    for (const b of buildings) {
        if (!b.visible) continue
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b
    }
    return null
}

export function doorAt(
    buildings: Building[],
    x: number,
    y: number
): Building | null {
    for (const b of buildings) {
        if (!b.visible) continue
        if (x === b.x + b.doorX && y === b.y + b.doorY) return b
    }
    return null
}

// ============================================================
// Application d'un mouvement : prédit le nouvel état SANS effet de bord
// Retourne { newState, repsCost } ou null si bloqué
// ============================================================
export interface MoveResult {
    nextState: PlayerMapState
    repsCost: number
    triggersIntro: boolean   // true si on vient de marcher dans les hautes herbes
    enteredBuilding?: "gym" | "casino" | "monsterCave"
    leftToOutdoor?: boolean  // vrai si on est sorti par un doorMat
    reason?: string          // message si bloqué
}

export function tryComputeMove(
    current: PlayerMapState,
    direction: Direction,
    map: MapData,
    buildings: Building[],
    otherPlayersBlocking: Array<{ x: number; y: number }>
): MoveResult | { blocked: true; reason: string } {
    let nx = current.posX
    let ny = current.posY
    if (direction === "up") ny -= 1
    if (direction === "down") ny += 1
    if (direction === "left") nx -= 1
    if (direction === "right") nx += 1

    // Hors map
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        return { blocked: true, reason: "Tu sors de la carte." }
    }

    const tile = map.tiles[ny][nx]

    // Tuile bloquante
    if (isBlockingTile(tile)) {
        return { blocked: true, reason: "Bloqué." }
    }

    // Arbre tombé : bloqué si pas encore franchi
    if (tile === "treeObstacle" && !current.treeObstacleCleared) {
        return { blocked: true, reason: "TREE_OBSTACLE" }
    }

    // Bâtiment (mur, pas porte)
    if (current.mapId === "bourgpates") {
        const b = buildingAt(buildings, nx, ny)
        if (b && !(nx === b.x + b.doorX && ny === b.y + b.doorY)) {
            return { blocked: true, reason: "Un mur." }
        }
    }

    // Autre joueur bloque
    if (otherPlayersBlocking.some((p) => p.x === nx && p.y === ny)) {
        return { blocked: true, reason: "Quelqu'un te bloque le passage." }
    }

    // Cas spécial : doorMat dans un intérieur = sortie
    const newState: PlayerMapState = {
        ...current,
        posX: nx,
        posY: ny,
        direction,
    }

    if (tile === "doorMat" && map.exitTarget) {
        // On gère la sortie côté caller
        return {
            nextState: {
                ...current,
                mapId: map.exitTarget.mapId,
                posX: map.exitTarget.x,
                posY: map.exitTarget.y,
                direction,
            },
            repsCost: COST_MOVE,
            triggersIntro: false,
            leftToOutdoor: true,
        }
    }

    // Hautes herbes : trigger intro Monstre si jamais fait
    const triggersIntro =
        current.mapId === "bourgpates" &&
        tile === "grassTall" &&
        !current.hasEnteredTallGrass

    return {
        nextState: newState,
        repsCost: current.phase === "playing" ? COST_MOVE : 0,
        triggersIntro,
    }
}

// ============================================================
// Calcul de la case devant le joueur (pour A)
// ============================================================
export function frontTile(state: PlayerMapState): { x: number; y: number } {
    let fx = state.posX
    let fy = state.posY
    if (state.direction === "up") fy -= 1
    if (state.direction === "down") fy += 1
    if (state.direction === "left") fx -= 1
    if (state.direction === "right") fx += 1
    return { x: fx, y: fy }
}

// ============================================================
// Recul d'un joueur poussé (calcul de la nouvelle position cible)
// Retourne la position où le joueur poussé doit aller, ou null si pas possible
// ============================================================
export function computePushTarget(
    pushedX: number,
    pushedY: number,
    pusherDirection: Direction,
    map: MapData,
    buildings: Building[],
    otherPlayers: Array<{ x: number; y: number }>
): { x: number; y: number } | null {
    let tx = pushedX
    let ty = pushedY
    if (pusherDirection === "up") ty -= 1
    if (pusherDirection === "down") ty += 1
    if (pusherDirection === "left") tx -= 1
    if (pusherDirection === "right") tx += 1

    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return null
    const tile = map.tiles[ty][tx]
    if (isBlockingTile(tile)) return null

    if (map.id === "bourgpates") {
        const b = buildingAt(buildings, tx, ty)
        if (b && !(tx === b.x + b.doorX && ty === b.y + b.doorY)) return null
    }

    if (otherPlayers.some((p) => p.x === tx && p.y === ty)) return null

    return { x: tx, y: ty }
}
