"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Timer, Send, CheckCircle2, Zap, Trophy, ArrowRight } from "lucide-react"
import Link from "next/link"
import { SPECIAL_WORKOUTS, SpecialWorkout, WorkoutExercise } from "@/config/specialWorkouts"
import { useSession } from "next-auth/react"

export default function WorkoutPage({ params }: { params: { slug: string } }) {
    const router = useRouter()
    const { data: session } = useSession()
    const workout = SPECIAL_WORKOUTS.find(w => w.slug === params.slug)
    
    const [formData, setFormData] = useState<Record<string, number>>({})
    const [completionTime, setCompletionTime] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [timerActive, setTimerActive] = useState(false)
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timerActive, startTime])

    if (!workout) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white">
                <h1 className="text-2xl font-black mb-4">Entraînement introuvable</h1>
                <Link href="/pantheon" className="text-indigo-400 hover:underline">Retour au Panthéon</Link>
            </div>
        )
    }

    const handleStart = () => {
        setStartTime(Date.now() - (elapsed * 1000))
        setTimerActive(true)
    }

    const handleStop = () => {
        setTimerActive(false)
        setCompletionTime(elapsed)
    }

    const handleReset = () => {
        setTimerActive(false)
        setStartTime(null)
        setElapsed(0)
        setCompletionTime(0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) return alert("Vous devez être connecté")
        
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/workouts/special", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workoutId: workout.id,
                    data: { exercises: formData },
                    completionTime: completionTime || elapsed,
                    date: new Date().toISOString().split('T')[0]
                })
            })

            if (res.ok) {
                setSuccess(true)
                setTimeout(() => router.push("/pantheon"), 2000)
            } else {
                const err = await res.json()
                alert(err.message || "Erreur lors de l'envoi")
            }
        } catch (error) {
            console.error(error)
            alert("Erreur de connexion")
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white py-12 px-4 pb-32">
            <div className="max-w-xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link href="/pantheon" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit">
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-xs">Retour au Panthéon</span>
                    </Link>
                    
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
                            <Zap size={12} fill="currentColor" />
                            Défi Spécial
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            {workout.name}
                        </h1>
                        <p className="text-slate-400 text-sm font-medium">
                            {workout.description}
                        </p>
                    </div>
                </div>

                {success ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={40} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black uppercase italic italic">Exploit Validé !</h2>
                        <p className="text-slate-400 font-bold">Vos résultats ont été enregistrés. Redirection vers le Panthéon...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Timer Section */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                                        <Timer size={20} />
                                    </div>
                                    <span className="font-black uppercase tracking-wider text-sm">Chronomètre</span>
                                </div>
                                <div className="text-3xl font-mono font-black text-indigo-400 tabular-nums">
                                    {formatTime(elapsed)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {!timerActive ? (
                                    <button 
                                        type="button"
                                        onClick={handleStart}
                                        className="flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20"
                                    >
                                        {elapsed > 0 ? "Reprendre" : "Démarrer"}
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleStop}
                                        className="flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                                    >
                                        Stop
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    onClick={handleReset}
                                    className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest transition-all"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Exercises List */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Données de l'entraînement</h2>
                            <div className="grid gap-3">
                                {workout.exercises.map((exo) => (
                                    <div key={exo.type} className="group relative bg-slate-900/30 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition-all">
                                        <div className="space-y-1">
                                            <span className="block font-black text-sm uppercase tracking-tight">{exo.label}</span>
                                            {exo.goal && (
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Objectif: {exo.goal} {exo.unit.toLowerCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number"
                                                required
                                                min="0"
                                                placeholder="0"
                                                className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-right font-black text-lg focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                onChange={(e) => setFormData(prev => ({ ...prev, [exo.type]: parseInt(e.target.value) || 0 }))}
                                            />
                                            <span className="text-[10px] font-black text-slate-600 uppercase w-12">{exo.unit === 'REPS' ? 'Reps' : exo.unit === 'SECONDS' ? 'Sec' : 'M'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            disabled={isSubmitting || (workout.scoringType === 'TIME' && elapsed === 0)}
                            className="w-full flex items-center justify-center gap-3 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-3xl font-black text-xl uppercase italic tracking-tighter transition-all shadow-xl shadow-indigo-900/40 group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Soumettre l'Exploit
                                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Rewards Info */}
                <div className="bg-indigo-500/5 rounded-3xl p-6 border border-indigo-500/10 flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1 tracking-tight">Récompenses du défi</h3>
                        <p className="text-slate-400 text-xs font-medium leading-relaxed">
                            Validez tous les exercices pour obtenir le badge de finisher. Le meilleur score global (temps ou reps) décrochera le précieux badge <span className="text-indigo-400 font-bold uppercase">Platine</span> du Panthéon.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
