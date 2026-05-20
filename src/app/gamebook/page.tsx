// src/app/gamebook/page.tsx
//
// Page serveur du Gamebook. Garde-fou auth + injection des props.
// Remplace l'ancienne page (qui montait l'ancien SanctuaireTab).

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import GamebookClient from "./GamebookClient"

export const dynamic = "force-dynamic"

export default async function GamebookPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).id) {
        redirect("/login")
    }

    const user = session.user as any

    return (
        <main className="min-h-screen">
            <GamebookClient
                nickname={user.name ?? "Aventurier"}
                userId={user.id}
            />
        </main>
    )
}
