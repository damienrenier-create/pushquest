// Nexus II "jaune éclair" — page de dev pour visualiser la coque GBC.
//
// Server component qui gate l'accès (isNexusYellowEnabled) puis rend un client
// component avec la coque GBC et un contenu placeholder dans l'écran.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { isCreatorAccount } from "@/lib/gamebook/creator"
import { notFound } from "next/navigation"
import YellowDevClient from "./YellowDevClient"

export const dynamic = "force-dynamic"

export default async function YellowDevPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()
    // Réservé au créateur : active le téléport de dev ?map=<id> (ex. Cendreville).
    const isCreator = userId ? await isCreatorAccount(userId) : false
    // Pseudo du compte (whitelist du gate ACE → Cendreville pour certains joueurs).
    const nickname = (session?.user as { name?: string })?.name ?? ""

    return <YellowDevClient userId={userId ?? ""} isCreator={isCreator} nickname={nickname} />
}
