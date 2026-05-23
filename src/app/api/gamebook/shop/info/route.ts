// src/app/api/gamebook/shop/info/route.ts
//
// v3.8.9 — GET : retourne les "news" du shop (qui a acheté en dernier).
// Lu par le client juste avant d'ouvrir le ShopModal pour personnaliser
// le message d'accueil de NUTRIPATES.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cfg = await (prisma as any).globalConfig.findUnique({
        where: { key: "lastShopPurchase" },
    })
    if (!cfg?.value) {
        return NextResponse.json({ lastPurchase: null })
    }

    try {
        const data = JSON.parse(cfg.value as string)
        return NextResponse.json({ lastPurchase: data })
    } catch {
        return NextResponse.json({ lastPurchase: null })
    }
}
