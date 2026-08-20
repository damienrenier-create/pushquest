// src/app/api/gamebook/yellow/fusion-evo-sprite/route.ts
//
// FUSIONS ÉVOLUTIVES — génération du sprite d'un STADE ÉVOLUÉ (S2→S5) d'une lignée de fusion, par CHAÎNAGE depuis
// le stade PRÉCÉDENT (même mécanique que les Daemons custom : generateCustomDaemonSprite(refUrl=stade précédent)).
// SERVER-ONLY (clé Gemini jamais côté client). Gaté par fusionGenEnabled + MÊME budget que fusions/customs (table
// FusionSprite partagée : plafond TOTAL à vie + JOURNALIER). Désactivé → placeholder MissingNo, coût 0.
//
// La RÉFÉRENCE d'évolution (sprite du stade précédent) est résolue serveur : sprite maison (public/) si fourni,
// sinon Blob de la PAIRE (fusion de base) ou du stade évolué précédent (fusevo:) déjà en cache. Absente → génération
// sans ref (repli sur les ancres de style) : moins fidèle mais fonctionnelle (jamais bloquant).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { canGenerate, nextStatusAfterAttempt, withinTotalBudget, MAX_ATTEMPTS, fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { generateCustomDaemonSprite, fusionGenEnabled, PROMPT_VERSION } from "@/lib/gamebook/yellow/server/fusionSpriteGen"
import { FUSION_BASE_SPECIES, FUSION_BASE_PARENTS } from "@/lib/gamebook/yellow/data/fusionBaseSpecies"
import { evolvedFusionStageInfo, evoSpriteKey } from "@/lib/gamebook/yellow/data/fusionEvoSprites"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const TOTAL_CAP = Number(process.env.FUSION_GEN_TOTAL_CAP ?? 500)
const DAILY_CAP = Number(process.env.FUSION_GEN_DAILY_CAP ?? 50)
const MISSINGNO = "missingno"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

const spById = (id: string) => FUSION_BASE_SPECIES.find((s) => s.id === id)

/** URL du sprite du stade PRÉCÉDENT (référence de chaînage) : maison (public/) si fourni, sinon Blob PAIRE (fusion
 *  de base) ou Blob du stade évolué précédent (fusevo:). null si rien n'est encore prêt. */
async function resolvePrevSpriteUrl(origin: string, prevId: string): Promise<string | null> {
    const prev = spById(prevId)
    if (prev?.sprite && !prev.sprite.includes(MISSINGNO)) return `${origin}${prev.sprite}` // sprite MAISON déployé
    const fs = (prisma as any).fusionSprite
    try {
        const parents = FUSION_BASE_PARENTS[prevId]
        const key = parents ? fusionPairKey(parents[0], parents[1]) : evoSpriteKey(prevId) // base = paire ; sinon stade évolué
        const row = await fs.findUnique({ where: { pairKey: key }, select: { status: true, blobUrl: true } })
        if (row?.status === "READY" && row.blobUrl) return row.blobUrl
    } catch { /* table absente → pas de ref */ }
    return null
}

// GET ?id=<speciesId> → statut du stade évolué (le client affiche le placeholder tant que ce n'est pas READY).
export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    try {
        const row = await (prisma as any).fusionSprite.findUnique({ where: { pairKey: evoSpriteKey(id) }, select: { status: true, blobUrl: true } })
        return NextResponse.json({ ok: true, status: row?.status ?? "NONE", url: row?.blobUrl ?? null })
    } catch {
        return NextResponse.json({ ok: true, status: "NONE", url: null }) // table absente → neutre (placeholder)
    }
}

