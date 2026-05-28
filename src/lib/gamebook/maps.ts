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

    // v3.12 / v3.23k — Canal d'entrée vers Macaron'île (waterShallow au sud).
    // 4 cases de large (x=6..9) pour qu'on puisse y entrer en biais, depuis la berge.
    // Sans swim_set : bloquant. Avec swim_set mais sans firstSwimDone : "trop froide".
    m[OUTDOOR_H - 1][6] = "waterShallow"
    m[OUTDOOR_H - 1][7] = "waterShallow"
    m[OUTDOOR_H - 1][8] = "waterShallow"
    m[OUTDOOR_H - 1][9] = "waterShallow"
    // v3.23r — Row buffer d'eau juste au-dessus de la transition (y=14). Permet au joueur
    // d'apparaître DANS l'eau sur bourgpates après un push (au lieu de directement la_mer).
    // Il nage ensuite vers le sud (y=15) pour déclencher la transition.
    m[OUTDOOR_H - 2][7] = "waterShallow"
    m[OUTDOOR_H - 2][8] = "waterShallow"

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

    // v3.23d — 2 cerisiers communs (40 reps × 5/jour)
    // v3.23l — cherry_tree_2 déplacé à (13, 3) tout en haut à droite (MAMAN était au même endroit)
    m[14][3] = "cherryTree"   // cherry_tree_1 (sud-ouest, près de MORUE)
    m[3][13] = "cherryTree"   // cherry_tree_2 (haut-droite, sous l'orée nord)

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

    // v3.22 — Arbres décoratifs additionnels pour casser la monotonie
    m[5][2] = "tree"
    m[8][14] = "tree"
    m[14][2] = "tree"
    m[16][14] = "tree"
    m[6][3] = "flowerR"
    m[16][3] = "flowerY"

    // Petite mare mignonne (à gauche du chemin, entre le gym et le casino)
    m[9][3] = "water"; m[9][4] = "water"; m[9][5] = "water"
    m[10][3] = "water"; m[10][4] = "water"; m[10][5] = "water"

    // Petite mare aussi à droite, plus petite
    m[9][11] = "water"; m[9][12] = "water"
    m[10][11] = "water"; m[10][12] = "water"

    // v3.8.1 — 2 arbres fruitiers (cueillette de fruits, +80 reps, 3 fois/jour/arbre)
    m[11][5] = "appleTree"   // apple_tree_1 (gauche du chemin central)
    m[11][10] = "appleTree"  // apple_tree_2 (droite du chemin central)

    // v3.23d — 1 cerisier commun + 1 Maléfica (piège -30 reps, look violet)
    m[17][3] = "cherryTree"   // cherry_tree_3
    m[15][12] = "poisonTree"  // poison_tree_1 : visible, joueur attentif évite

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

// ============================================================
// v3.23d — 5 types d'arbres fruitiers (catalogue centralisé)
// ============================================================
// Chaque type a son tile, son bonus, son max/jour, son emoji et son rendu visuel.
// La source de vérité unique pour : take-fruit/route.ts (validation + reward),
// MapClient (détection interaction + rendu vide), TileCell (sprite).
//
// Bonus croissant, max décroissant : plus l'arbre est rare, plus il donne.
// ============================================================
export type TreeKind = "apple" | "cherry" | "pear" | "peach" | "coconut" | "poison" | "olive" | "boost" | "divisor"

export interface TreeKindConfig {
    kind: TreeKind
    emoji: string
    label: string
    /** Tile placé sur la map (fruits présents). */
    tile: TileType
    /** Tile alternative côté client si déjà cueilli aujourd'hui. */
    emptyTile: TileType
    /** Bonus reps gagnés par fruit cueilli (avant ratio onboarding). */
    bonusReps: number
    /** Nombre max de fruits cueillables par jour sur cet arbre. */
    maxPerDay: number
}

export const TREE_KIND_CONFIGS: Record<TreeKind, TreeKindConfig> = {
    apple:    { kind: "apple",    emoji: "🍎", label: "Pommier",     tile: "appleTree",    emptyTile: "appleTreeEmpty",    bonusReps: 80,  maxPerDay: 3 },
    cherry:   { kind: "cherry",   emoji: "🍒", label: "Cerisier",    tile: "cherryTree",   emptyTile: "cherryTreeEmpty",   bonusReps: 40,  maxPerDay: 5 },
    pear:     { kind: "pear",     emoji: "🍐", label: "Poirier",     tile: "pearTree",     emptyTile: "pearTreeEmpty",     bonusReps: 60,  maxPerDay: 4 },
    peach:    { kind: "peach",    emoji: "🍑", label: "Pêcher",      tile: "peachTree",    emptyTile: "peachTreeEmpty",    bonusReps: 100, maxPerDay: 2 },
    coconut:  { kind: "coconut",  emoji: "🥥", label: "Cocotier",    tile: "coconutTree",  emptyTile: "coconutTreeEmpty",  bonusReps: 150, maxPerDay: 1 },
    // 💀 Piège : bonus négatif. Le joueur naïf perd 30 reps par fruit, max 3 fois/jour (= -90 reps max).
    // Visuellement très différent (violet/noir) pour donner une chance aux joueurs attentifs de l'éviter.
    poison:   { kind: "poison",   emoji: "🟣", label: "Maléfica",    tile: "poisonTree",   emptyTile: "poisonTreeEmpty",   bonusReps: -30, maxPerDay: 3 },
    // 🫒 Olivier de Lasagnas Vegas : généreux mais petites portions. 7×20 reps = 140/jour si on récolte tout.
    olive:    { kind: "olive",    emoji: "🫒", label: "Olivier",     tile: "oliveTree",    emptyTile: "oliveTreeEmpty",    bonusReps: 20,  maxPerDay: 7 },
    // ✨ Arbre Boost : DOUBLE l'énergie actuelle. 1×/jour. bonusReps signal (0 = effet spécial géré côté serveur).
    boost:    { kind: "boost",    emoji: "✨", label: "Arbre Boost", tile: "boostTree",    emptyTile: "boostTreeEmpty",    bonusReps: 0,   maxPerDay: 1 },
    // ⚠️ Arbre Divisor : DIVISE l'énergie par 2. 1×/jour. Look trompeur (proche du boost) — joueur doit reconnaître.
    divisor:  { kind: "divisor",  emoji: "⚠️", label: "Arbre Divisor", tile: "divisorTree", emptyTile: "divisorTreeEmpty",  bonusReps: 0,   maxPerDay: 1 },
}

/** Lookup d'un config arbre par son tile (utile pour TileCell). */
export function getTreeConfigByTile(tile: TileType): TreeKindConfig | null {
    for (const c of Object.values(TREE_KIND_CONFIGS)) {
        if (c.tile === tile || c.emptyTile === tile) return c
    }
    return null
}

/** Liste GLOBALE de tous les arbres du Nexus (toutes maps confondues). */
export interface TreeInstance {
    id: string
    mapId: string
    x: number
    y: number
    kind: TreeKind
}

export const ALL_TREES: TreeInstance[] = [
    // === Pommiers (existants) ===
    { id: "apple_tree_1", mapId: "pepiteville", x: 5,  y: 11, kind: "apple" },
    { id: "apple_tree_2", mapId: "pepiteville", x: 10, y: 11, kind: "apple" },
    { id: "apple_tree_3", mapId: "hautespates", x: 1,  y: 7,  kind: "apple" },
    // === Cerisiers (commun, 40 reps × 5/j) ===
    { id: "cherry_tree_1", mapId: "bourgpates",  x: 3,  y: 14, kind: "cherry" },
    { id: "cherry_tree_2", mapId: "bourgpates",  x: 13, y: 3,  kind: "cherry" },
    { id: "cherry_tree_3", mapId: "pepiteville", x: 3,  y: 17, kind: "cherry" },
    // === Poiriers (commun, 60 reps × 4/j) ===
    { id: "pear_tree_1", mapId: "macaron_ile", x: 10, y: 14, kind: "pear" },
    { id: "pear_tree_2", mapId: "muscuville",  x: 5, y: 16, kind: "pear" },
    // === Pêcher (rare, 100 reps × 2/j — caché dans grass_sud) ===
    // v4.0 — peach_tree_1 placé à (7, 3) — toujours valide après compactage H=14→8
    { id: "peach_tree_1", mapId: "grass_sud", x: 7, y: 3, kind: "peach" },
    // === Cocotier (ultra-rare, 150 reps × 1/j — sommet du Mont) ===
    { id: "coconut_tree_1", mapId: "mont_pasta_ventoux", x: 5, y: 1, kind: "coconut" },
    // === 💀 Maléfica (piège, -30 reps × 3/j) — placé bien visible à Pépiteville
    //         pour piéger les naïfs (l'apparence violette doit suffire à dissuader les attentifs).
    { id: "poison_tree_1", mapId: "pepiteville", x: 12, y: 15, kind: "poison" },
    // === 🫒 Olivier (Lasagnas Vegas) : 7 olives/jour à +20 reps chacune ===
    { id: "olive_tree_1", mapId: "lasagnas_vegas", x: 10, y: 21, kind: "olive" },
    // === 🍒 Cerisier Vegas (haut-droite près Père Pesto) ===
    { id: "vegas_cherry_1", mapId: "lasagnas_vegas", x: 15, y: 2, kind: "cherry" },
    // === 🍐 Poirier Vegas (sud-ouest près du bar TB) ===
    { id: "vegas_pear_1", mapId: "lasagnas_vegas", x: 3, y: 21, kind: "pear" },
    // === 🍑 Pêcher Vegas (sud-est près du casino VIP) ===
    { id: "vegas_peach_1", mapId: "lasagnas_vegas", x: 20, y: 21, kind: "peach" },
    // === v3.24e — Arbres du parc grass_sud (entre Macaron'île et Muscuville) ===
    // v4.0 — grass_sud compactée à H=8 : arbres regroupés sur y=2..5
    { id: "park_cherry_1",  mapId: "grass_sud", x: 2, y: 2, kind: "cherry" },
    { id: "park_pear_1",    mapId: "grass_sud", x: 6, y: 2, kind: "pear" },
    { id: "park_peach_1",   mapId: "grass_sud", x: 2, y: 3, kind: "peach" },
    { id: "park_poison_1",  mapId: "grass_sud", x: 6, y: 3, kind: "poison" },
    { id: "park_poison_2",  mapId: "grass_sud", x: 2, y: 4, kind: "poison" },
    { id: "park_boost_1",   mapId: "grass_sud", x: 6, y: 4, kind: "boost" },
    { id: "park_divisor_1", mapId: "grass_sud", x: 2, y: 5, kind: "divisor" },
    { id: "park_apple_1",   mapId: "grass_sud", x: 6, y: 5, kind: "apple" },
]

/** Helper : tous les arbres d'une map donnée. */
export function getTreesForMap(mapId: string): TreeInstance[] {
    return ALL_TREES.filter((t) => t.mapId === mapId)
}

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
// v3.22 — Bâtiments 5x5 (au lieu de 4x4) pour labels vraiment lisibles
// 14 × 17 cases :
//   - y=0      : bordure tree + waterShallow (7,0) trigger retour la_mer
//   - y=1      : canal waterShallow 1 ligne (cols 6,7 — swim entry)
//   - y=2..3   : plage de sable (sand)
//   - y=4..8   : ville rangée 1 (shop 5x5 + vétérinaire 5x5)
//   - y=9      : chemin horizontal d'accès aux portes rangée 1
//   - y=10..14 : ville rangée 2 (bibliothèque 5x5)
//   - y=15     : chemin horizontal sud + grassTall cols 6,7 = trigger grass_sud
//   - y=16     : bordure tree
// ============================================================
const MACARONILE_W = 14
const MACARONILE_H = 17

