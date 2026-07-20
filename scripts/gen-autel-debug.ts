// scripts/gen-autel-debug.ts
//
// DEBUG MAP de l'AUTEL DE LA CHIMÈRE (yellow_combat_autel, 18×10). Importe les VRAIES collisions de la map
// (YELLOW_MAPS + isBlockingTile) → superpose à l'art : sol praticable / mur, PNJ autel, spawn, sortie, coord/case.
//   npx tsx scripts/gen-autel-debug.ts
import { mkdirSync } from "fs"
import { join } from "path"
import sharp from "sharp"
import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"
import { isBlockingTile } from "../src/lib/gamebook/mapEngine"

const map = YELLOW_MAPS["yellow_combat_autel"]
const W = map.width, H = map.height
const tiles = map.tiles

// PNJ / repères (npcs.ts + maps.ts).
const NPCS = [
    { x: 9, y: 6, label: "COMBAT", color: "#b98ae6" },
    { x: 2, y: 6, label: "PC-G", color: "#3ad0c0" }, { x: 3, y: 6, label: "PC-G", color: "#3ad0c0" },
    { x: 14, y: 6, label: "PC-D", color: "#3ad0c0" }, { x: 15, y: 6, label: "PC-D", color: "#3ad0c0" },
]
const SPAWN = { x: 9, y: 8, label: "spawn" }
const EXITS = [{ x: 8, y: 9, label: "↧ hub" }, { x: 9, y: 9, label: "↧ hub" }]
const EXIT_LEAGUE = [{ x: 8, y: 1, label: "↥ LIGUE" }, { x: 9, y: 1, label: "↥ LIGUE" }]

const TILE = 48, L = 34, TOP = 32, MARGIN = 10
const fullW = L + W * TILE + MARGIN, fullH = TOP + H * TILE + MARGIN

// BFS de connectivité depuis le spawn (les PNJ bloquent leur case) → la porte Ligue / hub / PC sont-ils atteignables ?
function checkReachability() {
    const npcBlocked = new Set(NPCS.map((n) => `${n.x},${n.y}`))
    const walkable = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && !isBlockingTile(tiles[y][x]) && !npcBlocked.has(`${x},${y}`)
    const seen = new Set([`${SPAWN.x},${SPAWN.y}`]); const q: [number, number][] = [[SPAWN.x, SPAWN.y]]
    while (q.length) { const [x, y] = q.shift()!; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!seen.has(k) && walkable(nx, ny)) { seen.add(k); q.push([nx, ny]) } } }
    const ligue = EXIT_LEAGUE.every((e) => seen.has(`${e.x},${e.y}`))
    const hub = EXITS.every((e) => seen.has(`${e.x},${e.y}`))
    const pc = [[2, 7], [3, 7], [14, 7], [15, 7]].every(([x, y]) => seen.has(`${x},${y}`))
    console.log(`🧭 REACHABILITY depuis spawn (9,8) : Ligue(8,1)(9,1)=${ligue ? "✅" : "❌"} · Hub(8,9)(9,9)=${hub ? "✅" : "❌"} · PC(2,7)(3,7)(14,7)(15,7)=${pc ? "✅" : "❌"}`)
}

async function main() {
    checkReachability()
    const s: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = L + x * TILE, py = TOP + y * TILE
        const blocked = isBlockingTile(tiles[y][x])
        s.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="${blocked ? "rgba(200,40,40,0.42)" : "rgba(40,200,90,0.26)"}"/>`)
        s.push(`<text x="${px + TILE / 2}" y="${py + TILE - 5}" fill="#fff" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
    const box = (x: number, y: number, color: string, label: string, glyph = "") => {
        let g = `<rect x="${L + x * TILE + 3}" y="${TOP + y * TILE + 3}" width="${TILE - 6}" height="${TILE - 6}" fill="none" stroke="${color}" stroke-width="3" rx="6"/>`
        g += `<text x="${L + x * TILE + TILE / 2}" y="${TOP + y * TILE + 15}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="8.5" font-weight="bold" text-anchor="middle">${label}</text>`
        if (glyph) g += `<text x="${L + x * TILE + TILE / 2}" y="${TOP + y * TILE + TILE - 15}" font-size="17" text-anchor="middle">${glyph}</text>`
        return g
    }
    for (const n of NPCS) {
        s.push(box(n.x, n.y, n.color, n.label, "🧬"))
        s.push(`<text x="${L + n.x * TILE + TILE / 2}" y="${TOP + (n.y + 1) * TILE + TILE / 2 + 4}" fill="${n.color}" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="16" font-weight="bold" text-anchor="middle">▲</text>`) // interaction depuis y+1
    }
    s.push(box(SPAWN.x, SPAWN.y, "#e0b020", SPAWN.label, "★"))
    for (const e of EXITS) s.push(box(e.x, e.y, "#2f7ae0", e.label, "🚪"))
    for (const e of EXIT_LEAGUE) s.push(box(e.x, e.y, "#ff5cc8", e.label, "⚔️"))
    for (let x = 0; x <= W; x++) { const p = L + x * TILE; s.push(`<line x1="${p}" y1="${TOP}" x2="${p}" y2="${TOP + H * TILE}" stroke="#000a" stroke-width="${x % 5 === 0 ? 1.4 : 0.5}"/>`); if (x < W) s.push(`<text x="${p + TILE / 2}" y="${TOP - 8}" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">${x}</text>`) }
    for (let y = 0; y <= H; y++) { const p = TOP + y * TILE; s.push(`<line x1="${L}" y1="${p}" x2="${L + W * TILE}" y2="${p}" stroke="#000a" stroke-width="${y % 5 === 0 ? 1.4 : 0.5}"/>`); if (y < H) s.push(`<text x="6" y="${p + TILE / 2 + 4}" fill="#fff" font-size="11" font-weight="bold">${y}</text>`) }
    s.push(`<text x="${L}" y="${TOP + H * TILE + 7}" fill="#fff" font-size="10.5" font-weight="bold">AUTEL DE LA CHIMÈRE (yellow_combat_autel) 18x10 — vert=sol · rouge=bloqué · 🧬=PNJ (▲=case interaction) · ★=spawn · 🚪=sortie</text>`)
    s.push(`</svg>`)

    const OUT_DIR = join(process.cwd(), "debug-maps"); mkdirSync(OUT_DIR, { recursive: true })
    const art = await sharp(join(process.cwd(), "public/yellow/sprites/fusion_altar.png")).resize(W * TILE, H * TILE, { fit: "fill" }).toBuffer()
    const out = join(OUT_DIR, "autel_debug.png")
    await sharp({ create: { width: fullW, height: fullH, channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
        .composite([{ input: art, top: TOP, left: L }, { input: Buffer.from(s.join("")), top: 0, left: 0 }])
        .png().toFile(out)
    console.log("✅", out, `(${fullW}x${fullH})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
