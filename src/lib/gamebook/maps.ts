// src/lib/gamebook/maps.ts
//
// Définition statique des cartes du jeu :
//   - bourgpates : la carte principale (Bourg-Boulette), en extérieur
//   - gym       : intérieur de la salle de muscu
//   - casino    : intérieur du casino
//   - cave      : grotte du Monstre Spaghetti Volant
//   - route1    : route 1 (forêt avec arbre obstacle + pont)
//
// Note : on garde "bourgpates" comme ID interne (sinon ça casserait les
// progressions en DB des joueurs existants). Seul le nom affiché change.

import type { Building, MapData, Sign, TileType } from "./mapEngine"

// ============================================================
// CARTE EXTÉRIEURE — BOURG-BOULETTE
// 15 × 16
// ============================================================
const OUTDOOR_W = 15
const OUTDOOR_H = 16

function buildOutdoor(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < OUTDOOR_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < OUTDOOR_W; x++) {
            if (x === 0 || x === OUTDOOR_W - 1 || y === 0) row.push("tree")
            else row.push("grass")
        }
        m.push(row)
    }
    // Hautes herbes (sortie nord, déclencheur intro Monstre)
    m[1][6] = "grassTall"
    m[1][7] = "grassTall"
    m[1][8] = "grassTall"
    m[2][6] = "grassTall"
    m[2][7] = "grassTall"
    m[2][8] = "grassTall"

    // Chemin vertical central
    for (let y = 3; y < OUTDOOR_H - 1; y++) {
        m[y][7] = "path"
        m[y][8] = "path"
    }
    // Chemin horizontal
    for (let x = 2; x < OUTDOOR_W - 1; x++) m[10][x] = "path"

    // Rivière en bas
    for (let x = 1; x < OUTDOOR_W - 1; x++) m[OUTDOOR_H - 1][x] = "water"
    m[OUTDOOR_H - 2][5] = "water"
    m[OUTDOOR_H - 2][6] = "water"

    // Jardin de fleurs
    m[12][2] = "flowerR"
    m[12][3] = "flowerY"
    m[12][4] = "flowerR"
    m[13][2] = "flowerY"
    m[13][3] = "flowerR"
    m[13][4] = "flowerY"
    m[11][2] = "fence"
    m[11][3] = "fence"
    m[11][4] = "fence"
    m[11][5] = "fence"

    return m
}

export const OUTDOOR_BUILDINGS_BASE: Building[] = [
    { x: 2, y: 4, w: 4, h: 3, kind: "gym", doorX: 1, doorY: 2, visible: true },
    { x: 10, y: 4, w: 4, h: 3, kind: "casino", doorX: 1, doorY: 2, visible: true },
    { x: 10, y: 11, w: 3, h: 3, kind: "monsterCave", doorX: 1, doorY: 2, visible: false },
]

export const OUTDOOR_SIGNS: Sign[] = [
    { x: 4, y: 7, text: "BOURG-BOULETTE\nBerceau du Monstre." },
    { x: 11, y: 7, text: "CASINO\nPour les âmes téméraires." },
    { x: 6, y: 3, text: "↑ ROUTE 1\nLes Hautes Herbes." },
    { x: 4, y: 12, text: "Jardin de Pâtes-Fleurs." },
]

// ============================================================
// SALLE DE MUSCU
// ============================================================
function buildGym(): TileType[][] {
    const W = 10, H = 8
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0) row.push("wallH")
            else if (x === 0 || x === W - 1 || y === H - 1) row.push("wallV")
            else row.push("floorWood")
        }
        m.push(row)
    }
    m[H - 1][4] = "doorMat"
    m[H - 1][5] = "doorMat"

    m[2][2] = "machineSquat"
    m[2][4] = "machinePushup"
    m[2][7] = "machinePullup"
    m[5][2] = "machineCardio"
    m[5][7] = "machineGainage"

    return m
}

