"use client"

import { useState, useEffect, useCallback } from "react"

export default function CoinsBalance({ userId }: { userId: string }) {
    const [balance, setBalance] = useState<number | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showHistory, setShowHistory] = useState(false)

    const fetchBalance = useCallback(async () => {
        try {
            const res = await fetch("/api/coins")
            if (res.ok) {
                const data = await res.json()
                setBalance(data.balance)
                setHistory(data.history || [])
            }
        } catch (e) {
            console.error("Erreur CoinsBalance:", e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBalance()
    }, [fetchBalance])

    if (loading) {
        return (
            <div className="bg-amber-50 rounded-2xl p-4 animate-pulse">
                <div className="h-6 bg-amber-200 rounded w-1/2 mx-auto"></div>
            </div>
        )
    }

    return (
        <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200 shadow-sm transition-all text-amber-900 mb-6">
            <div className="flex justify-between items-center">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                    🔥 Embercoins
                </h3>
                <div className="font-black text-xl">
                    {balance !== null ? `${balance.toLocaleString()} EC` : "—"}
                </div>
            </div>

            <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px] uppercase font-bold text-amber-700 hover:text-amber-900 mt-2 flex items-center gap-1"
            >
                [Historique {showHistory ? "▴" : "▾"}]
            </button>

            {showHistory && (
                <div className="mt-4 pt-4 border-t border-amber-200 space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {history.length > 0 ? history.map((item) => {
                        const isPositive = item.amount > 0
                        return (
                            <div key={item.id} className="flex justify-between text-[10px] sm:text-xs">
                                <span className="font-medium text-amber-800/80">
                                    {new Date(item.createdAt).toLocaleString('fr-FR', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                    {" · "} {item.reason}
                                </span>
                                <span className={`font-black ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                    {isPositive ? '+' : ''}{item.amount} EC
                                </span>
                            </div>
                        )
                    }) : (
                        <p className="text-center text-xs text-amber-700">Aucun historique pour le moment.</p>
                    )}
                </div>
            )}
        </div>
    )
}
