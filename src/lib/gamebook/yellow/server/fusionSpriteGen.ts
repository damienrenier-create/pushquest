import "server-only"
// src/lib/gamebook/yellow/server/fusionSpriteGen.ts
//
// GÉNÉRATEUR de sprite de fusion (Gemini "Nano Banana 2" = gemini-3.1-flash-image). SERVER-ONLY (clé jamais côté
// client). Gaté par FUSION_GEN_ENABLED : renvoie {ok:false} immédiatement si désactivé → COÛT 0 tant qu'on n'active pas.
// Résolution 512 (le tier le moins cher), qui matche le rendu détaillé des sprites maison (cf. STYLE_BIBLE v2).
// Les RÉFÉRENCES envoyées au modèle (2 parents + ancres) = les sprites ORIGINAUX (déjà déployés dans public/),
// normalisés À LA VOLÉE par sharp (trim + 512 transparent) → AUCUN dossier _norm dérivé à committer.
// Post-traitement sharp de la sortie (trim alpha + recentrage + rejet fond opaque/vide).
// ⚠️ La surface exacte du SDK @google/genai pour la sortie image évolue — À VÉRIFIER par Sartay au 1er test réel.
//    Le code est DÉFENSIF (tout échec → {ok:false}) et PLAFONNÉ en amont (route API : plafond TOTAL + journalier).

import sharp from "sharp"
import { put } from "@vercel/blob"
import { GoogleGenAI } from "@google/genai"
import { getSpecies } from "../data/species"
import { canonicalPair, fusionPairKey } from "../data/fusionSpriteCache"
import { STYLE_BIBLE, STYLE_ANCHORS } from "./fusionStyleBible"

const MODEL = process.env.FUSION_GEN_MODEL ?? "gemini-3.1-flash-image" // Nano Banana 2 ; 0,5K ≈ 0,045 $/image
export const PROMPT_VERSION = 4 // v4 = fond MAGENTA + détourage flood-fill BORDS puis key GLOBAL par dominance magenta (enclavé + anti-frange)
const CHROMA_TOL = 96 // tolérance de détourage (somme des écarts RGB au fond estimé)
const RES = 512

/** La génération est-elle ARMÉE ? (coupe-circuit env + présence de la clé). false → aucun appel, coût 0. */
export function fusionGenEnabled(): boolean {
    return process.env.FUSION_GEN_ENABLED === "true" && !!process.env.GEMINI_API_KEY
}

/** Fetch un sprite ORIGINAL (public/) et le NORMALISE à la volée (trim alpha + recentrage 512 transparent) → base64.
 *  Renvoie null en cas d'échec. Évite de committer un dossier _norm de fichiers dérivés (~54 Mo). */
