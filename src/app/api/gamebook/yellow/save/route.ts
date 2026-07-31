// src/app/api/gamebook/yellow/save/route.ts
//
// Nexus Jaune Éclair — sauvegarde/chargement de la progression (équipe, PC, objets,
// Pokédex). Stockée dans GamebookProgress.flags de la ligne chapterId="yellow"
// (isolée de l'arc v3 → pas de migration). Gated feature flag.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID, YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { parseSave, emptySave } from "@/lib/gamebook/yellow/storage/save"
import { classifyOverwrite, appendBackup } from "@/lib/gamebook/yellow/storage/saveGuard"

export const dynamic = "force-dynamic"

// Ensemble des uid présents dans l'équipe OU le PC d'une save (robuste au contenu inconnu).
function teamPcUids(flags: unknown): Set<string> {
    const f = (flags && typeof flags === "object" ? flags : {}) as { team?: unknown[]; pc?: unknown[] }
    const ids = new Set<string>()
    for (const arr of [f.team, f.pc]) {
        if (Array.isArray(arr)) for (const m of arr) {
            const uid = (m as { uid?: unknown })?.uid
            if (typeof uid === "string") ids.add(uid)
        }
    }
    return ids
}
// Un Daemon a-t-il DISPARU (uid présent avant, absent après) ? Couvre échange, don, relâcher… — PAS l'évolution
// (elle conserve l'uid) ni le dépôt/retrait PC (l'uid reste dans l'union équipe+PC). Sert de FILET DE SÉCURITÉ :
// avant toute perte de Daemon, on grave une copie dans `history` → un échange accidentel redevient annulable.
function daemonDisappeared(prevFlags: unknown, nextFlags: unknown): boolean {
    const before = teamPcUids(prevFlags)
    if (before.size === 0) return false
    const after = teamPcUids(nextFlags)
    for (const uid of before) if (!after.has(uid)) return true
    return false
}

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    const row = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
    })
    const save = row?.flags ? parseSave(row.flags) : emptySave()
    return NextResponse.json({ ok: true, save })
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { save?: unknown; intentionalReset?: boolean }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const save = parseSave(body.save) // sanitize systématique côté serveur

    // GARDE-FOU ANTI-PERTE : on lit la save serveur ACTUELLE avant d'écrire. Un autosave d'une session
    // « fraîche » (nouvel appareil / cache vidé) ne doit JAMAIS écraser un compte avancé (le bug de Mools).
    const existing = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
        select: { flags: true, history: true },
    })
    if (existing?.flags && !body.intentionalReset) {
        const verdict = classifyOverwrite(existing.flags, save)
        if (verdict === "destructive") {
            // Vierge par-dessus un compte plein → on REFUSE et on garde une copie de sécurité. Le client
            // reçoit 409 + la vraie save → il recharge au lieu d'écraser. Rien n'est perdu, l'accident est bloqué.
            const history = appendBackup(existing.history, existing.flags, "refus-ecrasement-vierge", new Date().toISOString())
            await (prisma as any).gamebookProgress.update({
                where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
                data: { history: history as unknown as object },
            })
            return NextResponse.json({ ok: false, rejected: "would_wipe_meaningful_save", save: parseSave(existing.flags) }, { status: 409 })
        }
        if (verdict === "regression") {
            // Régression réelle (badges/pokédex/champion en moins) mais pas vierge → on écrit, mais on garde
            // d'abord une copie de sécurité (annulable via history).
            const history = appendBackup(existing.history, existing.flags, "auto-backup-regression", new Date().toISOString())
            await (prisma as any).gamebookProgress.update({
                where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
                data: { flags: save as unknown as object, history: history as unknown as object },
            })
            return NextResponse.json({ ok: true, backedUp: true })
        }
        // FILET DE SÉCURITÉ ÉCHANGE/RELÂCHER : un Daemon présent avant a disparu (uid parti de l'équipe ET du PC).
        //   L'écriture est légitime (pas une régression de progression) MAIS on grave d'abord une copie → l'accident
        //   (ex. échange involontaire de son Daemon de tête contre un Crocavern) redevient annulable via `history`.
        if (daemonDisappeared(existing.flags, save)) {
            const history = appendBackup(existing.history, existing.flags, "auto-backup-daemon-parti", new Date().toISOString())
            await (prisma as any).gamebookProgress.update({
                where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
                data: { flags: save as unknown as object, history: history as unknown as object },
            })
            return NextResponse.json({ ok: true, backedUp: true })
        }
    }

    await (prisma as any).gamebookProgress.upsert({
        where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
        create: {
            userId: auth.userId,
            chapterId: YELLOW_CHAPTER_ID,
            currentNodeId: "map",
            mapId: YELLOW_ENTRANCE_MAP_ID,
            posX: 10, posY: 12, direction: "down",
            flags: save as unknown as object,
        },
        update: { flags: save as unknown as object },
    })

    return NextResponse.json({ ok: true })
}
