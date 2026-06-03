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
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import type { YellowMapData } from "@/lib/gamebook/yellow/maps"

export const dynamic = "force-dynamic"

// Spawn par défaut côté serveur (doit rester en phase avec store/gameStore.ts).
// VILLE JAUNE = Viridian City 45×40 (scale natif), entrée sud centre-bas.
const DEFAULT_PLAYER = {
    mapId: YELLOW_ENTRANCE_MAP_ID,
    posX: 22,
    posY: 38,
    direction: "up" as const,
}

function isPositionWalkable(map: YellowMapData, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
    const tile = map.tiles[y][x]
    if (isBlockingTile(tile)) return false
    // Mur de bâtiment (sauf porte)
    if (map.buildings) {
        for (const b of map.buildings) {
            const inside = x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
            if (!inside) continue
            const isDoor = x === b.x + b.doorX && y === b.y + b.doorY
            if (!isDoor) return false
        }
    }
    return true
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

    // Safety : si la map a évolué depuis le dernier save (refonte, building
    // ajouté à l'emplacement où le joueur était…), on retombe sur le spawn
    // par défaut pour éviter de spawn le joueur dans un mur infranchissable.
    const map = YELLOW_MAPS[player.mapId]
    if (!map || !isPositionWalkable(map, player.posX, player.posY)) {
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
        create: { userId, chapterId: YELLOW_CHAPTER_ID, currentNodeId: "map", mapId, posX, posY, direction },
        update: { mapId, posX, posY, direction },
    })

    return NextResponse.json({ ok: true })
}
