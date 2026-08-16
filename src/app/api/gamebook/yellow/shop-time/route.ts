// src/app/api/gamebook/yellow/shop-time/route.ts
//
// LA BOURSE DU NEXUS — heure SERVEUR (Europe/Paris) pour le calcul des prix dynamiques du magasin. Le client
// interroge cette route à l'ouverture du shop : le multiplicateur de bourse dépend de l'HEURE SERVEUR, pas de
// l'horloge du joueur → impossible de tricher en changeant l'heure de sa machine. Pas d'auth (donnée publique :
// juste l'heure serveur + le multiplicateur dérivé). Non caché (force-dynamic) → toujours l'heure courante.

import { NextResponse } from "next/server"
import { bourseMultiplier } from "@/lib/gamebook/yellow/data/shopPricing"

export const dynamic = "force-dynamic"

export async function GET() {
    // Heure locale française (le jeu vise « 8h→20h » en heure de Paris). % 24 : minuit peut sortir "24" en fr-FR.
    const hourStr = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date())
    const hour = (parseInt(hourStr, 10) || 0) % 24
    return NextResponse.json({ hour, bourse: bourseMultiplier(hour) })
}
