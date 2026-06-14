// scripts/analyze-maison-hantee-maze.ts
//
// Extrait le LABYRINTHE INVISIBLE de la maison hantée depuis `~/Downloads/maison_hantee_check maze.png`
// (mon overlay de vérif sur lequel Sartay a tracé des MURS NOIRS ÉPAIS sur les ARÊTES entre cases).
// Sortie = 2 grilles ASCII (murs verticaux / horizontaux) à coller dans maps.ts + un overlay de
// contrôle (debug-maps/maison_hantee_maze_check.png) où les arêtes détectées sont surlignées.
//
// Discriminant clé : la grille de l'overlay a de fines lignes (≤2px) ; le mur de Sartay est ÉPAIS
// (≥3px de noir perpendiculaire) → on ne garde que les segments épais.
//   npx tsx scripts/analyze-maison-hantee-maze.ts

import sharp from "sharp"
import { join } from "path"
import { homedir } from "os"

const SRC = join(homedir(), "Downloads", "maison_hantee_check maze.png")
const L = 32, T = 30, TILE = 44, W = 22, H = 16
const BAND = 8          // demi-largeur du scan perpendiculaire (px) — tolère le désalignement
const THICK = 2         // run de noir perpendiculaire mini pour = "mur épais" (vs grille fine ≤1)
const FRAC = 0.35       // fraction d'échantillons épais le long de l'arête pour valider
const MARGIN = 0.16     // on ignore les 16% aux extrémités (coins/intersections)
const DARK = 72         // seuil de "noir" (canaux R,G,B tous &lt; DARK) — le vert des cases a G élevé

const TARGET_W = L + W * TILE + 8  // 1008 (géométrie de référence de l'overlay)
const TARGET_H = T + H * TILE + 8  // 742

async function main() {
    // L'image exportée par Sartay peut être redimensionnée → on la ramène à la géométrie de référence
    // (1008x742) pour retrouver l'épaisseur d'origine des traits avant détection.
    const { data, info } = await sharp(SRC).resize(TARGET_W, TARGET_H, { fit: "fill", kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const ch = info.channels
    const dark = (px: number, py: number): boolean => {
        if (px < 0 || py < 0 || px >= info.width || py >= info.height) return false
        const i = (py * info.width + px) * ch
        return data[i] < DARK && data[i + 1] < DARK && data[i + 2] < DARK
    }
    const maxRun = (vals: boolean[]): number => {
        let best = 0, cur = 0
        for (const d of vals) { if (d) { cur++; if (cur > best) best = cur } else cur = 0 }
        return best
    }

    // --- Murs VERTICAUX : arête entre (x,y) et (x+1,y), sur la ligne X = L+(x+1)*TILE ---
    const v: boolean[][] = Array.from({ length: H }, () => new Array(W).fill(false))
    for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) {
        const X = L + (x + 1) * TILE
        const y0 = T + y * TILE + Math.round(TILE * MARGIN)
        const y1 = T + (y + 1) * TILE - Math.round(TILE * MARGIN)
        let thick = 0, total = 0
        for (let py = y0; py <= y1; py += 3) {
            total++
            const band: boolean[] = []
            for (let px = X - BAND; px <= X + BAND; px++) band.push(dark(px, py))
            if (maxRun(band) >= THICK) thick++
        }
        if (total > 0 && thick / total >= FRAC) v[y][x] = true
    }

    // --- Murs HORIZONTAUX : arête entre (x,y) et (x,y+1), sur la ligne Y = T+(y+1)*TILE ---
    const h: boolean[][] = Array.from({ length: H }, () => new Array(W).fill(false))
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
        const Y = T + (y + 1) * TILE
        const x0 = L + x * TILE + Math.round(TILE * MARGIN)
        const x1 = L + (x + 1) * TILE - Math.round(TILE * MARGIN)
        let thick = 0, total = 0
        for (let px = x0; px <= x1; px += 3) {
            total++
            const band: boolean[] = []
            for (let py = Y - BAND; py <= Y + BAND; py++) band.push(dark(px, py))
            if (maxRun(band) >= THICK) thick++
        }
        if (total > 0 && thick / total >= FRAC) h[y][x] = true
    }

    const vRows = v.map((r) => r.map((b) => (b ? "|" : ".")).join(""))
    const hRows = h.map((r) => r.map((b) => (b ? "_" : ".")).join(""))
    const nV = vRows.join("").split("|").length - 1
    const nH = hRows.join("").split("_").length - 1
    console.log(`Murs verticaux=${nV}  horizontaux=${nH}\n`)
    console.log("MAISON_HANTEE_VWALLS ('|' = mur à DROITE de (x,y)) :")
    console.log(vRows.map((r) => `    "${r}",`).join("\n"))
    console.log("\nMAISON_HANTEE_HWALLS ('_' = mur SOUS (x,y)) :")
    console.log(hRows.map((r) => `    "${r}",`).join("\n"))

    // --- Overlay de contrôle : arêtes détectées en MAGENTA épais par-dessus le dessin de Sartay ---
    const svg: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}">`]
    const dot = (cx: number, cy: number) => svg.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="#ffeb3b" stroke="#000" stroke-width="1.5"/>`)
    for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (v[y][x]) dot(L + (x + 1) * TILE, T + y * TILE + TILE / 2)
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (h[y][x]) dot(L + x * TILE + TILE / 2, T + (y + 1) * TILE)
    svg.push(`</svg>`)
    const out = join(process.cwd(), "debug-maps", "maison_hantee_maze_check.png")
    await sharp(SRC).resize(TARGET_W, TARGET_H, { fit: "fill", kernel: "nearest" }).composite([{ input: Buffer.from(svg.join("")), top: 0, left: 0 }]).png().toFile(out)
    console.log("\n✅ Overlay de contrôle (magenta = arêtes détectées) :", out)
}
main().catch((e) => { console.error(e); process.exit(1) })
