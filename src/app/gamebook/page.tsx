// src/app/gamebook/page.tsx
//
// Page serveur du Gamebook. CHAPITRE 1 RETIRÉ (juin 2026) : tout joueur connecté est
// redirigé directement vers le Nexus II (Chapitre 2 "jaune éclair"). Le Chapitre 1 n'est
// plus chargé ; l'ancien GamebookClient reste en repo pour archive mais n'est plus monté.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function GamebookPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as { id?: string }).id) {
        redirect("/login")
    }

    // Aspiration directe dans le Chapitre 2 — quel que soit le joueur (créateur, invité, pote).
    redirect("/gamebook/yellow")
}
