// src/app/api/gamebook/yellow/fusion-sprite/route.ts
//
// FUSION — cache + génération de sprites (Gemini). GET = statut d'une paire (le client résout l'image). POST =
// déclenche la génération (idempotent, plafonnée). SERVER-ONLY (la clé ne fuit jamais). Gaté par FUSION_GEN_ENABLED.
//
// GARANTIE BUDGET :
//   • FUSION_GEN_ENABLED != "true" → aucune génération, jamais (coût 0).
//   • Plafond TOTAL à vie (FUSION_GEN_TOTAL_CAP, défaut 500 ≈ ~22 $) = SUM(attempts) sur toutes les paires.
//   • Plafond JOURNALIER (FUSION_GEN_DAILY_CAP, défaut 50) = nb de paires créées sur 24 h.
//   • ⚠️ Le VRAI coupe-circuit absolu reste le budget Google Cloud (à poser à ~15 € côté console). Cf. SETUP.
// Table gated (prisma as any).fusionSprite → compile + neutre tant que db:push n'a pas créé la table.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { fusionPairKey, canGenerate, nextStatusAfterAttempt, withinTotalBudget, MAX_ATTEMPTS } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { generateFusionSprite, fusionGenEnabled, PROMPT_VERSION } from "@/lib/gamebook/yellow/server/fusionSpriteGen"
import { specialFusionForIds } from "@/lib/gamebook/yellow/data/fusionSpecies"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // la génération image peut prendre quelques secondes

// Plafonds RELEVÉS (Sartay, 25/08/2026) : 500→1500 total, 50→120/jour — trop de fusions novel tombaient en placeholder
//   une fois le budget atteint. Toujours surchargeable par env. ⚠️ penser à relever aussi le budget Google Cloud (coût réel).
const TOTAL_CAP = Number(process.env.FUSION_GEN_TOTAL_CAP ?? 1500)
const DAILY_CAP = Number(process.env.FUSION_GEN_DAILY_CAP ?? 120)

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// GET ?a=<id>&b=<id> → statut de la paire (le client affiche le placeholder tant que ce n'est pas READY).
export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    // DIAG (aucun secret : uniquement des booléens/compteurs) — pour savoir si la génération est bien ARMÉE en prod.
    //   Ouvre /api/gamebook/yellow/fusion-sprite?diag=1 (connecté). enabled=false → env manquante/non redéployée.
    if (req.nextUrl.searchParams.get("diag")) {
        let rowsTotal = 0, rowsToday = 0
        try {
            const fs = (prisma as any).fusionSprite
            rowsTotal = await fs.count()
            rowsToday = await fs.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } })
        } catch { /* table absente */ }
        return NextResponse.json({
            ok: true,
            enabled: fusionGenEnabled(),
            flagIsTrue: process.env.FUSION_GEN_ENABLED === "true",
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
            model: process.env.FUSION_GEN_MODEL ?? "gemini-3.1-flash-image",
            promptVersion: PROMPT_VERSION, totalCap: TOTAL_CAP, dailyCap: DAILY_CAP,
            rowsTotal, rowsToday,
        })
    }

    const a = req.nextUrl.searchParams.get("a"), b = req.nextUrl.searchParams.get("b")
    if (!a || !b) return NextResponse.json({ error: "Missing a/b" }, { status: 400 })
    try {
        const row = await (prisma as any).fusionSprite.findUnique({ where: { pairKey: fusionPairKey(a, b) }, select: { status: true, blobUrl: true } })
        return NextResponse.json({ ok: true, status: row?.status ?? "NONE", url: row?.blobUrl ?? null })
    } catch {
        return NextResponse.json({ ok: true, status: "NONE", url: null }) // table absente → neutre (placeholder)
    }
}

// POST {aId,bId,fusionName,types} → génère (si armé + budget) et renvoie le statut final. Idempotent (pairKey unique).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { aId?: unknown; bId?: unknown; fusionName?: unknown; types?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const aId = typeof body.aId === "string" ? body.aId : null
    const bId = typeof body.bId === "string" ? body.bId : null
    const fusionName = typeof body.fusionName === "string" ? body.fusionName.slice(0, 60) : "Chimère"
    const types = Array.isArray(body.types) ? body.types.filter((t): t is string => typeof t === "string").slice(0, 2) : []
    if (!aId || !bId) return NextResponse.json({ error: "Missing parents" }, { status: 400 })
    const pairKey = fusionPairKey(aId, bId)

    // Coupe-circuit : désactivé → placeholder, sans jamais toucher au réseau/budget.
    if (!fusionGenEnabled()) return NextResponse.json({ ok: true, status: "disabled" })

    const fs = (prisma as any).fusionSprite
    try {
        const existing = await fs.findUnique({ where: { pairKey } })
        if (existing?.status === "READY") return NextResponse.json({ ok: true, status: "READY", url: existing.blobUrl })
        if (existing && !canGenerate(existing)) return NextResponse.json({ ok: true, status: existing.status, url: existing.blobUrl ?? null })

        // GARDE-FOU BUDGET (avant tout appel facturé).
        const agg = await fs.aggregate({ _sum: { attempts: true } })
        const spent = agg?._sum?.attempts ?? 0
        if (!withinTotalBudget(spent, TOTAL_CAP)) return NextResponse.json({ ok: true, status: "capped", reason: "total" })
        const since = new Date(Date.now() - 24 * 3600 * 1000)
        const today = await fs.count({ where: { createdAt: { gte: since } } })
        if (today >= DAILY_CAP) return NextResponse.json({ ok: true, status: "capped", reason: "daily" })

        // RÉSERVATION ATOMIQUE d'un essai (idempotent : un seul appelant génère par paire).
        let attemptNo = 1
        if (!existing) {
            try {
                await fs.create({ data: { pairKey, parentAId: aId, parentBId: bId, fusionName, status: "PENDING", attempts: 1, model: null, promptVersion: PROMPT_VERSION } })
            } catch {
                // course : une autre requête vient de créer la ligne → on ne génère pas, on renvoie son statut.
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

        // GÉNÉRATION (facturée). L'origine sert à fetch les sprites de référence (_norm). Concept = physique visé (fusions inédites).
        const gen = await generateFusionSprite({ origin: req.nextUrl.origin, aId, bId, fusionName, types, concept: specialFusionForIds(aId, bId)?.concept })
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
