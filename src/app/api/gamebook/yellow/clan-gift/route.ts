// src/app/api/gamebook/yellow/clan-gift/route.ts
//
// MODE FUN — CADEAU D'ÉNERGIE DU CHEF DE CLAN (fan-out communautaire, MÊME clan / MÊME run).
//  POST : appelé quand le chef récompense un membre (disciple > niv 20). Le +1000⚡ du membre est déjà crédité
//         côté client (clanChief). Ici on fait RUISSELER 500⚡ sur TOUS les AUTRES membres FUN du MÊME clan ET
//         du MÊME run (monde) que le donneur → lignes FunChenGrant (tier 9), réclamées à leur connexion (chen-gift GET).
//  Idempotent par eventKey `clangift:<userId>:<world>` (one-time PAR RUN). JAMAIS en run 3 (ni replay).
//
// Réutilise la table FunChenGrant (aucune migration). Gated FUN-only.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const CLAN_GIFT_TIER = 9        // tier « clan » (≠ 1/2 = Chen) → message dédié côté client
const CLAN_GIFT_ENERGY = 500

/** Clan du monde `world` dans un blob de flags (live = plat ; ngplus = monde imbriqué). run3/replay = pas de cadeau. */
function clanOfWorld(flags: Record<string, unknown> | null | undefined, world: string): string | null {
    const f = (flags ?? {}) as Record<string, unknown>
    if (world === "live") return typeof f.clan === "string" ? f.clan : null
    if (world === "ngplus") { const w = f.ngplusWorld as Record<string, unknown> | null | undefined; return w && typeof w.clan === "string" ? w.clan : null }
    return null // run3 / replay → jamais
}

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function POST() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true, gameMode: true } })
        if (!me || me.gameMode !== "fun") return NextResponse.json({ ok: false, reason: "not-fun" })

        const myGp = await prisma.gamebookProgress.findFirst({ where: { userId: auth.userId, chapterId: "yellow" }, select: { flags: true } }) as { flags: Record<string, unknown> } | null
        const myFlags = myGp?.flags ?? {}
        const world = typeof myFlags.activeWorld === "string" ? myFlags.activeWorld : "live"
        if (world !== "live" && world !== "ngplus") return NextResponse.json({ ok: false, reason: "run3-or-replay" }) // jamais run 3/replay
        const myClan = clanOfWorld(myFlags, world)
        if (!myClan) return NextResponse.json({ ok: false, reason: "no-clan" })

        const fg = (prisma as any).funChenGrant
        const eventKey = `clangift:${auth.userId}:${world}`
        if (await fg.findFirst({ where: { eventKey }, select: { id: true } })) return NextResponse.json({ ok: false, reason: "already" }) // one-time/run

        // Destinataires = AUTRES joueurs FUN dont le clan DU MÊME MONDE == mon clan.
        const funPlayers = (await prisma.gamebookProgress.findMany({
            where: { chapterId: "yellow", user: { gameMode: "fun" } },
            select: { userId: true, flags: true },
        })) as { userId: string; flags: Record<string, unknown> }[]
        const recipients = funPlayers.filter((p) => p.userId !== auth.userId && clanOfWorld(p.flags, world) === myClan).map((p) => p.userId)

        if (recipients.length > 0) {
            await fg.createMany({
                data: recipients.map((id) => ({ toUserId: id, fromUserId: auth.userId, fromNickname: me.nickname, tier: CLAN_GIFT_TIER, eventKey, energy: CLAN_GIFT_ENERGY })),
            })
        }
        return NextResponse.json({ ok: true, granted: recipients.length, clan: myClan, world })
    } catch {
        return NextResponse.json({ ok: false, reason: "no-table" })
    }
}
