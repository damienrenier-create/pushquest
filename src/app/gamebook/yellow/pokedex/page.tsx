// Nexus Jaune Éclair — page Pokédex (gated feature flag).

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import PokedexClient from "./PokedexClient"

export const dynamic = "force-dynamic"

export default async function YellowPokedexPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()

    return <PokedexClient />
}
