// src/app/api/gamebook/yellow/enabled/route.ts
//
// Nexus Jaune Éclair — indique au CLIENT si le passage vers le Chapitre 2 est
// ouvert (feature flag + isSystem). Sert au teaser de fin de Chapitre 1 pour
// afficher soit le bouton d'entrée, soit le message « pas encore ouvert ».
// Ne 404 PAS quand c'est désactivé : renvoie { enabled: false } (le teaser gère).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { parseSave } from "@/lib/gamebook/yellow/storage/save"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)

    // entered = le joueur a déjà entamé le Chapitre 2 (intro vue) → ne plus le téléporter.
    let entered = false
    if (enabled && userId) {
        try {
            const row = await (prisma as any).gamebookProgress.findUnique({
                where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
                select: { flags: true },
            })
            if (row?.flags) entered = parseSave(row.flags).introSeen === true
        } catch { /* défaut : non entamé */ }
    }
    return NextResponse.json({ enabled, entered })
}
