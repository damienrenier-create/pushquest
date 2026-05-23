// src/lib/gamebook/maps.ts
//
// Définition statique des cartes du jeu :
//   - bourgpates    : la carte principale (Bourg-Boulette), en extérieur
//   - gym           : intérieur de la salle de muscu de Bourg-Boulette
//   - casino        : intérieur du casino de Bourg-Boulette
//   - cave          : grotte du Monstre Spaghetti Volant
//   - route1        : route 1 (forêt avec arbre obstacle + pont)
//   - pepiteville   : v3.8 — ville post-pont, contient shop + gym2 + casino2
//   - gym_pepite    : v3.8 — salle de muscu de Pépiteville (DURUM dedans)
//   - casino_pepite : v3.8 — casino de Pépiteville
//   - shop_interior : v3.8 — boutique de Pépiteville (NUTRIPATES dedans)
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

    // v3.12 — Canal d'entrée vers Macaron'île (case waterShallow au sud, sur le chemin central).
    // Quand le joueur (équipé du swim_set + firstSwimDone) marche dessus → transition vers
    // le canal de macaron_ile (10 cases de waterShallow à traverser).
    // Sans swim_set : bloquant. Avec swim_set mais sans firstSwimDone : "trop froide".
    m[OUTDOOR_H - 1][7] = "waterShallow"
    m[OUTDOOR_H - 1][8] = "waterShallow"

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
    { x: 2, y: 4, w: 4, h: 3, kind: "gym", doorX: 1, doorY: 2, visible: true, targetMapId: "gym" },
    { x: 10, y: 4, w: 4, h: 3, kind: "casino", doorX: 1, doorY: 2, visible: true, targetMapId: "casino" },
    { x: 10, y: 11, w: 3, h: 3, kind: "monsterCave", doorX: 1, doorY: 2, visible: false, targetMapId: "cave" },
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
    // v3.8.6 : tronc élargi à 3 cases (x=4, 5, 6) pour permettre à plusieurs
    //          joueurs de passer côte à côte sans se bloquer mutuellement.
    for (let x = 0; x < ROUTE1_W; x++) {
        if (x === 4 || x === 5 || x === 6) {
            m[11][x] = "treeObstacle"
        } else {
            m[11][x] = "tree"
        }
    }
    // Ligne y=12 : double mur, ouverture de 3 cases en face des 3 arbres
    for (let x = 0; x < ROUTE1_W; x++) {
        if (x < 4 || x > 6) {
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

    // Espace en haut (après le pont — c'est ici qu'on transitionne vers Pépiteville en v3.8)
    m[1][5] = "path"

    return m
}

// ============================================================
// v3.8 — PÉPITEVILLE (carte post-pont, accessible après CHAMPIO)
// 17 × 20
// ============================================================
const PEPITEVILLE_W = 17
const PEPITEVILLE_H = 20

function buildPepiteville(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < PEPITEVILLE_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < PEPITEVILLE_W; x++) {
            if (x === 0 || x === PEPITEVILLE_W - 1 || y === 0 || y === PEPITEVILLE_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }

    // Chemin vertical central (colonnes 7-8, du nord au sud)
    for (let y = 1; y < PEPITEVILLE_H - 1; y++) {
        m[y][7] = "path"
        m[y][8] = "path"
    }

    // Parterres de fleurs côté gauche (devant les bâtiments)
    m[2][2] = "flowerR"; m[2][3] = "flowerY"; m[2][4] = "flowerR"
    m[3][2] = "flowerY"; m[3][3] = "flowerR"; m[3][4] = "flowerY"

    // Parterres de fleurs côté droit
    m[2][11] = "flowerR"; m[2][12] = "flowerY"; m[2][13] = "flowerR"
    m[3][11] = "flowerY"; m[3][12] = "flowerR"; m[3][13] = "flowerY"

    // Petite mare mignonne (à gauche du chemin, entre le gym et le casino)
    m[9][3] = "water"; m[9][4] = "water"; m[9][5] = "water"
    m[10][3] = "water"; m[10][4] = "water"; m[10][5] = "water"

    // Petite mare aussi à droite, plus petite
    m[9][11] = "water"; m[9][12] = "water"
    m[10][11] = "water"; m[10][12] = "water"

    // v3.8.1 — 2 arbres fruitiers (cueillette de fruits, +80 reps, 3 fois/jour/arbre)
    m[11][5] = "appleTree"   // apple_tree_1 (gauche du chemin central)
    m[11][10] = "appleTree"  // apple_tree_2 (droite du chemin central)

    // Sortie sud (doorMat → route1 nord post-pont)
    m[PEPITEVILLE_H - 2][8] = "doorMat"

    // v3.8.7 — Sortie nord vers Hautes-Pâtes : hautes herbes au lieu de path simple.
    // Bande de 3 cases grassTall au nord du chemin central (x=7, 8, 9). Le joueur
    // marche dessus → transition automatique vers Hautes-Pâtes (cf. MapClient).
    m[1][7] = "grassTall"
    m[1][8] = "grassTall"
    m[1][9] = "grassTall"

    return m
}

// v3.8.1 — Coordonnées des arbres fruitiers (utilisées par MapClient pour identifier
// quel arbre est devant le joueur quand il appuie sur A).
export const PEPITEVILLE_APPLE_TREES: Array<{ id: string; x: number; y: number }> = [
    { id: "apple_tree_1", x: 5, y: 11 },
    { id: "apple_tree_2", x: 10, y: 11 },
]

export const PEPITEVILLE_BUILDINGS: Building[] = [
    // Gym Pépiteville : 4×3 en (1, 5)–(4, 7), porte en (2, 7)
    { x: 1, y: 5, w: 4, h: 3, kind: "gym", doorX: 1, doorY: 2, visible: true, targetMapId: "gym_pepite" },
    // Shop : 5×3 en (10, 5)–(14, 7), porte en (11, 7)
    { x: 10, y: 5, w: 5, h: 3, kind: "shop", doorX: 1, doorY: 2, visible: true, targetMapId: "shop_interior" },
    // Casino Pépiteville : 4×3 en (1, 13)–(4, 15), porte en (2, 15)
    { x: 1, y: 13, w: 4, h: 3, kind: "casino", doorX: 1, doorY: 2, visible: true, targetMapId: "casino_pepite" },
]

export const PEPITEVILLE_SIGNS: Sign[] = [
    { x: 4, y: 7, text: "GYMNASE DE PÉPITEVILLE\nUn certain DURUM y traîne." },
    { x: 10, y: 7, text: "BOUTIQUE\nSpécialités locales. Sac obligatoire." },
    { x: 4, y: 15, text: "CASINO DE PÉPITEVILLE\nMêmes règles, autre adresse." },
    // v3.8.2 — Le sign route2 placeholder est remplacé : la zone est désormais explorée
    { x: 8, y: 1, text: "↑ HAUTES-PÂTES\nUn petit hameau coiffé d'une tour étrange." },
    { x: 9, y: 9, text: "Bassin aux Lasagnes." },
    // v3.8.1 — panneau près des arbres
    { x: 4, y: 12, text: "ARBRES À PÂTES-FRUITS\nMax 3 fruits par arbre par jour." },
]

// ============================================================
// v3.8 — GYM PÉPITEVILLE (copie de la salle de muscu, DURUM dedans)
// ============================================================
function buildGymPepite(): TileType[][] {
    // Identique à buildGym pour la cohérence visuelle
    return buildGym()
}

// ============================================================
// v3.8 — CASINO PÉPITEVILLE (copie du casino)
// ============================================================
function buildCasinoPepite(): TileType[][] {
    return buildCasino()
}

// ============================================================
// v3.8 — SHOP INTERIOR (boutique de Pépiteville, NUTRIPATES dedans)
// 9 × 8 (v3.8.7 — élargi pour matcher le pattern de spawn (4, 6) de tryComputeMove
//        qui sinon atterrissait sur le mur sud)
// ============================================================
// ============================================================
// v3.12 — MACARON'ÎLE (île au sud de Bourg-Boulette, via le canal)
// 14 × 18 cases :
//   - y=0      : bordure tree
//   - y=1..10  : canal waterShallow (au centre, col 6-7) entouré d'eau bloquante
//   - y=11..12 : plage de sable (sand)
//   - y=13..16 : ville Macaron'île (PNJ tristes, bâtiments visuels en placeholder pour v3.13+)
//   - y=17     : bordure tree
// ============================================================
const MACARONILE_W = 14
const MACARONILE_H = 18

function buildMacaronIle(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < MACARONILE_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < MACARONILE_W; x++) {
            // Bordures tree (nord, sud, ouest, est)
            if (x === 0 || x === MACARONILE_W - 1 || y === 0 || y === MACARONILE_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }

    // Canal vertical waterShallow au centre (col 6-7) sur y=1..10 (10 cases de hauteur).
    // Les colonnes 1-5 et 8-12 sur ces mêmes lignes sont de l'eau "profonde" bloquante.
    for (let y = 1; y <= 10; y++) {
        for (let x = 1; x <= MACARONILE_W - 2; x++) {
            if (x === 6 || x === 7) {
                m[y][x] = "waterShallow"
            } else {
                m[y][x] = "water"
            }
        }
    }

    // Plage (sand) sur y=11, y=12 — zone d'arrivée du canal
    for (let x = 1; x <= MACARONILE_W - 2; x++) {
        m[11][x] = "sand"
        m[12][x] = "sand"
    }

    // Quelques fleurs et flore décorative sur la ville
    m[14][3] = "flowerR"
    m[14][4] = "flowerY"
    m[14][10] = "flowerY"
    m[14][11] = "flowerR"

    // Chemin central horizontal pour traverser la ville (y=14)
    for (let x = 1; x <= MACARONILE_W - 2; x++) {
        if (x >= 5 && x <= 8) m[14][x] = "path"
    }

    return m
}

function buildShopInterior(): TileType[][] {
    const W = 9, H = 8
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0) row.push("wallH")
            else if (x === 0 || x === W - 1 || y === H - 1) row.push("wallV")
            else row.push("floorChecker")
        }
        m.push(row)
    }
    // Étagères du haut (ligne y=1, tous les x intérieurs)
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    // Comptoir (ligne y=3, tous les x intérieurs)
    for (let x = 1; x < W - 1; x++) m[3][x] = "shopCounter"
    // Sol damier ailleurs : déjà floorChecker partout par défaut

    // v3.8.7 — Sortie sud (doorMat) en (4, 7) → pepiteville devant la porte shop.
    // (Avant : H=7 et doorMat en y=5, mais le spawn générique tryComputeMove pose
    // le joueur en (4, 6) qui était le mur sud → bloqué. Avec H=8, (4, 6) = floor.)
    m[H - 1][4] = "doorMat"

    return m
}

