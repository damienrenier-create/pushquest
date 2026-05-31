// Nexus II "jaune éclair" — registre des maps + bâtiments + exits.
//
// Conventions :
//   - Maps : prefixe `yellow_*`
//   - Buildings : pose sur une map extérieure, bloque le mouvement sauf à la
//     case porte. La porte = warp automatique vers la map intérieure.
//   - Exits : warps custom (ex: sortie d'une map intérieure qui ramène dehors).
//
// Toutes les coordonnées sont en TILES. Le rendu (10x9 viewport) est géré
// côté MapView avec scroll caméra.

import type { MapData, TileType } from "@/lib/gamebook/mapEngine"
import { YELLOW_ENTRANCE_MAP_ID } from "./featureFlag"

// === Types yellow-specific ============================================

export interface YellowBuilding {
    id: string
    /** Coin haut-gauche du footprint */
    x: number
    y: number
    /** Taille en tiles */
    w: number
    h: number
    /** Position de la porte RELATIVE à (x, y) */
    doorX: number
    doorY: number
    /** Map intérieure vers laquelle la porte mène */
    targetMapId: string
    /** Où le joueur réapparaît en entrant dans la map intérieure */
    targetSpawnX: number
    targetSpawnY: number
    /** Nom affiché au-dessus du bâtiment */
    displayName: string
    /** Type pour différencier visuellement (couleur du toit) */
    kind: "shop" | "casino" | "infirmary" | "arena"
}

export interface YellowExit {
    /** Case qui déclenche le warp (coords absolues dans la map) */
    x: number
    y: number
    targetMapId: string
    targetSpawnX: number
    targetSpawnY: number
}

export interface YellowMapData extends MapData {
    /** Bâtiments présents sur cette map (rendu + collision + warps auto) */
    buildings?: YellowBuilding[]
    /** Warps custom (ex: doorMat de sortie d'intérieur) */
    exits?: YellowExit[]
    /** Couleur dominante de la map ("ground" — sol par défaut) */
    groundTile?: TileType
    /** v2 — Image PNG utilisée comme fond complet de la map (au lieu du rendu
     *  par tiles CSS). Pratique pour des scènes pré-assemblées Spriters Resource. */
    backgroundImage?: string
    /** Largeur native de l'image en pixels (ex: 1360 pour viridian_full) */
    backgroundImageWidth?: number
    /** Hauteur native de l'image en pixels */
    backgroundImageHeight?: number
    /** Combien de pixels de l'image natifs = 1 tile du jeu (ex: 16 pour natif, 32 pour 2x) */
    backgroundImageTileSize?: number
    /** Pixel x de l'image qui correspond à la case (0, 0) de la map (skip headers/bordures) */
    backgroundImageOriginX?: number
    /** Pixel y de l'image qui correspond à la case (0, 0) de la map (skip headers/bordures) */
    backgroundImageOriginY?: number
}

// === Helpers ============================================================

/** Pose les murs périphériques de l'extérieur (4 côtés) */
function fillRect(W: number, H: number, defaultTile: TileType): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) row.push(defaultTile)
        m.push(row)
    }
    return m
}

function fillRoom(W: number, H: number, floor: TileType): TileType[][] {
    const m = fillRect(W, H, floor)
    // Murs périphériques intérieur
    for (let x = 0; x < W; x++) {
        m[0][x] = "wallH"
        m[H - 1][x] = "wallH"
    }
    for (let y = 1; y < H - 1; y++) {
        m[y][0] = "wallV"
        m[y][W - 1] = "wallV"
    }
    return m
}

// === Collisions Viridian City (mapping user + extrapolations pixel) ==
// Le visuel vient de viridian_full.png. Ces tiles servent uniquement à
// bloquer/autoriser le mouvement (pas de rendu CSS).

