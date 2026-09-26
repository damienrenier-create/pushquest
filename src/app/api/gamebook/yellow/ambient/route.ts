// src/app/api/gamebook/yellow/ambient/route.ts
//
// Nexus Jaune Éclair — 📰 ACTUALITÉS DU NEXUS.
//  POST : le client signale une connexion → le serveur dépose éventuellement les cadeaux d'ambiance dus
//         (sacre de Ligue 1×/semaine, reflet battu 1×/jour). Les chemins de réclamation HABITUELS
//         (hall-of-fame/energy et duel-gift) les créditent et les annoncent juste après : rien de neuf côté UX.
//
// La cadence est arbitrée côté serveur par écriture conditionnelle (cf. server/ambientNews) : le client ne peut
// donc pas farmer d'énergie en rechargeant. Le client n'appelle PAS cette route en run 3 (énergie source unique).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { generateAmbientNews } from "@/lib/gamebook/yellow/server/ambientNews"

export const dynamic = "force-dynamic"

export async function POST() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const news = await generateAmbientNews(userId)
    return NextResponse.json({ ok: true, ...news })
}
