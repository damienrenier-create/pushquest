// Nexus Jaune Éclair — page FUSIODEX (gated feature flag). Le déblocage EN JEU (arrivée au Dôme Fusion) est
// vérifié côté client (marker autel_visited) : anti-spoiler même par URL directe.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import FusiodexClient from "./FusiodexClient"

export const dynamic = "force-dynamic"

export default async function YellowFusiodexPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()

    return <FusiodexClient />
}
