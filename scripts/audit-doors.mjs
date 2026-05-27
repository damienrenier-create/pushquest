// Audit complet des portes (entrée + sortie) de toutes les maps.
// - Pour chaque interior (a un exitTarget) : vérifie INTERIOR_ENTRY_POSITIONS + exitTarget + walkability.
// - Pour chaque outdoor avec buildings : vérifie chaque building.door = walkable.
//
// Run : node scripts/audit-doors.mjs

import { MAPS } from "../src/lib/gamebook/maps.ts"
import { INTERIOR_ENTRY_POSITIONS, isBlockingTile } from "../src/lib/gamebook/mapEngine.ts"

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const YEL = "\x1b[33m"
const GRN = "\x1b[32m"
const CYAN = "\x1b[36m"

let errors = 0
let warns = 0
const log = (lvl, msg) => {
    const tag = lvl === "err" ? RED + "[ERR]" + RESET
        : lvl === "warn" ? YEL + "[WARN]" + RESET
            : lvl === "ok" ? GRN + "[OK]" + RESET
                : CYAN + "[" + lvl + "]" + RESET
    console.log(`${tag} ${msg}`)
    if (lvl === "err") errors++
    if (lvl === "warn") warns++
}

const tileAt = (map, x, y) => {
    if (!map?.tiles || y < 0 || y >= map.tiles.length) return null
    const row = map.tiles[y]
    if (!row || x < 0 || x >= row.length) return null
    return row[x]
}

const findTilePositions = (map, predicate) => {
    const positions = []
    for (let y = 0; y < map.tiles.length; y++) {
        for (let x = 0; x < map.tiles[y].length; x++) {
            if (predicate(map.tiles[y][x])) positions.push({ x, y })
        }
    }
    return positions
}

console.log(`\n${CYAN}━━━ AUDIT DES PORTES PUSHQUEST ━━━${RESET}\n`)

// ============================================================
// 1. Pour chaque interior (a un exitTarget) :
// ============================================================
console.log(`${CYAN}── 1. INTERIEURS (exitTarget) ──${RESET}`)
for (const [mapId, map] of Object.entries(MAPS)) {
    if (!map.exitTarget) continue
    const doorMats = findTilePositions(map, (t) => t === "doorMat")
    if (doorMats.length === 0) {
        log("err", `${mapId} : exitTarget défini mais AUCUN doorMat dans la map !`)
        continue
    }
    if (doorMats.length > 1) {
        log("warn", `${mapId} : ${doorMats.length} doorMats trouvés (multi-portes). Premier : (${doorMats[0].x},${doorMats[0].y})`)
    }
    const doorMat = doorMats[0]

    // Vérif INTERIOR_ENTRY_POSITIONS
    const entry = INTERIOR_ENTRY_POSITIONS[mapId]
    if (!entry) {
        log("err", `${mapId} : MANQUE dans INTERIOR_ENTRY_POSITIONS. Le joueur risque de spawner sur la valeur défaut (4,6) qui peut être invalide.`)
    } else {
        const entryTile = tileAt(map, entry.x, entry.y)
        if (!entryTile) {
            log("err", `${mapId} : INTERIOR_ENTRY_POSITIONS pointe sur (${entry.x},${entry.y}) — HORS MAP.`)
        } else if (entryTile === "doorMat") {
            log("err", `${mapId} : INTERIOR_ENTRY_POSITIONS pointe sur (${entry.x},${entry.y}) — c'est un doorMat ! Le joueur va re-sortir instantanément.`)
        } else if (isBlockingTile(entryTile)) {
            log("err", `${mapId} : INTERIOR_ENTRY_POSITIONS pointe sur (${entry.x},${entry.y}) = "${entryTile}" — BLOQUANT.`)
        } else {
            // Vérifie aussi que entry est adjacent au doorMat (sinon spawn bizarre)
            const adjacent = Math.abs(entry.x - doorMat.x) + Math.abs(entry.y - doorMat.y) === 1
            if (!adjacent) {
                log("warn", `${mapId} : entry (${entry.x},${entry.y}) PAS adjacente au doorMat (${doorMat.x},${doorMat.y}) — distance ${Math.abs(entry.x - doorMat.x) + Math.abs(entry.y - doorMat.y)}.`)
            } else {
                log("ok", `${mapId} : entry (${entry.x},${entry.y}) face ${entry.direction}, doorMat (${doorMat.x},${doorMat.y}), tile="${entryTile}" ✓`)
            }
        }
    }

    // Vérif exitTarget : tile cible doit être walkable
    const target = map.exitTarget
    const targetMap = MAPS[target.mapId]
    if (!targetMap) {
        log("err", `${mapId} : exitTarget pointe sur mapId "${target.mapId}" INEXISTANT.`)
        continue
    }
    const targetTile = tileAt(targetMap, target.x, target.y)
    if (!targetTile) {
        log("err", `${mapId} : exitTarget (${target.mapId}, ${target.x}, ${target.y}) — HORS MAP cible.`)
    } else if (isBlockingTile(targetTile)) {
        log("err", `${mapId} : exitTarget (${target.mapId}, ${target.x}, ${target.y}) tombe sur "${targetTile}" BLOQUANT.`)
    } else if (targetTile === "doorMat") {
        log("warn", `${mapId} : exitTarget (${target.mapId}, ${target.x}, ${target.y}) tombe sur un doorMat — risque de boucle.`)
    }
}

