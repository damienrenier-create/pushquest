// src/app/api/gamebook/yellow/registry/route.ts
//
// Nexus Jaune Éclair — REGISTRE DES DRESSEURS (bibliothèque du Centre Daemon).
// Renvoie, pour chaque joueur Yellow (invités inclus), un résumé public de sa
// progression : équipe (espèces + niveaux), Pokédex, badges, PvP, victoires ACE,
// Daemon fétiche. Lecture seule, gated comme le reste du chapitre.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { parseSave } from "@/lib/gamebook/yellow/storage/save"
import { SPECIES } from "@/lib/gamebook/yellow/data/species"

export const dynamic = "force-dynamic"

const DEX_TOTAL = Object.keys(SPECIES).length

/** Clé au plus grand compteur (Daemon fétiche / attaque favorite). */
function topKey(rec: Record<string, number>): string | null {
    let best: string | null = null
    let max = 0
    for (const [k, v] of Object.entries(rec)) if (v > max) { max = v; best = k }
    return best
}

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const rows = await (prisma as any).gamebookProgress.findMany({
        where: { chapterId: YELLOW_CHAPTER_ID },
        select: { userId: true, flags: true, user: { select: { nickname: true, isGuest: true, gameMode: true } } },
    })

    const players = (rows as { userId: string; flags: unknown; user: { nickname: string | null; isGuest: boolean; gameMode: string | null } | null }[])
        .map((r) => {
            const s = parseSave(r.flags)
            // ÉQUIPE COURANTE (pas le run-1 gelé) : le top-level est le monde LIVE ; l'équipe active d'un joueur en
            // run 2/3 est imbriquée dans ngplusWorld/run3World → on expose le monde ACTIF pour un vrai reflet.
            const activeTeam = s.activeWorld === "ngplus" && s.ngplusWorld ? s.ngplusWorld.team
                : s.activeWorld === "run3" && s.run3World ? s.run3World.team
                : s.team
            return {
                userId: r.userId,
                nickname: r.user?.nickname ?? "?",
                isGuest: r.user?.isGuest === true,
                gameMode: r.user?.gameMode ?? "normal", // "fun" = lien nexus-fun-2026 → scoping des reflets fun (route nord)
                // MIROIR à PLEINE PUISSANCE : on expose la VRAIE force du joueur (EV entraînés, points Saiyan `allocated`,
                //   IV, moveset/CT réels, objets tenus) — pas seulement espèce+niveau — pour que son reflet IA soit au
                //   niveau du joueur (et active ses pilotes d'archétype via les moves équipés). Lecture seule, contexte fermé.
                team: activeTeam.map((m) => ({
                    speciesId: m.speciesId, level: m.level, nickname: m.nickname ?? null, shiny: m.shiny,
                    ev: m.ev, allocated: m.allocated, ivs: m.ivs,
                    moves: m.moves.map((x) => x.moveId),
                    heldItem: m.heldItem, heldItem2: m.heldItem2,
                })),
                // DAEMONS CUSTOM du joueur (specs) → le SPECTATEUR les enregistre pour RÉSOUDRE l'espèce (sprite +
                //   combat du reflet) au lieu de la jeter. Sans ça, un Daemon custom/canonisé d'un autre joueur = MISSINGNO.
                customDaemons: s.customDaemons ?? [],
                dexCaught: s.pokedex.caught.length,
                badges: s.badges,
                pvp: { wins: s.pvpStats.wins, losses: s.pvpStats.losses },
                aceWins: s.aceWins,
                favoriteDaemon: topKey(s.pvpStats.daemonUse),
                favoriteMove: topKey(s.pvpStats.moveUse),
                chosenAvatar: s.chosenAvatar ?? null, // FASHION VICTIM : skin adopté → le reflet l'affiche partout
            }
        })
        .filter((p) => p.team.length > 0) // uniquement ceux qui ont vraiment commencé

    return NextResponse.json({ ok: true, players, dexTotal: DEX_TOTAL, me: userId })
}
