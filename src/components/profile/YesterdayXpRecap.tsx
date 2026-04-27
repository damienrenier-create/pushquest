"use client"

import React from 'react'
import { Zap, Trophy, Target, Award, Sparkles, TrendingUp } from 'lucide-react'

interface YesterdayXpRecapProps {
    recap: {
        repsXP: number
        regularityXP: number
        badgesXP: number
        badgesDetail: { name: string, xp: number, emoji: string }[]
        manualXP: number
        total: number
    } | null
}

export default function YesterdayXpRecap({ recap }: YesterdayXpRecapProps) {
    if (!recap || recap.total === 0) return (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-center">
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Rapport de la veille</p>
            <p className="text-slate-600 font-bold mt-2 italic text-sm">Aucun XP gagné hier. Repos du guerrier ? 🛌</p>
        </div>
    )

    return (
        <section className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl group">
            {/* Background effects */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                            <HistoryIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Rapport de la Veille</h2>
                    </div>

                    <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-slate-400 tracking-tighter">
                            +{recap.total.toLocaleString()}
                        </span>
                        <span className="text-indigo-400 font-black text-xs uppercase tracking-widest">XP TOTAUX</span>
                    </div>

                    <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-sm">
                        Voici le détail chirurgical de ta progression de minuit à minuit. Chaque répétition compte pour la gloire.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-md">
                    {/* Reps */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shadow-inner">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Répétitions</p>
                            <p className="text-sm font-black text-white">+{recap.repsXP} XP</p>
                        </div>
                    </div>

                    {/* Regularity */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Régularité</p>
                            <p className="text-sm font-black text-white">+{recap.regularityXP} XP</p>
                        </div>
                    </div>

                    {/* Badges / Trophies */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 sm:col-span-2 relative group/item">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 shadow-inner">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trophées & Badges</p>
                            <p className="text-sm font-black text-white">+{recap.badgesXP} XP</p>
                            {recap.badgesDetail.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {recap.badgesDetail.map((b, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded-lg border border-white/5 text-[9px] font-bold text-slate-300">
                                            <span>{b.emoji}</span>
                                            <span>{b.name}</span>
                                            <span className="text-amber-400">+{b.xp}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Sparkles className="absolute right-4 top-4 w-4 h-4 text-amber-500/20 group-hover/item:text-amber-500/50 transition-colors" />
                    </div>

                    {/* Bonus / Manual */}
                    {recap.manualXP !== 0 && (
                        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 sm:col-span-2">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 shadow-inner">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bonus & Ajustements</p>
                                <p className="text-sm font-black text-white">{recap.manualXP > 0 ? '+' : ''}{recap.manualXP} XP</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progression Validée</span>
                </div>
                <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Mission Accomplie</span>
                </div>
            </div>
        </section>
    )
}

function HistoryIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    )
}
