// src/app/api/gamebook/yellow/secret-shadow/route.ts
//
// Nexus Jaune Éclair — OMBRES de la page « 🔮 Secrets » du Fusiodex. L'ombre d'une fusion encore secrète est NOIRCIE ICI,
// côté serveur, et servie sous un numéro OPAQUE (`?i=<rang dans le catalogue>`). Avant (relecture 19/10/2026), la page
// chargeait le vrai sprite et le noircissait en CSS : un clic droit « ouvrir l'image » montrait la fusion en couleur, et
// le nom du fichier (`colosfer__lunarque.png`) livrait la recette. Ici, ni l'URL ni l'image ne trahissent rien.
//
// Sprite source : registre officiel (fichier public), sinon le sprite généré (FusionSprite READY), sinon l'espèce seule
// (Mimimoy). Lecture seule, aucune génération. Réponse en cache privé (le catalogue ne bouge qu'au déploiement).
// `?s=<id>` : même ombre pour la fiche SCELLÉE d'un ultra-secret du Pokédex (MégamonarX, Galijah) — et pour eux SEULS.

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import sharp from "sharp"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { fusionSecretEntries } from "@/lib/gamebook/yellow/data/fusionSecrets"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"
import { fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { getSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"

export const dynamic = "force-dynamic"
const SIZE = 160 // assez pour reconnaître une silhouette, pas pour lire un détail

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
        const r = await fetch(url)
        if (!r.ok) return new NextResponse(null, { status: 404 })
        // NOIRCISSEMENT : chaque pixel visible devient l'encre de l'ombre (alpha conservé, couleurs détruites).
        const { data, info } = await sharp(Buffer.from(await r.arrayBuffer())).ensureAlpha().trim()
            .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .raw().toBuffer({ resolveWithObject: true })
        for (let p = 0; p < data.length; p += 4) { data[p] = 16; data[p + 1] = 12; data[p + 2] = 26 }
        const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
        return new NextResponse(new Uint8Array(png), { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } })
    } catch {
        return new NextResponse(null, { status: 404 })
    }
}
