// Nexus Jaune Éclair — SUPER-ADMIN : générateur de progression (outil de test).
//
// Gate identique à la page de jeu (connecté + chapitre ouvert). Pas de gestion de droits
// pour l'instant : l'outil n'écrit QUE la save du compte connecté (l'API save ne permet
// rien d'autre), il n'y a donc pas d'escalade possible vers un autre joueur.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { notFound } from "next/navigation"
import SuperAdminPanel from "./SuperAdminPanel"

export const dynamic = "force-dynamic"

export default async function YellowAdminPage() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!(await isNexusYellowEnabled(userId))) return notFound()
    const nickname = (session?.user as { name?: string })?.name ?? ""

    return <SuperAdminPanel nickname={nickname} />
}
