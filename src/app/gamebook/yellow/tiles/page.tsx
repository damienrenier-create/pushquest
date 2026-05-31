// Nexus II — page debug viewer des tilesets FireRed.
//
// Page gatée (creator + flag) qui affiche les 6 tilesets téléchargés depuis
// pret/pokefirered, à 4× la taille native, avec grille rouge tous les 16 px
// (= 1 tile) et coordonnées affichées en haut/à gauche.
//
// Cette page est temporaire — elle sert à identifier les coords précises de
// chaque tile (grass/path/tree/etc.) pour qu'on les mappe dans MapView.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import TilesViewerClient from "./TilesViewerClient"

export const dynamic = "force-dynamic"

export default async function YellowTilesPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const enabled = await isNexusYellowEnabled(userId)
    if (!enabled) return notFound()

    return <TilesViewerClient />
}
