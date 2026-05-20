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

type Slide = "intro" | "body" | "outro"

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

    // Sélection d'un choix : on stocke le choix en attente, on bascule en slide outro
    function handleChoice(c: Choice) {
        setPendingChoice(c)
        setSlide("outro")
    }

    // Validation de l'outro : on envoie le choix au serveur, on récupère le nouveau nœud
    async function commitChoice() {
        if (!data || !pendingChoice) return
        setLoading(true)
        try {
            const res = await fetch("/api/gamebook/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapterId: data.progress.chapterId,
                    choiceId: pendingChoice.id,
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
                <div className="max-w-md p-6 border-2 border-black bg-white rounded-md shadow-[4px_4px_0_rgba(0,0,0,1)]">
                    <p className="text-red-700 font-bold mb-2">Erreur</p>
                    <p className="text-sm text-slate-700 mb-4">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-black"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour au Dashboard
                    </Link>
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
    const outroPhrase = renderText(
        pickPhrase(
            PHRASES,
            pendingChoice ? moodFromTag(pendingChoice.tag) : "NEUTRE",
            "outros",
            seed + ":out"
        ),
        renderCtx
    )

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
                                <p className="text-sm leading-relaxed italic">{introPhrase}</p>
                            )}
                            {slide === "body" && (
                                <p className="text-sm leading-relaxed italic text-amber-200/60">
                                    {/* Pendant la lecture du corps, le Monstre se tait */}
                                    (Le Monstre observe en silence.)
                                </p>
                            )}
                            {slide === "outro" && (
                                <>
                                    {monsterCommentOnPrevious && (
                                        <p className="text-sm leading-relaxed mb-2">
                                            {monsterCommentOnPrevious}
                                        </p>
                                    )}
                                    <p className="text-sm leading-relaxed italic">{outroPhrase}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Théâtre narratif */}
                <div className="mb-6 p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0_rgba(0,0,0,1)]">
                    {slide !== "outro" && (
                        <div className="whitespace-pre-line text-slate-900 text-[15px] leading-relaxed">
                            {bodyText}
                        </div>
                    )}

                    {slide === "outro" && pendingChoice && (
                        <div className="text-slate-700 text-sm italic">
                            Tu as choisi : <span className="font-bold not-italic">{pendingChoice.text}</span>
                        </div>
                    )}
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
                        data.node.choices.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => handleChoice(c)}
                                disabled={loading}
                                className="block w-full text-left p-3 bg-white border-2 border-black rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all text-sm"
                            >
                                → {c.text}
                            </button>
                        ))}

                    {slide === "outro" && (
                        <button
                            onClick={commitChoice}
                            disabled={loading}
                            className="w-full p-3 bg-slate-900 text-amber-100 border-2 border-black rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                        >
                            {loading ? "..." : "Suite →"}
                        </button>
                    )}
                </div>

                {/* Debug / Stats (visible mais discret) */}
                <div className="mt-8 text-[10px] text-slate-400 tracking-wide">
                    <p>Nœud : {data.progress.currentNodeId} · Humeur : {data.progress.mood}</p>
                </div>
            </div>
        </div>
    )
}