function buildMacaronIle(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < MACARONILE_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < MACARONILE_W; x++) {
            if (x === 0 || x === MACARONILE_W - 1 || y === 0 || y === MACARONILE_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }

    // Sortie nord du canal vers la_mer : (7, 0) waterShallow
    m[0][7] = "waterShallow"

    // Canal 1 ligne (y=1) : water bloquant partout SAUF cols 6,7 = waterShallow (swim)
    // v3.23n — Tout le canal nord est nageable : pas de raison de mettre des blocs.
    // Le joueur arrive de la_mer et peut nager dans toute la largeur pour rejoindre la plage.
    for (let x = 1; x <= MACARONILE_W - 2; x++) {
        m[1][x] = "waterShallow"
    }

    // Plage sand y=2,3
    for (let x = 1; x <= MACARONILE_W - 2; x++) {
        m[2][x] = "sand"
        m[3][x] = "sand"
    }

    // Chemin vertical central cols 6,7 de y=2 à y=15
    for (let y = 2; y <= MACARONILE_H - 2; y++) {
        m[y][6] = "path"
        m[y][7] = "path"
    }

    // Chemin horizontal d'accès rangée 1 (y=9)
    for (let x = 1; x <= MACARONILE_W - 2; x++) m[9][x] = "path"

    // Chemin horizontal sud (y=15)
    for (let x = 1; x <= MACARONILE_W - 2; x++) m[15][x] = "path"

    // Fleurs déco + quelques arbres pour casser la monotonie
    m[8][6] = "flowerR"  // entre les buildings
    m[8][7] = "flowerY"
    m[14][8] = "flowerY"
    m[14][9] = "flowerR"
    // Arbres décoratifs (cols 8-12 sud, hors bbox biblio)
    m[10][8] = "tree"
    m[12][12] = "tree"
    m[13][9] = "tree"

    // v3.23d — 1 poirier (60 reps × 4/jour)
    // v3.23h — Déplacé de (2, 14) qui était INSIDE le footprint de BIBLIO vers (10, 14)
    // (accessible depuis le chemin central, à l'est de BIBLIO, sous l'orée VÉTO).
    m[14][10] = "pearTree"  // pear_tree_1

    // v3.23n — Sortie sud vers grass_sud élargie à 4 cases (cols 5..8) pour ne pas bloquer
    m[MACARONILE_H - 1][5] = "grassTall"
    m[MACARONILE_H - 1][6] = "grassTall"
    m[MACARONILE_H - 1][7] = "grassTall"
    m[MACARONILE_H - 1][8] = "grassTall"

    return m
}

// ============================================================
// v3.23b — MONT PASTA-VENTOUX (montagne verticale au sud de Muscuville)
// 7×104 cases : corridor vertical de 100 cases d'ascension + buffers.
//   - y=0     : tree (sommet, avec marker spécial)
//   - y=1     : sommet flowery + cinematic trigger
//   - y=2..101: 100 cases de path vertical (ascension)
//   - y=102   : entrée sud (grassTall trigger depuis Muscuville)
//   - y=103   : tree (limite sud)
// ============================================================
const MONT_W = 7
const MONT_H = 104
export const MONT_SUMMIT_Y = 1

function buildMontPastaVentoux(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < MONT_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < MONT_W; x++) {
            if (x === 0 || x === MONT_W - 1 || y === 0 || y === MONT_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }
    // Sommet : fleurs + statues (col 3 center)
    m[1][3] = "flowerR"
    m[1][2] = "flowerY"
    m[1][4] = "flowerY"
    // Chemin vertical central (col 3) sur toute la hauteur
    for (let y = 2; y <= MONT_H - 3; y++) m[y][3] = "path"
    // Entrée sud : grassTall (col 3, y=H-2=102) = trigger depuis Muscuville
    m[MONT_H - 2][3] = "grassTall"
    // Décor latéral : arbres + fleurs tous les 10 cases pour donner du visuel
    for (let y = 10; y < MONT_H - 5; y += 10) {
        m[y][1] = "tree"
        m[y][MONT_W - 2] = "tree"
        if (y + 5 < MONT_H - 5) {
            m[y + 5][1] = "flowerR"
            m[y + 5][MONT_W - 2] = "flowerY"
        }
    }
    // v3.23d — Cocotier au sommet (ultra-rare, 150 reps × 1/j)
    // Remplace la flowerY centrale (m[1][3] reste flowerR pour décor du sommet)
    m[1][5] = "coconutTree"
    return m
}

// v3.23b — Spawn dans le Mont depuis Muscuville (entrée sud du Mont = y=H-2)
export const MONT_SPAWN_FROM_MUSCUVILLE = {
    mapId: "mont_pasta_ventoux",
    posX: 3,
    posY: MONT_H - 3,  // juste au-dessus de la grassTall d'entrée
    direction: "up" as const,
}
// Retour vers Muscuville depuis le Mont (sortie sud du Mont = grassTall y=H-2)
export const MUSCUVILLE_SPAWN_FROM_MONT = {
    mapId: "muscuville",
    posX: 8,
    posY: 14,  // juste au-dessus de la grassTall sud Muscuville
    direction: "up" as const,
}

// ============================================================
// v3.24a — LASAGNAS VEGAS (ville opulente à l'ouest de Muscuville)
// 24 × 24 cases. Casinos, mafia Team Boulette, hôtel, 3 shops, route avec voitures.
// Connexion : sortie OUEST de Muscuville (3 cases milieu-gauche) → entrée EST de Vegas.
//
// Layout :
//   y=0       : tree boundary
//   y=1-3     : néons / décor opulent (panneaux lumineux, marbre)
//   y=4-9     : bâtiments NORD (Hôtel + Shop habits + Shop bouffe + Casino map A)
//   y=10      : trottoir nord
//   y=11-14   : ROUTE 4 voies (voitures qui circulent en boucle)
//   y=15      : trottoir sud
//   y=16-22   : bâtiments SUD (Bar Team Boulette + Shop rachat + Casino map B/C + fontaine)
//   y=23      : tree boundary
//
// Connexions :
//   - x=23 milieu (y=12,13) ← entrée depuis Muscuville (via sortie ouest Muscuville)
//   - x=0  milieu (y=12,13) → sortie vers FUTURE ville (bloquée, panneau "construction")
//   - Père Pesto : tout en haut, y=2, à l'opposé du bar Team Boulette
// ============================================================
export const LASAGNAS_W = 24
export const LASAGNAS_H = 24

function buildLasagnasVegas(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < LASAGNAS_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < LASAGNAS_W; x++) {
            if (x === 0 || x === LASAGNAS_W - 1 || y === 0 || y === LASAGNAS_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }

    // === Entrée EST depuis Muscuville (côté droit, milieu : y=12,13) ===
    // 3 cases d'arrivée. Path central horizontal y=12 et y=13 sur toute la largeur.
    m[12][LASAGNAS_W - 1] = "grassTall"
    m[13][LASAGNAS_W - 1] = "grassTall"
    // === Sortie OUEST (future ville, bloquée pour l'instant) ===
    // On laisse un panneau là, mais pas de transition codée
    m[12][0] = "tree"  // reste boundary, futur grassTall
    m[13][0] = "tree"

    // === Chemins horizontaux d'accès aux bâtiments ===
    // Trottoir nord y=10 : full path
    for (let x = 1; x < LASAGNAS_W - 1; x++) m[10][x] = "path"
    // Trottoir sud y=15 : full path
    for (let x = 1; x < LASAGNAS_W - 1; x++) m[15][x] = "path"
    // Connexion verticale : 2 cases au centre vertical (x=11,12) entre trottoirs
    // (déjà couvert par le path horizontal aux y=10 et y=15)

    // === Route 4 voies y=11..14, avec passage piéton x=11,12 (cases path safe) ===
    // Les tiles "road" sont décoratives ; les voitures seront animées côté client.
    // Le passage piéton (x=11,12, y=11..14) reste path → pas d'écrasement.
    for (let y = 11; y <= 14; y++) {
        for (let x = 1; x < LASAGNAS_W - 1; x++) {
            if (x === 11 || x === 12) {
                m[y][x] = "path"  // passage piéton safe
            } else {
                m[y][x] = "road"
            }
        }
    }

    // === Décor opulent rangée nord (y=1..3) : néons et marbre ===
    // Quelques fleurs jaunes pour les néons décoratifs
    m[2][3] = "flowerY"; m[2][7] = "flowerY"; m[2][11] = "flowerY"; m[2][15] = "flowerY"; m[2][19] = "flowerY"

    // === Décor sud (fontaines symbolisées par water petites) ===
    m[20][6] = "water"; m[20][7] = "water"
    m[20][16] = "water"; m[20][17] = "water"

    // === Arbres décor Lasagnas Vegas — séquence du jardinier BASILICO ===
    // L'ordre de cueillette à respecter (pour la mission) sera défini server-side.
    m[21][10] = "oliveTree"      // 🫒 olive_tree_1 (sud-centre)
    m[2][15] = "cherryTree"      // 🍒 vegas_cherry_1 (haut-droite, près de Père Pesto)
    m[21][3] = "pearTree"        // 🍐 vegas_pear_1 (sud-ouest, près du bar TB)
    m[21][20] = "peachTree"      // 🍑 vegas_peach_1 (sud-est, près du casino VIP)

    // === Trottoirs d'accès aux portes des bâtiments ===
    // Lignes verticales courtes entre y=10 (trottoir) et y=9 (face nord bâtiments)
    // Les portes seront positionnées par Building, ces lignes sont juste le sol entre.

    return m
}

// v3.24a-2 — HÔTEL DE LASAGNAS VEGAS
// 9×7. Hall d'accueil avec comptoir + 2 lits (gauche/droite). Sleep gratuit 1×/jour.
function buildLasagnasHotel(): TileType[][] {
    const W = 9, H = 7
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
    // Comptoir d'accueil au nord
    for (let x = 2; x <= W - 3; x++) m[1][x] = "shopCounter"
    // 2 lits (représentés par rug ; le joueur appuie A dessus pour dormir)
    m[3][2] = "rug"
    m[3][6] = "rug"
    // Sortie sud
    m[H - 1][4] = "doorMat"
    return m
}

// v3.24a-2 — SHOP HABITS (vêtements + casquette de flic anti-voiture)
function buildLasagnasShopHabits(): TileType[][] {
    const W = 9, H = 7
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
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    for (let x = 1; x < W - 1; x++) m[3][x] = "shopCounter"
    m[H - 1][4] = "doorMat"
    return m
}

// v3.24a-2 — SHOP BOUFFE (version premium TRENETTE)
function buildLasagnasShopBouffe(): TileType[][] {
    const W = 9, H = 7
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
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    for (let x = 1; x < W - 1; x++) m[3][x] = "shopCounter"
    m[H - 1][4] = "doorMat"
    return m
}

// v3.24a-2 — SHOP RACHAT (achète les objets cassés au joueur)
function buildLasagnasShopRachat(): TileType[][] {
    const W = 9, H = 7
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
    // Décor recyclerie : étagères entassées
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    m[3][3] = "shopCounter"; m[3][4] = "shopCounter"; m[3][5] = "shopCounter"
    m[H - 1][4] = "doorMat"
    return m
}

// v3.24c — BAR DE LA TEAM BOULETTE (intérieur opaque, mafia camouflée)
// 11×8. Comptoir bar nord + 4 PNJ TB + porte cachée vers bureau (à condition d'avoir la clé)
function buildLasagnasTbBar(): TileType[][] {
    const W = 11, H = 8
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
    // Comptoir bar nord
    for (let x = 2; x <= W - 3; x++) m[1][x] = "shopCounter"
    // Petites tables
    m[3][2] = "table"; m[3][8] = "table"
    m[5][2] = "table"; m[5][8] = "table"
    // Tapis rouge mafia
    for (let x = 4; x <= 6; x++) m[4][x] = "rug"
    // Porte cachée vers le bureau du boss (apparaîtra ouverte si clé obtenue)
    // Pour l'instant : decor shopShelf au centre nord, devient stairsUp si clé
    m[2][5] = "shopShelf"  // "porte cachée" stylisée
    // Sortie sud
    m[H - 1][5] = "doorMat"
    return m
}

// v3.24c — BUREAU DU BOSS (Il Capo) — accessible après avoir la clé du 4e PNJ bar
// 9×7. Tapis rouge + bureau impérial + Il Capo derrière + porte arène (cachée jusqu'au boss vaincu)
function buildLasagnasTbBureau(): TileType[][] {
    const W = 9, H = 7
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
    // Bureau central (table)
    m[2][4] = "table"
    // Tapis rouge sang luxueux
    for (let y = 1; y <= H - 2; y++) {
        for (let x = 1; x <= W - 2; x++) {
            if (m[y][x] === "floorTile") m[y][x] = "rug"
        }
    }
    // Sortie sud (retour bar)
    m[H - 1][4] = "doorMat"
    return m
}

// v3.24b — CASINO MAP A : HALL d'entrée. Slot machines + lotto poule (à venir).
// 12×9. 2 croupiers (VITELLINO +10% boost / FETTUCCI -10% malus).
function buildLasagnasCasinoA(): TileType[][] {
    const W = 12, H = 9
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
    // Slot machines en rangée nord (4 machines)
    m[2][2] = "slotMachine"
    m[2][4] = "slotMachine"
    m[2][6] = "slotMachine"
    m[2][8] = "slotMachine"
    // Tapis rouge au centre
    for (let x = 3; x <= 8; x++) {
        m[5][x] = "rug"
    }
    // Future zone lotto poule (5, 5) — tile placeholder
    m[5][5] = "rug"
    m[5][6] = "rug"
    // Sortie sud
    m[H - 1][6] = "doorMat"
    return m
}