// ============================================================
// 2. Pour chaque outdoor : vérifie chaque building.door = walkable + adjacent à un chemin
// ============================================================
console.log(`\n${CYAN}── 2. PORTES DE BÂTIMENTS (extérieurs) ──${RESET}`)
const mapsByModule = await import("../src/lib/gamebook/maps.ts")
const buildingArrays = {
    bourgpates: mapsByModule.OUTDOOR_BUILDINGS_BASE,
    pepiteville: mapsByModule.PEPITEVILLE_BUILDINGS,
    hautespates: mapsByModule.HAUTESPATES_BUILDINGS,
    macaron_ile: mapsByModule.MACARONILE_BUILDINGS,
    muscuville: mapsByModule.MUSCUVILLE_BUILDINGS,
    lasagnas_vegas: mapsByModule.LASAGNAS_BUILDINGS,
    pastagone: mapsByModule.PASTAGONE_BUILDINGS,
}

for (const [outdoorMapId, buildings] of Object.entries(buildingArrays)) {
    if (!buildings) {
        log("warn", `${outdoorMapId} : pas d'export buildings`)
        continue
    }
    const outdoorMap = MAPS[outdoorMapId]
    if (!outdoorMap) {
        log("err", `${outdoorMapId} : map inexistante alors qu'il a des buildings`)
        continue
    }
    for (const b of buildings) {
        const doorX = b.x + b.doorX
        const doorY = b.y + b.doorY
        const tile = tileAt(outdoorMap, doorX, doorY)
        const tgt = b.targetMapId ?? `(kind ${b.kind})`

        if (!tile) {
            log("err", `${outdoorMapId} → ${tgt} : door (${doorX},${doorY}) HORS MAP`)
            continue
        }
        // La door peut être walkable même si la tile sous-jacente est bloquante visuellement,
        // car la mapEngine handle door = bypass blocking. On le tolère mais on warn.
        if (isBlockingTile(tile) && tile !== "doorMat") {
            log("warn", `${outdoorMapId} → ${tgt} : door (${doorX},${doorY}) tile="${tile}" BLOQUANT — mapEngine bypass mais risqué.`)
        } else if (tile === "doorMat" || !isBlockingTile(tile)) {
            log("ok", `${outdoorMapId} → ${tgt} : door (${doorX},${doorY}) tile="${tile}" ✓`)
        }

        // Vérifie aussi que la map cible existe + a un exitTarget cohérent
        if (b.targetMapId) {
            const t = MAPS[b.targetMapId]
            if (!t) {
                log("err", `  └─ targetMapId "${b.targetMapId}" INEXISTANTE dans MAPS`)
            } else if (!t.exitTarget) {
                log("warn", `  └─ targetMapId "${b.targetMapId}" n'a PAS d'exitTarget (pas de retour automatique)`)
            } else if (t.exitTarget.mapId !== outdoorMapId) {
                log("warn", `  └─ targetMapId "${b.targetMapId}" exitTarget vers "${t.exitTarget.mapId}" — pas la même outdoor (${outdoorMapId}).`)
            }
        }
    }
}

console.log(`\n${CYAN}━━━ FIN AUDIT — ${errors} erreurs, ${warns} warns ━━━${RESET}\n`)
process.exit(errors > 0 ? 1 : 0)
