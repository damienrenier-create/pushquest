"use client"

import { useState, useEffect, useCallback } from "react"
import CoinsBalance from "./CoinsBalance"
import BetCard from "./BetCard"

export default function BetsSection({ session }: { session: any }) {
    const [bets, setBets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showResolved, setShowResolved] = useState(false)

    const fetchBets = useCallback(async () => {
        try {
            const res = await fetch("/api/bets")
            if (res.ok) {
                const data = await res.json()
                setBets(data)
                setError(null)
            } else {
                setError("Impossible de charger les paris.")
            }
        } catch (e) {
            setError("Erreur réseau lors du chargement des paris.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBets()

        const id = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchBets()
            }
        }, 30000)

        return () => clearInterval(id)
    }, [fetchBets])

    const activeBets = bets.filter(b => b.status === "OPEN" || b.status === "LOCKED" || b.status === "DRAFT")
    const resolvedBets = bets.filter(b => b.status === "RESOLVED" || b.status === "CANCELLED")

    return (
        <div className="space-y-6">
            {/* <CoinsBalance userId={session?.user?.id} /> */}

            <div className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-gray-100">
                {/* ENCART EXPLICATION */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide mb-1">🎲 Comment ça marche ?</p>
                    <p className="text-[11px] font-bold text-amber-700 leading-snug">
                        Mise des XP sur l'issue que tu penses correcte. Plus tu mises tôt, plus le multiplicateur est élevé (jusqu'à ×2). 
                        Ta mise est débitée immédiatement. Les gagnants se partagent la pool des perdants.
                    </p>
                    <a href="/faq#paris" className="text-[10px] font-black text-amber-600 uppercase mt-2 inline-block hover:underline">
                        Lire les règles complètes →
                    </a>
                </div>

                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-slate-800">
                    🎲 PARIS EN COURS
                </h2>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center p-6 bg-red-50 rounded-2xl">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <button onClick={fetchBets} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Réessayer</button>
                    </div>
                ) : activeBets.length === 0 ? (
                    <div className="text-center p-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 font-black uppercase">Aucun pari en cours</p>
                        <p className="text-slate-400 text-sm mt-2">Revenez bientôt pour de nouveaux défis !</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeBets.map(bet => (
                            <BetCard 
                                key={bet.id} 
                                bet={bet} 
                                currentUserId={session?.user?.id}
                                onAction={fetchBets}
                            />
                        ))}
                    </div>
                )}
            </div>

            {resolvedBets.length > 0 && (
                <div className="bg-slate-100 rounded-[2rem] p-4 sm:p-6 border border-slate-200">
                    <button 
                        onClick={() => setShowResolved(!showResolved)}
                        className="w-full flex justify-between items-center text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <h2 className="text-sm font-black uppercase">
                            Paris Terminés ({resolvedBets.length})
                        </h2>
                        <span className="font-bold">{showResolved ? '▴' : '▾'}</span>
                    </button>

                    {showResolved && (
                        <div className="mt-6 space-y-4">
                            {resolvedBets.map(bet => (
                                <BetCard 
                                    key={bet.id} 
                                    bet={bet} 
                                    currentUserId={session?.user?.id}
                                    onAction={fetchBets}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