function buildViridianCollisions(): TileType[][] {
    const W = VIRIDIAN_W, H = VIRIDIAN_H
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) row.push("grass")
        m.push(row)
    }

    // === MONTAGNES OUEST (cliffs) ===
    // Bloc nord : cols 0..7, rows 0..16 (user-confirmed)
    for (let y = 0; y <= 16; y++) {
        for (let x = 0; x <= 7; x++) m[y][x] = "tree"
    }
    // Sand path horizontal rows 17..19 cols 0..8 (extrapolé via sampling — user mentionnait col 0)
    // Ces tiles restent en default grass (walkable).

    // Bloc sud : cols 0..6, rows 20..37 (extrapolé — les cliffs continuent vers le sud)
    for (let y = 20; y <= 37; y++) {
        for (let x = 0; x <= 6; x++) m[y][x] = "tree"
    }

    // === BORDURE NORD (row 0) ===
    for (let x = 8; x <= 17; x++) m[0][x] = "tree"
    m[0][18] = "fence"
    // (19..23, 0) = herbe (default)
    for (let x = 24; x <= 43; x++) m[0][x] = "tree"

    // === BARRIÈRES horizontales row 4 ===
    for (let x = 8; x <= 18; x++) m[4][x] = "fence"

    // === BARRIÈRE (18, 6) ===
    m[6][18] = "fence"

    // === BUISSONS col 19, rows impaires 7..15 ===
    for (let y = 7; y <= 15; y += 2) m[y][19] = "tree"

    // === EAU (fontaine) cols 11..16, rows 26..30 ===
    for (let y = 26; y <= 30; y++) {
        for (let x = 11; x <= 16; x++) m[y][x] = "water"
    }

    // === BORDURE EST (cols 42..43, toutes les rows) ===
    for (let y = 0; y < H; y++) {
        for (let x = 42; x <= 43; x++) m[y][x] = "tree"
    }

    // === BORDURE SUD (row 39) avec gap sortie Route 1 ===
    // Cols 0..21 et 26..41 = trees. Cols 22..25 = sand walkable (sortie Route 1).
    for (let x = 0; x <= 21; x++) m[39][x] = "tree"
    for (let x = 26; x <= 41; x++) m[39][x] = "tree"
    // (22..25, 36..39) = sand walkable (default grass OK)

    return m
}

// === Bâtiments de Viridian City (positions mappées par l'user 2026-05-31) ==
// Le visuel est dans viridian_full.png — ces définitions servent à :
//   1. Bloquer le mouvement sur les murs du bâtiment
//   2. Auto-générer les exits (warp porte → map intérieure)
const TOWN_BUILDINGS: YellowBuilding[] = [
    {
        // GYM : toit (33-38, 6) à (33-38, 8), porte (36, 10)
        id: "b_arena",
        x: 33, y: 6, w: 6, h: 4,        // footprint cols 33..38, rows 6..9
        doorX: 3, doorY: 4,             // porte abs (36, 10) — devant le bâtiment
        targetMapId: "yellow_arena",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "GYM",
        kind: "arena",
    },
    {
        // MAISON NPC (placeholder casino) : toit (24-28, 16), porte (25, 18)
        id: "b_casino",
        x: 24, y: 16, w: 5, h: 2,       // footprint cols 24..28, rows 16..17
        doorX: 1, doorY: 2,             // porte abs (25, 18) — devant le bâtiment
        targetMapId: "yellow_casino",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "MAISON",
        kind: "casino",
    },
    {
        // MART : toit (34-37, 16), descend à (34-37, 19), porte (36, 19)
        id: "b_shop",
        x: 34, y: 16, w: 4, h: 4,       // footprint cols 34..37, rows 16..19
        doorX: 2, doorY: 3,             // porte abs (36, 19) — dans le footprint (walkable)
        targetMapId: "yellow_shop",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "MART",
        kind: "shop",
    },
    {
        // PC Pokemon Center : (24-28, 20-26), porte (26, 26)
        id: "b_infirmary",
        x: 24, y: 20, w: 5, h: 7,       // footprint cols 24..28, rows 20..26
        doorX: 2, doorY: 6,             // porte abs (26, 26) — dans le footprint (walkable)
        targetMapId: "yellow_infirmary",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "PC",
        kind: "infirmary",
    },
]

// === Intérieurs : 4 maps 9×7 ============================================

function buildShopInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorChecker")
    // Comptoir horizontal
    for (let x = 1; x < 8; x++) m[2][x] = "shopCounter"
    // Étagères au-dessus
    for (let x = 1; x < 8; x++) m[1][x] = "shopShelf"
    // Porte de sortie au sud
    m[6][4] = "doorMat"
    return m
}

function buildCasinoInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorTile")
    // Tables de casino
    m[2][2] = "table"
    m[2][6] = "table"
    m[4][2] = "slotMachine"
    m[4][6] = "rouletteWheel"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

function buildInfirmaryInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorTile")
    // 2 lits
    m[2][2] = "rug"
    m[2][6] = "rug"
    // Comptoir d'accueil au nord
    for (let x = 3; x <= 5; x++) m[1][x] = "shopCounter"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

