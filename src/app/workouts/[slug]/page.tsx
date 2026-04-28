"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Timer, Send, CheckCircle2, Zap, Trophy, History, Image as ImageIcon, ExternalLink, Medal, Camera, Clock } from "lucide-react"
import Link from "next/link"
import { SPECIAL_WORKOUTS } from "@/config/specialWorkouts"
import { useSession } from "next-auth/react"

export default function WorkoutPage({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter()
    const { data: session } = useSession()
    const resolvedParams = React.use(params)
    const workout = SPECIAL_WORKOUTS.find(w => w.slug === resolvedParams.slug)

    const today = new Date().toISOString().split('T')[0];
    const isStarted = workout ? today >= workout.date : false;
    const isEnded = workout?.endDate ? today > workout.endDate : false;
    const isAvailable = isStarted && !isEnded;

    // Form state
    const [formData, setFormData] = useState<Record<string, number>>({})
    const [manualMinutes, setManualMinutes] = useState<string>("")
    const [manualSeconds, setManualSeconds] = useState<string>("")
    const [proofUrl, setProofUrl] = useState<string>("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Chrono state
    const [startTime, setStartTime] = useState<number | null>(null)
    const [timerActive, setTimerActive] = useState(false)
    const [elapsed, setElapsed] = useState(0)

    // Ranking state
    const [ranking, setRanking] = useState<any[]>([])
    const [loadingRanking, setLoadingRanking] = useState(true)

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timerActive, startTime])

    useEffect(() => {
        if (workout) {
            fetch(`/api/workouts/special/ranking?workoutId=${workout.id}`)
                .then(res => res.json())
                .then(data => {
                    setRanking(data.ranking || [])
                    setLoadingRanking(false)
                })
                .catch(err => {
                    console.error(err)
                    setLoadingRanking(false)
                })
        }
    }, [workout])

    if (!workout) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-900">
                <h1 className="text-2xl font-black mb-4">Entraînement introuvable</h1>
                <Link href="/pantheon" className="text-indigo-600 hover:underline">Retour au Panthéon</Link>
            </div>
        )
    }

    const handleStart = () => {
        setStartTime(Date.now() - (elapsed * 1000))
        setTimerActive(true)
    }

    const handleStop = () => {
        setTimerActive(false)
        const totalSec = elapsed
        setManualMinutes(Math.floor(totalSec / 60).toString())
        setManualSeconds((totalSec % 60).toString())
    }

    const handleReset = () => {
        setTimerActive(false)
        setStartTime(null)
        setElapsed(0)
        setManualMinutes("")
        setManualSeconds("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) return alert("Vous devez être connecté")
        if (!isAvailable) return alert("Ce défi n'est pas actif actuellement")

        setIsSubmitting(true)

        // Calculate final time from manual inputs (priority) or elapsed
        const finalTime = (parseInt(manualMinutes) || 0) * 60 + (parseInt(manualSeconds) || 0)

        // Automatically mock exercises completion if scoring is TIME
        let finalDataExercises = formData;
        if (workout.scoringType === 'TIME') {
            finalDataExercises = workout.exercises.reduce((acc, exo, idx) => ({ ...acc, [`${exo.type}_${idx}`]: exo.goal || 0 }), {});
        }

        try {
            const res = await fetch("/api/workouts/special", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workoutId: workout.id,
                    data: { exercises: finalDataExercises },
                    completionTime: finalTime || elapsed,
                    proofUrl,
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
        <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 pb-32">
            <div className="max-w-xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link href="/pantheon" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group w-fit">
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Retour au Panthéon</span>
                    </Link>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                            <Zap size={12} fill="currentColor" />
                            Défi Spécial
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            {workout.name}
                        </h1>
                        <p className="text-slate-600 text-sm font-medium max-w-md">
                            {workout.description}
                        </p>
                        {/* ⚠️ Les reps du défi ne sont PAS comptées automatiquement */}
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs max-w-md">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <p className="text-amber-800 font-medium">
                                Tes répétitions ici <strong>ne sont pas comptées</strong> dans ton total du jour.{' '}
                                <Link href="/" className="text-indigo-600 underline font-bold">Encode-les manuellement</Link> après le défi.
                            </p>
                        </div>
                    </div>
                </div>

                {success ? (
                    <div className="bg-white border border-emerald-100 rounded-3xl p-12 text-center space-y-4 shadow-xl shadow-emerald-500/5 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={40} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black uppercase italic text-slate-900">Exploit Validé !</h2>
                        <p className="text-slate-500 font-bold">Vos résultats ont été enregistrés. Redirection...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {!isStarted && (
                            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-12 text-center space-y-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Clock size={120} />
                                </div>
                                <div className="relative z-10 w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                                    <Timer size={40} className="text-white" />
                                </div>
                                <h2 className="relative z-10 text-2xl font-black uppercase italic text-amber-900">Pas si vite !</h2>
                                <p className="relative z-10 text-amber-700 font-bold">Ce défi ne commence que le <strong>{new Date(workout.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>. Préparez-vous bien d'ici là, voici ce qui vous attend !</p>
                            </div>
                        )}
                        {isEnded && (
                            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <History size={120} />
                                </div>
                                <div className="relative z-10 w-20 h-20 bg-slate-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-slate-400/20">
                                    <History size={40} className="text-white" />
                                </div>
                                <h2 className="relative z-10 text-2xl font-black uppercase italic text-slate-700">Défi Terminé</h2>
                                <p className="relative z-10 text-slate-500 font-bold">Navré, ce défi s'est terminé le <strong>{new Date(workout.endDate!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>.</p>
                            </div>
                        )}

                        {isAvailable && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Timer size={20} />
                                        </div>
                                        <span className="font-black uppercase tracking-wider text-xs text-slate-500">Temps de l'exploit</span>
                                    </div>
                                    <div className="text-3xl font-mono font-black text-indigo-600 tabular-nums">
                                        {formatTime(elapsed || (parseInt(manualMinutes) || 0) * 60 + (parseInt(manualSeconds) || 0))}
                                    </div>
                                </div>

                                {/* Manual Entry or Chrono */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {!timerActive ? (
                                            <button
                                                type="button"
                                                onClick={handleStart}
                                                className="flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                {elapsed > 0 ? "Reprendre" : "Démarrer Chrono"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleStop}
                                                className="flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                                            >
                                                Stop
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest transition-all"
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <div className="relative py-2 flex items-center gap-3">
                                        <div className="flex-1 h-px bg-slate-200"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Ou saisie manuelle</span>
                                        <div className="flex-1 h-px bg-slate-200"></div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                className="w-full bg-transparent font-black text-center outline-none text-slate-900"
                                                value={manualMinutes}
                                                onChange={(e) => setManualMinutes(e.target.value)}
                                            />
                                            <span className="font-bold text-slate-400">m</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                                            <input
                                                type="number"
                                                placeholder="Sec"
                                                className="w-full bg-transparent font-black text-center outline-none text-slate-900"
                                                value={manualSeconds}
                                                onChange={(e) => setManualSeconds(e.target.value)}
                                            />
                                            <span className="font-bold text-slate-400">s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Exercises List - Light Theme */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Programmation du défi</h2>
                            {workout.scoringType === 'TIME' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {workout.exercises.map((exo, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Étape {idx + 1}</span>
                                            <span className="font-black text-slate-800 text-sm mt-1">{exo.label}</span>
                                            {exo.goal && (
                                                <span className="text-indigo-600 font-black text-xs mt-0.5 tracking-tight uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    {exo.goal} {exo.unit === 'REPS' ? 'reps' : exo.unit === 'SECONDS' ? 'sec' : exo.unit === 'KILOMETERS' ? 'km' : 'm'}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={(workout.id === 'workout-03-pyramid' || workout.id === 'workout-08-kheops-fullbody')
                                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                                    : (workout.exercises.length > 12 ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" : "grid gap-3")
                                }>
                                    {/* --- Special Grouping for Stages of 4 --- */}
                                    {(workout.id === 'workout-03-pyramid' || workout.id === 'workout-08-kheops-fullbody') ? (
                                        (() => {
                                            const stages = [];
                                            for (let i = 0; i < workout.exercises.length; i += 4) {
                                                stages.push(workout.exercises.slice(i, i + 4));
                                            }
                                            return stages.map((stageExercises, stageIdx) => (
                                                <div key={stageIdx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                                                            Étape {stageIdx + 1} {stageIdx === 2 && workout.id === 'workout-03-pyramid' ? '— SOMMET' : ''}
                                                        </h3>
                                                        <span className="text-[10px] font-bold text-slate-400 italic">4 exercices</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {stageExercises.map((exo, idxInStage) => {
                                                            const globalIdx = stageIdx * 4 + idxInStage;
                                                            const icons: Record<string, string> = {
                                                                PUSHUPS: '💪', PULLUPS: '🏋️', SQUATS: '🦵',
                                                                PLANK: '🛡️', RUN: '🏃'
                                                            };
                                                            return (
                                                                <div key={idxInStage} className="space-y-1.5">
                                                                    <div className="flex items-center gap-1.5 min-h-[14px]">
                                                                        <span className="text-xs">{icons[exo.type] || '⚡'}</span>
                                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-700 truncate">{exo.label}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="number"
                                                                            required
                                                                            min="0"
                                                                            placeholder="0"
                                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-right font-black text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                                            disabled={!isAvailable}
                                                                            defaultValue={workout.scoringType === 'TIME' ? exo.goal : 0}
                                                                            onChange={(e) => setFormData(prev => ({ ...prev, [`${exo.type}_${globalIdx}`]: parseInt(e.target.value) || 0 }))}
                                                                        />
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase w-4">{exo.unit === 'REPS' ? 'R' : exo.unit === 'SECONDS' ? 'S' : 'K'}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ));
                                        })()
                                    ) : (
                                        /* --- Normal List / Grid --- */
                                        workout.exercises.map((exo, idx) => {
                                            const isCompact = workout.exercises.length > 12;
                                            return (
                                                <div key={idx} className={`group relative bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm ${isCompact ? "p-2" : "p-4"
                                                    }`}>
                                                    <div className="space-y-0.5 text-left">
                                                        <span className={`block font-black uppercase tracking-tight text-slate-800 ${isCompact ? "text-[8px] leading-tight" : "text-sm"
                                                            }`}>
                                                            {exo.label}
                                                        </span>
                                                        {exo.goal && !isCompact && (
                                                            <span className="text-[10px] font-bold text-indigo-500 uppercase">Obj: {exo.goal} {exo.unit.toLowerCase()}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0"
                                                            placeholder="0"
                                                            className={`${isCompact ? "w-12 px-1 py-1 text-xs" : "w-20 px-3 py-2 text-lg"} bg-slate-50 border border-slate-200 rounded-lg text-right font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 disabled:opacity-50`}
                                                            disabled={!isAvailable}
                                                            defaultValue={workout.scoringType === 'TIME' ? exo.goal : 0}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, [`${exo.type}_${idx}`]: parseInt(e.target.value) || 0 }))}
                                                        />
                                                        {!isCompact && (
                                                            <span className="text-[10px] font-black text-slate-400 uppercase w-10">
                                                                {exo.unit === 'REPS' ? 'Reps' : exo.unit === 'SECONDS' ? 'Sec' : exo.unit === 'KILOMETERS' ? 'KM' : 'M'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {isAvailable && (
                            <>
                                {/* Proof Link Section with Google Photos redirect */}
                                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <ImageIcon size={18} />
                                            <span className="font-black uppercase tracking-wider text-[10px]">Preuve de l'exploit (facultatif)</span>
                                        </div>
                                        <a
                                            href="https://photos.app.goo.gl/FrtN2kjDRY8vGQVP6"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tight hover:bg-indigo-100 transition-colors"
                                        >
                                            <Camera size={12} />
                                            Album Records
                                        </a>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="url"
                                            placeholder="Lien vers votre photo/vidéo dans l'album"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-900"
                                            value={proofUrl}
                                            onChange={(e) => setProofUrl(e.target.value)}
                                        />
                                        <p className="text-[9px] text-slate-400 font-medium px-2 italic text-left">
                                            Astuce : Téléchargez votre preuve sur l'album Google Photos et collez le lien ici.
                                        </p>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-3 py-6 bg-slate-900 hover:bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-3xl font-black text-xl uppercase italic tracking-tighter transition-all shadow-xl shadow-slate-900/20 group"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Soumettre l'Exploit
                                            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>
                )}

                {/* Section Records (Leaderboard) */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 ml-2 text-left">
                        <Trophy size={16} className="text-amber-500" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Hall of Fame : {workout.name}</h2>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        {loadingRanking ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">Chargement des records...</div>
                        ) : ranking.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-bold italic">Aucun record pour le moment. Soyez le premier !</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {ranking.map((row, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-sm
                                                ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                    idx === 1 ? 'bg-slate-100 text-slate-600' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="space-y-0.5 text-left">
                                                <span className="font-black text-slate-900 uppercase tracking-tight block">{row.user?.nickname || "Anonyme"}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                                                    <History size={10} />
                                                    {new Date(row.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="font-mono font-black text-indigo-600 text-lg">
                                                {formatTime(row.completionTime || 0)}
                                            </div>
                                            {row.proofUrl && (
                                                <a href={row.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full transition-colors">
                                                    Preuve <ExternalLink size={8} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 flex items-start gap-4 shadow-sm text-left">
                    <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                        <Medal size={24} />
                    </div>
                    <div>
                        <h3 className="font-black uppercase text-sm mb-1 tracking-tight text-slate-900">Règle du Platine</h3>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                            Le badge <span className="text-indigo-600 font-bold uppercase">Platine</span> est exclusif : il appartient au détenteur du record actuel. Si vous battez le temps de référence, le titre vous sera automatiquement transféré !
                        </p>
                    </div>
                </div>
            </div>
        </main >
    )
}
