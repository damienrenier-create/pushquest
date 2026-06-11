// Nexus Jaune Éclair — Dex de référence (fiche d'une espèce).

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import DexDetailClient from "./DexDetailClient"

export const dynamic = "force-dynamic"

export default async function YellowDexDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) redirect("/")

    const { id } = await params
    if (!getSpecies(id)) notFound()

    return <DexDetailClient id={id} />
}