function buildArenaInterior(): TileType[][] {
    const m = fillRoom(9, 7, "arenaFloor")
    // Petite estrade au nord
    m[1][4] = "shopCounter"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

// === Helpers warp =======================================================

/** Position absolue de la porte d'un bâtiment. */
export function buildingDoorPos(b: YellowBuilding): { x: number; y: number } {
    return { x: b.x + b.doorX, y: b.y + b.doorY }
}

/** Exits auto-dérivés des buildings (porte = warp vers intérieur). */
function exitsFromBuildings(buildings: YellowBuilding[]): YellowExit[] {
    return buildings.map((b) => {
        const door = buildingDoorPos(b)
        return {
            x: door.x,
            y: door.y,
            targetMapId: b.targetMapId,
            targetSpawnX: b.targetSpawnX,
            targetSpawnY: b.targetSpawnY,
        }
    })
}

// === Registre ===========================================================

// Coordonnées de retour pour les exits d'intérieur : juste sous la porte
// du bâtiment correspondant (player.posY = door.y + 1).
const TOWN_BUILDING_BY_TARGET: Record<string, YellowBuilding> = Object.fromEntries(
    TOWN_BUILDINGS.map((b) => [b.targetMapId, b]),
)

function returnExit(targetInteriorMapId: string, doorMatX: number, doorMatY: number): YellowExit {
    const b = TOWN_BUILDING_BY_TARGET[targetInteriorMapId]
    const door = buildingDoorPos(b)
    return {
        x: doorMatX,
        y: doorMatY,
        targetMapId: YELLOW_ENTRANCE_MAP_ID,
        targetSpawnX: door.x,
        targetSpawnY: door.y + 1, // 1 case sous la porte = sur le path
    }
}

// === VILLE JAUNE = Viridian City (FireRed) ==============================
// viridian_full.png : 1360x672 px à l'échelle NATIVE FireRed (16 px = 1 tile).
// La sheet Spriters Resource a une bordure décorative :
//   - Gauche : x=0..7 (frame + marge blanche), contenu réel commence x=8
//   - Haut  : y=0..23 (titre + marge blanche), contenu réel commence y=24
// Viridian City occupe ensuite ~712 px wide × 648 px tall depuis (8, 24).
const VIRIDIAN_W = 44                // (720 - 8) / 16 = 44.5, on prend 44
const VIRIDIAN_H = 40                // (672 - 24) / 16 = 40.5, on prend 40
const VIRIDIAN_IMAGE_TILE_SIZE = 16
const VIRIDIAN_ORIGIN_X = 8          // px image qui correspond à map (0, _)
const VIRIDIAN_ORIGIN_Y = 24         // px image qui correspond à map (_, 0)

export const YELLOW_MAPS: Record<string, YellowMapData> = {
    [YELLOW_ENTRANCE_MAP_ID]: {
        id: YELLOW_ENTRANCE_MAP_ID,
        name: "VILLE JAUNE",
        tiles: buildViridianCollisions(),
        width: VIRIDIAN_W,
        height: VIRIDIAN_H,
        // Bâtiments visuellement déjà dans l'image. Le buildings array sert
        // uniquement à : 1) bloquer le mouvement dans les façades, 2) générer
        // les exits/warps via les positions de porte.
        buildings: TOWN_BUILDINGS,
        exits: exitsFromBuildings(TOWN_BUILDINGS),
        backgroundImage: "/yellow/sprites/viridian_full.png",
        backgroundImageWidth: 1360,
        backgroundImageHeight: 672,
        backgroundImageTileSize: VIRIDIAN_IMAGE_TILE_SIZE,
        backgroundImageOriginX: VIRIDIAN_ORIGIN_X,
        backgroundImageOriginY: VIRIDIAN_ORIGIN_Y,
    },
    yellow_shop: {
        id: "yellow_shop",
        name: "SHOP",
        tiles: buildShopInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_shop", 4, 6)],
    },
    yellow_casino: {
        id: "yellow_casino",
        name: "CASINO",
        tiles: buildCasinoInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_casino", 4, 6)],
    },
    yellow_infirmary: {
        id: "yellow_infirmary",
        name: "INFIRMERIE",
        tiles: buildInfirmaryInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_infirmary", 4, 6)],
    },
    yellow_arena: {
        id: "yellow_arena",
        name: "ARÈNE",
        tiles: buildArenaInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_arena", 4, 6)],
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
