// src/app/api/gamebook/yellow/clan-hall-of-fame/route.ts
//
// Nexus Jaune Éclair — PANTHÉON DES CLANS (Chapelle de Nouillon, partagé entre tous les joueurs).
//  Grave le PIC de niveau du Daemon-clan de chaque membre, PAR clan, de façon PERSISTANTE cross-run (le pacte
//  reset au NG+, mais le nom gravé reste). Chaque joueur a AU PLUS une ligne par clan, maintenue à son pic.
//  POST : le client signale son Daemon-clan courant → upsert-au-pic (on n'écrase que si le niveau progresse).
//  GET  : renvoie les membres gravés, groupés par clan, du plus haut niveau au plus bas.
//
// Stockage : on RÉUTILISE la table LeagueChampion avec world = "clan:<air|combat|roche>" → AUCUNE migration
// (save-safe, comme dome-hall-of-fame/). Le champ `team` porte un petit JSON { level, speciesId, transcended }.
// Passe par (prisma as any).leagueChampion (gated) → neutre tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { CLAN_KEYS } from "@/lib/gamebook/yellow/data/clans"

export const dynamic = "force-dynamic"

const CLANS = new Set<string>(CLAN_KEYS as readonly string[])

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

interface StoredEntry { level?: number; speciesId?: string; transcended?: boolean }

// Membres gravés des 3 clans (Panthéon partagé), par clan, du plus haut niveau au plus bas.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const lc = (prisma as any).leagueChampion
        const rows = (await lc.findMany({
            where: { world: { startsWith: "clan:" } },
            take: 600,
            select: { nickname: true, team: true, wonAt: true, world: true },
        })) as { nickname: string; team: string; wonAt: Date; world: string }[]
        const members = rows.map((r) => {
            let e: StoredEntry = {}
            try { e = JSON.parse(r.team) as StoredEntry } catch { e = {} }
            return {
                nickname: r.nickname,
                clan: r.world.replace("clan:", ""),
                level: typeof e.level === "number" ? e.level : 0,
                speciesId: typeof e.speciesId === "string" ? e.speciesId : "",
                transcended: e.transcended === true,
                wonAt: r.wonAt,
            }
        }).sort((a, b) => b.level - a.level)
        return NextResponse.json({ ok: true, members })
    } catch {
        return NextResponse.json({ ok: true, members: [] }) // table pas encore créée → neutre
    }
}

// Le client signale son Daemon-clan courant → upsert-au-pic (une ligne par joueur et par clan, jamais rétrogradée).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { clan?: unknown; level?: unknown; speciesId?: unknown; transcended?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const clan = typeof body.clan === "string" && CLANS.has(body.clan) ? body.clan : null
    if (!clan) return NextResponse.json({ error: "Bad clan" }, { status: 400 })
    const level = typeof body.level === "number" && isFinite(body.level) ? Math.max(0, Math.min(100, Math.floor(body.level))) : 0
    if (level <= 0) return NextResponse.json({ ok: true, skipped: "no-level" })
    const speciesId = typeof body.speciesId === "string" ? body.speciesId.slice(0, 40) : ""
    const transcended = body.transcended === true
    const world = `clan:${clan}`
    const payload = JSON.stringify({ level, speciesId, transcended })

    try {
        const lc = (prisma as any).leagueChampion
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        const existing = (await lc.findFirst({ where: { userId: auth.userId, world }, select: { id: true, team: true } })) as { id: string; team: string } | null
        if (!existing) {
            await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: payload, world } })
            return NextResponse.json({ ok: true, created: true })
        }
        let prev: StoredEntry = {}
        try { prev = JSON.parse(existing.team) as StoredEntry } catch { prev = {} }
        const prevLevel = typeof prev.level === "number" ? prev.level : 0
        if (level <= prevLevel && !(transcended && !prev.transcended)) return NextResponse.json({ ok: true, kept: true }) // pic conservé
        await lc.update({ where: { id: existing.id }, data: { nickname: me.nickname, team: payload } })
        return NextResponse.json({ ok: true, updated: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
