// src/app/api/gamebook/progress/route.ts
//
// GET  /api/gamebook/progress?chapterId=ch1_caravane
//   -> retourne le progress du joueur (en crée un si pas existant)
//
// POST /api/gamebook/progress
//   body: { chapterId, choiceId }
//   -> applique le choix, retourne le nouvel état
//
// DELETE /api/gamebook/progress?chapterId=ch1_caravane
//   -> reset le progress (utile pour tester / debug)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    applyChoice,
    Chapter,
    initialState,
    type Choice,
    type GamebookProgressState,
} from "@/lib/gamebook/engine"

// Chargement statique du chapitre 1 (seul chapitre dispo pour le MVP).
// Les chapitres futurs seront chargés dynamiquement via chapterId.
import ch1 from "@/data/chapters/ch1_caravane.json"

const CHAPTERS: Record<string, Chapter> = {
    ch1_caravane: ch1 as unknown as Chapter,
}

function getChapter(chapterId: string | null): Chapter | null {
    if (!chapterId) return null
    return CHAPTERS[chapterId] ?? null
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id as string

    const chapterId = req.nextUrl.searchParams.get("chapterId")
    const chapter = getChapter(chapterId)
    if (!chapter) {
        return NextResponse.json({ error: "Unknown chapter" }, { status: 404 })
    }

    let progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: chapter.chapterId } },
    })

    if (!progress) {
        const init = initialState(chapter)
        progress = await prisma.gamebookProgress.create({
            data: {
                userId,
                chapterId: chapter.chapterId,
                currentNodeId: init.currentNodeId,
                mood: init.mood,
                mbtiScores: init.mbtiScores as any,
                temperaments: init.temperaments as any,
                flags: init.flags as any,
                history: init.history as any,
                isCompleted: init.isCompleted,
            },
        })
    }

    const currentNode = chapter.nodes[progress.currentNodeId]
    if (!currentNode) {
        return NextResponse.json(
            { error: `Invalid current node: ${progress.currentNodeId}` },
            { status: 500 }
        )
    }

    return NextResponse.json({
        progress: serialize(progress),
        node: { id: progress.currentNodeId, ...currentNode },
        chapterTitle: chapter.title,
    })
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id as string

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 })
    }
    const { chapterId, choiceId } = body ?? {}
    if (typeof chapterId !== "string" || typeof choiceId !== "string") {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const chapter = getChapter(chapterId)
    if (!chapter) {
        return NextResponse.json({ error: "Unknown chapter" }, { status: 404 })
    }

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: chapter.chapterId } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 404 })
    }

    const currentNode = chapter.nodes[progress.currentNodeId]
    if (!currentNode) {
        return NextResponse.json({ error: "Invalid current node" }, { status: 500 })
    }
    const choice: Choice | undefined = currentNode.choices.find((c) => c.id === choiceId)
    if (!choice) {
        return NextResponse.json({ error: "Invalid choice" }, { status: 400 })
    }

    const nextNode = chapter.nodes[choice.nextNodeId]
    if (!nextNode) {
        return NextResponse.json({ error: "Invalid next node" }, { status: 500 })
    }

    const state: GamebookProgressState = {
        chapterId: progress.chapterId,
        currentNodeId: progress.currentNodeId,
        mood: progress.mood as any,
        mbtiScores: (progress.mbtiScores as any) ?? {},
        temperaments: (progress.temperaments as any) ?? {},
        flags: (progress.flags as any) ?? {},
        history: (progress.history as any) ?? [],
        isCompleted: progress.isCompleted,
    }
    const newState = applyChoice(state, currentNode, choice, nextNode)

    const updated = await prisma.gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: chapter.chapterId } },
        data: {
            currentNodeId: newState.currentNodeId,
            mood: newState.mood,
            mbtiScores: newState.mbtiScores as any,
            temperaments: newState.temperaments as any,
            flags: newState.flags as any,
            history: newState.history as any,
            isCompleted: newState.isCompleted,
        },
    })

    return NextResponse.json({
        progress: serialize(updated),
        node: { id: updated.currentNodeId, ...nextNode },
        chapterTitle: chapter.title,
        previousChoice: {
            id: choice.id,
            text: choice.text,
            tag: choice.tag,
            monsterComment: choice.monsterComment,
        },
    })
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id as string

    const chapterId = req.nextUrl.searchParams.get("chapterId")
    const chapter = getChapter(chapterId)
    if (!chapter) {
        return NextResponse.json({ error: "Unknown chapter" }, { status: 404 })
    }

    await prisma.gamebookProgress.deleteMany({
        where: { userId, chapterId: chapter.chapterId },
    })

    return NextResponse.json({ ok: true })
}

function serialize(p: any) {
    return {
        id: p.id,
        chapterId: p.chapterId,
        currentNodeId: p.currentNodeId,
        mood: p.mood,
        mbtiScores: p.mbtiScores,
        temperaments: p.temperaments,
        flags: p.flags,
        history: p.history,
        isCompleted: p.isCompleted,
        updatedAt: p.updatedAt,
    }
}
