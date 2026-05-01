"use client"

import { HelpCircle } from "lucide-react"
import Link from "next/link"

interface StatCardsProps {
    xp: any
    todayISO: string
    selectedDate: string
    requiredReps: number
    currentTotal: number
    league: string
    handleSwitchEgo: () => void
    session: any
    currentUserStats?: {
        isInjured?: boolean
        isVeteran?: boolean
        currentMedicalNote?: string | null
        finesDueEur?: number
    }
}

export default function StatCards({
    xp,
    todayISO,
    selectedDate,
    requiredReps,
    currentTotal,
    league,
    handleSwitchEgo,
    session,
    currentUserStats
}: StatCardsProps) {
    const missing = Math.max(0, requiredReps - currentTotal)

    return (
        <div className="flex flex-col gap-4">
            {todayISO === "2026-03-08" && (
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-5 shadow-xl animate-pulse border border-white/20 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <span className="text-4xl">🔥</span>
                        <div>
                            <h4 className="text-white font-black uppercase text-sm tracking-widest">Événement : Saint Marvin</h4>
                            <p className="text-orange-50 text-[11px] font-bold leading-tight mt-1 uppercase">
                                Double XP sur toutes vos séries aujourd'hui + 500 XP bonus en validant votre cible !
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>
            )}

            {xp && xp.currentUser && (
                <div className="bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col gap-3">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <Link href="/faq" className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-inner border border-white/10 shrink-0 hover:scale-110 transition-transform">
                                {xp.currentUser.emoji}
                            </Link>
                            <div>
                                <Link href="/faq" className="text-white font-black text-lg uppercase tracking-tight leading-none hover:underline">{xp.currentUser.animal}</Link>
                                <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">{xp.currentUser.belt}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-white font-black text-xl tracking-tight">Lv. {xp.currentUser.level}</span>
                            <div className="flex gap-2">
                                {league === 'GAINAGE' && (
                                    <button
                                        onClick={handleSwitchEgo}
                                        className="flex items-center gap-1.5 text-emerald-400 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all group"
                                        title="Basculer de Verse"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                            {league === 'GAINAGE' ? 'Verse Pompes' : 'Verse Gainage'}
                                        </span>
                                        <span className="text-sm">🔄</span>
                                    </button>
                                )}
                                <Link
                                    href="/faq"
                                    className="flex items-center gap-2 text-indigo-100 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all group shadow-lg shadow-indigo-900/20 border border-indigo-400/30"
                                    title="Comment ça marche ?"
                                >
                                    <HelpCircle size={14} className="group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Guide & Aide</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 pt-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 px-0.5">
                            <span>{xp.currentUser.totalXP.toLocaleString('fr-FR')} XP</span>
                            <span>{xp.currentUser.xpNextLvl.toLocaleString('fr-FR')} XP</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out" style={{ width: `${xp.currentUser.progress}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                            Cible {selectedDate === todayISO ? "Aujourd'hui" : selectedDate}
                            <span className="ml-2 text-[8px] text-blue-300/50 normal-case font-bold tracking-tight">(Pile poil = +200 XP)</span>
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black">{requiredReps}</span>
                            <span className="text-slate-500 font-bold uppercase text-xs">Points</span>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter space-y-1.5">
                            <div>Score : <span className="text-white">{currentTotal} Points</span></div>
                            <div className="flex flex-col gap-1 text-[8px] text-slate-500 font-black border-l-2 border-slate-800 pl-2 mt-2">
                                <p>• Bonus +50% XP si badge "à l'honneur"</p>
                                <p>• +100 XP au premier validé (Flambeau)</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        {missing > 0 ? (
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-black text-orange-400">-{missing}</span>
                                <span className="text-[10px] font-black text-slate-400 italic uppercase">POINTS/REPS À FAIRE</span>
                            </div>
                        ) : (
                            <div className="bg-green-500 text-white px-4 py-2 rounded-full font-black text-sm shadow-lg animate-bounce">VALIDÉ ✅</div>
                        )}
                    </div>
                </div>

                {/* État de Protection */}
                {selectedDate === todayISO && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protection Amendes</span>
                        {currentUserStats?.isVeteran ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-tight bg-emerald-500/10 px-2 py-1 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Couvert (Buyout)
                            </span>
                        ) : currentUserStats?.isInjured ? (
                            <span className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-tight bg-amber-500/10 px-2 py-1 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Protégé (Certificat)
                            </span>
                        ) : (
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-tight border border-white/5 px-2 py-1 rounded-lg">
                                Non couvert ⚠️
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
