// Nexus II "jaune éclair" — page de dev pour visualiser la coque GBC.
//
// Server component qui gate l'accès (isNexusYellowEnabled) puis rend un client
// component avec la coque GBC et un contenu placeholder dans l'écran.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import YellowDevClient from "./YellowDevClient"

export const dynamic = "force-dynamic"

export default async function YellowDevPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()

    return <YellowDevClient />
}
