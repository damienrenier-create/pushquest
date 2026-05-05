"use client"

import { useState } from "react"

export default function BetCard({
    bet,
    currentUserId,
    onAction
}: {
    bet: any
    currentUserId: string
    onAction: () => void
}) {
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const [showBetPanel, setShowBetPanel] = useState<{ option: string } | null>(null)
    const [stakeAmount, setStakeAmount] = useState<number | ''>('')

    const formatDate = (d: string) => {
        return new Date(d).toLocaleString('fr-FR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })
    }

    const isDuelPending = bet.type === "DUEL" && bet.status === "OPEN" && bet.entries.length === 1 && bet.targetUserId === currentUserId;

    const handleEnter = async (option: string, amount: number) => {
        setActionLoading(true)
        setMessage(null)
        try {
            const res = await fetch(`/api/bets/${bet.id}/enter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ option, xpAmount: amount })
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' })
                setShowBetPanel(null)
                onAction()
            } else {
                setMessage({ text: data.message || "Erreur lors de la mise", type: 'error' })
            }
        } catch (e) {
            setMessage({ text: "Erreur réseau", type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    const handleWithdraw = async () => {
        if (!confirm("Voulez-vous vraiment vous retirer ? Vous subirez une pénalité selon le temps écoulé.")) return;
        setActionLoading(true)
        setMessage(null)
        try {
            const res = await fetch(`/api/bets/${bet.id}/withdraw`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' })
                onAction()
            } else {
                setMessage({ text: data.message, type: 'error' })
            }
        } catch (e) {
            setMessage({ text: "Erreur réseau", type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    const handleAcceptDuel = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const res = await fetch(`/api/bets/${bet.id}/accept`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' })
                onAction()
            } else {
                setMessage({ text: data.message, type: 'error' })
            }
        } catch (e) {
            setMessage({ text: "Erreur réseau", type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeclineDuel = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const res = await fetch(`/api/bets/${bet.id}/decline`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' })
                onAction()
            } else {
                setMessage({ text: data.message, type: 'error' })
            }
        } catch (e) {
            setMessage({ text: "Erreur réseau", type: 'error' })
        } finally {
            setActionLoading(false)
        }
    }

    const isResolvedOrCancelled = bet.status === "RESOLVED" || bet.status === "CANCELLED"
    const myEntry = bet.myEntry

    return (
        <div className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all relative ${isResolvedOrCancelled ? 'bg-slate-800/50 border-slate-700/50 grayscale-[50%]' : 'bg-slate-900 border-white/10'}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded font-black text-[10px] uppercase">
                        {bet.type}
                    </span>
                    {bet.subType !== 'BINARY' && (
                        <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded font-black text-[10px] uppercase">
                            MULTI
                        </span>
                    )}
                </div>
                {!isResolvedOrCancelled && bet.closeAt && (
                    <div className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full flex items-center gap-1">
                        ⏱ Fin : {formatDate(bet.closeAt)}
                    </div>
                )}
            </div>

            {/* Title & Description */}
            <h3 className="text-white font-black text-sm sm:text-base leading-tight mb-1">{bet.title}</h3>
            {bet.description && <p className="text-slate-400 text-xs mb-4">{bet.description}</p>}

            {/* Resolved Banner */}
            {bet.status === "RESOLVED" && (
                <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                    <p className="text-green-400 font-black text-xs uppercase mb-1">✅ Terminé</p>
                    <p className="text-white font-bold text-sm">Option gagnante : {bet.options.find((o: any) => o.key === bet.resolvedOption)?.label || bet.resolvedOption}</p>
                    {myEntry && myEntry.option === bet.resolvedOption && !myEntry.withdrawn && (
                        <p className="text-green-400 font-bold text-xs mt-2">Vous avez gagné 🎉</p>
                    )}
                    {myEntry && myEntry.option !== bet.resolvedOption && !myEntry.withdrawn && (
                        <p className="text-red-400 font-bold text-xs mt-2">Vous avez perdu votre mise.</p>
                    )}
                </div>
            )}
            
            {bet.status === "CANCELLED" && (
                <div className="mb-4 bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                    <p className="text-slate-400 font-black text-xs uppercase">🚫 Pari annulé</p>
                </div>
            )}

            {/* Duel Pending Banner */}
            {isDuelPending && (
                <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                    <p className="text-blue-400 font-black text-xs uppercase mb-2">⚔️ Duel en attente de réponse</p>
                    {bet.targetUserId === currentUserId && (
                        <div className="flex gap-2 justify-center mt-2">
                            <button disabled={actionLoading} onClick={handleAcceptDuel} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors">Accepter</button>
                            <button disabled={actionLoading} onClick={handleDeclineDuel} className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors">Refuser</button>
                        </div>
                    )}
                </div>
            )}

            {/* Options & Progress Bars */}
            <div className="space-y-3 mb-4">
                {(bet.oddsDisplay && bet.oddsDisplay.length > 0 ? bet.oddsDisplay : bet.options).map((opt: any) => {
                    const percentage = opt.percentage || 0;
                    const isMyOption = myEntry?.option === opt.key && !myEntry?.withdrawn;
                    const isWinning = bet.status === "RESOLVED" && bet.resolvedOption === opt.key;
                    
                    return (
                        <div key={opt.key} className="relative">
                            <div className="flex justify-between items-end mb-1 relative z-10 px-1">
                                <span className={`font-bold text-xs ${isWinning ? 'text-green-400' : 'text-slate-200'}`}>
                                    {opt.label} {isMyOption ? '👤' : ''}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {opt.percentage !== undefined ? `${opt.percentage}% · ${opt.betCount} pari${opt.betCount > 1 ? 's' : ''} · ${opt.totalXp} XP` : ''}
                                </span>
                            </div>
                            <div className="h-6 w-full bg-slate-800 rounded-lg overflow-hidden relative border border-slate-700">
                                <div 
                                    className={`h-full absolute left-0 top-0 transition-all duration-500 ${isMyOption ? 'bg-amber-500/50' : isWinning ? 'bg-green-500/50' : 'bg-slate-600/50'}`}
                                    style={{ width: `${Math.max(2, percentage)}%` }}
                                ></div>
                            </div>

                            {/* Cotes bookmaker — si disponibles */}
                            {(() => {
                                const bOdd = bet.bookmakerOdds?.find((o: any) => o.key === opt.key);
                                if (!bOdd) return null;
                                return (
                                    <div className="mt-1.5 space-y-1">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] text-slate-500 font-bold">
                                                📊 {bOdd.statLabel}
                                            </span>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-amber-400">
                                                    Cote {bOdd.finalOdd}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold ml-1">
                                                    · {bOdd.impliedGainFinal} XP / 100 misés
                                                </span>
                                            </div>
                                        </div>
                                        {/* Early bird indicator */}
                                        {bOdd.earlyBirdMultiplier > 1.01 && (
                                            <div className="flex items-center gap-1 px-1">
                                                <span className="text-[9px] font-black text-green-400">
                                                    ⚡ Early Bird ×{bOdd.earlyBirdMultiplier.toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-slate-600">
                                                    (cote de base : {bOdd.odd})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Ma cote figée si j'ai déjà misé */}
                            {myEntry && myEntry.option === opt.key && myEntry.lockedOdd && (
                                <div className="mt-1 px-1 py-1 bg-amber-500/10 rounded-lg">
                                    <span className="text-[9px] font-black text-amber-400">
                                        🔒 Votre cote figée : {myEntry.lockedOdd} · gain garanti : {Math.floor(myEntry.xpStaked * myEntry.lockedOdd)} XP
                                    </span>
                                </div>
                            )}
                            
                            {/* Action pari */}
                            {!isResolvedOrCancelled && bet.status === "OPEN" && (!myEntry || myEntry.withdrawn || myEntry.option === opt.key) && !isDuelPending && bet.createdByUserId !== currentUserId && (
                                <div className="mt-2 text-right">
                                    <button 
                                        onClick={() => setShowBetPanel({ option: opt.key })}
                                        className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400"
                                    >
                                        {myEntry && myEntry.option === opt.key && !myEntry.withdrawn ? '+ Augmenter la mise' : `Parier sur ${opt.label} →`}
                                    </button>
                                </div>
                            )}

                            {/* Panel inline */}
                            {showBetPanel?.option === opt.key && (
                                <div className="mt-2 bg-slate-800 border border-slate-700 p-3 rounded-xl animate-in slide-in-from-top-2">
                                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-2">Montant (XP)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={stakeAmount}
                                            onChange={(e) => setStakeAmount(e.target.value ? parseInt(e.target.value) : '')}
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                            placeholder="Ex: 100"
                                            min="1"
                                        />
                                        <button 
                                            disabled={actionLoading || !stakeAmount || stakeAmount <= 0}
                                            onClick={() => handleEnter(opt.key, stakeAmount as number)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Confirmer
                                        </button>
                                        <button 
                                            onClick={() => setShowBetPanel(null)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white font-black text-xs px-3 rounded-lg"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                                        Multiplicateur actuel : <span className="text-amber-400">×{opt.currentMultiplier || 1}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Footer Info */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-800/50 gap-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Pool totale : {bet.totalPool || 0} XP
                </div>

                {myEntry && !myEntry.withdrawn && !isResolvedOrCancelled && bet.status === "OPEN" && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-500 font-black">
                            Ma mise : {myEntry.xpStaked} XP
                        </span>
                        {/* <button 
                            disabled={actionLoading}
                            onClick={handleWithdraw}
                            className="text-[10px] text-red-400 hover:text-red-300 border border-red-400/20 rounded px-2 py-1"
                            style={{ display: 'none' }}
                        >
                            Retirer
                        </button> */}
                    </div>
                )}
                {/* myEntry?.withdrawn && (
                    <span className="text-[10px] text-slate-500 font-bold">
                        Position retirée ({myEntry.xpReturned || 0} XP récupérés)
                    </span>
                ) */}
            </div>

            {/* Feedback message */}
            {message && (
                <div className={`mt-3 p-2 rounded text-[10px] font-bold text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {message.text}
                </div>
            )}
        </div>
    )
}
