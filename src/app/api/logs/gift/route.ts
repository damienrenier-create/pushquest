// src/app/api/logs/gift/route.ts
//
// Gestion fine des séries CADEAU (reps offertes, ex. à Milka) :
//  GET  ?date=YYYY-MM-DD : liste les séries-cadeau du joueur connecté ce jour-là (pour les afficher
//                          avec une croix de suppression).
//  DELETE { id }         : supprime UNE série-cadeau précise (scopée au propriétaire) — sert à nettoyer
//                          les doublons. Comme c'est un cadeau, la suppression retire bien la ligne en base
//                          (et donc des reps reçues par le bénéficiaire).
//
// NB : pas de détection anti-triche ici (un cadeau n'impacte pas le quota du donneur).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
    const date = new URL(req.url).searchParams.get("date")
    if (!date) return NextResponse.json({ message: "Date manquante" }, { status: 400 })

    const sets = await prisma.exerciseSet.findMany({
        where: { userId: session.user.id, date, offeredToUserId: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { id: true, exercise: true, reps: true, offeredToUserId: true },
    })
    return NextResponse.json({ sets })
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Non autorisé" }, { status: 401 })

    let body: { id?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ message: "Bad JSON" }, { status: 400 }) }
    const id = typeof body.id === "string" ? body.id : ""
    if (!id) return NextResponse.json({ message: "id manquant" }, { status: 400 })

    // Scopé : on ne supprime QUE ses propres séries-cadeau (sécurité + ne touche pas la saisie normale).
    const res = await prisma.exerciseSet.deleteMany({
        where: { id, userId: session.user.id, offeredToUserId: { not: null } },
    })
    return NextResponse.json({ ok: true, deleted: res.count })
}
