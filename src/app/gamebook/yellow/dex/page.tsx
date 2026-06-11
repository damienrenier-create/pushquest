// Nexus Jaune Éclair — Dex de référence (liste). Catalogue COMPLET des espèces,
// non gated par seen/caught (contrairement à /pokedex). Accessible à tout joueur
// connecté.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DexClient from "./DexClient"

export const dynamic = "force-dynamic"

export default async function YellowDexPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) redirect("/")

    return <DexClient />
}
