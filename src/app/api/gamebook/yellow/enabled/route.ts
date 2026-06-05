// src/app/api/gamebook/yellow/enabled/route.ts
//
// Nexus Jaune Éclair — indique au CLIENT si le passage vers le Chapitre 2 est
// ouvert (feature flag + isSystem). Sert au teaser de fin de Chapitre 1 pour
// afficher soit le bouton d'entrée, soit le message « pas encore ouvert ».
// Ne 404 PAS quand c'est désactivé : renvoie { enabled: false } (le teaser gère).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    return NextResponse.json({ enabled })
}