// ============================================================
// CASINO
// ============================================================
function buildCasino(): TileType[][] {
    const W = 10, H = 8
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0) row.push("wallH")
            else if (x === 0 || x === W - 1 || y === H - 1) row.push("wallV")
            else row.push("floorTile")
        }
        m.push(row)
    }
    m[H - 1][4] = "doorMat"
    m[H - 1][5] = "doorMat"

    m[3][4] = "rug"
    m[3][5] = "rug"
    m[4][4] = "rug"
    m[4][5] = "rug"

    m[2][2] = "chairBlueDown"
    m[3][2] = "table"
    m[4][2] = "chairBlueUp"
    m[2][7] = "chairRedDown"
    m[3][7] = "table"
    m[4][7] = "chairRedUp"

    m[1][2] = "slotMachine"
    m[1][7] = "slotMachine"
    m[5][4] = "rouletteWheel"

    return m
}

// ============================================================
// GROTTE DU MONSTRE
// ============================================================
function buildCave(): TileType[][] {
    const W = 9, H = 8
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0 || x === 0 || x === W - 1 || y === H - 1) row.push("caveWall")
            else row.push("caveFloor")
        }
        m.push(row)
    }
    m[H - 1][4] = "doorMat"

    m[1][1] = "bookshelf"
    m[1][2] = "bookshelf"
    m[1][3] = "bookshelf"
    m[1][5] = "bookshelf"
    m[1][6] = "bookshelf"
    m[1][7] = "bookshelf"

    m[2][4] = "monsterDesk"

    m[3][1] = "potion"
    m[3][7] = "potion"

    return m
}

// ============================================================
// ROUTE 1 — Forêt avec arbre obstacle + pont Pépite d'Azuria
// 11 × 18 (verticale, on monte depuis le sud)
// ============================================================
const ROUTE1_W = 11
const ROUTE1_H = 18

function buildRoute1(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < ROUTE1_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < ROUTE1_W; x++) {
            // Bordures d'arbres latérales
            if (x === 0 || x === ROUTE1_W - 1) row.push("tree")
            else row.push("grass")
        }
        m.push(row)
    }

    // Tapis d'entrée en bas (sortie vers Bourg-Boulette)
    m[ROUTE1_H - 1][5] = "doorMat"

    // Chemin vertical sud (de y=12 à y=16)
    for (let y = 12; y < ROUTE1_H - 1; y++) {
        m[y][5] = "path"
    }

    // === ZONE BAS : forêt clairsemée (sous l'arbre) ===
    m[15][2] = "tree"
    m[15][8] = "tree"
    m[14][3] = "grassTall"
    m[14][7] = "grassTall"
    m[13][2] = "tree"

    // === MILIEU : ARBRE OBSTACLE === (y=11, juste avant le pont)
    // v3.5b : mur DOUBLE garanti par boucle - impossible de contourner
    // Ligne y=11 : entièrement bloquée (tree partout sauf l'obstacle au centre)
    for (let x = 0; x < ROUTE1_W; x++) {
        if (x === 5) {
            m[11][x] = "treeObstacle"
        } else {
            m[11][x] = "tree"
        }
    }
    // Ligne y=12 : double mur (tree partout sauf au centre pour laisser le chemin sud accessible)
    for (let x = 0; x < ROUTE1_W; x++) {
        if (x !== 5) {
            m[12][x] = "tree"
        }
    }

    // === ZONE HAUT : PONT PÉPITE D'AZURIA (y=2 à y=10) ===
    // Pont large de 5 cases (colonnes 3-7) avec cours d'eau bleu de chaque côté
    for (let y = 2; y <= 10; y++) {
        // Cours d'eau à gauche (colonnes 1-2)
        m[y][1] = "water"
        m[y][2] = "water"
        // Pont (colonnes 3-7)
        m[y][3] = "bridgePlank"
        m[y][4] = "bridgePlank"
        m[y][5] = "bridgePlank"
        m[y][6] = "bridgePlank"
        m[y][7] = "bridgePlank"
        // Cours d'eau à droite (colonnes 8-9)
        m[y][8] = "water"
        m[y][9] = "water"
    }

    // Espace en haut (après le pont, futur extension)
    m[1][5] = "path"

    return m
}

