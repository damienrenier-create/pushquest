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
const NPCS = [{ x: 9, y: 6, label: "AUTEL", color: "#b98ae6" }]
const SPAWN = { x: 9, y: 8, label: "spawn" }
const EXIT = { x: 9, y: 9, label: "↧ hub" }

const TILE = 48, L = 34, TOP = 32, MARGIN = 10
const fullW = L + W * TILE + MARGIN, fullH = TOP + H * TILE + MARGIN

async function main() {
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
    s.push(box(EXIT.x, EXIT.y, "#2f7ae0", EXIT.label, "🚪"))
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
