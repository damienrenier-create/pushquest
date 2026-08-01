// scripts/normalize-dex-sprites.mjs
//
// LOT 1 — Normalise les sprites du Pokédex pour servir de RÉFÉRENCES au générateur de fusions.
// Pour chaque public/yellow/sprites/dex/*.png : trim de l'alpha (retire le vide autour), recentre sur un canevas
// carré 512×512 100% TRANSPARENT (le sujet occupe ~86% du cadre), écrit dans public/yellow/sprites/dex/_norm/.
// Idempotent : re-passable sans dommage (réécrit _norm/). N'ALTÈRE JAMAIS les sprites d'origine.
//
//   Lancer :  node scripts/normalize-dex-sprites.mjs
//   Coût : 0 € (local, aucun réseau). Prérequis du générateur : les refs _norm doivent exister avant d'activer.

import sharp from "sharp"
import { readdirSync, mkdirSync, existsSync } from "fs"
import path from "path"

const SRC = "public/yellow/sprites/dex"
const OUT = path.join(SRC, "_norm")
const SIZE = 512
const CONTENT = Math.round(SIZE * 0.86) // le sujet tient dans ~86% du cadre, marge transparente autour

if (!existsSync(SRC)) { console.error(`✗ dossier introuvable : ${SRC}`); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".png") && !f.startsWith("_"))
let ok = 0, skipped = 0, failed = 0

for (const f of files) {
    const src = path.join(SRC, f)
    const dst = path.join(OUT, f)
    try {
        // 1) trim de l'alpha → 2) recadrage "contain" dans un carré CONTENT → 3) centrage sur canevas SIZE transparent.
        const trimmed = await sharp(src).ensureAlpha().trim().resize(CONTENT, CONTENT, { fit: "inside", withoutEnlargement: false }).png().toBuffer()
        await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
            .composite([{ input: trimmed, gravity: "center" }])
            .png()
            .toFile(dst)
        ok++
    } catch (e) {
        // certains PNG (ex. Image1.png non-sprite) peuvent échouer au trim → on saute sans casser le lot.
        failed++
        console.warn(`  ⚠ ${f} : ${String(e?.message ?? e).slice(0, 80)}`)
    }
}

console.log(`✓ normalisés : ${ok} · ignorés : ${skipped} · échoués : ${failed} → ${OUT}`)
