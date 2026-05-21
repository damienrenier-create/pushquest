"use client"

// src/app/gamebook/GamebookClient.tsx
//
// Nouvelle interface du Gamebook (remplace l'ancien SanctuaireTab).
// Affiche 3 slides séquentielles : intro (humeur) -> corps du nœud -> outro (humeur).
// Lit /api/gamebook/progress pour récupérer l'état, envoie les choix via POST.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw } from "lucide-react"
import phrasesData from "@/data/chapters/monster_phrases.json"
import {
    type Choice,
    type ChapterNode,
    type Mood,
    type MonsterPhrases,
    moodFromTag,
    pickPhrase,
    renderText,
    type RenderContext,
} from "@/lib/gamebook/engine"

const PHRASES = phrasesData as MonsterPhrases

type ProgressState = {
    id: string
    chapterId: string
    currentNodeId: string
    mood: Mood
    flags: Record<string, unknown>
    history: Array<{ nodeId: string; choiceId: string; at: string }>
    isCompleted: boolean
}

type ApiResponse = {
    progress: ProgressState
    node: ChapterNode & { id: string }
    chapterTitle: string
    previousChoice?: {
        id: string
        text: string
        tag: string
        monsterComment: string | null
    }
}

type Props = {
    nickname: string
    userId: string
}

type Slide = "intro" | "body"

export default function GamebookClient({ nickname, userId }: Props) {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [slide, setSlide] = useState<Slide>("intro")
    const [pendingChoice, setPendingChoice] = useState<Choice | null>(null)

    // Contexte pour le rendu des variables {nickname} etc.
    const renderCtx: RenderContext = {
        nickname,
        currentHour: new Date().getHours(),
    }

    // Chargement initial
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch("/api/gamebook/progress?chapterId=ch1_caravane", {
                    cache: "no-store",
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = (await res.json()) as ApiResponse
                if (!cancelled) {
                    setData(json)
                    setSlide("intro")
                    setLoading(false)
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message ?? "Erreur inconnue")
                    setLoading(false)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    // Reset (debug)
    async function handleReset() {
        if (!confirm("Recommencer le chapitre depuis le début ?")) return
        setLoading(true)
        await fetch("/api/gamebook/progress?chapterId=ch1_caravane", { method: "DELETE" })
        const res = await fetch("/api/gamebook/progress?chapterId=ch1_caravane", {
            cache: "no-store",
        })
        const json = (await res.json()) as ApiResponse
        setData(json)
        setSlide("intro")
        setPendingChoice(null)
        setLoading(false)
    }

    // Sélection d'un choix : on envoie le choix au serveur, on passe directement au nœud suivant
    async function handleChoice(c: Choice) {
        if (!data) return

        if (c.action === "reset") {
            setLoading(true)
            try {
                await fetch("/api/gamebook/progress?chapterId=ch1_caravane", { method: "DELETE" })
                window.location.reload()
            } catch (err: any) {
                console.error(err)
                setError("Impossible de réinitialiser la partie.")
                setLoading(false)
            }
            return
        }

        setPendingChoice(c)
        setLoading(true)
        try {
            const res = await fetch("/api/gamebook/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapterId: data.progress.chapterId,
                    choiceId: c.id,
                }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = (await res.json()) as ApiResponse
            setData(json)
            setPendingChoice(null)
            setSlide("intro")
        } catch (e: any) {
            setError(e?.message ?? "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50 font-mono">
                <p className="text-slate-700 text-sm tracking-widest animate-pulse">
                    🍝 Le Monstre rassemble ses pensées...
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50 font-mono">
                <div className="max-w-md w-full mx-4 p-6 border-2 border-black bg-white rounded-md shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4">
                    <div>
                        <p className="text-red-700 font-bold mb-2">Erreur système</p>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">{error}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-100 pt-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-black transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour
                        </Link>
                        <button
                            onClick={async () => {
                                if (!confirm("Réinitialiser la progression et recommencer le chapitre ?")) return
                                setError(null)
                                setLoading(true)
                                try {
                                    await fetch("/api/gamebook/progress?chapterId=ch1_caravane", { method: "DELETE" })
                                    window.location.reload()
                                } catch(e: any) {
                                    setError("Impossible de réinitialiser la partie.")
                                    setLoading(false)
                                }
                            }}
                            className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-800 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Réinitialiser la partie
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

    const seed = `${userId}:${data.progress.currentNodeId}`
    const introPhrase = renderText(
        pickPhrase(PHRASES, data.progress.mood, "intros", seed),
        renderCtx
    )
    const bodyText = renderText(data.node.body, renderCtx)
    const monsterCommentOnPrevious = data.previousChoice?.monsterComment
        ? renderText(data.previousChoice.monsterComment, renderCtx)
        : null

    return (
        <div className="min-h-screen bg-amber-50 font-mono">
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </Link>
                    <span className="text-[10px] tracking-widest text-slate-400 uppercase">
                        {data.chapterTitle}
                    </span>
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-700"
                        title="Recommencer le chapitre"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                    </button>
                </div>

                {/* Bandeau Monstre */}
                <div className="mb-6 p-4 bg-slate-900 text-amber-100 rounded-md shadow-[4px_4px_0_rgba(0,0,0,1)] border-2 border-black">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl select-none">👁️</span>
                        <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-1">
                                Le Monstre
                            </p>
                            {slide === "intro" && (
                                <p className="text-sm leading-relaxed italic">
                                    {monsterCommentOnPrevious ? `${monsterCommentOnPrevious} ${introPhrase}` : introPhrase}
                                </p>
                            )}
                            {slide === "body" && (
                                <p className="text-sm leading-relaxed italic text-amber-200/60">
                                    {/* Pendant la lecture du corps, le Monstre se tait */}
                                    (Le Monstre observe en silence.)
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Théâtre narratif */}
                <div className="mb-6 p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0_rgba(0,0,0,1)]">
                    <div className="whitespace-pre-line text-slate-900 text-[15px] leading-relaxed">
                        {bodyText}
                    </div>
                </div>

                {/* Navigation entre slides + choix */}
                <div className="space-y-2">
                    {slide === "intro" && (
                        <button
                            onClick={() => setSlide("body")}
                            className="w-full p-3 bg-white border-2 border-black rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-sm uppercase tracking-wider"
                        >
                            Continuer →
                        </button>
                    )}

                    {slide === "body" &&
                        data.node.choices.filter((c) => {
                            if (!c.condition) return true;
                            const flagValue = !!data.progress.flags[c.condition.flag];
                            return flagValue === c.condition.expected;
                        }).map((c) => (
                            <button
                                key={c.id}
                                onClick={() => handleChoice(c)}
                                disabled={loading}
                                className="block w-full text-left p-3 bg-white border-2 border-black rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all text-sm"
                            >
                                → {c.text}
                            </button>
                        ))}
                </div>

                {/* Debug / Stats (invisible mais sélectionnable) */}
                <div className="mt-8 text-[10px] text-amber-50 bg-amber-50 select-text tracking-wide">
                    <p>Nœud : {data.progress.currentNodeId} · Humeur : {data.progress.mood}</p>
                </div>
            </div>
        </div>
    )
}