// ============================================================
// v3.8.2 — HAUTES-PÂTES (ville d'à côté, accessible depuis Pépiteville nord)
// 11 × 13
// ============================================================
const HAUTESPATES_W = 11
const HAUTESPATES_H = 13

function buildHautesPates(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < HAUTESPATES_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < HAUTESPATES_W; x++) {
            if (x === 0 || x === HAUTESPATES_W - 1 || y === 0 || y === HAUTESPATES_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }

    // Chemin vertical central (colonne 5, du nord au sud)
    for (let y = 1; y < HAUTESPATES_H - 1; y++) m[y][5] = "path"

    // Petits parterres autour
    m[9][2] = "flowerR"; m[9][3] = "flowerY"
    m[9][7] = "flowerY"; m[9][8] = "flowerR"

    // v3.8.7 — Sortie sud vers Pépiteville : hautes herbes (transition automatique).
    // Bande de 3 cases grassTall au sud (cohérent avec l'entrée nord de Pépiteville).
    m[HAUTESPATES_H - 2][4] = "grassTall"
    m[HAUTESPATES_H - 2][5] = "grassTall"
    m[HAUTESPATES_H - 2][6] = "grassTall"

    return m
}

export const HAUTESPATES_BUILDINGS: Building[] = [
    // Tour : 3×4, porte en bas-centre (1, 3). Position (4, 2)..(6, 5).
    { x: 4, y: 2, w: 3, h: 4, kind: "tower", doorX: 1, doorY: 3, visible: true, targetMapId: "tower_floor_1" },
]

