// Découpe des planches Gemini "3 panneaux" en sprites de Pokédex propres et
// TRANSPARENTS. Fond DAMIER OPAQUE + titre + cadre + watermark.
//
// Méthode robuste (ne dépend pas de la connexité au bord — gère les créatures
// dont les ailes touchent les 4 côtés, comme l'aigle) :
//   1) palette = couleurs PEU SATURÉES les plus fréquentes de la région = le damier ;
//   2) détourage GLOBAL : tout pixel proche du damier → transparent (même enclavé) ;
//   3) on ne GARDE que la plus grande composante opaque connexe = le Daemon
//      (élimine cadre résiduel, watermark, pixels parasites) ;
//   4) recadrage serré + petit pad.
//
// Usage: node scripts/split-daemon-sheet.mjs

import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const HOME = process.env.USERPROFILE || process.env.HOME
const DL = path.join(HOME, "Downloads")
const OUT_DIR = path.join("public", "yellow", "sprites", "dex")

const SHEETS = [
    { file: "Gemini_Generated_Image_qgm3mdqgm3mdqgm3.png", names: ["feuillichot", "broutame", "sylvapuce"] },
    { file: "Gemini_Generated_Image_mswk2mmswk2mmswk.png", names: ["gouttiny", "ondulo", "razmaree"] },
    { file: "Gemini_Generated_Image_r61mc8r61mc8r61m.png", names: ["braisille", "flamkure", "pyrokoss"] },
    { file: "Gemini_Generated_Image_6cjibl6cjibl6cji.png", names: ["couperin", "frappard", "maitrezenc"] },
    { file: "Gemini_Generated_Image_i9lilwi9lilwi9li.png", names: ["cailloutchi", "roctaur", "rochison"] },
    { file: "Gemini_Generated_Image_99bnju99bnju99bn.png", names: ["plumiot", "faukon", "aquilothan"] },
]

const KEY_TOL2 = 44 * 44
const sat = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b)

// Palette du damier : couleurs peu saturées les plus fréquentes de la région.
function detectPalette(out, W, H) {
    const freq = new Map()
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
        const d = (y * W + x) * 4
        if (out[d + 3] < 10) continue
        const r = out[d], g = out[d + 1], b = out[d + 2]
        if (sat(r, g, b) >= 48) continue // ignore les couleurs vives (créature)
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
        freq.set(key, (freq.get(key) || 0) + 1)
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([k]) => [((k >> 10) & 31) << 3, ((k >> 5) & 31) << 3, (k & 31) << 3])
}

async function processSheet(sheet) {
    const file = path.join(DL, sheet.file)
    if (!fs.existsSync(file)) { console.log("⚠ absent:", sheet.file); return }
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: w, height: h } = info
    const I = (x, y) => (y * w + x) * 4
    const third = w / 3
    const insetX = Math.round(third * 0.03)
    const ryT = Math.round(h * 0.13)         // sous le titre + bord haut du cadre
    const insetB = Math.round(h * 0.03)
    console.log(`\n${sheet.file}  (${w}x${h})`)

    for (let i = 0; i < 3; i++) {
        const x0 = Math.round(i * third), x1 = Math.round((i + 1) * third)
        const rx0 = x0 + insetX, rx1 = x1 - insetX, ryB = h - insetB
        const W = rx1 - rx0, H = ryB - ryT

        // Copie la région.
        const out = Buffer.alloc(W * H * 4)
        for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
            const s = I(rx0 + xx, ryT + yy), d = (yy * W + xx) * 4
            out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3]
        }

        // 1) Palette du damier (globale, fiable même si la créature touche les bords).
        const pal = detectPalette(out, W, H)
        const isBg = (d) => {
            if (out[d + 3] === 0) return true
            const r = out[d], g = out[d + 1], b = out[d + 2]
            for (const c of pal) {
                const dr = r - c[0], dg = g - c[1], db = b - c[2]
                if (dr * dr + dg * dg + db * db < KEY_TOL2) return true
            }
            return false
        }
        // 2) Détourage par FLOOD depuis les bords (préserve l'intérieur via le contour
        //    sombre ; le damier enclavé entre ailes sera retiré à l'étape 3).
        const seen = new Uint8Array(W * H)
        const stack = []
        const push = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H && !seen[y * W + x]) { seen[y * W + x] = 1; stack.push(y * W + x) } }
        for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
        for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
        while (stack.length) {
            const p = stack.pop()
            if (!isBg(p * 4)) continue
            out[p * 4 + 3] = 0
            const x = p % W, y = (p - x) / W
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
        }

        // 3) Plus grande composante opaque connexe = le Daemon.
        const lab = new Int32Array(W * H).fill(-1)
        let bestId = -1, bestN = 0, comps = []
        let id = 0
        for (let s0 = 0; s0 < W * H; s0++) {
            if (lab[s0] !== -1 || out[s0 * 4 + 3] === 0) continue
            let n = 0, miX = W, maX = 0, miY = H, maY = 0
            const st = [s0]; lab[s0] = id
            while (st.length) {
                const p = st.pop(); const cx = p % W, cy = (p - cx) / W
                n++
                if (cx < miX) miX = cx; if (cx > maX) maX = cx
                if (cy < miY) miY = cy; if (cy > maY) maY = cy
                if (cx + 1 < W) { const q = p + 1; if (lab[q] === -1 && out[q * 4 + 3]) { lab[q] = id; st.push(q) } }
                if (cx - 1 >= 0) { const q = p - 1; if (lab[q] === -1 && out[q * 4 + 3]) { lab[q] = id; st.push(q) } }
                if (cy + 1 < H) { const q = p + W; if (lab[q] === -1 && out[q * 4 + 3]) { lab[q] = id; st.push(q) } }
                if (cy - 1 >= 0) { const q = p - W; if (lab[q] === -1 && out[q * 4 + 3]) { lab[q] = id; st.push(q) } }
            }
            comps[id] = { miX, maX, miY, maY }
            if (n > bestN) { bestN = n; bestId = id }
            id++
        }
        if (bestId < 0) { console.log(`  panneau ${i} vide ?!`); continue }
        const bb = comps[bestId]

        // 4) Ne garder que la composante du Daemon, recadrer + pad.
        const cpad = Math.round(h * 0.012)
        const L = Math.max(0, bb.miX - cpad), T = Math.max(0, bb.miY - cpad)
        const R = Math.min(W, bb.maX + cpad + 1), Bt = Math.min(H, bb.maY + cpad + 1)
        const cw = R - L, ch = Bt - T
        const crop = Buffer.alloc(cw * ch * 4)
        for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
            const sp = (T + yy) * W + (L + xx), d = (yy * cw + xx) * 4
            if (lab[sp] === bestId) {
                crop[d] = out[sp * 4]; crop[d + 1] = out[sp * 4 + 1]; crop[d + 2] = out[sp * 4 + 2]; crop[d + 3] = out[sp * 4 + 3]
            } // sinon laissé transparent (0,0,0,0)
        }
        const dest = path.join(OUT_DIR, `${sheet.names[i]}.png`)
        await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile(dest)
        console.log(`  ✓ ${sheet.names[i]}.png  (${cw}x${ch}, ${bestN}px, palette ${pal.length})`)
    }
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    for (const s of SHEETS) await processSheet(s)
    console.log("\nTerminé →", OUT_DIR)
}

main().catch((e) => { console.error(e); process.exit(1) })
