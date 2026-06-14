// scripts/gen-centrale-map.ts
//
// Extrait la grille de collisions de la CENTRALE ÉLECTRIQUE depuis centrale.png (labyrinthe
// gris : sol clair = walkable, formes sombres = murs/rochers/machines). Règle Sartah : « les
// cases jaunes (le sol) sont les seules walkables ». Sort une carte ASCII (# = mur, . = sol)
// + un overlay PNG (art + rouge/vert + coordonnée par case) pour validation visuelle.
//   npx tsx scripts/gen-centrale-map.ts "<chemin centrale.png>"

import { mkdirSync } from "fs"
import { join } from "path"
import sharp from "sharp"

const SRC = process.argv[2] ?? "C:/Users/Sartay/Downloads/centrale colorisée.png"
const W = 40, H = 36 // grille (1083x976 ≈ 40x36 tuiles ~27px ; idem grayscale 638x575)

async function main() {
    const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const cw = info.width / W, ch = info.height / H
    const rgb = (X: number, Y: number) => {
        const ix = Math.min(info.width - 1, Math.max(0, Math.round(X)))
        const iy = Math.min(info.height - 1, Math.max(0, Math.round(Y)))
        const i = (iy * info.width + ix) * info.channels
        return [data[i], data[i + 1], data[i + 2]] as const
    }
    // Le SOL walkable = beige/crème (R,G hauts, B plus bas) OU jaune hachuré (hazard). Tout le
    // reste = mur : rochers bruns (R>G>B mais G bas), machines bleu/violet (B haut), tuyaux gris
    // (R≈G≈B moyen), grout sombre. Une case est SOL si la majorité de ses pixels sont beige/jaune.
    const isFloor = (r: number, g: number, b: number) => r > 175 && g > 150 && r - b > 25
    const rows: string[] = []
    let walls = 0
    for (let y = 0; y < H; y++) {
        let row = ""
        for (let x = 0; x < W; x++) {
            let floor = 0, n = 0
            for (let sy = 0.18; sy < 0.86; sy += 0.1) for (let sx = 0.12; sx < 0.9; sx += 0.08) {
                const [r, g, b] = rgb((x + sx) * cw, (y + sy) * ch)
                if (isFloor(r, g, b)) floor++
                n++
            }
            const wall = floor / n < 0.5
            if (wall) walls++
            row += wall ? "#" : "."
        }
        rows.push(row)
    }
    console.log("     " + Array.from({ length: W }, (_, x) => x % 10).join(""))
    rows.forEach((r, y) => console.log(String(y).padStart(3, " ") + "  " + r))
    console.log(`\nmurs=${walls} sol=${W * H - walls}`)
    console.log("ROWS_JSON=" + JSON.stringify(rows))

    // --- Overlay : art + tint rouge(mur)/vert(sol) + coordonnée par case + grille ---
    const TILE = 22, L = 26, T = 26, LEG = 70
    const fullW = L + W * TILE + 8, fullH = T + H * TILE + LEG
    const s: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const wall = rows[y][x] === "#"
        const pxx = L + x * TILE, pyy = T + y * TILE
        s.push(`<rect x="${pxx}" y="${pyy}" width="${TILE}" height="${TILE}" fill="${wall ? "#d62828" : "#2ecc40"}" opacity="${wall ? 0.42 : 0.12}"/>`)
        s.push(`<text x="${pxx + TILE / 2}" y="${pyy + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="8" text-anchor="middle">${x},${y}</text>`)
    }
    for (let x = 0; x <= W; x++) { const p = L + x * TILE, hv = x % 5 === 0; s.push(`<line x1="${p}" y1="${T}" x2="${p}" y2="${T + H * TILE}" stroke="${hv ? "#000a" : "#0004"}" stroke-width="${hv ? 1.1 : 0.4}"/>`); if (hv && x < W) s.push(`<text x="${p + 2}" y="${T - 8}" fill="#fff" font-size="10">${x}</text>`) }
    for (let y = 0; y <= H; y++) { const p = T + y * TILE, hv = y % 5 === 0; s.push(`<line x1="${L}" y1="${p}" x2="${L + W * TILE}" y2="${p}" stroke="${hv ? "#000a" : "#0004"}" stroke-width="${hv ? 1.1 : 0.4}"/>`); if (hv && y < H) s.push(`<text x="4" y="${p + 13}" fill="#fff" font-size="10">${y}</text>`) }
    s.push(`<text x="${L}" y="${T + H * TILE + 26}" fill="#fff" font-size="13" font-weight="bold">CENTRALE — ${W}x${H} — rouge=mur, vert=sol(walkable)</text>`)
    s.push(`</svg>`)

    const OUT = join(process.cwd(), "debug-maps"); mkdirSync(OUT, { recursive: true })
    const art = await sharp(SRC).resize(W * TILE, H * TILE, { kernel: "nearest" }).toBuffer()
    await sharp({ create: { width: fullW, height: fullH, channels: 4, background: { r: 24, g: 24, b: 24, alpha: 1 } } })
        .composite([{ input: art, top: T, left: L }, { input: Buffer.from(s.join("")), top: 0, left: 0 }])
        .png().toFile(join(OUT, "centrale_overlay.png"))
    console.log("✅ debug-maps/centrale_overlay.png")
}
main().catch((e) => { console.error(e); process.exit(1) })
