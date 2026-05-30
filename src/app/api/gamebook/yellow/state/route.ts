// Nexus II "jaune éclair" — endpoint stub gardé par le feature flag.
//
// Cette route prouve que la gate fonctionne :
//   - Non connecté            → 401
//   - Connecté mais non-créateur ou flag OFF → 403
//   - Créateur + flag ON      → renvoie un stub state pour la map yellow_entrance
//
// Aucune écriture en BDD ici. Aucune lecture autre que `user.isSystem` via le helper.
// Quand le vrai gameplay v2 arrivera, ce stub sera remplacé par une vraie route state
// qui lit/écrit la ligne GamebookProgress(userId, chapterId="yellow").

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID, YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { YELLOW_MAPS } from "@/lib/gamebook/yellow/maps"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) {
        return NextResponse.json(
            { error: "Forbidden", reason: "Nexus II non accessible" },
            { status: 403 },
        )
    }

    return NextResponse.json({
        chapterId: YELLOW_CHAPTER_ID,
        mapId: YELLOW_ENTRANCE_MAP_ID,
        map: YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID],
        npcs: YELLOW_NPCS.filter((n) => n.mapId === YELLOW_ENTRANCE_MAP_ID),
        spawn: { x: 4, y: 5 },
        note: "STUB scaffolding — gameplay v2 à venir",
    })
}
