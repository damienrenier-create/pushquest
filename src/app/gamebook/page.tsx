// src/app/gamebook/page.tsx
//
// Page serveur du Gamebook. Garde-fou auth + injection des props.
// Monte le client GamebookClient v3 (carte Pokémon-style).

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import GamebookClient from "./GamebookClient"

export const dynamic = "force-dynamic"

export default async function GamebookPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as { id?: string }).id) {
        redirect("/login")
    }

    const user = session.user as { id: string; name?: string }

    return (
        <main className="min-h-screen">
            <GamebookClient
                nickname={user.name ?? "Aventurier"}
                userId={user.id}
            />
        </main>
    )
}
