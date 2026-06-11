// Nexus Jaune Éclair — Dex : table des types (règles d'efficacité). Non gated,
// accessible à tout joueur connecté.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { POKE_TYPES, type PokeType } from "@/lib/gamebook/yellow/battle/types"
import TypeChartClient from "./TypeChartClient"

export const dynamic = "force-dynamic"

export default async function YellowTypeChartPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) redirect("/")

    const { type } = await searchParams
    const upper = type?.toUpperCase() as PokeType | undefined
    const initialType = upper && POKE_TYPES.includes(upper) ? upper : null

    return <TypeChartClient initialType={initialType} />
}