export const HAUTESPATES_SIGNS: Sign[] = [
    { x: 4, y: 7, text: "TOUR DES PÂTES AIGUËS\nCelle dont parle FUSILLI...\nQuelque chose duveteux y vit, paraît-il." },
    { x: 5, y: 10, text: "HAUTES-PÂTES\nUn hameau perdu au nord. Le silence règne, sauf au sommet." },
]

// ============================================================
// v3.8.2 — TOUR : 5 ÉTAGES (tailles décroissantes)
// Chaque étage : murs en pierre, sol pierre, escaliers up/down.
// Floor 1 a une sortie doorMat vers Hautes-Pâtes. Floor 5 a PIAFFINI.
// ============================================================

function buildTowerFloor(size: number, hasDownStairs: boolean, hasUpStairs: boolean, hasExit: boolean): TileType[][] {
    const W = size, H = size
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
                row.push("towerWall")
            } else {
                row.push("towerFloor")
            }
        }
        m.push(row)
    }
    // Quelques fenêtres décoratives (parois nord)
    if (W >= 7) {
        m[0][Math.floor(W / 4)] = "towerWindow"
        m[0][Math.floor((3 * W) / 4)] = "towerWindow"
    }

    // Escalier montant : centré en haut (juste sous la paroi nord)
    if (hasUpStairs) {
        m[1][Math.floor(W / 2)] = "stairsUp"
    }
    // Escalier descendant : centré en bas (juste au-dessus de la paroi sud)
    if (hasDownStairs) {
        m[H - 2][Math.floor(W / 2)] = "stairsDown"
    }
    // doorMat sortie vers Hautes-Pâtes (uniquement floor 1)
    if (hasExit) {
        m[H - 1][Math.floor(W / 2)] = "doorMat"
    }

    return m
}