// v3.24b — CASINO MAP B : SALLE DE JEUX. Roulettes + stop ou encore (à venir).
// 12×9. 2 croupiers (GRAMIGNA +5% / CASARECCI -5%).
function buildLasagnasCasinoB(): TileType[][] {
    const W = 12, H = 9
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
    // 2 roulettes à gauche/droite
    m[3][3] = "rouletteWheel"
    m[3][8] = "rouletteWheel"
    // 2 tables au sud avec chaises
    m[5][4] = "table"; m[5][5] = "chairRedDown"
    m[5][7] = "table"; m[5][8] = "chairBlueDown"
    // Tapis central
    for (let x = 3; x <= 8; x++) m[6][x] = "rug"
    // Sortie sud
    m[H - 1][6] = "doorMat"
    return m
}

// v3.24b — CASINO MAP C : VIP. Casino pattern + combats de coq (à venir).
// 10×8. 2 croupiers (BAVETTONE +15% / TROFIE -15%).
// Gating à l'entrée (smoking VIP + 100 pompes + sorteur).
function buildLasagnasCasinoC(): TileType[][] {
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
    // Roulette pattern VIP (centre)
    m[2][5] = "rouletteWheel"
    // Tapis luxe partout au sud
    for (let y = 4; y <= 5; y++) {
        for (let x = 2; x <= 7; x++) m[y][x] = "rug"
    }
    // Sortie sud
    m[H - 1][5] = "doorMat"
    return m
}

// v3.24a — Placeholder pour les intérieurs Lasagnas Vegas non encore implémentés.
// 7×6 box avec un panneau "construction" + doorMat de retour vers la ville.
// Sera remplacé par les vrais intérieurs (hôtel, casino, etc.) dans les commits suivants.
function buildLasagnasConstruction(): TileType[][] {
    const W = 7, H = 6
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
    // Panneau "construction" au centre
    m[2][3] = "shopShelf"
    // Sortie sud (doorMat)
    m[H - 1][3] = "doorMat"
    return m
}

