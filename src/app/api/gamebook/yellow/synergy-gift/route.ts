// src/app/api/gamebook/yellow/synergy-gift/route.ts
//
// Nexus Jaune Éclair — FÊTE DE DÉCOUVERTE DE SYNERGIE (calquée sur la fête shiny). Quand un joueur PERCE pour la
// 1re fois MONDIALE un « secret » de fusion synergique (fusion inédite / clan / paire / mimimoy), toute la
// communauté est récompensée : +200⚡ pour les joueurs ayant atteint le Dôme de Fusion (autel_visited), +50⚡ pour
// les autres. Réutilise la table ShinyGift avec kind="synergy" (AUCUN db:push) ; énergie VARIABLE par bénéficiaire.
// Idempotent MONDIAL par eventKey = `synergy:<key>` → 1 seule fête par secret, à vie. Réclamé au login via la même
// route que la fête shiny (GET /shiny-gift claime toutes les lignes ShinyGift, tous kinds confondus).
//
// Table gated (try/catch) → NEUTRE tant que ShinyGift n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { AUTEL_VISITED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"

export const dynamic = "force-dynamic"
const ENERGY_DOME = 200 // a atteint le Dôme de Fusion
const ENERGY_OTHER = 50 // le reste de la communauté

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// POST { key, label } → 1re découverte MONDIALE d'un secret → don ShinyGift(kind="synergy") à TOUS (200 si Dôme atteint, sinon 50).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { key?: unknown; label?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const key = typeof body.key === "string" ? body.key.slice(0, 80) : ""
    const label = typeof body.label === "string" ? body.label.slice(0, 80) : ""
    if (!key || !label) return NextResponse.json({ error: "bad_params" }, { status: 400 })
    const eventKey = `synergy:${key}`

    try {
        const sg = prisma.shinyGift
        // Idempotence MONDIALE : la fête d'un secret n'a lieu qu'UNE fois à vie (le 1er découvreur au monde).
        const dup = await sg.findFirst({ where: { eventKey }, select: { id: true } })
        if (dup) return NextResponse.json({ ok: true, skipped: "already-discovered" })

        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })

        // TOUS les joueurs Nexus Jaune (découvreur inclus). On lit leurs `flags` pour le split 200/50 (Dôme atteint ?).
        const players = (await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID }, select: { userId: true, flags: true },
        })) as { userId: string; flags: unknown }[]
        if (players.length > 0) {
            await sg.createMany({
                data: players.map((p) => {
                    const dt = (p.flags && typeof p.flags === "object" ? (p.flags as { defeatedTrainers?: unknown }).defeatedTrainers : null)
                    const reachedDome = Array.isArray(dt) && dt.includes(AUTEL_VISITED_MARKER)
                    return { toUserId: p.userId, fromUserId: auth.userId, fromNickname: me.nickname, kind: "synergy", speciesId: label, eventKey, energy: reachedDome ? ENERGY_DOME : ENERGY_OTHER }
                }),
            })
        }
        return NextResponse.json({ ok: true, granted: players.length })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