function buildTowerFloor1(): TileType[][] {
    // 11x11 — rez-de-chaussée : sortie doorMat + stairsUp, pas de stairsDown
    return buildTowerFloor(11, false, true, true)
}
function buildTowerFloor2(): TileType[][] {
    // 10x10 — stairsDown + stairsUp
    return buildTowerFloor(10, true, true, false)
}
function buildTowerFloor3(): TileType[][] {
    return buildTowerFloor(9, true, true, false)
}
function buildTowerFloor4(): TileType[][] {
    return buildTowerFloor(8, true, true, false)
}
function buildTowerFloor5(): TileType[][] {
    // 7x7 — sommet : stairsDown uniquement (l'oiseau PIAFFINI est ailleurs en NPC)
    return buildTowerFloor(7, true, false, false)
}

// PNJ du pont — postés sur les bords du pont (v3.8.6).
//
// Le pont fait colonnes 3-7 (5 cases) × lignes 2-10. Chaque PNJ est posté sur
// l'une des deux colonnes-bord (x=3 ou x=7), juste à côté du cours d'eau, et
// regarde HORIZONTALEMENT vers l'intérieur du pont. Il surveille toute sa ligne.
//
// Comme les PNJ sont aux extrémités, il est impossible de passer "derrière" :
// la seule façon de franchir leur ligne est de les affronter (ou de reculer).
//
// IDs identiques à v3.4 pour préserver les bridgePnjDefeated existants en DB.
export const BRIDGE_PNJS: Array<{
    id: string
    name: string
    x: number
    y: number
    color: string
    /** Direction horizontale du regard (visuel + cohérence narrative). */
    facing: "left" | "right"
    challenge: BridgeChallenge
}> = [
    { id: "pnj_pompo",   name: "POMPO",   x: 3, y: 9, color: "#d84030", facing: "right", challenge: { kind: "exercise", exercise: "PUSHUP", reps: 100 } },
    { id: "pnj_squatto", name: "SQUATTO", x: 7, y: 7, color: "#4080d8", facing: "left",  challenge: { kind: "exercise", exercise: "SQUAT",  reps: 100 } },
    { id: "pnj_gainax",  name: "GAINAX",  x: 3, y: 5, color: "#48a830", facing: "right", challenge: { kind: "exercise", exercise: "GAINAGE", reps: 100 } },
    { id: "pnj_champio", name: "CHAMPIO", x: 7, y: 3, color: "#a040d8", facing: "left",  challenge: { kind: "topYesterday" } },
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
        // v3.8.4 — fix : avant on arrivait en (7, 1) qui est `grassTall`, ce qui
        // re-déclenchait immédiatement la transition vers route1 (boucle infinie).
        // On atterrit maintenant en (7, 3) = `path`, juste sous les hautes herbes.
        exitTarget: { mapId: "bourgpates", x: 7, y: 3 },
    },
    // === v3.8 — Pépiteville et ses bâtiments ===
    pepiteville: {
        id: "pepiteville",
        name: "PÉPITEVILLE",
        tiles: buildPepiteville(),
        width: PEPITEVILLE_W,
        height: PEPITEVILLE_H,
        // Sortie sud par le doorMat → route1 nord (post-pont)
        exitTarget: { mapId: "route1", x: 5, y: 1 },
    },
    gym_pepite: {
        id: "gym_pepite",
        name: "GYMNASE DE PÉPITEVILLE",
        tiles: buildGymPepite(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "pepiteville", x: 2, y: 8 },  // devant la porte du gym de Pépiteville
    },
    casino_pepite: {
        id: "casino_pepite",
        name: "CASINO DE PÉPITEVILLE",
        tiles: buildCasinoPepite(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "pepiteville", x: 2, y: 16 },  // devant la porte du casino de Pépiteville
    },
    shop_interior: {
        id: "shop_interior",
        name: "BOUTIQUE",
        tiles: buildShopInterior(),
        width: 9,
        height: 8,
        exitTarget: { mapId: "pepiteville", x: 11, y: 8 },  // devant la porte du shop
    },
    // v3.12 — Macaron'île : canal au nord + plage + ville (extension prévue v3.13+)
    macaron_ile: {
        id: "macaron_ile",
        name: "MACARON'ÎLE",
        tiles: buildMacaronIle(),
        width: MACARONILE_W,
        height: MACARONILE_H,
        // exitTarget non utilisé : on a une transition via grassTall/canal en MapClient
    },
    // === v3.8.2 — Hautes-Pâtes et sa Tour ===
    hautespates: {
        id: "hautespates",
        name: "HAUTES-PÂTES",
        tiles: buildHautesPates(),
        width: HAUTESPATES_W,
        height: HAUTESPATES_H,
        exitTarget: { mapId: "pepiteville", x: 8, y: 1 },  // retour Pépiteville sortie nord
    },
    tower_floor_1: {
        id: "tower_floor_1",
        name: "TOUR — REZ-DE-CHAUSSÉE",
        tiles: buildTowerFloor1(),
        width: 11,
        height: 11,
        exitTarget: { mapId: "hautespates", x: 5, y: 6 },  // devant la porte de la tour
    },
    tower_floor_2: {
        id: "tower_floor_2",
        name: "TOUR — ÉTAGE 2",
        tiles: buildTowerFloor2(),
        width: 10,
        height: 10,
    },
    tower_floor_3: {
        id: "tower_floor_3",
        name: "TOUR — ÉTAGE 3",
        tiles: buildTowerFloor3(),
        width: 9,
        height: 9,
    },
    tower_floor_4: {
        id: "tower_floor_4",
        name: "TOUR — ÉTAGE 4",
        tiles: buildTowerFloor4(),
        width: 8,
        height: 8,
    },
    tower_floor_5: {
        id: "tower_floor_5",
        name: "TOUR — SOMMET",
        tiles: buildTowerFloor5(),
        width: 7,
        height: 7,
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

// v3.8 — Quand le joueur passe le pont (CHAMPIO vaincu) et marche en haut de route1,
// on le téléporte au sud de Pépiteville.
export const PEPITEVILLE_SPAWN_FROM_SOUTH = {
    mapId: "pepiteville",
    posX: 8,
    posY: PEPITEVILLE_H - 3,  // case juste au-dessus du doorMat sud
    direction: "up" as const,
}

// v3.8 — Coordonnées de la "case de transition" sud → Pépiteville en haut de route1.
// Sert dans MapClient pour intercepter le mouvement et faire le gating CHAMPIO.
export const ROUTE1_NORTH_GATE = { x: 5, y: 1 }

// v3.8.7 — La transition Pépiteville ↔ Hautes-Pâtes passe par des hautes herbes (grassTall),
// pas par une gate fixée à une case précise. PEPITEVILLE_NORTH_GATE est conservé en
// référence historique mais MapClient utilise désormais la détection grassTall.
export const PEPITEVILLE_NORTH_GATE = { x: 8, y: 1 }

// Spawn quand on arrive à Hautes-Pâtes depuis Pépiteville (sortie sud de Hautes-Pâtes)
// Le joueur arrive UN cran AU-DESSUS de la bande grassTall sud pour ne pas re-trigger
// la transition vers Pépiteville immédiatement (sinon boucle infinie).
export const HAUTESPATES_SPAWN_FROM_SOUTH = {
    mapId: "hautespates",
    posX: 5,
    posY: HAUTESPATES_H - 3,
    direction: "up" as const,
}

// Spawn quand on revient à Pépiteville depuis Hautes-Pâtes (au sud de la bande grassTall nord).
export const PEPITEVILLE_SPAWN_FROM_NORTH = {
    mapId: "pepiteville",
    posX: 8,
    posY: 2,  // case juste sous la bande grassTall en y=1
    direction: "down" as const,
}

// v3.8.2 — Seuils de squats du jour requis pour franchir chaque escalier de la Tour.
// Index = étage de départ (1 → 2 = 50 squats, 2 → 3 = 75, etc.)
export const TOWER_STAIRS_SQUATS_THRESHOLD: Record<number, number> = {
    1: 50,
    2: 75,
    3: 100,
    4: 150,
}

// v3.12 — Spawn quand on arrive à Macaron'île depuis Bourg-Boulette (poussé dans le canal nord)
export const MACARONILE_CANAL_ENTRY_FROM_NORTH = {
    mapId: "macaron_ile",
    posX: 7,
    posY: 1,  // 1ère case du canal côté nord
    direction: "down" as const,
}

// v3.12 — Quand on quitte Macaron'île par le nord (depuis la 1ère case du canal), retour à Bourg-Boulette
export const BOURGPATES_SPAWN_FROM_MACARONILE = {
    mapId: "bourgpates",
    posX: 7,
    posY: OUTDOOR_H - 2,  // case grass juste au-dessus du canal sud de Bourg-Boulette
    direction: "up" as const,
}

// v3.12 — Quand on entre dans Macaron'île depuis Bourg-Boulette par mouvement (et pas push)
// le joueur arrive sur la 1ère case du canal et nage les 9 suivantes pour atteindre la ville.
// Les coordonnées du canal sud (entrée vers la plage) sont (7, 10), (6, 10).
export const MACARONILE_NORTH_GATE = { x: 7, y: 0 }  // case juste au-dessus du canal nord (déclenche retour)