// Bâtiments visibles de Lasagnas Vegas (8 au total).
// v3.24a : tous pointent vers `lasagnas_construction` (placeholder) — sera remplacé
// progressivement par les vrais intérieurs.
//
// Layout :
//   Rangée NORD (y=4..7) :  Hôtel  ShopHabits  ShopBouffe  CasinoA
//   Rangée SUD  (y=16..19): BarTB  ShopRachat  CasinoB     CasinoC(VIP)
export const LASAGNAS_BUILDINGS: Building[] = [
    // Nord — Hôtel + 2 shops fonctionnels + casino entrée (placeholder)
    { x: 1,  y: 4,  w: 4, h: 4, kind: "shop",   doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_hotel",        displayName: "HOTEL" },
    { x: 6,  y: 4,  w: 4, h: 4, kind: "shop",   doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_shop_habits",  displayName: "HABITS" },
    { x: 11, y: 4,  w: 4, h: 4, kind: "shop",   doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_shop_bouffe",  displayName: "BOUFFE" },
    { x: 17, y: 4,  w: 4, h: 4, kind: "casino", doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_casino_a",    displayName: "CASINO" },
    // Sud — Bar TB (placeholder), Shop rachat fonctionnel, 2 casinos (placeholder)
    { x: 1,  y: 16, w: 4, h: 4, kind: "casino", doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_tb_bar",       displayName: "BAR" },
    { x: 6,  y: 16, w: 4, h: 4, kind: "shop",   doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_shop_rachat",  displayName: "RACHAT" },
    { x: 11, y: 16, w: 4, h: 4, kind: "casino", doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_casino_b",    displayName: "JEUX" },
    { x: 17, y: 16, w: 4, h: 4, kind: "casino", doorX: 1, doorY: 3, visible: true, targetMapId: "lasagnas_casino_c",    displayName: "VIP" },
    // v4.0 — Tour Pullman (shop multi-étages : Mary Malone / Iorek / Lee Scoresby / Serafina)
    { x: 22, y: 4,  w: 2, h: 4, kind: "tower",  doorX: 0, doorY: 3, visible: true, targetMapId: "vegas_shoptower_1",    displayName: "TOUR" },
]

export const LASAGNAS_SIGNS: Sign[] = [
    { x: 11, y: 9, text: "LASAGNAS VEGAS\nLa ville qui ne dort jamais. Casinos, hôtel, et la mafia Team Boulette dans les ruelles…" },
    { x: 1, y: 12, text: "🚧 ROUTE EN CONSTRUCTION 🚧\nVers une autre ville. Reviens plus tard." },
    { x: 22, y: 1, text: "Vers le sommet : Père Pesto, le fidèle du Dieu Spaghetti." },
    { x: 11, y: 11, text: "⚠️ ATTENTION : voitures sur la route. Utilise le passage piéton (cases jaunes)." },
]

// Spawns ===
// Arrivée à Vegas depuis Muscuville (entrée est = x=W-1)
export const LASAGNAS_SPAWN_FROM_MUSCUVILLE = {
    mapId: "lasagnas_vegas",
    posX: LASAGNAS_W - 2,  // juste à gauche de la grassTall
    posY: 12,
    direction: "left" as const,
}
// Retour à Muscuville depuis Vegas (sortie est de Vegas → entrée ouest Muscuville)
export const MUSCUVILLE_SPAWN_FROM_LASAGNAS = {
    mapId: "muscuville",
    posX: 1,  // juste à droite de la grassTall ouest Muscuville
    posY: 8,  // milieu de la sortie 3 cases
    direction: "right" as const,
}

// ============================================================
// v3.17c — LA MER (canal navigable entre Bourg-Boulette et Macaron'île)
// Petit map avec deux îlots de sable accueillant un naufragé et un nageur.
// Path waterShallow 3 colonnes (3-4-5) pour permettre le détour sur les îlots.
// ============================================================
const LAMER_W = 9
const LAMER_H = 10

function buildLaMer(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < LAMER_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < LAMER_W; x++) {
            if (x === 0 || x === LAMER_W - 1 || y === 0 || y === LAMER_H - 1) {
                row.push("tree")
            } else {
                row.push("water")  // eau profonde bloquante par défaut
            }
        }
        m.push(row)
    }
    // Path central 3 colonnes (3-4-5) sur les rows 1..H-2 → waterShallow nageable
    for (let y = 1; y <= LAMER_H - 2; y++) {
        for (let x = 3; x <= 5; x++) {
            m[y][x] = "waterShallow"
        }
    }
    // Sorties nord/sud (col 4, y=0 et y=H-1) → triggers de transition
    m[0][4] = "waterShallow"
    m[LAMER_H - 1][4] = "waterShallow"
    // Îlots de sable au milieu, sur les flancs du path
    m[4][2] = "sand"
    m[4][6] = "sand"
    // Quelques touffes décoratives sur les côtés (illusion d'algues)
    m[2][1] = "grassTall"
    m[7][7] = "grassTall"
    return m
}

// ============================================================
// v3.16 — HAUTES HERBES DU SUD (corridor entre Macaron'île et Muscuville)
// Bloqué par des BESTIOLES sauf si le tamagotchi du joueur est level >= 23.
// ============================================================
const GRASS_SUD_W = 9
// v4.0 — Compactée de 14 à 8 (presque moitié) : le corridor était trop long
//        et fatigant pour les joueurs. Les 8 arbres + happyFlowers sont
//        regroupés sur 4 lignes intérieures (y=2..5).
const GRASS_SUD_H = 8

function buildGrassSud(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < GRASS_SUD_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < GRASS_SUD_W; x++) {
            if (x === 0 || x === GRASS_SUD_W - 1 || y === 0 || y === GRASS_SUD_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }
    // Entrées grassTall nord et sud (col 4 centre)
    m[0][4] = "grassTall"
    m[GRASS_SUD_H - 1][4] = "grassTall"
    // Chemin vertical central
    for (let y = 1; y < GRASS_SUD_H - 1; y++) m[y][4] = "path"

    // v3.24e — Touffes denses de grassTall hors chemin pour rendu vivant
    for (let y = 1; y < GRASS_SUD_H - 1; y++) {
        for (let x = 1; x < GRASS_SUD_W - 1; x++) {
            if (m[y][x] === "grass" && Math.abs(x - 4) > 1) {
                if ((x * 3 + y * 7) % 5 < 3) m[y][x] = "grassTall"
            }
        }
    }

    // === 8 arbres du parc compactés sur y=2..5 ===
    m[2][2] = "cherryTree"      // 🍒
    m[2][6] = "pearTree"        // 🍐
    m[3][2] = "peachTree"       // 🍑
    m[3][6] = "poisonTree"      // 🟣 piège 1
    m[4][2] = "poisonTree"      // 🟣 piège 2
    m[4][6] = "boostTree"       // ✨ boost
    m[5][2] = "divisorTree"     // ⚠️ divisor (piège déguisé)
    m[5][6] = "appleTree"       // 🍎

    // === Fleurs déco ===
    m[2][3] = "flowerR"; m[2][5] = "flowerY"
    m[5][3] = "flowerY"; m[5][5] = "flowerR"

    // === HappyFlowers (placées sur le chemin central pour rester triggerables) ===
    m[3][3] = "happyFlower"
    m[4][5] = "happyFlower"

    return m
}

// ============================================================
// v3.16/v3.23 — MUSCUVILLE (village des athlètes, sud du corridor)
// Agrandie à 17×16 pour accueillir 4 bâtiments + sortie sud vers Mont Pasta-Ventoux.
//   - y=0     : tree + grassTall (col 8) trigger retour grass_sud
//   - y=1..4  : zone d'entrée + ville haute (Bike Shop + Gym Muscuville)
//   - y=5     : chemin horizontal
//   - y=6..9  : ville milieu (Casino + Contest Hall) — Contest Hall verrouillée sans badge
//   - y=10    : chemin horizontal
//   - y=11..14: place du sud + statues
//   - y=15    : tree + grassTall (col 8) trigger Mont Pasta-Ventoux
// ============================================================
const MUSCUVILLE_W = 17
// v4.0 — Étendu de 16 à 20 : 4 lignes de respiration au sud pour décongestionner
//        la zone arène + biblio + PNJ (ils étaient agglutinés sur y=14).
const MUSCUVILLE_H = 20

function buildMuscuville(): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < MUSCUVILLE_H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < MUSCUVILLE_W; x++) {
            if (x === 0 || x === MUSCUVILLE_W - 1 || y === 0 || y === MUSCUVILLE_H - 1) {
                row.push("tree")
            } else {
                row.push("grass")
            }
        }
        m.push(row)
    }
    // Entrée grassTall nord (col 8) = trigger retour grass_sud
    m[0][8] = "grassTall"
    // Sortie sud grassTall (col 8) = trigger Mont Pasta-Ventoux (dernière ligne)
    m[MUSCUVILLE_H - 1][8] = "grassTall"
    // v4.0 — Sortie OUEST déplacée à la place sud (y=15-17, col 0).
    // Avant : (col 0, y=7-9) — mais le casino (x=1..5, y=6..9) cachait les rochers !
    // Maintenant : place sud agrandie, rochers VISIBLES juste devant la sortie.
    m[15][0] = "grassTall"
    m[16][0] = "grassTall"
    m[17][0] = "grassTall"

    // Chemin vertical central (col 8) sur toute la hauteur (jusqu'à la sortie sud)
    for (let y = 1; y < MUSCUVILLE_H - 1; y++) m[y][8] = "path"

    // Chemins horizontaux d'accès aux portes (y=5 et y=10)
    for (let x = 1; x < MUSCUVILLE_W - 1; x++) m[5][x] = "path"
    for (let x = 1; x < MUSCUVILLE_W - 1; x++) m[10][x] = "path"
    // Nouveau : chemin horizontal y=16 pour relier le chemin central aux rochers ouest.
    for (let x = 1; x < MUSCUVILLE_W - 1; x++) {
        if (m[16][x] === "grass") m[16][x] = "path"
    }

    // v4.0 — Rochers physiques bloquant la sortie ouest (col 1, y=15-17).
    // Visibles + atteignables depuis la place sud aérée.
    m[15][1] = "boulder"
    m[16][1] = "boulder"
    m[17][1] = "boulder"

    // v3.35 — Chemin d'accès aux portes ARÈNE/BIBLIO (y=13)
    for (let x = 1; x < MUSCUVILLE_W - 1; x++) {
        if (m[13][x] === "grass") m[13][x] = "path"
    }

    // v4.0 — Place sud agrandie (y=14..18) : décor aéré pour PNJ et balade.
    // Décor : fleurs aux 4 coins de la place + le long du chemin central.
    m[14][2] = "flowerR"; m[14][3] = "flowerY"
    m[14][13] = "flowerY"; m[14][14] = "flowerR"
    m[17][2] = "flowerY"; m[17][14] = "flowerR"
    m[2][6] = "flowerY"; m[2][10] = "flowerR"
    return m
}

// v3.23 — Bâtiments de Muscuville
export const MUSCUVILLE_BUILDINGS: Building[] = [
    // Magasin de vélos — rangée 1 gauche (5x5, cols 1..5, rows 1..5)
    { x: 1, y: 1, w: 5, h: 4, kind: "shop", doorX: 2, doorY: 3, visible: true, targetMapId: "bike_shop", displayName: "VÉLOS" },
    // Gym Muscuville — rangée 1 droite (cols 11..15, rows 1..4)
    { x: 11, y: 1, w: 5, h: 4, kind: "gym", doorX: 2, doorY: 3, visible: true, targetMapId: "gym_muscuville", displayName: "MUSCU" },
    // Casino Muscuville — rangée 2 gauche (cols 1..5, rows 6..9)
    { x: 1, y: 6, w: 5, h: 4, kind: "casino", doorX: 2, doorY: 3, visible: true, targetMapId: "casino_muscuville", displayName: "CASINO" },
    // Salle des concours — rangée 2 droite (cols 11..15, rows 6..9) — verrouillée sans badge Conquérant
    { x: 11, y: 6, w: 5, h: 4, kind: "shop", doorX: 2, doorY: 3, visible: true, targetMapId: "contest_hall", displayName: "CONCOURS" },
    // v3.35 — ARÈNE de Muscuville (rangée 3 gauche : cols 2..6, rows 11..13). Porte (4, 13).
    { x: 2, y: 11, w: 5, h: 3, kind: "shop", doorX: 2, doorY: 2, visible: true, targetMapId: "arena_muscuville", displayName: "ARÈNE" },
    // v3.35 — BIBLIOTHÈQUE de Muscuville (rangée 3 droite : cols 10..14, rows 11..13). Porte (12, 13).
    { x: 10, y: 11, w: 5, h: 3, kind: "bibliotheque", doorX: 2, doorY: 2, visible: true, targetMapId: "bibliotheque_muscuville", displayName: "BIBLIO" },
]

export const MUSCUVILLE_SIGNS: Sign[] = [
    { x: 4, y: 5, text: "MAGASIN DE VÉLOS\nVoir le marchand à l'intérieur. Indispensable pour gravir le Mont Pasta-Ventoux." },
    { x: 14, y: 5, text: "GYMNASE DE MUSCUVILLE\nLa salle officielle des athlètes." },
    { x: 4, y: 10, text: "CASINO DE MUSCUVILLE\nDernier casino de l'archipel." },
    { x: 14, y: 10, text: "SALLE DES CONCOURS\nIntersalle annuel. Accès interdit aux non-conquérants du Mont." },
    { x: 8, y: 18, text: "↓ MONT PASTA-VENTOUX\n100 cases jusqu'au sommet. Vélo obligatoire." },
    // v3.30 — Forêt hantée (à l'est, accès bloqué — "tu as trop peur")
    { x: 16, y: 8, text: "→ FORÊT HANTÉE\n*Le panneau grince. Tu sens un frisson.*\n« Trop peur. Reviens quand tu te sentiras prêt. »" },
    // v3.35 — Rochers à l'ouest : prix de passage progressif selon champions battus
    { x: 1, y: 14, text: "🪨 ROCHERS — PASSAGE VEGAS\nPrix : 4000 reps (–25% par champion d'arène battu).\n4/4 champions battus → passage GRATUIT." },
]

// v3.39 — Topics de la BIBLIOTHÈQUE DE MUSCUVILLE (MIRABELLE, sœur de la bibliothécaire Macaron).
// Layout identique à la biblio Macaron (cf. buildBibliothequeMuscuville).
export const BIBLIOTHEQUE_MUSCU_TOPICS: BiblioTopic[] = [
    // Rangée nord (y=1) : 9 slots pour ARBRES du Nexus
    {
        x: 2, y: 1, kind: "archives" as const,
        title: "Arbres du Nexus — Vue d'ensemble",
        text: "9 essences répertoriées dans le Nexus :\n\n🍎 Pommier (+80 reps × 3/jour)\n🍒 Cerisier (+40 × 5)\n🍐 Poirier (+60 × 4)\n🍑 Pêcher (+100 × 2)\n🥥 Cocotier (+150 × 1, ultra-rare)\n🟣 Maléfica (-30 × 3, piège)\n🫒 Olivier (+20 × 7, Vegas)\n✨ Arbre Boost (×2 énergie, 1×/jour, grass_sud)\n⚠️ Arbre Divisor (÷2, 1×/jour, look trompeur)\n\nDemande-moi le LIVRE DES ARBRES quand tu en auras croisé au moins 3.\n\n──────────\n📜 *Note de marge (écrite à la main par MIRABELLE) :*\n« Mon ami BASILICO, jardinier à Vegas, dit qu'il offre son arrosoir à qui cueille les fruits dans l'ordre des couleurs de l'arc-en-ciel : du rouge à l'orange en passant par le vert et le jaune. »",
    },
    {
        x: 6, y: 1, kind: "archives" as const,
        title: "Règles du bonheur de l'animal",
        text: "Le bonheur de ton compagnon évolue en continu :\n\n🟢 NOURRIR (Corned Pâtes) : +30\n🟢 DOC PROTÉINE (véto Muscu, 1×/jour) : reset 100\n🟢 HÔTEL Vegas (1×/jour) : +30\n🟢 ARÈNE Manouche victoire : +5\n🟢 ARBRE happyFlower (grass_sud) : +30\n🟢 BATTRE un défi PNJ : +10\n\n🔴 24h sans connexion : -10\n🔴 -1 par 50 pas (intérieurs compris)\n🔴 Animal en sac > 24h : -1/jour\n🔴 BOIRE ta gourde sans en donner : -1 (sac) ou -3 (visible)\n🔴 CRASH Stop ou Encore : -3\n🔴 FRUIT POISON mangé : -5\n🔴 BRUTE Vegas (lying) : -2\n\nSi le bonheur tombe à 0 : l'animal refuse d'évoluer.",
    },
    {
        x: 10, y: 1, kind: "archives" as const,
        title: "Mont Pasta-Ventoux — Records",
        text: "100 cases verticales. Vélo obligatoire.\n\nCoût/case selon vélo :\n🚲 Vieux Vélo : 8 reps\n🚴 Vélo Sport : 4 reps\n🚵 Vélo Pro : 2 reps\n\nMultiplicateur cadence (BPM) :\n💀 <30 ou ≥100 : ×3.0 (épuisement/explosion)\n🐌 30-59 ou 81-99 : ×1.5 (mauvais rythme)\n✨ 60-80 : ×0.5 (ZONE IDÉALE)\n\nDescente : 1 pas down = 10 cases gratuites.\nSommet conquis = badge Conquérant 200 XP + accès arène Muscu.",
    },
    // Rangée thématique (y=3)
    {
        x: 2, y: 3, kind: "archives" as const,
        title: "Champions de l'arène — Palmarès",
        text: "4 champions historiques de Muscuville :\n\n🧱 Champion du Gainage (coin NO)\n💪 Champion des Pompes (coin NE)\n🪢 Championne des Tractions (coin SO)\n🦵 Champion des Squats (coin SE)\n\n1ʳᵉ confrontation : bats TON record all-time sur l'exo.\nRevanche (après 1ʳᵉ gagnée) : plus gros VOLUME du jour all-time → badge 200 XP.\n\nChaque champion battu = -25% sur le prix des rochers (4000 reps).",
    },
    {
        x: 6, y: 3, kind: "archives" as const,
        title: "Géographie de Muscuville",
        text: "Le village des athlètes au sud du Nexus.\n\n🏠 Bâtiments :\n• Magasin de vélos (PELOTON) — indispensable pour le Mont\n• Gymnase (BICEPS)\n• Casino\n• Salle des concours (POMPATOR/SQUATILUS/TIROIR — accès après badge Conquérant)\n• Arène (4 champions — accès après badge Conquérant)\n• Bibliothèque (où tu es)\n\n🌍 Sorties :\n↓ Sud : Mont Pasta-Ventoux\n← Ouest : Rochers vers Lasagnas Vegas (prix progressif)\n→ Est : Forêt hantée (fermée)\n↑ Nord : grass_sud + Macaron'île",
    },
    {
        x: 10, y: 3, kind: "archives" as const,
        title: "Histoire de Muscuville",
        text: "Fondée par les frères MUSCULON il y a 50 ans. Devenue capitale officielle des athlètes du Nexus.\n\nLe concours intersalle annuel attire toujours les meilleurs. Les rochers à l'ouest empêchent traditionnellement les non-conquérants de Mont d'aller à Vegas — une mesure de protection contre l'addiction au jeu.\n\n*MIRABELLE écrit ses propres chroniques. Demande-lui si elle accepte de te les lire.*",
    },
    // Archives (y=7)
    {
        x: 2, y: 7, kind: "archives" as const,
        title: "Chronique du Mont — Première ascension",
        text: "Personne ne sait qui a fait la première ascension. On dit que c'était une femme âgée, sans vélo, en sandales. Elle a regardé le sommet pendant 3 jours puis a marché jusqu'en haut.\n\nDepuis, le badge Conquérant porte son symbole — un sommet enneigé sur fond bleu.",
    },
    {
        x: 6, y: 7, kind: "archives" as const,
        title: "Chronique des Champions",
        text: "Les 4 champions de l'arène ne sont pas natifs de Muscuville. Ils viennent d'horizons divers et se sont rencontrés au Mont, lors d'un entraînement collectif. Depuis, ils gardent l'arène ensemble.\n\nPersonne ne sait leurs vrais noms — ils n'utilisent que leurs disciplines.",
    },
    {
        x: 10, y: 7, kind: "archives" as const,
        title: "Index des biblios",
        text: "Cette bibliothèque est gérée par MIRABELLE, érudite des arbres.\n\nSa sœur tient la BIBLIO de Macaron'île, spécialisée dans les animaux. Les deux soeurs se haïssent (légère rivalité fraternelle) mais respectent profondément leur travail mutuel.\n\nPour le LIVRE DES ARBRES : c'est ici, pas à Macaron. Sa sœur le consulte mais ne le donne pas.",
    },
]

// v3.39 — Signs de la mini-map sommet du Mont
export const MONT_SOMMET_SIGNS: Sign[] = [
    { x: 1, y: 2, text: "🌬️ VUE PANORAMIQUE\nDe ce sommet, tu vois tout l'archipel. Bourg-Boulette est minuscule au nord, Macaron'île à l'est, Vegas au loin." },
    { x: 5, y: 2, text: "📋 TABLEAU DE L'ARÈNE\n4 champions à battre : Gainage, Pompes, Tractions, Squats. Chacun = -25% sur le prix des rochers." },
    { x: 1, y: 4, text: "⛺ TENTE DES CHAMPIONS\n*Vide. Ils sont redescendus.*\n(L'un d'eux a oublié sa serviette de sport.)" },
    { x: 5, y: 4, text: "🎌 DRAPEAU DU SOMMET\nUn drapeau usé claque au vent. « Conquis le 2026-05-26. »\n(Tous ceux qui sont montés ont signé.)" },
]

// v3.22 — Bâtiments 5×5 avec displayName (label custom rendu à droite du bâtiment).
export const MACARONILE_BUILDINGS: Building[] = [
    // Shop TRENETTE — rangée 1 gauche (cols 1..5, rows 4..8) ; door centrée (3, 8). Labellé "SHOP" en façade.
    { x: 1, y: 4, w: 5, h: 5, kind: "shop", doorX: 2, doorY: 4, visible: true, targetMapId: "shop_macaron", displayName: "SHOP" },
    // Vétérinaire — rangée 1 droite (cols 8..12, rows 4..8) ; door centrée (10, 8)
    { x: 8, y: 4, w: 5, h: 5, kind: "veterinaire", doorX: 2, doorY: 4, visible: true, targetMapId: "veterinaire", displayName: "VÉTO" },
    // Bibliothèque — rangée 2 gauche (cols 1..5, rows 10..14) ; door centrée (3, 14)
    { x: 1, y: 10, w: 5, h: 5, kind: "bibliotheque", doorX: 2, doorY: 4, visible: true, targetMapId: "bibliotheque", displayName: "BIBLIO" },
]

// Signs sur le chemin, à côté des portes des buildings (jamais en travers du flux principal)
export const MACARONILE_SIGNS: Sign[] = [
    { x: 4, y: 9, text: "BOUTIQUE DE TRENETTE\nCorned Pâtes, Lunettes et autres trouvailles." },
    { x: 11, y: 9, text: "VÉTÉRINAIRE\nPour tous tes amis à plumes, à poils, à pâtes." },
    { x: 8, y: 3, text: "PLAGE DE SABLE PÂTE\nProfite avant la marée." },
    { x: 4, y: 15, text: "BIBLIOTHÈQUE\nSavoirs anciens, livres poussiéreux, silence requis." },
]

// v3.13 — Builders pour les nouveaux intérieurs Macaron'île
// shop_macaron : copie de shop_interior (9x8 floorChecker + étagères + comptoir)
function buildShopMacaron(): TileType[][] {
    return buildShopInterior()
}
// v3.15 — bibliotheque : 11x8 avec sol bois et étagères de livres
// v3.18 — Bibliothèque agrandie 13x10, plus belle avec statues + pupitres + comptoir central.
// Layout :
//   y=0 : wall nord
//   y=1 : rangée nord de 9 bookshelves "Animaux des joueurs" (1 par anim-joueur actif)
//   y=2 : passage
//   y=3 : 3 bookshelves thématiques (Casinos / Bestioles / Défis) + 2 pupitres de lecture
//   y=4 : passage central (avec lustre virtuel rendu via TileCell décor)
//   y=5 : 2 statues décoratives + comptoir BIBLIO au centre
//   y=6 : passage
//   y=7 : bookshelves "Archives" (4)
//   y=8 : passage + doorMat sortie
//   y=9 : wall sud
function buildBibliotheque(): TileType[][] {
    const W = 13, H = 10
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
    // Rangée nord (y=1) : 9 bookshelves "Animaux des joueurs" (cols 2..10)
    for (let x = 2; x <= W - 3; x++) m[1][x] = "bookshelf"
    // Petits gaps esthétiques aux coins
    m[1][1] = "shopShelf"
    m[1][W - 2] = "shopShelf"

    // Rangée thématique (y=3)
    m[3][2] = "bookshelf"   // Casinos
    m[3][6] = "bookshelf"   // Bestioles (centre)
    m[3][W - 3] = "bookshelf"  // Défis adoption animaux
    // 2 pupitres de lecture aux côtés (y=3)
    m[3][4] = "lectern"
    m[3][W - 5] = "lectern"

    // 2 statues décoratives (y=5)
    m[5][2] = "statue"
    m[5][W - 3] = "statue"
    // Comptoir BIBLIO central (col 5-6-7 sur y=5)
    m[5][5] = "shopCounter"
    m[5][6] = "shopCounter"
    m[5][7] = "shopCounter"

    // Archives (y=7) : 4 bookshelves de lore général
    m[7][2] = "bookshelf"
    m[7][5] = "bookshelf"
    m[7][7] = "bookshelf"
    m[7][W - 3] = "bookshelf"

    // Sortie sud
    m[H - 1][Math.floor(W / 2)] = "doorMat"

    return m
}

// v3.18 — Configuration des topics par bookshelf de la bibliothèque.
// Le client (MapClient) cherche cette config pour rendre le contenu du popup quand A
// est pressé sur un bookshelf de la bibliothèque.
export interface BiblioTopic {
    x: number
    y: number
    /** Identifiant logique du topic (consommé par BibliothequeModal pour switch sur sections riches). */
    kind: "casinos" | "bestioles" | "defis_adoption" | "animal_joueur" | "archives"
    /** Titre court affiché en popup. */
    title: string
    /** Texte du popup (markdown light). Pour kind=animal_joueur, le contenu est résolu dynamiquement. */
    text: string
    /** Index pour kind=animal_joueur (0..N-1) — utilisé pour mapper sur la liste d'animaux des joueurs. */
    animalSlotIndex?: number
}

export const BIBLIOTHEQUE_TOPICS: BiblioTopic[] = [
    // Rangée nord (y=1) : 9 slots pour animaux joueurs (cols 2..10). Le contenu est dynamique.
    ...Array.from({ length: 9 }, (_, i) => ({
        x: 2 + i,
        y: 1,
        kind: "animal_joueur" as const,
        title: `Animal du joueur #${i + 1}`,
        text: "*Le rayon attend qu'un animal y soit ajouté...*",
        animalSlotIndex: i,
    })),
    // Rangée thématique (y=3)
    {
        x: 2,
        y: 3,
        kind: "casinos",
        title: "Les Casinos de l'archipel",
        text: "Deux casinos officiels : un à Bourg-Boulette, un à Pépiteville.\n\nRumeur : des pièces tombées par terre attendent celui qui inspecte sous les machines... (un dit même qu'une roulette rouge/noir va bientôt ouvrir).",
    },
    {
        x: 6,
        y: 3,
        kind: "bestioles",
        title: "Bestioles des Hautes Herbes du Sud",
        text: "Créatures non identifiées. Vivent dans les hautes herbes au sud de Macaron'île.\n\nElles attaquent ceux qui n'ont pas d'animal compagnon. Première morsure = douleur sans perte. Suivantes = -10 reps par passage.\n\nUn animal du bestiaire bien préparé les fait fuir.",
    },
    {
        x: 10,  // W-3 with W=13
        y: 3,
        kind: "defis_adoption",
        title: "Défis d'adoption (chez le vétérinaire V3T)",
        text: "Pour libérer ton animal, tous ont les MÊMES 7 défis (ordre différent par animal) :\n\n1. Aller le voir\n2. Lui donner à boire (gourde)\n3. Lui offrir des pâtes (corned_pates)\n4. Le visiter matin ET après-midi\n5. 180s de gainage\n6. 200 pompes APRÈS le gainage\n7. 300 squats APRÈS les pompes\n\nLes seuils sont ajustés au ratio onboarding.",
    },
    // Archives (y=7)
    {
        x: 2,
        y: 7,
        kind: "archives",
        title: "Chronique du Monstre",
        text: "Récits anciens du Monstre de Bourg-Boulette. On dit qu'il accepte de recevoir ceux qui ont leur sac. Et qu'il offre parfois un cadeau aux courageux...",
    },
    {
        x: 5,
        y: 7,
        kind: "archives",
        title: "Chronique du Pont d'Azuria",
        text: "Le Pont est gardé par 4 PNJ légendaires : POMPO, SQUATTO, GAINAX et CHAMPIO. Chacun teste un type d'effort. Vaincre les quatre = badge Pionnier.",
    },
    {
        x: 7,
        y: 7,
        kind: "archives",
        title: "Chronique de PIAFFINI",
        text: "Un petit oiseau perdu au sommet de la Tour. Recueilli par JOJO grâce à un sauveur audacieux. Depuis, on dit qu'il chante de nouveau au-dessus de Bourg-Boulette.",
    },
    {
        x: 10,
        y: 7,
        kind: "archives",
        title: "Chronique de la Mer",
        text: "Le canal entre Bourg-Boulette et Macaron'île. Plein de courants imprévisibles. Un nageur s'y promène, il dit chercher le ONE PIECE. Un naufragé y attend depuis trop longtemps.",
    },
]
// v3.21.1 — Vétérinaire redesigné : map 13×10 luxueuse.
// Cages animaux + plantes + sacs de croquettes + tapis pour ambiance "clinique chaleureuse".
function buildVeterinaire(): TileType[][] {
    const W = 13, H = 10
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
    // Rangée nord (y=1) : grandes cages d'animaux + plantes aux extrémités
    m[1][1] = "plant"
    for (let x = 2; x <= W - 3; x++) m[1][x] = "animalCage"
    m[1][W - 2] = "plant"

    // Rangée 2 : tapis sous les cages
    m[2][5] = "rug"; m[2][6] = "rug"; m[2][7] = "rug"

    // Rangée 3 : sacs de croquettes + cages supplémentaires
    m[3][1] = "foodBag"
    m[3][2] = "animalCage"
    m[3][5] = "rug"; m[3][6] = "rug"; m[3][7] = "rug"
    m[3][W - 3] = "animalCage"
    m[3][W - 2] = "foodBag"

    // Rangée 5 : comptoir V3T central + plantes aux côtés
    m[5][1] = "plant"
    m[5][5] = "shopCounter"
    m[5][6] = "shopCounter"
    m[5][7] = "shopCounter"
    m[5][W - 2] = "plant"

    // Rangée 6 : tapis devant le comptoir
    m[6][5] = "rug"; m[6][6] = "rug"; m[6][7] = "rug"

    // Rangée 7 : 2 cages basses + sacs croquettes
    m[7][1] = "foodBag"
    m[7][2] = "animalCage"
    m[7][W - 3] = "animalCage"
    m[7][W - 2] = "foodBag"

    // Sortie sud
    m[H - 1][Math.floor(W / 2)] = "doorMat"

    return m
}

// v3.23 — BIKE_SHOP : intérieur du magasin de vélos de Muscuville (9x8)
function buildBikeShop(): TileType[][] {
    const W = 9, H = 8
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
    // Étagères de vélos (réutilise shopShelf décoratif)
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    // Comptoir
    for (let x = 2; x <= W - 3; x++) m[3][x] = "shopCounter"
    // Quelques sacs de pièces déco (foodBag réutilisé)
    m[5][1] = "foodBag"
    m[5][W - 2] = "foodBag"
    m[H - 1][4] = "doorMat"
    return m
}

// v3.23 — GYM_MUSCUVILLE : salle de muscu de Muscuville (10x8, copie de buildGym)
function buildGymMuscuville(): TileType[][] {
    return buildGym()
}

// v3.23 — CASINO_MUSCUVILLE : copie du casino
function buildCasinoMuscuville(): TileType[][] {
    return buildCasino()
}

// v3.23 — CONTEST_HALL : salle des concours intersalle (11x9). Stub : 3 PNJ adversaires + tapis central.
function buildContestHall(): TileType[][] {
    const W = 11, H = 9
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
    // Tapis central (zone d'arène)
    for (let y = 3; y <= 5; y++) {
        for (let x = 3; x <= W - 4; x++) m[y][x] = "rug"
    }
    // Étagères de trophées sur le mur nord (décor)
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    // Sortie sud
    m[H - 1][Math.floor(W / 2)] = "doorMat"
    return m
}

// v3.39 — Mini-map sommet du Mont Pasta-Ventoux : 6×6, accessible une fois la cinématique
// du sommet jouée. Contient le PNJ "Secrétaire de l'arène" qui prévient que les champions
// viennent juste de redescendre.
function buildMontSommet(): TileType[][] {
    const W = 7, H = 7
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (x === 0 || x === W - 1 || y === 0) row.push("tree")
            else if (y === H - 1) row.push("grass")  // sud ouvert
            else row.push("grass")
        }
        m.push(row)
    }
    // Sortie sud (descente vers le mont) : case path centrale
    m[H - 1][Math.floor(W / 2)] = "grassTall"
    // Décor : quelques fleurs et rochers (via flowerR/Y et tree)
    m[2][1] = "flowerR"
    m[2][W - 2] = "flowerY"
    m[4][1] = "flowerY"
    m[4][W - 2] = "flowerR"
    return m
}