// PNJ du pont — positions fixes sur le chemin du pont
// Ils sont les "ghosts" système, pas des joueurs réels
// PNJ du pont — positions en ZIGZAG (v3.5)
// Le pont fait colonnes 3-7 x lignes 2-10
// Chaque PNJ surveille toute sa ligne ET toute sa colonne (cf. mapEngine.ts)
// Le joueur doit zigzaguer pour les éviter, ou les affronter pour passer.
//
// IDs identiques à v3.4 pour préserver les bridgePnjDefeated existants en DB.
export const BRIDGE_PNJS: Array<{
    id: string
    name: string
    x: number
    y: number
    color: string
    challenge: BridgeChallenge
}> = [
    { id: "pnj_pompo",   name: "POMPO",   x: 3, y: 9, color: "#d84030", challenge: { kind: "exercise", exercise: "PUSHUP", reps: 100 } },
    { id: "pnj_squatto", name: "SQUATTO", x: 7, y: 7, color: "#4080d8", challenge: { kind: "exercise", exercise: "SQUAT",  reps: 100 } },
    { id: "pnj_gainax",  name: "GAINAX",  x: 3, y: 5, color: "#48a830", challenge: { kind: "exercise", exercise: "GAINAGE", reps: 100 } },
    { id: "pnj_champio", name: "CHAMPIO", x: 5, y: 3, color: "#a040d8", challenge: { kind: "topYesterday" } },
]

export type BridgeChallenge =
    | { kind: "exercise"; exercise: "PUSHUP" | "SQUAT" | "GAINAGE" | "PULLUP" | "CARDIO"; reps: number }
    | { kind: "topYesterday" }

// ============================================================
// MAPS EXPORTÉES
// ============================================================
export const MAPS: Record<string, MapData> = {
    bourgpates: {
        id: "bourgpates",
        name: "BOURG-BOULETTE",
        tiles: buildOutdoor(),
        width: OUTDOOR_W,
        height: OUTDOOR_H,
    },
    gym: {
        id: "gym",
        name: "SALLE DE MUSCU",
        tiles: buildGym(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "bourgpates", x: 3, y: 7 },
    },
    casino: {
        id: "casino",
        name: "CASINO",
        tiles: buildCasino(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "bourgpates", x: 11, y: 7 },
    },
    cave: {
        id: "cave",
        name: "GROTTE DU MONSTRE",
        tiles: buildCave(),
        width: 9,
        height: 8,
        exitTarget: { mapId: "bourgpates", x: 11, y: 14 },
    },
    route1: {
        id: "route1",
        name: "ROUTE 1 — PONT PÉPITE D'AZURIA",
        tiles: buildRoute1(),
        width: ROUTE1_W,
        height: ROUTE1_H,
        exitTarget: { mapId: "bourgpates", x: 7, y: 1 },  // retour Bourg-Boulette par les hautes herbes
    },
}

export function getMap(mapId: string): MapData {
    return MAPS[mapId] ?? MAPS.bourgpates
}

// Position de spawn initial pour les nouveaux joueurs
export const INITIAL_SPAWN = {
    mapId: "bourgpates",
    posX: 7,
    posY: 12,
    direction: "up" as const,
}

// Position où on téléporte le joueur quand il sort de Bourg-Boulette vers le nord
// (déclenché APRÈS l'intro Monstre, quand le joueur traverse les hautes herbes la 2e fois)
export const ROUTE1_SPAWN_FROM_SOUTH = {
    mapId: "route1",
    posX: 5,
    posY: ROUTE1_H - 2,
    direction: "up" as const,
}