// POST {speciesId} → génère (si armé + budget) le sprite du stade évolué, en chaînant depuis le stade précédent.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { speciesId?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const speciesId = typeof body.speciesId === "string" ? body.speciesId : null
    if (!speciesId) return NextResponse.json({ error: "Missing speciesId" }, { status: 400 })

    const sp = spById(speciesId)
    const info = evolvedFusionStageInfo(speciesId)
    if (!sp || !info) return NextResponse.json({ error: "Not an evolved fusion stage" }, { status: 400 })
    if (sp.sprite && !sp.sprite.includes(MISSINGNO)) return NextResponse.json({ ok: true, status: "hand" }) // sprite maison → rien à générer

    if (!fusionGenEnabled()) return NextResponse.json({ ok: true, status: "disabled" })

    const pairKey = evoSpriteKey(speciesId)
    const fs = (prisma as any).fusionSprite
    try {
        const existing = await fs.findUnique({ where: { pairKey } })
        if (existing?.status === "READY" && existing.blobUrl) return NextResponse.json({ ok: true, status: "READY", url: existing.blobUrl })
        if (existing && !canGenerate(existing)) return NextResponse.json({ ok: true, status: existing.status, url: existing.blobUrl ?? null })

        // GARDE-FOU BUDGET (avant tout appel facturé) — partagé avec fusions + customs.
        const agg = await fs.aggregate({ _sum: { attempts: true } })
        const spent = agg?._sum?.attempts ?? 0
        if (!withinTotalBudget(spent, TOTAL_CAP)) return NextResponse.json({ ok: true, status: "capped", reason: "total" })
        const since = new Date(Date.now() - 24 * 3600 * 1000)
        const today = await fs.count({ where: { createdAt: { gte: since } } })
        if (today >= DAILY_CAP) return NextResponse.json({ ok: true, status: "capped", reason: "daily" })

        // RÉSERVATION ATOMIQUE d'un essai (idempotent : un seul générateur par clé).
        let attemptNo = 1
        if (!existing) {
            try {
                await fs.create({ data: { pairKey, parentAId: info.prevId, parentBId: `s${info.stage}`, fusionName: sp.name.slice(0, 60), status: "PENDING", attempts: 1, model: null, promptVersion: PROMPT_VERSION } })
            } catch {
                const now = await fs.findUnique({ where: { pairKey }, select: { status: true, blobUrl: true } })
                return NextResponse.json({ ok: true, status: now?.status ?? "PENDING", url: now?.blobUrl ?? null })
            }
        } else {
            const claim = await fs.updateMany({ where: { pairKey, status: "PENDING", attempts: { lt: MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } })
            if (claim.count !== 1) {
                const now = await fs.findUnique({ where: { pairKey }, select: { status: true, blobUrl: true } })
                return NextResponse.json({ ok: true, status: now?.status ?? "PENDING", url: now?.blobUrl ?? null })
            }
            attemptNo = (existing.attempts ?? 0) + 1
        }

        // GÉNÉRATION (facturée). refUrl = sprite du stade précédent (chaînage d'évolution) → identité conservée.
        const refUrl = await resolvePrevSpriteUrl(req.nextUrl.origin, info.prevId)
        const da = sp.description?.trim() || `${sp.name}, forme évoluée d'une lignée de fusion (types ${sp.types.join("/")}).`
        const gen = await generateCustomDaemonSprite({
            origin: req.nextUrl.origin, key: `fusevo_${speciesId}`, da, name: sp.name,
            types: sp.types.map((t) => String(t)), stage: info.stage, totalStages: info.totalStages, refUrl,
        })
        if (gen.ok) {
            await fs.update({ where: { pairKey }, data: { status: "READY", blobUrl: gen.url, model: gen.model, error: null } })
            return NextResponse.json({ ok: true, status: "READY", url: gen.url })
        }
        const next = nextStatusAfterAttempt(attemptNo - 1, false)
        await fs.update({ where: { pairKey }, data: { status: next.status, error: gen.error.slice(0, 200) } })
        return NextResponse.json({ ok: true, status: next.status })
    } catch (e) {
        return NextResponse.json({ ok: true, status: "error", error: String((e as Error)?.message ?? e).slice(0, 200) })
    }
}