// v3.35 — Arène de Muscuville : 4 champions aux 4 coins, sortie sud centrale.
function buildArenaMuscuville(): TileType[][] {
    const W = 11, H = 11
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0) row.push("wallH")
            else if (x === 0 || x === W - 1 || y === H - 1) row.push("wallV")
            else row.push("arenaFloor")
        }
        m.push(row)
    }
    // Tapis central (zone de combat)
    for (let y = 4; y <= 6; y++) {
        for (let x = 4; x <= W - 5; x++) m[y][x] = "rug"
    }
    // Sortie sud (au centre)
    m[H - 1][Math.floor(W / 2)] = "doorMat"
    return m
}

// v3.35 — Bibliothèque de Muscuville : layout similaire à Macaron mais sœur érudite + plus de rayons.
function buildBibliothequeMuscuville(): TileType[][] {
    const W = 13, H = 10
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
    // Rangée nord (y=1) : 9 bookshelves "Arbres du Nexus" (cols 2..10)
    for (let x = 2; x <= W - 3; x++) m[1][x] = "bookshelf"
    m[1][1] = "shopShelf"
    m[1][W - 2] = "shopShelf"

    // Rangée thématique (y=3) — "Géographie" / "Arène" / "Histoire"
    m[3][2] = "bookshelf"
    m[3][6] = "bookshelf"
    m[3][W - 3] = "bookshelf"
    m[3][4] = "lectern"
    m[3][W - 5] = "lectern"

    // Statues + comptoir central (y=5)
    m[5][2] = "statue"
    m[5][W - 3] = "statue"
    m[5][5] = "shopCounter"
    m[5][6] = "shopCounter"
    m[5][7] = "shopCounter"

    // Archives (y=7)
    m[7][2] = "bookshelf"
    m[7][6] = "bookshelf"
    m[7][W - 3] = "bookshelf"

    // Sortie sud
    m[H - 1][Math.floor(W / 2)] = "doorMat"
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

    // v3.17c — Décor enrichi : plus d'arbres + fleurs pour casser le côté désertique
    m[2][1] = "tree"; m[2][9] = "tree"
    m[3][2] = "flowerR"; m[3][8] = "flowerY"
    m[4][1] = "tree"
    m[6][9] = "tree"
    m[7][2] = "flowerY"; m[7][8] = "flowerR"

    // Petits parterres autour (existants)
    m[9][2] = "flowerR"; m[9][3] = "flowerY"
    m[9][7] = "flowerY"; m[9][8] = "flowerR"

    // v3.17c — Nouvel arbre fruitier caché parmi les arbres (apple_tree_3)
    // Position : (1, 7) — à l'écart du chemin central, demande de chercher
    m[7][1] = "appleTree"

    // v3.8.7 — Sortie sud vers Pépiteville : hautes herbes (transition automatique).
    // Bande de 3 cases grassTall au sud (cohérent avec l'entrée nord de Pépiteville).
    m[HAUTESPATES_H - 2][4] = "grassTall"
    m[HAUTESPATES_H - 2][5] = "grassTall"
    m[HAUTESPATES_H - 2][6] = "grassTall"

    return m
}

