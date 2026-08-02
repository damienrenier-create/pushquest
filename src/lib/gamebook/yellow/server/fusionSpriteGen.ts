import "server-only"
// src/lib/gamebook/yellow/server/fusionSpriteGen.ts
//
// GÉNÉRATEUR de sprite de fusion (Gemini "Nano Banana 2" = gemini-3.1-flash-image). SERVER-ONLY (clé jamais côté
// client). Gaté par FUSION_GEN_ENABLED : renvoie {ok:false} immédiatement si désactivé → COÛT 0 tant qu'on n'active pas.
// Résolution 512 (le tier le moins cher), qui matche le rendu détaillé des sprites maison (cf. STYLE_BIBLE v2).
// Post-traitement sharp (trim alpha + recentrage + rejet fond opaque/vide).
// ⚠️ La surface exacte du SDK @google/genai pour la sortie image évolue — À VÉRIFIER par Sartay au 1er test réel.
//    Le code est DÉFENSIF (tout échec → {ok:false}) et PLAFONNÉ en amont (route API : plafond TOTAL + journalier).

import sharp from "sharp"
import { put } from "@vercel/blob"
import { GoogleGenAI } from "@google/genai"
import { getSpecies } from "../data/species"
import { canonicalPair, fusionPairKey } from "../data/fusionSpriteCache"
import { STYLE_BIBLE, STYLE_ANCHORS } from "./fusionStyleBible"

const MODEL = process.env.FUSION_GEN_MODEL ?? "gemini-3.1-flash-image" // Nano Banana 2 ; 0,5K ≈ 0,045 $/image
export const PROMPT_VERSION = 2 // v2 = STYLE_BIBLE « pixel art détaillé » + ancres = chimères faites main
const RES = 512

/** La génération est-elle ARMÉE ? (coupe-circuit env + présence de la clé). false → aucun appel, coût 0. */
export function fusionGenEnabled(): boolean {
    return process.env.FUSION_GEN_ENABLED === "true" && !!process.env.GEMINI_API_KEY
}

async function fetchB64(url: string): Promise<string | null> {
    try {
        const r = await fetch(url)
        if (!r.ok) return null
        return Buffer.from(await r.arrayBuffer()).toString("base64")
    } catch { return null }
}

/** Chemin de sprite d'une espèce → nom de fichier relatif au dossier dex (pour trouver sa version _norm). */
function dexRelPath(spritePath: string | undefined): string | null {
    if (!spritePath) return null
    return spritePath.replace(/^\/yellow\/sprites\/dex\//, "")
}

// Les bords sont-ils MAJORITAIREMENT transparents ? (sinon = fond non découpé → on rejette)
function bordersMostlyTransparent(data: Buffer, w: number, h: number): boolean {
    let opaque = 0, total = 0
    const px = (x: number, y: number) => data[(y * w + x) * 4 + 3]
    for (let x = 0; x < w; x++) { total += 2; if (px(x, 0) > 40) opaque++; if (px(x, h - 1) > 40) opaque++ }
    for (let y = 0; y < h; y++) { total += 2; if (px(0, y) > 40) opaque++; if (px(w - 1, y) > 40) opaque++ }
    return opaque / total < 0.1
}
// L'image est-elle quasi vide ? (< 3% de pixels visibles)
function nearlyEmpty(data: Buffer): boolean {
    let visible = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 40) visible++
    return visible / (data.length / 4) < 0.03
}

/** Génère + poste le sprite. Renvoie l'URL Blob (succès) ou une erreur. NE LÈVE JAMAIS (défensif). */
export async function generateFusionSprite(opts: {
    origin: string
    aId: string
    bId: string
    fusionName: string
    types: string[]
}): Promise<{ ok: true; url: string; model: string } | { ok: false; error: string }> {
    if (!fusionGenEnabled()) return { ok: false, error: "disabled" }
    const [aId, bId] = canonicalPair(opts.aId, opts.bId)
    const spA = getSpecies(aId), spB = getSpecies(bId)
    if (!spA || !spB) return { ok: false, error: "unknown-species" }

    // Références NORMALISÉES : d'abord les 2 PARENTS (dérivés de leur vrai chemin de sprite → _norm/<fichier>),
    //   puis les ANCRES de style (chemins de STYLE_ANCHORS → _norm/<chemin>, ex. _norm/fusion/dracorex.png).
    const aRel = dexRelPath(spA.sprite), bRel = dexRelPath(spB.sprite)
    if (!aRel || !bRel) return { ok: false, error: "no-parent-sprite" }
    const parentUrls = [aRel, bRel].map((rel) => `${opts.origin}/yellow/sprites/dex/_norm/${rel}`)
    const anchorUrls = STYLE_ANCHORS.map((p) => `${opts.origin}/yellow/sprites/dex/_norm/${p}`)
    const parentRefs = (await Promise.all(parentUrls.map(fetchB64))).filter((x): x is string => !!x)
    if (parentRefs.length < 2) return { ok: false, error: "no-refs" } // il FAUT les 2 parents normalisés (lance normalize-dex-sprites.mjs)
    const anchorRefs = (await Promise.all(anchorUrls.map(fetchB64))).filter((x): x is string => !!x)
    const refs = [...parentRefs, ...anchorRefs]

    const prompt = [
        STYLE_BIBLE,
        `\nCrée UNE créature unique = la FUSION de ${spA.name} (DOMINANT : silhouette/gabarit de base) et ${spB.name} (couleurs & éléments signature intégrés).`,
        `Nom : ${opts.fusionName}. Types : ${opts.types.join("/")} → palette dérivée de ces types.`,
        spA.description ? `Réf ${spA.name} : ${spA.description}` : "",
        spB.description ? `Réf ${spB.name} : ${spB.description}` : "",
        `Images fournies : les 2 PREMIÈRES = les parents (1 = ${spA.name} base/gabarit ; 2 = ${spB.name} couleurs & attributs).`
            + (anchorRefs.length ? ` Les ${anchorRefs.length} suivantes = RÉFÉRENCES DE STYLE : imite leur RENDU (grain de pixel, détail), NE COPIE PAS leur contenu.` : ""),
        `Une SEULE créature cohérente (pas un collage). Fond 100% TRANSPARENT, sujet centré, aucun texte/décor/bordure/ombre.`,
    ].filter(Boolean).join("\n")

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
        const res = await ai.models.generateContent({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }, ...refs.map((data) => ({ inlineData: { mimeType: "image/png", data } }))] }],
        })
        // Extrait la 1re partie image (inlineData base64) de la réponse.
        const parts = (res as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] }).candidates?.[0]?.content?.parts ?? []
        const b64 = parts.find((p) => p.inlineData?.data)?.inlineData?.data
        if (!b64) return { ok: false, error: "no-image" }

        // Post-traitement : trim alpha → recentre 512 transparent → PNG.
        const png = await sharp(Buffer.from(b64, "base64")).ensureAlpha().trim().resize(RES, RES, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
        const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        if (!bordersMostlyTransparent(data, RES, RES) || nearlyEmpty(data)) return { ok: false, error: "bad-output" }

        const blob = await put(`yellow/fusion/${fusionPairKey(aId, bId)}.png`, png, { access: "public", contentType: "image/png", addRandomSuffix: false })
        return { ok: true, url: blob.url, model: MODEL }
    } catch (e) {
        return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) }
    }
}
