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
import { fusionSecretRevealKey } from "@/lib/gamebook/yellow/data/fusionSpecies"

export const dynamic = "force-dynamic"
const ENERGY_ALL = 200 // +200 ⚡ pour TOUTE la communauté (découvreur inclus) — la découverte d'un secret profite à tous

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

    let body: { key?: unknown; label?: unknown; reveal?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    // RÉVÉLATION D'UNE PAIRE DE CLAN (page « Secrets » : une carte par paire) — UNE seule ligne-journal (au nom du découvreur,
    //   énergie 0, déjà « réclamée »), jamais de fête : celle du clan reste unique (clé `clan:<clan>`). La clé est revalidée
    //   contre le catalogue réel (aucune clé arbitraire).
    if (typeof body.reveal === "string") {
        const rk = body.reveal.slice(0, 120)
        const m = rk.match(/^clan:[a-z]+:([a-z0-9_]+)\|([a-z0-9_]+)$/)
        if (!m || fusionSecretRevealKey(m[1], m[2]) !== rk) return NextResponse.json({ error: "bad_reveal" }, { status: 400 })
        try {
            const sg = prisma.shinyGift
            const eventKey = `reveal:${rk}`
            if (await sg.findFirst({ where: { eventKey }, select: { id: true } })) return NextResponse.json({ ok: true, skipped: "already-revealed" })
            const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
            if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
            const label = typeof body.label === "string" ? body.label.slice(0, 80) : ""
            await sg.create({ data: { toUserId: auth.userId, fromUserId: auth.userId, fromNickname: me.nickname, kind: "synergy_reveal", speciesId: label, eventKey, energy: 0, claimed: true } })
            return NextResponse.json({ ok: true, revealed: rk })
        } catch {
            return NextResponse.json({ ok: true, skipped: "no-table" })
        }
    }
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

        // TOUS les joueurs Nexus Jaune (découvreur inclus) reçoivent +200 ⚡ — flat, plus de split Dôme.
        const players = (await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID }, select: { userId: true },
        })) as { userId: string }[]
        if (players.length > 0) {
            await sg.createMany({
                data: players.map((p) => ({ toUserId: p.userId, fromUserId: auth.userId, fromNickname: me.nickname, kind: "synergy", speciesId: label, eventKey, energy: ENERGY_ALL })),
            })
        }
        return NextResponse.json({ ok: true, granted: players.length })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}

// GET → les secrets déjà PERCÉS dans le Nexus (1er découvreur au monde + date), du plus ancien au plus récent. Sert à la
//   page « Secrets » du Fusiodex : une ombre passe en couleur pour tous dès qu'un joueur l'a percée. Lecture seule.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const rows = (await prisma.shinyGift.findMany({
            where: { kind: { in: ["synergy", "synergy_reveal"] } }, // fêtes (inédites, duos, clans, Mimimoy) + révélations des paires de clan
            select: { eventKey: true, fromNickname: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        })) as { eventKey: string; fromNickname: string; createdAt: Date }[]
        const seen = new Set<string>()
        const discovered: { key: string; by: string; at: string }[] = []
        for (const r of rows) {
            const key = r.eventKey.replace(/^synergy:/, "").replace(/^reveal:/, "")
            if (!key || seen.has(key)) continue // une ligne par bénéficiaire : on garde la 1re (même découvreur, même date)
            seen.add(key)
            discovered.push({ key, by: r.fromNickname, at: r.createdAt.toISOString() })
        }
        return NextResponse.json({ ok: true, discovered })
    } catch {
        return NextResponse.json({ ok: true, discovered: [] }) // table absente → neutre (tout reste en ombre)
    }
}