// v3.17c — Identifiant logique du nouvel arbre de Hautes-Pâtes (pattern fruitsTaken existant).
export const HAUTESPATES_APPLE_TREES = [
    { id: "apple_tree_3", x: 1, y: 7, mapId: "hautespates" },
]

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

    // v3.17 — Escaliers triplés (3 cases adjacentes) pour ne pas bloquer entre joueurs
    const mid = Math.floor(W / 2)
    if (hasUpStairs) {
        m[1][mid] = "stairsUp"
        if (mid - 1 >= 1) m[1][mid - 1] = "stairsUp"
        if (mid + 1 <= W - 2) m[1][mid + 1] = "stairsUp"
    }
    if (hasDownStairs) {
        m[H - 2][mid] = "stairsDown"
        if (mid - 1 >= 1) m[H - 2][mid - 1] = "stairsDown"
        if (mid + 1 <= W - 2) m[H - 2][mid + 1] = "stairsDown"
    }
    // doorMat sortie vers Hautes-Pâtes (uniquement floor 1)
    if (hasExit) {
        m[H - 1][Math.floor(W / 2)] = "doorMat"
    }

    return m
}

function buildTowerFloor1(): TileType[][] {
    // 11x11 — rez-de-chaussée : sortie doorMat + stairsUp, pas de stairsDown
    const m = buildTowerFloor(11, false, true, true)
    // v3.17d — 2 tableaux : franss (Philippe) + mools (Jean)
    m[5][10] = "painting"  // est
    m[5][0] = "painting"   // ouest
    return m
}
function buildTowerFloor2(): TileType[][] {
    // 10x10 — stairsDown + stairsUp
    const m = buildTowerFloor(10, true, true, false)
    // v3.17d — 2 tableaux : milkardashian (Etienne) + Xa (Ayrton)
    m[5][9] = "painting"
    m[5][0] = "painting"
    return m
}
function buildTowerFloor3(): TileType[][] {
    const m = buildTowerFloor(9, true, true, false)
    // v3.17d — 2 tableaux : marvin (Marcello) + Gg (Kylian)
    m[4][8] = "painting"
    m[4][0] = "painting"
    return m
}
function buildTowerFloor4(): TileType[][] {
    const m = buildTowerFloor(8, true, true, false)
    // v3.17d — 1 tableau placeholder (slot disponible pour futur 7e joueur)
    m[4][7] = "painting"
    return m
}
function buildTowerFloor5(): TileType[][] {
    // 7x7 — sommet : stairsDown uniquement (l'oiseau PIAFFINI est ailleurs en NPC)
    return buildTowerFloor(7, true, false, false)
}

// v3.17c — Config des tableaux des papas dans la Tour.
// Chaque tableau correspond à un joueur (nicknameMatch case insensitive). Quand un joueur
// regarde SON tableau pour la première fois, il reçoit +100 reps (équivalent 10 pas).
// Les tableaux non assignés sont décoratifs et affichent le lore générique.
export interface PapaTableau {
    mapId: string
    x: number
    y: number
    /** nickname du joueur dont c'est le père. Null = tableau placeholder (lore générique). */
    nicknameMatch: string | null
    papaName: string
    sport: string
    lore: string
}
export const PAPA_TABLEAUX: PapaTableau[] = [
    // Floor 1 — franss + mools
    {
        mapId: "tower_floor_1",
        x: 10,
        y: 5,
        nicknameMatch: "franss",
        papaName: "Philippe",
        sport: "Champion de vélo",
        lore: "Un portrait en sépia. Un homme jeune en maillot jaune, le sourire éclatant, posant sur un vélo. La plaque indique : « PHILIPPE — Champion de vélo. Une légende. »",
    },
    {
        mapId: "tower_floor_1",
        x: 0,
        y: 5,
        nicknameMatch: "mools",
        papaName: "Jean",
        sport: "Champion de tennis de table",
        lore: "Un portrait fier. Un homme tenant une raquette, la balle floue en plein vol. La plaque : « JEAN — Champion de tennis de table. Vitesse et précision. »",
    },
    // Floor 2 — milkardashian + Xa
    {
        mapId: "tower_floor_2",
        x: 9,
        y: 5,
        nicknameMatch: "milkardashian",
        papaName: "Etienne",
        sport: "Champion de vélo",
        lore: "Une photo d'époque. Un cycliste élégant en maillot multicolore, le mollet saillant. Plaque : « ETIENNE — Champion de vélo. Endurance pure. »",
    },
    {
        mapId: "tower_floor_2",
        x: 0,
        y: 5,
        nicknameMatch: "Xa",
        papaName: "Ayrton",
        sport: "Champion automobile",
        lore: "Un portrait dramatique. Un pilote, casque sous le bras, devant une monoplace rouge feu. Plaque : « AYRTON — Très grand champion automobile. Le maître des virages. »",
    },
    // Floor 3 — marvin + Gg
    {
        mapId: "tower_floor_3",
        x: 8,
        y: 4,
        nicknameMatch: "marvin",
        papaName: "Marcello",
        sport: "Le plus grand joueur de billard",
        lore: "Un portrait calme. Un homme penché sur une table de billard, la queue parfaitement alignée. Plaque : « MARCELLO — Le plus grand joueur de billard de tous les temps. »",
    },
    {
        mapId: "tower_floor_3",
        x: 0,
        y: 4,
        nicknameMatch: "Gg",
        papaName: "Kylian",
        sport: "Champion de trail",
        lore: "Un cliché en pleine nature. Un coureur en montagne, transpirant mais souriant. Plaque : « KYLIAN — Très grand champion de trail. Pieds infatigables. »",
    },
    // Floor 4 — Neuneu
    {
        mapId: "tower_floor_4",
        x: 7,
        y: 4,
        nicknameMatch: "Neuneu",
        papaName: "Pierre",
        sport: "Ingénieur du son",
        lore: "Un portrait studio. Un homme aux cheveux argentés, casque sur les oreilles, derrière une console mixage géante. Plaque : « PIERRE — Ingénieur du son hors pair. Celui qui sculpte le silence. »",
    },
]

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
    { id: "pnj_gainax",  name: "GAINAX",  x: 3, y: 5, color: "#48a830", facing: "right", challenge: { kind: "exercise", exercise: "PLANK", reps: 100 } },
    { id: "pnj_champio", name: "CHAMPIO", x: 7, y: 3, color: "#a040d8", facing: "left",  challenge: { kind: "topYesterday" } },
]

export type BridgeChallenge =
    | { kind: "exercise"; exercise: "PUSHUP" | "SQUAT" | "PLANK" | "PULLUP" | "CARDIO"; reps: number }
    | { kind: "topYesterday" }

// ============================================================
// v4.0 Phase 4 — PASTAGONE (hub pentagonal + cellule + 5 bâtiments)
// ============================================================
// Layout outdoor : 15×15. Pentagone stylisé avec 5 bâtiments aux 5 points
// cardinaux + 1 cellule au centre. Tile "pastagoneRoad" partout sauf décor.

const PASTAGONE_W = 15
const PASTAGONE_H = 15

function buildPastagone(): TileType[][] {
    const m: TileType[][] = Array.from({ length: PASTAGONE_H }, () =>
        Array(PASTAGONE_W).fill("pastagoneRoad" as TileType))

    // Bordures fence (effet "enclos")
    for (let x = 0; x < PASTAGONE_W; x++) {
        m[0][x] = "fence"
        m[PASTAGONE_H - 1][x] = "fence"
    }
    for (let y = 0; y < PASTAGONE_H; y++) {
        m[y][0] = "fence"
        m[y][PASTAGONE_W - 1] = "fence"
    }

    // Cellule centrale (2×2) avec doorMat en bas
    m[5][7] = "buildingCellule"
    m[5][8] = "buildingCellule"
    m[6][7] = "buildingCellule"
    m[6][8] = "doorMat"  // entrée cellule

    // 5 bâtiments aux 5 points (pentagonal-ish)
    // Infirmerie (haut-gauche)
    m[2][3] = "buildingInfirmerie"
    m[2][4] = "buildingInfirmerie"
    m[3][3] = "doorMat"
    // Cuisine (haut-droite)
    m[2][10] = "buildingCuisine"
    m[2][11] = "buildingCuisine"
    m[3][11] = "doorMat"
    // Armurerie (bas-gauche)
    m[11][3] = "buildingArmurerie"
    m[11][4] = "buildingArmurerie"
    m[10][3] = "doorMat"
    // Briefing (bas-droite)
    m[11][10] = "buildingBriefing"
    m[11][11] = "buildingBriefing"
    m[10][11] = "doorMat"
    // Tour de Garde (bas centre)
    m[12][7] = "buildingTour"
    m[12][8] = "buildingTour"
    m[11][7] = "doorMat"

    // Sortie nord (vers Vegas) — verrouillée tant que !pastagoneBossBeaten (gérée côté client)
    m[1][7] = "pastagoneRoad"
    m[1][8] = "pastagoneRoad"

    return m
}

// Cellule intérieure 9×7 : table, lampe, chaise, flic CARBONE, porte
const CELLULE_W = 9
const CELLULE_H = 7

function buildPastagoneCellule(): TileType[][] {
    const m: TileType[][] = Array.from({ length: CELLULE_H }, () =>
        Array(CELLULE_W).fill("floorTile" as TileType))

    // Murs
    for (let x = 0; x < CELLULE_W; x++) {
        m[0][x] = "wallH"
        m[CELLULE_H - 1][x] = "wallH"
    }
    for (let y = 0; y < CELLULE_H; y++) {
        m[y][0] = "wallV"
        m[y][CELLULE_W - 1] = "wallV"
    }
    m[0][0] = "wallCorner"
    m[0][CELLULE_W - 1] = "wallCorner"
    m[CELLULE_H - 1][0] = "wallCorner"
    m[CELLULE_H - 1][CELLULE_W - 1] = "wallCorner"

    // Barreaux côté droit (mi-cellule, mi-couloir)
    m[2][6] = "celluleBars"
    m[3][6] = "celluleBars"
    m[4][6] = "celluleBars"

    // Porte de cellule (centre droit, interactive A)
    m[3][7] = "celluleDoor"

    // Table d'interrogatoire + lampe au centre côté cellule
    m[2][3] = "interrogationLamp"
    m[3][3] = "interrogationTable"
    m[3][2] = "interrogationTable"  // table 2 cases

    // Sortie (doorMat) — bloquée tant que !pastagoneEscaped, sinon mène à Pastagone outdoor
    m[CELLULE_H - 1][4] = "doorMat"

    return m
}

