// Nexus II "jaune éclair" — état joueur côté serveur.
//
// Modèle de stockage :
//   - Une ligne GamebookProgress(userId, chapterId="yellow") DIFFÉRENTE de
//     la ligne (userId, chapterId="map_v3"). Isolation totale des données v3.
//   - On utilise les colonnes existantes mapId/posX/posY/direction. Aucune
//     migration de schéma nécessaire — Prisma applique les defaults aux 130
//     autres colonnes (qui ne concernent que v3 et sont ignorées en v2).
//
// GET  : récupère l'état du joueur OU renvoie les valeurs par défaut si
//        aucune ligne n'existe encore. Crée RIEN tant qu'il n'a pas bougé.
// POST : upsert avec un body { mapId, posX, posY, direction }. Valide les
//        bornes côté serveur (anti-cheat basique).
//
// Bytes-budget estimé : ~150 octets par GET (4 champs sélectionnés), ~50
// octets par POST upsert. Avec un POST debouncé toutes les 3 secondes côté
// client, ça reste très loin du quota Neon free tier.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    isNexusYellowEnabled,
    YELLOW_CHAPTER_ID,
    YELLOW_ENTRANCE_MAP_ID,
} from "@/lib/gamebook/yellow/featureFlag"
import { YELLOW_MAPS } from "@/lib/gamebook/yellow/maps"

export const dynamic = "force-dynamic"

// Spawn par défaut côté serveur (doit rester en phase avec store/gameStore.ts).
const DEFAULT_PLAYER = {
    mapId: YELLOW_ENTRANCE_MAP_ID,
    posX: 7,
    posY: 10,
    direction: "up" as const,
}

async function authorize(): Promise<{ userId: string } | NextResponse> {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return NextResponse.json({ error: "Forbidden", reason: "Nexus II non accessible" }, { status: 403 })
    return { userId }
}

export async function GET() {
    const auth = await authorize()
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
        select: { mapId: true, posX: true, posY: true, direction: true },
    })

    const player = progress
        ? {
              mapId: progress.mapId,
              posX: progress.posX,
              posY: progress.posY,
              direction: progress.direction,
          }
        : DEFAULT_PLAYER

    // Si le mapId stocké n'existe pas (ou n'est pas une map yellow), on
    // retombe sur l'entrée. Évite de boot un joueur sur une map disparue.
    if (!YELLOW_MAPS[player.mapId]) {
        return NextResponse.json({ player: DEFAULT_PLAYER, recovered: true })
    }

    return NextResponse.json({ player })
}

interface SavePayload {
    mapId?: unknown
    posX?: unknown
    posY?: unknown
    direction?: unknown
}

export async function POST(req: Request) {
    const auth = await authorize()
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    let body: SavePayload
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 })
    }

    const mapId = typeof body.mapId === "string" ? body.mapId : null
    const posX = typeof body.posX === "number" ? body.posX : null
    const posY = typeof body.posY === "number" ? body.posY : null
    const direction = typeof body.direction === "string" ? body.direction : null

    if (!mapId || posX === null || posY === null || !direction) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    if (!["up", "down", "left", "right"].includes(direction)) {
        return NextResponse.json({ error: "Invalid direction" }, { status: 400 })
    }

    // Anti-cheat basique : la map doit exister côté yellow + position dans les bornes
    const map = YELLOW_MAPS[mapId]
    if (!map) return NextResponse.json({ error: "Unknown yellow map" }, { status: 400 })
    if (posX < 0 || posX >= map.width || posY < 0 || posY >= map.height) {
        return NextResponse.json({ error: "Out of bounds" }, { status: 400 })
    }

    await (prisma as any).gamebookProgress.upsert({
        where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
        create: { userId, chapterId: YELLOW_CHAPTER_ID, mapId, posX, posY, direction },
        update: { mapId, posX, posY, direction },
    })

    return NextResponse.json({ ok: true })
}
