// src/app/api/gamebook/yellow/energy-grant/route.ts
//
// Nexus Jaune Éclair — CONSOMMATION d'un CADEAU d'énergie en attente (vœu génie / admin).
// Canal serveur→client ANTI-ÉCRASEMENT : le cadeau vit dans FrontierProfile.energyGrantPending (jamais
// sérialisé dans la save → un autosave ne peut pas l'effacer). Le client, au chargement, voit le montant via
// /player-stats (WildPlayerCtx.energyGrantPending), le CRÉDITE (creditReps) ET LE PERSISTE d'abord, PUIS appelle
// CE POST pour le consommer EN DERNIER. Ordre anti-perte : le crédit est déjà sauvé avant la consommation, donc
// même si la réponse de ce POST se perd, rien n'est perdu (au pire un re-crédit inoffensif au prochain load).
//
// COMPARE-AND-SWAP : on ne remet à 0 QUE si energyGrantPending vaut TOUJOURS exactement le montant que le client
// vient de créditer → on n'efface jamais un cadeau PLUS RÉCENT (nouveau montant posé entre-temps par l'admin), et
// deux onglets qui consomment le même cadeau ne peuvent pas se marcher dessus.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    let amount = 0
    try { const b = await req.json(); amount = Math.max(0, Math.floor(b?.amount ?? 0)) } catch { /* corps absent */ }
    if (amount <= 0) return NextResponse.json({ ok: true, consumed: false })

    try {
        const res = await (prisma as any).frontierProfile.updateMany({
            where: { userId, energyGrantPending: amount },
            data: { energyGrantPending: 0 },
        })
        return NextResponse.json({ ok: true, consumed: res.count === 1 })
    } catch {
        // Profil / colonne absents (avant db:push) → rien à consommer, non bloquant.
        return NextResponse.json({ ok: true, consumed: false })
    }
}
