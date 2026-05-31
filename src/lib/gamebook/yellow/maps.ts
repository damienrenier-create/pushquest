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
    /** Combien de pixels de l'image natifs = 1 tile du jeu (ex: 32 pour image 2x upscalée) */
    backgroundImageTileSize?: number
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

// === yellow_entrance : la VILLE (extérieur) ==============================
// 20×16 tiles. 4 bâtiments en 2×2. Paths qui les connectent. Quelques arbres
// décoratifs. Joueur spawn au centre-sud. Camera scrollera quand il bouge.

const TOWN_W = 20
const TOWN_H = 16

function buildYellowTown(): TileType[][] {
    const m = fillRect(TOWN_W, TOWN_H, "grass")
    // Bordures = arbres (mur naturel infranchissable)
    for (let x = 0; x < TOWN_W; x++) {
        m[0][x] = "tree"
        m[TOWN_H - 1][x] = "tree"
    }
    for (let y = 0; y < TOWN_H; y++) {
        m[y][0] = "tree"
        m[y][TOWN_W - 1] = "tree"
    }
    // Croix de paths : un axe horizontal au milieu + un vertical au milieu
    for (let x = 1; x < TOWN_W - 1; x++) m[8][x] = "path"
    for (let y = 1; y < TOWN_H - 1; y++) m[y][10] = "path"
    // Petits paths verticaux qui descendent des portes (door y=7 → path y=8)
    for (let y = 7; y <= 8; y++) {
        m[y][4] = "path"   // descente devant shop
        m[y][15] = "path"  // descente devant casino
    }
    for (let y = 8; y <= 14; y++) {
        m[y][4] = "path"   // descente vers infirmerie
        m[y][15] = "path"  // descente vers arène
    }
    // Quelques fleurs déco
    m[2][2] = "flowerY"
    m[2][17] = "flowerY"
    m[13][2] = "flowerY"
    m[13][17] = "flowerY"
    return m
}

const TOWN_BUILDINGS: YellowBuilding[] = [
    {
        id: "b_shop",
        x: 3, y: 3, w: 4, h: 4,
        doorX: 1, doorY: 3,
        targetMapId: "yellow_shop",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "SHOP",
        kind: "shop",
    },
    {
        id: "b_casino",
        x: 14, y: 3, w: 4, h: 4,
        doorX: 1, doorY: 3,
        targetMapId: "yellow_casino",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "CASINO",
        kind: "casino",
    },
    {
        id: "b_infirmary",
        x: 3, y: 10, w: 4, h: 4,
        doorX: 1, doorY: 3,
        targetMapId: "yellow_infirmary",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "INFIRMERIE",
        kind: "infirmary",
    },
    {
        id: "b_arena",
        x: 14, y: 10, w: 4, h: 4,
        doorX: 1, doorY: 3,
        targetMapId: "yellow_arena",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "ARÈNE",
        kind: "arena",
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
// viridian_full.png : 1360x672 px. Viridian City occupe les ~720 premiers
// pixels en largeur, le reste = intérieurs (rendus séparément plus tard).
// Image upscalée 2x → 1 metatile FireRed = 32 px image. Viridian City =
// 22 tiles wide × 21 tiles tall (= 704 × 672 px image affichés).
const VIRIDIAN_W = 22
const VIRIDIAN_H = 21
const VIRIDIAN_IMAGE_TILE_SIZE = 32  // px par tile dans l'image

export const YELLOW_MAPS: Record<string, YellowMapData> = {
    [YELLOW_ENTRANCE_MAP_ID]: {
        id: YELLOW_ENTRANCE_MAP_ID,
        name: "VILLE JAUNE",
        tiles: fillRect(VIRIDIAN_W, VIRIDIAN_H, "grass"), // tout walkable pour l'instant — collisions à câbler après
        width: VIRIDIAN_W,
        height: VIRIDIAN_H,
        // Bâtiments désactivés : leurs façades sont déjà dans l'image, et leurs
        // portes/intérieurs seront re-câblés une fois qu'on aura identifié leurs
        // coords précises dans l'image.
        // buildings: TOWN_BUILDINGS,
        // exits: exitsFromBuildings(TOWN_BUILDINGS),
        backgroundImage: "/yellow/sprites/viridian_full.png",
        backgroundImageWidth: 1360,
        backgroundImageHeight: 672,
        backgroundImageTileSize: VIRIDIAN_IMAGE_TILE_SIZE,
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