// Infirmerie 9×7 — RIGATONI ? Non, FUSILLI : heal 50 reps/soin, max 3/j
function buildPastagoneInfirmerie(): TileType[][] {
    const m: TileType[][] = Array.from({ length: 7 }, () => Array(9).fill("floorTile" as TileType))
    for (let x = 0; x < 9; x++) { m[0][x] = "wallH"; m[6][x] = "wallH" }
    for (let y = 0; y < 7; y++) { m[y][0] = "wallV"; m[y][8] = "wallV" }
    m[0][0] = "wallCorner"; m[0][8] = "wallCorner"; m[6][0] = "wallCorner"; m[6][8] = "wallCorner"
    m[2][4] = "shopCounter"  // comptoir FUSILLI
    m[2][3] = "shopShelf"
    m[2][5] = "shopShelf"
    m[6][4] = "doorMat"
    return m
}

// Cuisine 9×7 — RIGATONI : shop bouffe + énigme BOLOGNION cachée
function buildPastagoneCuisine(): TileType[][] {
    const m: TileType[][] = Array.from({ length: 7 }, () => Array(9).fill("floorTile" as TileType))
    for (let x = 0; x < 9; x++) { m[0][x] = "wallH"; m[6][x] = "wallH" }
    for (let y = 0; y < 7; y++) { m[y][0] = "wallV"; m[y][8] = "wallV" }
    m[0][0] = "wallCorner"; m[0][8] = "wallCorner"; m[6][0] = "wallCorner"; m[6][8] = "wallCorner"
    m[2][4] = "shopCounter"  // comptoir RIGATONI
    m[2][3] = "shopShelf"
    m[2][5] = "shopShelf"
    m[4][2] = "foodBag"  // sacs de pâte (clue énigme BOLOGNION)
    m[4][6] = "foodBag"
    m[6][4] = "doorMat"
    return m
}

// Armurerie 9×7 — PESTO Jr : 4 items wearables Daemon
function buildPastagoneArmurerie(): TileType[][] {
    const m: TileType[][] = Array.from({ length: 7 }, () => Array(9).fill("floorTile" as TileType))
    for (let x = 0; x < 9; x++) { m[0][x] = "wallH"; m[6][x] = "wallH" }
    for (let y = 0; y < 7; y++) { m[y][0] = "wallV"; m[y][8] = "wallV" }
    m[0][0] = "wallCorner"; m[0][8] = "wallCorner"; m[6][0] = "wallCorner"; m[6][8] = "wallCorner"
    m[2][4] = "shopCounter"  // comptoir PESTO Jr
    m[2][2] = "shopShelf"
    m[2][3] = "shopShelf"
    m[2][5] = "shopShelf"
    m[2][6] = "shopShelf"
    m[6][4] = "doorMat"
    return m
}

// Briefing 9×7 — TAGLIA : stats progression + map ennemis
function buildPastagoneBriefing(): TileType[][] {
    const m: TileType[][] = Array.from({ length: 7 }, () => Array(9).fill("floorTile" as TileType))
    for (let x = 0; x < 9; x++) { m[0][x] = "wallH"; m[6][x] = "wallH" }
    for (let y = 0; y < 7; y++) { m[y][0] = "wallV"; m[y][8] = "wallV" }
    m[0][0] = "wallCorner"; m[0][8] = "wallCorner"; m[6][0] = "wallCorner"; m[6][8] = "wallCorner"
    m[2][4] = "interrogationTable"  // table briefing
    m[2][3] = "painting"  // tableau briefing (carte ennemis)
    m[2][5] = "painting"
    m[6][4] = "doorMat"
    return m
}

// Tour de Garde 9×7 — 1 PNJ visible à la fois (rotation aléatoire 25 PNJ)
// ============================================================
// v4.0 — TOUR PULLMAN (4 étages PastaVegas : apothicairerie / forge / transport / magie)
// 9×8 par étage, layout identique avec stairs latéraux.
// ============================================================
function buildVegasShopTowerFloor(opts: {
    /** "first" : stairsUp seul. "middle" : stairsUp + stairsDown. "top" : stairsDown seul. */
    floorKind: "first" | "middle" | "top"
}): TileType[][] {
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
    // shopShelf au nord (y=1)
    for (let x = 1; x < W - 1; x++) m[1][x] = "shopShelf"
    // shopCounter (y=3) sauf au milieu (passage)
    for (let x = 1; x < W - 1; x++) m[3][x] = "shopCounter"
    // Escaliers
    if (opts.floorKind === "first" || opts.floorKind === "middle") {
        m[5][7] = "stairsUp"  // monter
    }
    if (opts.floorKind === "middle" || opts.floorKind === "top") {
        m[5][1] = "stairsDown"  // descendre
    }
    // doorMat sud (sortie vers Vegas outdoor — uniquement RDC, autres étages ont seulement les stairs)
    if (opts.floorKind === "first") {
        m[H - 1][4] = "doorMat"
    }
    return m
}

// ============================================================
// PASTAGONE Buildings + Signs + spawn entries
// ============================================================
export const PASTAGONE_BUILDINGS: Building[] = [
    // Cellule centrale (le joueur sort par là après escape)
    { x: 7, y: 5, w: 2, h: 2, kind: "monsterCave", doorX: 1, doorY: 1, visible: true,
      targetMapId: "pastagone_cellule", displayName: "CELLULE" },
    // Infirmerie (haut-gauche)
    { x: 3, y: 2, w: 2, h: 2, kind: "veterinaire", doorX: 0, doorY: 1, visible: true,
      targetMapId: "pastagone_infirmerie", displayName: "INFIRMERIE" },
    // Cuisine (haut-droite)
    { x: 10, y: 2, w: 2, h: 2, kind: "shop", doorX: 1, doorY: 1, visible: true,
      targetMapId: "pastagone_cuisine", displayName: "CUISINE" },
    // Armurerie (bas-gauche) — building y=11 row, door y=10
    { x: 3, y: 10, w: 2, h: 2, kind: "shop", doorX: 0, doorY: 0, visible: true,
      targetMapId: "pastagone_armurerie", displayName: "ARMURERIE" },
    // Briefing (bas-droite)
    { x: 10, y: 10, w: 2, h: 2, kind: "bibliotheque", doorX: 1, doorY: 0, visible: true,
      targetMapId: "pastagone_briefing", displayName: "BRIEFING" },
    // Tour de Garde (bas centre) — building y=12 row, door y=11
    { x: 7, y: 11, w: 2, h: 2, kind: "tower", doorX: 0, doorY: 0, visible: true,
      targetMapId: "pastagone_tour", displayName: "TOUR" },
]

export const PASTAGONE_SIGNS: Sign[] = [
    { x: 7, y: 13, text: "PASTAGONE\nLe pentagone des chiens flics. Cinq services, une seule sortie : par la porte du Doberman Alpha." },
    { x: 1, y: 7, text: "Tu cherches la sortie ? Trouve le boss." },
]

// Spawn quand le joueur s'évade de la cellule (pose-toi devant la cellule, face sud)
export const PASTAGONE_SPAWN_AFTER_ESCAPE = {
    mapId: "pastagone",
    posX: 8,
    posY: 7,
    direction: "down" as const,
}

// Spawn quand le joueur est arrêté à Vegas et téléporté en cellule
export const PASTAGONE_CELLULE_SPAWN = {
    mapId: "pastagone_cellule",
    posX: 2,
    posY: 4,
    direction: "right" as const,
}

