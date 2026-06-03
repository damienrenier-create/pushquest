// Nexus Jaune Éclair — page de dev du système de combat (gated feature flag).

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import BattleDevClient from "./BattleDevClient"

export const dynamic = "force-dynamic"

export default async function YellowBattlePage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()

    return <BattleDevClient />
}
