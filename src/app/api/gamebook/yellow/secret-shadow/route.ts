// src/app/api/gamebook/yellow/secret-shadow/route.ts
//
// Nexus Jaune Éclair — OMBRES de la page « 🔮 Secrets » du Fusiodex. L'ombre d'une fusion encore secrète est NOIRCIE ICI,
// côté serveur, et servie sous un numéro OPAQUE (`?i=<rang dans le catalogue>`). Avant (relecture 19/10/2026), la page
// chargeait le vrai sprite et le noircissait en CSS : un clic droit « ouvrir l'image » montrait la fusion en couleur, et
// le nom du fichier (`colosfer__lunarque.png`) livrait la recette. Ici, ni l'URL ni l'image ne trahissent rien.
//
// NETTETÉ PAR JOUEUR (demande Sartay 19/10/2026) : l'ombre est FLOUTÉE ici selon la save de CELUI qui la regarde — niveau
// combiné de ses deux Daemons parents (meilleur exemplaire de chaque espèce), sur 200 (cf. shadowClarity). Deux parents
// niveau 100 = ombre nette ; aucun des deux = une tache. Le flou est appliqué au serveur : impossible d'obtenir plus net.
// Le paramètre `c` de l'URL n'est qu'une clé de cache pour le navigateur (le serveur l'ignore et recalcule).
//
// Sprite source : registre officiel (fichier public), sinon le sprite généré (FusionSprite READY), sinon l'espèce seule
// (Mimimoy). Lecture seule, aucune génération.
// `?s=<id>` : même ombre (nette) pour la fiche SCELLÉE d'un ultra-secret du Pokédex (MégamonarX, Galijah) — et pour eux SEULS.

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import sharp from "sharp"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { fusionSecretEntries, shadowClarity, shadowBlurSigma, bestLevelsFromSave } from "@/lib/gamebook/yellow/data/fusionSecrets"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"
import { fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { getSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"

export const dynamic = "force-dynamic"
const SIZE = 160 // taille finale de l'ombre
const INNER = 140 // la silhouette nette occupe ce carré ; la marge accueille le flou sans le couper

// Les 44 ombres partent en rafale à l'ouverture de l'onglet : on garde les niveaux du joueur une minute en mémoire
//   (par instance), plutôt que relire 44 fois sa save.
const LEVELS_TTL_MS = 60_000
const levelsCache = new Map<string, { at: number; levels: Map<string, number> }>()
async function playerBestLevels(userId: string): Promise<Map<string, number>> {
    const hit = levelsCache.get(userId)
    if (hit && Date.now() - hit.at < LEVELS_TTL_MS) return hit.levels
    let levels = new Map<string, number>()
    try {
        const prog = await (prisma as any).gamebookProgress.findFirst({ where: { chapterId: YELLOW_CHAPTER_ID, userId }, select: { flags: true } })
        levels = bestLevelsFromSave(prog?.flags)
    } catch { /* save illisible → aucune netteté (ombre floue), jamais d'erreur */ }
    levelsCache.set(userId, { at: Date.now(), levels })
    if (levelsCache.size > 500) levelsCache.clear()
    return levels
}

async function spriteUrlFor(i: number, origin: string): Promise<string | null> {
    const e = fusionSecretEntries()[i]
    if (!e) return null
    if (e.showcase.kind === "single") {
        const sp = getSpecies(e.showcase.id)
        return sp?.sprite ? `${origin}${sp.sprite}` : null
    }
    const { a, b } = e.showcase
    const official = officialFusionForParents(a, b)
    if (official?.sprite) return official.sprite.startsWith("/") ? `${origin}${official.sprite}` : official.sprite
    try {
        const row = await (prisma as any).fusionSprite.findUnique({ where: { pairKey: fusionPairKey(a, b) }, select: { status: true, blobUrl: true } })
        return row?.status === "READY" && row.blobUrl ? (row.blobUrl as string) : null
    } catch { return null }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })
    const ultra = req.nextUrl.searchParams.get("s")
    const i = Math.floor(Number(req.nextUrl.searchParams.get("i")))
    if (ultra !== null ? !DEX_ULTRA_SECRET.has(ultra) : (!Number.isFinite(i) || i < 0)) return NextResponse.json({ error: "bad_index" }, { status: 400 })
    try {
        const ultraSprite = ultra !== null ? getSpecies(ultra)?.sprite : undefined
        const url = ultra !== null ? (ultraSprite ? `${req.nextUrl.origin}${ultraSprite}` : null) : await spriteUrlFor(i, req.nextUrl.origin)
        if (!url) return new NextResponse(null, { status: 404 })
        // Netteté : calculée ICI depuis la save du joueur (jamais fournie par le client). Les ultra-secrets restent nets.
        let sigma = 0
        if (ultra === null) {
            const e = fusionSecretEntries()[i]
            const levels = await playerBestLevels(userId)
            sigma = shadowBlurSigma(shadowClarity(e.showcase, (id) => levels.get(id) ?? 0))
        }
        const r = await fetch(url)
        if (!r.ok) return new NextResponse(null, { status: 404 })
        const pad = Math.max(4, Math.ceil(sigma * 2.5))
        // NOIRCISSEMENT : chaque pixel visible devient l'encre de l'ombre (alpha conservé, couleurs détruites).
        const { data, info } = await sharp(Buffer.from(await r.arrayBuffer())).ensureAlpha().trim()
            .resize(INNER, INNER, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .raw().toBuffer({ resolveWithObject: true })
        for (let p = 0; p < data.length; p += 4) { data[p] = 4; data[p + 1] = 2; data[p + 2] = 8 } // encre presque noire : contraste avec le cadre violet sombre
        let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        if (sigma >= 0.3) img = sharp(await img.blur(sigma).png().toBuffer()) // FLOU : la silhouette se fond en tache
        const png = await img.resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
        return new NextResponse(new Uint8Array(png), { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=600" } })
    } catch {
        return new NextResponse(null, { status: 404 })
    }
}
