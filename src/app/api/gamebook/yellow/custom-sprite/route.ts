// src/app/api/gamebook/yellow/custom-sprite/route.ts
//
// CRÉATION DE DAEMON — génération du sprite d'une lignée CUSTOM (Gemini, texte→pixel art d'après la DA du joueur).
// Appelée UNE fois au démarrage effectif d'un run 2 (le Daemon reste MISSINGNO tant que ce n'est pas prêt).
// UN STADE par POST (chaque appel ≤ ~20 s → sûr même à maxDuration=60) ; le client boucle 1→2→3 et passe l'URL
// du stade précédent (refUrl) pour le CHAÎNAGE d'évolution. SERVER-ONLY (clé jamais côté client). Gaté par
// FUSION_GEN_ENABLED (même coupe-circuit + MÊME budget que les fusions → table FusionSprite partagée).
//
// GARANTIE BUDGET (identique aux fusions) : désactivé → aucune génération ; plafond TOTAL à vie + JOURNALIER ;
//   coupe-circuit ultime = budget Google Cloud. Chaque STADE compte pour 1 image (1 ligne FusionSprite).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { canGenerate, nextStatusAfterAttempt, withinTotalBudget, MAX_ATTEMPTS } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { generateCustomDaemonSprite, fusionGenEnabled, PROMPT_VERSION } from "@/lib/gamebook/yellow/server/fusionSpriteGen"
import { typesAtStage, customLineageBaseId, type CustomSpec } from "@/lib/gamebook/yellow/create/customSpecies"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 1 seul stade par appel → confortable

const TOTAL_CAP = Number(process.env.FUSION_GEN_TOTAL_CAP ?? 500)
const DAILY_CAP = Number(process.env.FUSION_GEN_DAILY_CAP ?? 50)
const ROMAN = ["", "", " II", " III"]

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Validation défensive de la spec reçue (c'est la création du joueur → on fait confiance à la forme, mais on borne).
function parseSpec(raw: unknown): CustomSpec | null {
    if (!raw || typeof raw !== "object") return null
    const s = raw as Record<string, unknown>
    if (typeof s.name !== "string" || typeof s.da !== "string") return null
    const stages = Number(s.stages)
    if (![1, 2, 3].includes(stages)) return null
    if (!Array.isArray(s.finalTypes) || s.finalTypes.length < 1) return null
    return raw as CustomSpec
}

// POST {ownerId, spec, stage, refUrl?} → génère le sprite du stade demandé et renvoie son URL (ou statut).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { ownerId?: unknown; spec?: unknown; stage?: unknown; refUrl?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : null
    const spec = parseSpec(body.spec)
    const stage = Number(body.stage)
    const refUrl = typeof body.refUrl === "string" ? body.refUrl : null
    if (!ownerId || !spec) return NextResponse.json({ error: "Missing ownerId/spec" }, { status: 400 })
    const totalStages = Number(spec.stages)
    if (!Number.isInteger(stage) || stage < 1 || stage > totalStages) return NextResponse.json({ error: "Bad stage" }, { status: 400 })

    // Coupe-circuit : désactivé → le Daemon garde MISSINGNO, aucun réseau/budget touché.
    if (!fusionGenEnabled()) return NextResponse.json({ ok: true, status: "disabled" })

    const baseId = customLineageBaseId({ ownerId, spec })
    const key = `${baseId}_s${stage}`
    const pairKey = `custom:${key}` // clé LITTÉRALE (pas fusionPairKey : pas de tri de paire ici)

    const fs = (prisma as any).fusionSprite
    try {
        const existing = await fs.findUnique({ where: { pairKey } })
        if (existing?.status === "READY" && existing.blobUrl) return NextResponse.json({ ok: true, status: "READY", url: existing.blobUrl })
        if (existing && !canGenerate(existing)) return NextResponse.json({ ok: true, status: existing.status, url: existing.blobUrl ?? null })

        // GARDE-FOU BUDGET (avant tout appel facturé) — partagé avec les fusions.
        const agg = await fs.aggregate({ _sum: { attempts: true } })
        const spent = agg?._sum?.attempts ?? 0
        if (!withinTotalBudget(spent, TOTAL_CAP)) return NextResponse.json({ ok: true, status: "capped", reason: "total" })
        const since = new Date(Date.now() - 24 * 3600 * 1000)
        const today = await fs.count({ where: { createdAt: { gte: since } } })
        if (today >= DAILY_CAP) return NextResponse.json({ ok: true, status: "capped", reason: "daily" })

        // Nom + DA + types du stade (miroir EXACT de buildCustomSpecies).
        const stageName = spec.stageNames?.[stage]?.trim() || `${spec.name}${ROMAN[stage] ?? ""}`
        const da = (stage === totalStages && spec.daFinal?.trim()) ? spec.daFinal.trim() : spec.da.trim()
        const types = typesAtStage(spec, stage).map((t) => String(t))

        // RÉSERVATION ATOMIQUE d'un essai (idempotent : un seul générateur par clé).
        let attemptNo = 1
        if (!existing) {
            try {
                await fs.create({ data: { pairKey, parentAId: baseId, parentBId: `s${stage}`, fusionName: stageName.slice(0, 60), status: "PENDING", attempts: 1, model: null, promptVersion: PROMPT_VERSION } })
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

        // GÉNÉRATION (facturée). origin = pour fetch les ancres de style (+ le refUrl du stade précédent → chaînage).
        const gen = await generateCustomDaemonSprite({ origin: req.nextUrl.origin, key, da, name: stageName, types, stage, totalStages, refUrl })
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
