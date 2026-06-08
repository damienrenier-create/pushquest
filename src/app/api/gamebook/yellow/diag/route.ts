// src/app/api/gamebook/yellow/diag/route.ts
//
// Diagnostic SIMPLE de la config Pusher (multijoueur casino / PvP).
// Ouvre /api/gamebook/yellow/diag en étant connecté → il dit en clair ce qui
// manque. Ne révèle AUCUNE valeur secrète, seulement si chaque clé est définie.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PUSHER_ENABLED } from "@/lib/pusher"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ verdict: "⚠️ Connecte-toi d'abord (ouvre l'app, puis reviens sur ce lien)." }, { status: 401 })
    }

    const serveur = PUSHER_ENABLED // APP_ID && KEY && SECRET && CLUSTER (tous présents)
    const clientKey = !!process.env.NEXT_PUBLIC_PUSHER_KEY
    const clientCluster = !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    const client = clientKey && clientCluster

    let verdict: string
    if (serveur && client) {
        verdict = "✅ Pusher est ENTIÈREMENT configuré dans Vercel (serveur + client). Le multijoueur DOIT marcher. Si tu ne vois personne : (1) vous devez être TOUS dans le bâtiment CASINO en même temps, (2) rechargez la page en DUR (Ctrl+Maj+R) pour vider le cache. Si ça persiste, dis-le-moi : c'est un bug à creuser."
    } else if (!serveur && !client) {
        verdict = "❌ AUCUNE clé Pusher dans Vercel (ni serveur, ni client). C'est LA cause : impossible de voir/affronter d'autres joueurs. → Ajoute les 6 variables dans Vercel (Settings → Environment Variables) puis REDÉPLOIE."
    } else if (serveur && !client) {
        verdict = "❌ Les clés SERVEUR sont là, mais les clés CLIENT manquent (NEXT_PUBLIC_PUSHER_KEY et/ou NEXT_PUBLIC_PUSHER_CLUSTER). C'est LA cause : ton navigateur ne se connecte jamais à Pusher. → Ajoute-les dans Vercel puis REDÉPLOIE (obligatoire pour les NEXT_PUBLIC_*)."
    } else {
        verdict = "❌ Les clés CLIENT sont là, mais les clés SERVEUR sont incomplètes (il faut PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER, les 4). → Complète-les dans Vercel puis redéploie."
    }

    return NextResponse.json({
        verdict,
        detail: {
            "serveur (PUSHER_* complet)": serveur,
            "client NEXT_PUBLIC_PUSHER_KEY défini": clientKey,
            "client NEXT_PUBLIC_PUSHER_CLUSTER défini": clientCluster,
        },
    })
}