function buildPastagoneTour(): TileType[][] {
    const m: TileType[][] = Array.from({ length: 7 }, () => Array(9).fill("floorTile" as TileType))
    for (let x = 0; x < 9; x++) { m[0][x] = "wallH"; m[6][x] = "wallH" }
    for (let y = 0; y < 7; y++) { m[y][0] = "wallV"; m[y][8] = "wallV" }
    m[0][0] = "wallCorner"; m[0][8] = "wallCorner"; m[6][0] = "wallCorner"; m[6][8] = "wallCorner"
    // Sol arène au centre pour signifier "ring de combat"
    for (let y = 2; y <= 4; y++) for (let x = 3; x <= 5; x++) m[y][x] = "arenaFloor"
    m[6][4] = "doorMat"
    return m
}

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
    // v3.12 — Macaron'île : canal au nord + plage + ville (extension v3.13)
    // eslint-disable-next-line
    macaron_ile: {
        id: "macaron_ile",
        name: "MACARON'ÎLE",
        tiles: buildMacaronIle(),
        width: MACARONILE_W,
        height: MACARONILE_H,
        // exitTarget non utilisé : on a une transition via canal en MapClient
    },
    // v3.22 — Bâtiments 5x5 → doors aux nouvelles positions
    shop_macaron: {
        id: "shop_macaron",
        name: "BOUTIQUE DE TRENETTE",
        tiles: buildShopMacaron(),
        width: 9,
        height: 8,
        exitTarget: { mapId: "macaron_ile", x: 3, y: 9 },
    },
    veterinaire: {
        id: "veterinaire",
        name: "VÉTÉRINAIRE",
        tiles: buildVeterinaire(),
        width: 13,
        height: 10,
        exitTarget: { mapId: "macaron_ile", x: 10, y: 9 },
    },
    bibliotheque: {
        id: "bibliotheque",
        name: "BIBLIOTHÈQUE",
        tiles: buildBibliotheque(),
        width: 13,
        height: 10,
        exitTarget: { mapId: "macaron_ile", x: 3, y: 15 },
    },
    // v3.35 — Arène de Muscuville (4 champions + revanches)
    arena_muscuville: {
        id: "arena_muscuville",
        name: "ARÈNE DE MUSCUVILLE",
        tiles: buildArenaMuscuville(),
        width: 11,
        height: 11,
        exitTarget: { mapId: "muscuville", x: 4, y: 14 },
    },
    // v3.35 — Bibliothèque de Muscuville (sœur de la bibliothécaire Macaron'île)
    bibliotheque_muscuville: {
        id: "bibliotheque_muscuville",
        name: "BIBLIOTHÈQUE DE MUSCUVILLE",
        tiles: buildBibliothequeMuscuville(),
        width: 13,
        height: 10,
        exitTarget: { mapId: "muscuville", x: 12, y: 14 },
    },
    // v3.23b — Mont Pasta-Ventoux (montagne verticale au sud de Muscuville)
    mont_pasta_ventoux: {
        id: "mont_pasta_ventoux",
        name: "MONT PASTA-VENTOUX",
        tiles: buildMontPastaVentoux(),
        width: MONT_W,
        height: MONT_H,
    },
    // v3.39 — Mini-map sommet du Mont (6×6 + secrétaire de l'arène)
    mont_sommet: {
        id: "mont_sommet",
        name: "SOMMET DU MONT PASTA-VENTOUX",
        tiles: buildMontSommet(),
        width: 7,
        height: 7,
        // Pas d'exitTarget : la sortie se fait via grassTall sud (transit auto vers mont_pasta_ventoux).
    },
    // v3.24a — Lasagnas Vegas (ville opulente à l'ouest de Muscuville, casinos + mafia)
    lasagnas_vegas: {
        id: "lasagnas_vegas",
        name: "LASAGNAS VEGAS",
        tiles: buildLasagnasVegas(),
        width: LASAGNAS_W,
        height: LASAGNAS_H,
    },
    // v3.24a — Placeholder unique pour les intérieurs Vegas non implémentés
    // Sera remplacé par les vrais intérieurs (hôtel, 3 shops, 3 casinos, bar TB) dans les commits suivants.
    lasagnas_construction: {
        id: "lasagnas_construction",
        name: "EN CONSTRUCTION",
        tiles: buildLasagnasConstruction(),
        width: 7,
        height: 6,
        exitTarget: { mapId: "lasagnas_vegas", x: 11, y: 10 },
    },
    // v3.24a-2 — Intérieurs de Lasagnas Vegas (4 d'entre eux ce commit)
    lasagnas_hotel: {
        id: "lasagnas_hotel",
        name: "HÔTEL BELLAGIOMATO",
        tiles: buildLasagnasHotel(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "lasagnas_vegas", x: 2, y: 8 },
    },
    lasagnas_shop_habits: {
        id: "lasagnas_shop_habits",
        name: "SHOP HABITS",
        tiles: buildLasagnasShopHabits(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "lasagnas_vegas", x: 7, y: 8 },
    },
    lasagnas_shop_bouffe: {
        id: "lasagnas_shop_bouffe",
        name: "SHOP BOUFFE",
        tiles: buildLasagnasShopBouffe(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "lasagnas_vegas", x: 12, y: 8 },
    },
    lasagnas_shop_rachat: {
        id: "lasagnas_shop_rachat",
        name: "RECYCLOMATO",
        tiles: buildLasagnasShopRachat(),
        width: 9,
        height: 7,
        // v4.0 audit-doors fix : était (7, 20) = "water" (bloquant). Décalé à (8, 20) = grass adjacent au door.
        exitTarget: { mapId: "lasagnas_vegas", x: 8, y: 20 },
    },
    // v3.24c — Bar Team Boulette + bureau Il Capo
    lasagnas_tb_bar: {
        id: "lasagnas_tb_bar",
        name: "BAR DE LA TEAM BOULETTE",
        tiles: buildLasagnasTbBar(),
        width: 11,
        height: 8,
        exitTarget: { mapId: "lasagnas_vegas", x: 2, y: 20 },
    },
    lasagnas_tb_bureau: {
        id: "lasagnas_tb_bureau",
        name: "BUREAU DE IL CAPO",
        tiles: buildLasagnasTbBureau(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "lasagnas_tb_bar", x: 5, y: 6 },
    },
    // v3.24b — Casino 3 maps (Hall, Salle de jeux, VIP)
    lasagnas_casino_a: {
        id: "lasagnas_casino_a",
        name: "CASINO — HALL",
        tiles: buildLasagnasCasinoA(),
        width: 12,
        height: 9,
        exitTarget: { mapId: "lasagnas_vegas", x: 18, y: 8 },
    },
    lasagnas_casino_b: {
        id: "lasagnas_casino_b",
        name: "CASINO — SALLE DE JEUX",
        tiles: buildLasagnasCasinoB(),
        width: 12,
        height: 9,
        exitTarget: { mapId: "lasagnas_vegas", x: 12, y: 20 },
    },
    lasagnas_casino_c: {
        id: "lasagnas_casino_c",
        name: "CASINO — VIP",
        tiles: buildLasagnasCasinoC(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "lasagnas_vegas", x: 18, y: 20 },
    },
    // v3.17c — La mer (canal navigable inséré entre Bourg-Boulette et Macaron'île)
    la_mer: {
        id: "la_mer",
        name: "LA MER",
        tiles: buildLaMer(),
        width: LAMER_W,
        height: LAMER_H,
    },
    // v3.16 — Hautes herbes du sud + Muscuville
    grass_sud: {
        id: "grass_sud",
        name: "HAUTES HERBES DU SUD",
        tiles: buildGrassSud(),
        width: GRASS_SUD_W,
        height: GRASS_SUD_H,
    },
    muscuville: {
        id: "muscuville",
        name: "MUSCUVILLE",
        tiles: buildMuscuville(),
        width: MUSCUVILLE_W,
        height: MUSCUVILLE_H,
    },
    // v3.23 — Bâtiments intérieurs de Muscuville
    bike_shop: {
        id: "bike_shop",
        name: "MAGASIN DE VÉLOS",
        tiles: buildBikeShop(),
        width: 9,
        height: 8,
        exitTarget: { mapId: "muscuville", x: 3, y: 5 },
    },
    gym_muscuville: {
        id: "gym_muscuville",
        name: "GYM DE MUSCUVILLE",
        tiles: buildGymMuscuville(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "muscuville", x: 13, y: 5 },
    },
    casino_muscuville: {
        id: "casino_muscuville",
        name: "CASINO DE MUSCUVILLE",
        tiles: buildCasinoMuscuville(),
        width: 10,
        height: 8,
        exitTarget: { mapId: "muscuville", x: 3, y: 10 },
    },
    contest_hall: {
        id: "contest_hall",
        name: "SALLE DES CONCOURS",
        tiles: buildContestHall(),
        width: 11,
        height: 9,
        exitTarget: { mapId: "muscuville", x: 13, y: 10 },
    },
    // === v3.8.2 — Hautes-Pâtes et sa Tour ===
    hautespates: {
        id: "hautespates",
        name: "HAUTES-PÂTES",
        tiles: buildHautesPates(),
        width: HAUTESPATES_W,
        height: HAUTESPATES_H,
        // Pas d'exitTarget : la sortie se fait via grassTall sud (transit auto vers pepiteville).
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
    // v4.0 Phase 4 — Pastagone (hub pentagonal outdoor + cellule + 5 bâtiments)
    pastagone: {
        id: "pastagone",
        name: "PASTAGONE",
        tiles: buildPastagone(),
        width: PASTAGONE_W,
        height: PASTAGONE_H,
    },
    pastagone_cellule: {
        id: "pastagone_cellule",
        name: "CELLULE PASTAGONE",
        tiles: buildPastagoneCellule(),
        width: CELLULE_W,
        height: CELLULE_H,
        // v4.0 audit-doors fix : était (8, 6) = doorMat (boucle d'entrée infinie).
        // Décalé à (8, 7) = pastagoneRoad walkable, juste sud du door cellule.
        exitTarget: { mapId: "pastagone", x: 8, y: 7 },
    },
    pastagone_infirmerie: {
        id: "pastagone_infirmerie",
        name: "INFIRMERIE — FUSILLI",
        tiles: buildPastagoneInfirmerie(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "pastagone", x: 3, y: 4 },
    },
    pastagone_cuisine: {
        id: "pastagone_cuisine",
        name: "CUISINE — RIGATONI",
        tiles: buildPastagoneCuisine(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "pastagone", x: 11, y: 4 },
    },
    pastagone_armurerie: {
        id: "pastagone_armurerie",
        name: "ARMURERIE — PESTO Jr",
        tiles: buildPastagoneArmurerie(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "pastagone", x: 3, y: 9 },
    },
    pastagone_briefing: {
        id: "pastagone_briefing",
        name: "BRIEFING — TAGLIA",
        tiles: buildPastagoneBriefing(),
        width: 9,
        height: 7,
        exitTarget: { mapId: "pastagone", x: 11, y: 9 },
    },
    pastagone_tour: {
        id: "pastagone_tour",
        name: "TOUR DE GARDE",
        tiles: buildPastagoneTour(),
        width: 9,
        height: 7,
        // v4.0 audit-doors fix : était (7, 11) = doorMat (boucle d'entrée infinie).
        // Décalé à (7, 10) = pastagoneRoad walkable, juste nord du door tour.
        exitTarget: { mapId: "pastagone", x: 7, y: 10 },
    },
    // v4.0 — Tour Pullman PastaVegas (4 étages)
    vegas_shoptower_1: {
        id: "vegas_shoptower_1",
        name: "APOTHICAIRERIE — MARY MALONE",
        tiles: buildVegasShopTowerFloor({ floorKind: "first" }),
        width: 9,
        height: 8,
        // Sortie sud → Vegas devant la tour (porte à 22, 7 = building.x=22, w=2, doorY=3)
        // On revient à (22, 8) qui est juste sous la porte. Vegas est 24×24, vérifier walkable.
        exitTarget: { mapId: "lasagnas_vegas", x: 22, y: 8 },
    },
    vegas_shoptower_2: {
        id: "vegas_shoptower_2",
        name: "FORGE — IOREK",
        tiles: buildVegasShopTowerFloor({ floorKind: "middle" }),
        width: 9,
        height: 8,
        // v4.0 audit-doors : pas de doorMat (transition via stairs). exitTarget retiré.
    },
    vegas_shoptower_3: {
        id: "vegas_shoptower_3",
        name: "TRANSPORT — LEE SCORESBY",
        tiles: buildVegasShopTowerFloor({ floorKind: "middle" }),
        width: 9,
        height: 8,
    },
    vegas_shoptower_4: {
        id: "vegas_shoptower_4",
        name: "MAGIE — SERAFINA",
        tiles: buildVegasShopTowerFloor({ floorKind: "top" }),
        width: 9,
        height: 8,
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

// v3.17c — La mer s'insère entre Bourg-Boulette (sud) et Macaron'île (canal nord).
// Bourg sud waterShallow (7,15)/(8,15) → la_mer (4, 1) heading down.
// la_mer (4, 0) → retour Bourg (8, 14) heading up.
// la_mer (4, H-1=9) → Macaron'île (7, 1) canal entry heading down.
// Macaron'île (7, 0) → retour la_mer (4, H-2=8) heading up.
export const LAMER_SPAWN_FROM_BOURG = {
    mapId: "la_mer",
    posX: 4,
    posY: 1,
    direction: "down" as const,
}
export const BOURG_SPAWN_FROM_LAMER = {
    mapId: "bourgpates",
    posX: 8,
    posY: 14,
    direction: "up" as const,
}
export const MACARONILE_SPAWN_FROM_LAMER = {
    mapId: "macaron_ile",
    posX: 7,
    posY: 1,
    direction: "down" as const,
}
export const LAMER_SPAWN_FROM_MACARONILE = {
    mapId: "la_mer",
    posX: 4,
    posY: LAMER_H - 2,
    direction: "up" as const,
}

// ============================================================
// v3.22 — INDOOR MAPS (mouvement gratuit) + FAST TRAVEL
// ============================================================
// Maps "intérieures" : les déplacements y sont gratuits (0 reps/case).
// L'idée : une fois que tu es dans un bâtiment, tu te déplaces librement pour interagir.
export const INDOOR_MAP_IDS = new Set([
    "gym",
    "casino",
    "cave",
    "gym_pepite",
    "casino_pepite",
    "shop_interior",
    "shop_macaron",
    "veterinaire",
    "bibliotheque",
    "tower_floor_1",
    "tower_floor_2",
    "tower_floor_3",
    "tower_floor_4",
    "tower_floor_5",
    // v3.23 — Bâtiments intérieurs de Muscuville
    "bike_shop",
    "gym_muscuville",
    "casino_muscuville",
    "contest_hall",
    // v3.24a — Lasagnas Vegas (placeholder + intérieurs à venir)
    "lasagnas_construction",
    // v3.24a-2 — Intérieurs fonctionnels Vegas
    "lasagnas_hotel",
    "lasagnas_shop_habits",
    "lasagnas_shop_bouffe",
    "lasagnas_shop_rachat",
    // v3.24b — 3 maps casino Vegas
    "lasagnas_casino_a",
    "lasagnas_casino_b",
    "lasagnas_casino_c",
    // v3.24c — Bar Team Boulette + bureau Il Capo
    "lasagnas_tb_bar",
    "lasagnas_tb_bureau",
    // v3.35 — Arène et bibliothèque de Muscuville
    "arena_muscuville",
    "bibliotheque_muscuville",
    // v3.39 — Sommet du Mont Pasta-Ventoux (mini-map)
    "mont_sommet",
])

export function isIndoorMap(mapId: string): boolean {
    return INDOOR_MAP_IDS.has(mapId)
}

// Villes que le joueur peut visiter (et donc débloquer pour fast travel)
export const TRAVEL_TOWN_IDS = ["bourgpates", "pepiteville", "hautespates", "macaron_ile", "muscuville"] as const
export type TravelTownId = typeof TRAVEL_TOWN_IDS[number]

export interface TownSpawn {
    mapId: string
    name: string
    posX: number
    posY: number
    direction: "up" | "down" | "left" | "right"
}

// Points de spawn pour le fast travel — choisi à l'endroit où "tout commence" dans chaque ville
export const TOWN_SPAWN_POINTS: Record<TravelTownId, TownSpawn> = {
    bourgpates: { mapId: "bourgpates", name: "Bourg-Boulette", posX: 7, posY: 12, direction: "down" },
    pepiteville: { mapId: "pepiteville", name: "Pépiteville", posX: 8, posY: 16, direction: "up" },
    hautespates: { mapId: "hautespates", name: "Hautes-Pâtes", posX: 5, posY: 11, direction: "up" },
    macaron_ile: { mapId: "macaron_ile", name: "Macaron'île", posX: 6, posY: 11, direction: "up" },
    muscuville: { mapId: "muscuville", name: "Muscuville", posX: 6, posY: 5, direction: "down" },
}

// v3.16 — Transitions sud Macaron'île ↔ grass_sud ↔ Muscuville
// Quand le joueur marche sur la grassTall (6 ou 7, 21) de Macaron'île → entrée dans grass_sud
export const GRASS_SUD_SPAWN_FROM_NORTH = {
    mapId: "grass_sud",
    posX: 4,
    posY: 2,
    direction: "down" as const,
}
// v3.22 — Rebasé sur MACARONILE_H=17 : spawn juste au-dessus du grassTall sud (y=15) sur path
export const MACARONILE_SPAWN_FROM_GRASS_SUD = {
    mapId: "macaron_ile",
    posX: 6,
    posY: 14,
    direction: "up" as const,
}
// v3.23 — Muscuville agrandie : grassTall nord en col 8, spawn juste en dessous
export const MUSCUVILLE_SPAWN_FROM_NORTH = {
    mapId: "muscuville",
    posX: 8,
    posY: 2,
    direction: "down" as const,
}
// Retour vers grass_sud depuis Muscuville (grassTall en (6, 0))
export const GRASS_SUD_SPAWN_FROM_SOUTH = {
    mapId: "grass_sud",
    posX: 4,
    posY: GRASS_SUD_H - 3,
    direction: "up" as const,
}
