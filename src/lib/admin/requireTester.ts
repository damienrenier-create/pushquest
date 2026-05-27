// src/lib/admin/requireTester.ts
//
// Helper d'autorisation pour les routes du panneau testeur.
// Vérifie que la session est valide ET que l'utilisateur a isTester === true.
// À utiliser en début de chaque route /api/admin/tester/*.

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export interface TesterCheckOk {
    ok: true
    userId: string
}

export interface TesterCheckErr {
    ok: false
    status: 401 | 403
    error: string
}

export type TesterCheck = TesterCheckOk | TesterCheckErr

/**
 * Renvoie { ok: true, userId } si le user en session est un tester (isTester=true).
 * Sinon, renvoie { ok: false, status, error } à utiliser comme réponse HTTP.
 *
 * Usage :
 *   const r = await requireTester()
 *   if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
 *   const userId = r.userId
 */
export async function requireTester(): Promise<TesterCheck> {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return { ok: false, status: 401, error: "Unauthorized" }
    }
    const userId = (session.user as { id: string }).id

    const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isTester: true },
    })
    if (user?.isTester !== true) {
        return { ok: false, status: 403, error: "Forbidden — testers only" }
    }

    return { ok: true, userId }
}
