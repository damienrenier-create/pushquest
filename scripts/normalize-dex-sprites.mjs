// scripts/normalize-dex-sprites.mjs
//
// LOT 1 — Normalise les sprites qui servent de RÉFÉRENCES au générateur de fusions. Pour chaque PNG : trim de
// l'alpha (retire le vide autour), recentrage sur un canevas carré 512×512 100% TRANSPARENT (sujet ~86% du cadre).
// Deux passes :
//   • base   : public/yellow/sprites/dex/*.png            → public/yellow/sprites/dex/_norm/*.png        (les 2 parents)
//   • ancres : public/yellow/sprites/dex/fusion/*.png      → public/yellow/sprites/dex/_norm/fusion/*.png  (STYLE_ANCHORS)
// Idempotent, N'ALTÈRE JAMAIS les originaux. Coût 0 € (local, aucun réseau).
//
//   Lancer :  node scripts/normalize-dex-sprites.mjs

import sharp from "sharp"
import { readdirSync, mkdirSync, existsSync } from "fs"
import path from "path"

const ROOT = "public/yellow/sprites/dex"
const OUT = path.join(ROOT, "_norm")
const SIZE = 512
const CONTENT = Math.round(SIZE * 0.86) // le sujet tient dans ~86% du cadre, marge transparente autour

async function normalizeDir(srcDir, outDir, label) {
    if (!existsSync(srcDir)) { console.warn(`  (dossier absent, ignoré : ${srcDir})`); return }
    mkdirSync(outDir, { recursive: true })
    const files = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".png") && !f.startsWith("_"))
    let ok = 0, failed = 0
    for (const f of files) {
        try {
            // trim de l'alpha → recadrage "contain" dans un carré CONTENT → centrage sur canevas SIZE transparent.
            const trimmed = await sharp(path.join(srcDir, f)).ensureAlpha().trim().resize(CONTENT, CONTENT, { fit: "inside", withoutEnlargement: false }).png().toBuffer()
            await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
                .composite([{ input: trimmed, gravity: "center" }])
                .png()
                .toFile(path.join(outDir, f))
            ok++
        } catch (e) {
            failed++
            console.warn(`  ⚠ ${label}/${f} : ${String(e?.message ?? e).slice(0, 80)}`)
        }
    }
    console.log(`✓ ${label} : ${ok} normalisés · ${failed} échoués → ${outDir}`)
}

if (!existsSync(ROOT)) { console.error(`✗ dossier introuvable : ${ROOT}`); process.exit(1) }
await normalizeDir(ROOT, OUT, "base (parents)")
await normalizeDir(path.join(ROOT, "fusion"), path.join(OUT, "fusion"), "fusion (ancres de style)")
console.log("Terminé.")
