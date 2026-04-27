"use client"

import React from 'react'
import { Zap, Trophy, Target, Award, Sparkles, TrendingUp, History } from 'lucide-react'

interface YesterdayXpRecapProps {
    recap: {
        repsXP: number
        regularityXP: number
        regularityDetail: { base: number, flex: number }
        badgesXP: number
        badgesDetail: { name: string, xp: number, emoji: string, label?: string }[]
        recordsXP: number
        manualXP: number
        total: number
    } | null
}

export default function YesterdayXpRecap({ recap }: YesterdayXpRecapProps) {
    if (!recap || recap.total === 0) return (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-10 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50" />
            <div className="relative">
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mb-3">Rapport de la veille</p>
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                    <History className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-slate-400 font-bold italic text-sm">Repos du guerrier hier. Pas d'XP détecté. 🛌</p>
            </div>
        </div>
    )

    return (
        <section className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all duration-500 hover:border-slate-700">
            {/* Glossy Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-purple-500/5 opacity-30" />

            {/* Animated Spotlights */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-all duration-1000" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] group-hover:bg-indigo-600/20 transition-all duration-1000" />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-500/15 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <History size={22} className="group-hover:rotate-[-10deg] transition-transform duration-500" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                Rapport de Combat <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">CERTIFIÉ</span>
                            </h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">Activité de Minuit à Minuit (Hier)</p>
                        </div>
                    </div>

                    <div className="relative inline-block">
                        <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="relative flex items-baseline gap-4">
                            <span className="text-64xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                +{recap.total.toLocaleString()}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-indigo-400 font-black text-sm uppercase tracking-widest leading-none">XP</span>
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-tighter mt-1">TOTAL GAGNÉ</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:max-w-md animate-in slide-in-from-right-10 duration-700">
                    {/* Reps Card */}
                    <div className="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center gap-5 transition-all hover:bg-slate-800/50 hover:border-white/10 group/card shadow-inner">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/10 group-hover/card:scale-110 transition-transform">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Entraînement</p>
                            <p className="text-lg font-black text-white leading-none">+{recap.repsXP} <span className="text-[10px] text-slate-500">XP</span></p>
                        </div>
                    </div>

                    {/* Regularity Card */}
                    <div className="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center gap-5 transition-all hover:bg-slate-800/50 hover:border-white/10 group/card shadow-inner relative">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/10 group-hover/card:scale-110 transition-transform">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Régularité</p>
                            <div className="flex flex-col">
                                <p className="text-lg font-black text-white leading-none">+{recap.regularityXP} <span className="text-[10px] text-slate-500">XP</span></p>
                                <p className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-tighter mt-1">
                                    {recap.regularityDetail?.base > 0 && <span>QUOTA: {recap.regularityDetail.base}</span>}
                                    {recap.regularityDetail?.flex > 0 && <span> • FLEX: {recap.regularityDetail.flex}</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Trophies & Badges Card */}
                    <div className="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-6 flex flex-col gap-4 sm:col-span-2 transition-all hover:bg-slate-800/50 hover:border-white/10 group/card shadow-inner relative">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/10 group-hover/card:rotate-12 transition-transform">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Succès & Distinction</p>
                                <p className="text-lg font-black text-white leading-none">+{recap.badgesXP} <span className="text-[10px] text-slate-500">XP Trophées</span></p>
                            </div>
                            <Sparkles className="text-amber-500/30 group-hover/card:text-amber-500 group-hover/card:animate-pulse transition-all" size={20} />
                        </div>

                        {recap.badgesDetail.length > 0 && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                {recap.badgesDetail.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-900/60 px-4 py-2 rounded-xl border border-white/5 transition-all hover:bg-slate-950 hover:border-indigo-500/30">
                                        <div className="flex items-center gap-3">
                                            <span className="text-base">{b.emoji}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-200">{b.name}</span>
                                                {b.label && <span className="text-[8px] font-bold text-amber-500/70 uppercase tracking-tight">{b.label}</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-indigo-400">+{b.xp} <span className="text-[8px] text-slate-500">XP</span></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Record & Bonus Cards */}
                    <div className="flex flex-col gap-4 sm:col-span-2">
                        {recap.recordsXP > 0 && (
                            <div className="bg-emerald-500/5 backdrop-blur-sm border border-emerald-500/10 rounded-3xl p-5 flex items-center gap-5 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/20 group/card shadow-inner">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/10 group-hover/card:scale-110 transition-transform">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-0.5 text-glow">Titulaire du Panthéon</p>
                                    <p className="text-lg font-black text-white leading-none">+250 <span className="text-[10px] text-slate-500">XP Record du Jour</span></p>
                                </div>
                                <div className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-lg border border-emerald-500/30">VOLUME #1</div>
                            </div>
                        )}

                        {recap.manualXP !== 0 && (
                            <div className="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center gap-5 transition-all hover:bg-slate-800/50 hover:border-white/10 group/card shadow-inner">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/10 group-hover/card:scale-110 transition-transform">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ajustement Personnel</p>
                                    <p className="text-lg font-black text-white leading-none">{recap.manualXP > 0 ? '+' : ''}{recap.manualXP} <span className="text-[10px] text-slate-500">XP Bonus</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Progression synchronisée par Antigravity</span>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Performance Validée</span>
                </div>
            </div>
        </section>
    )
}