async function fetchNormalizedB64(url: string): Promise<string | null> {
    try {
        const r = await fetch(url)
        if (!r.ok) return null
        const png = await sharp(Buffer.from(await r.arrayBuffer())).ensureAlpha().trim().resize(RES, RES, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
        return png.toString("base64")
    } catch { return null }
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

/** DÉTOURAGE : rend TRANSPARENT le fond UNI qui touche les bords (flood-fill depuis les bordures, couleur ≈ celle des
 *  coins). Préserve l'intérieur du sujet (pixels non connectés au bord, même s'ils sont de couleur proche). Mute
 *  `data` (RGBA) en place. Nano Banana rend un fond opaque (souvent uni) → on le découpe ici. */
function floodRemoveBackground(data: Buffer, w: number, h: number, tol = CHROMA_TOL): void {
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => (y * w + x) * 4)
    let br = 0, bg = 0, bb = 0
    for (const i of corners) { br += data[i]; bg += data[i + 1]; bb += data[i + 2] }
    br /= 4; bg /= 4; bb /= 4
    const close = (i: number) => data[i + 3] !== 0 && Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) <= tol
    const stack: number[] = []
    const visit = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return
        const i = (y * w + x) * 4
        if (close(i)) { data[i + 3] = 0; stack.push(x, y) }
    }
    for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1) }
    for (let y = 0; y < h; y++) { visit(0, y); visit(w - 1, y) }
    while (stack.length) { const y = stack.pop()!, x = stack.pop()!; visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1) }
    // ZONES ENCLAVÉES (poches magenta dans les boucles/arcs, NON connectées au bord → invisibles au flood-fill) +
    //   FRANGE ROSE anti-aliasée : passe GLOBALE par DOMINANCE magenta (min(R,B)-G), INDÉPENDANTE de la teinte
    //   exacte du fond → tue TOUT magenta résiduel où qu'il soit. Sûr : le sujet ne contient pas de magenta franc
    //   (cf. prompt, G bas requis). La frange rose PARTIELLE (liseré) est dé-rosie plutôt que supprimée.
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue
        const R = data[i], G = data[i + 1], B = data[i + 2]
        const mag = Math.min(R, B) - G
        if (mag > 40 && G < 120 && R > 110 && B > 110) data[i + 3] = 0          // magenta FRANC (fond + enclavé + halo vif)
        else if (mag > 18 && R > 120 && B > 120) data[i + 1] = Math.min(R, B)   // anti-frange : dé-rosit le liseré rose
    }
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
    if (!spA.sprite || !spB.sprite) return { ok: false, error: "no-parent-sprite" }

    // Références : sprites ORIGINAUX des 2 PARENTS puis ANCRES de style (STYLE_ANCHORS = chemins sous dex/),
    //   normalisés à la volée. Ordre : parent A, parent B, puis ancres.
    const parentUrls = [spA.sprite, spB.sprite].map((s) => `${opts.origin}${s}`)
    const anchorUrls = STYLE_ANCHORS.map((p) => `${opts.origin}/yellow/sprites/dex/${p}`)
    const parentRefs = (await Promise.all(parentUrls.map(fetchNormalizedB64))).filter((x): x is string => !!x)
    if (parentRefs.length < 2) return { ok: false, error: "no-refs" } // il FAUT les 2 parents (sprites originaux introuvables ?)
    const anchorRefs = (await Promise.all(anchorUrls.map(fetchNormalizedB64))).filter((x): x is string => !!x)
    const refs = [...parentRefs, ...anchorRefs]

    const prompt = [
        STYLE_BIBLE,
        `\nCrée UNE créature unique = la FUSION de ${spA.name} (DOMINANT : silhouette/gabarit de base) et ${spB.name} (couleurs & éléments signature intégrés).`,
        `Nom : ${opts.fusionName}. Types : ${opts.types.join("/")} → palette dérivée de ces types.`,
        spA.description ? `Réf ${spA.name} : ${spA.description}` : "",
        spB.description ? `Réf ${spB.name} : ${spB.description}` : "",
        `Images fournies : les 2 PREMIÈRES = les parents (1 = ${spA.name} base/gabarit ; 2 = ${spB.name} couleurs & attributs).`
            + (anchorRefs.length ? ` Les ${anchorRefs.length} suivantes = RÉFÉRENCES DE STYLE : imite leur RENDU (grain de pixel, détail), NE COPIE PAS leur contenu.` : ""),
        `Une SEULE créature cohérente (pas un collage), sujet ENTIER et CENTRÉ. FOND : une couleur PARFAITEMENT UNIE et VIVE, MAGENTA pur (#FF00FF), remplissant TOUT l'arrière-plan — AUCUN autre élément, dégradé, décor, texte, bordure, ombre au sol, NI halo/lueur/aura magenta autour du sujet (ce fond sera détouré automatiquement ; toute bavure magenta gâche le découpage). Le sujet lui-même ne doit PAS contenir de magenta ni de rose vif.`,
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

        // Post-traitement : décode → DÉTOURE le fond uni (magenta) → trim → recentre sur 512 transparent → PNG.
        const { data: raw, info } = await sharp(Buffer.from(b64, "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        floodRemoveBackground(raw, info.width, info.height)
        const png = await sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } })
            .png().trim().resize(RES, RES, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
        const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        // Erreurs GRANULAIRES (pour diagnostiquer vite) : vide, ou détourage raté (fond non uni → bords encore opaques).
        if (nearlyEmpty(data)) return { ok: false, error: "bad-output-empty" }
        if (!bordersMostlyTransparent(data, RES, RES)) return { ok: false, error: "bad-output-bg" }

        const blob = await put(`yellow/fusion/${fusionPairKey(aId, bId)}.png`, png, { access: "public", contentType: "image/png", addRandomSuffix: false, allowOverwrite: true })
        return { ok: true, url: blob.url, model: MODEL }
    } catch (e) {
        return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) }
    }
}
