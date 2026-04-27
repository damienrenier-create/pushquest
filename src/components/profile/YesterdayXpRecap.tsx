"use client"

import React from 'react'
import { Zap, Trophy, Target, Award, Sparkles, TrendingUp, History, CheckCircle2 } from 'lucide-react'

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
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center relative overflow-hidden group shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-50" />
            <div className="relative">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-center">Rapport de la veille</p>
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                    <History className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-500 font-black text-sm uppercase tracking-tight">Repos du guerrier hier. Pas d'XP détecté. 🛌</p>
            </div>
        </div>
    )

    return (
        <section className="relative overflow-hidden bg-white border border-slate-100 rounded-[3rem] p-8 sm:p-14 shadow-xl shadow-slate-200/40 group transition-all duration-500 hover:shadow-2xl hover:border-slate-200">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-28 -ml-28 w-[30rem] h-[30rem] bg-purple-50/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative flex flex-col xl:flex-row xl:items-start justify-between gap-12">
                <div className="space-y-8 max-w-xl">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                            <History size={24} className="group-hover:rotate-[-10deg] transition-transform duration-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 italic">
                                Rapport de Combat
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 font-black tracking-widest flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 size={12} />
                                    CERTIFIÉ
                                </span>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Activité de la veille</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative py-4">
                        <div className="flex items-baseline gap-5">
                            <span className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                                +{recap.total.toLocaleString()}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-indigo-600 font-black text-2xl uppercase tracking-widest leading-none">XP</span>
                                <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] mt-2 border-l-2 border-indigo-500 pl-3">Total Capitalisé</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <div className="flex -space-x-3 overflow-hidden">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-4 ring-white bg-slate-100 flex items-center justify-center text-xs">⭐</div>
                            ))}
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Performance validée par la ligue</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full xl:max-w-xl">
                    {/* Reps Card */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 group/card">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-500 border border-slate-100 shadow-sm group-hover/card:scale-110 transition-transform">
                            <Target className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entraînement</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">+{recap.repsXP} <span className="text-xs text-slate-400">XP</span></p>
                        </div>
                    </div>

                    {/* Regularity Card */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 group/card">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-100 shadow-sm group-hover/card:scale-110 transition-transform">
                            <Zap className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Régularité</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-slate-900 leading-none">+{recap.regularityXP} <span className="text-xs text-slate-400">XP</span></p>
                                <p className="text-[9px] font-black text-emerald-600/70 border border-emerald-100/50 bg-white px-2 py-0.5 rounded-lg mt-2 w-fit">
                                    {recap.regularityDetail?.base > 0 && <span>QUOTA: {recap.regularityDetail.base}</span>}
                                    {recap.regularityDetail?.flex > 0 && <span> • FLEX: {recap.regularityDetail.flex}</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Trophies & Badges Card */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 flex flex-col gap-6 sm:col-span-2 transition-all hover:bg-white hover:shadow-xl hover:shadow-amber-500/5 group/card relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-0 group-hover/card:opacity-100 transition-opacity" />

                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-500 border border-slate-100 shadow-sm group-hover/card:rotate-12 transition-transform">
                                <Trophy className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Succès & Distinction</p>
                                <p className="text-2xl font-black text-slate-900 leading-none">+{recap.badgesXP} <span className="text-xs text-slate-400">XP Trophées</span></p>
                            </div>
                        </div>

                        {recap.badgesDetail.length > 0 && (
                            <div className="flex flex-col gap-3 pt-5 border-t border-slate-100 relative z-10">
                                {recap.badgesDetail.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-50 shadow-sm hover:border-indigo-200 transition-all group/badge">
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-50 group-hover/badge:scale-110 transition-transform">{b.emoji}</div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{b.name}</span>
                                                {b.label && <span className="text-[9px] font-black text-amber-600/70 border border-amber-100 bg-amber-50 px-2 py-0.5 rounded-lg w-fit mt-1">{b.label}</span>}
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-indigo-600">+{b.xp} <span className="text-[9px] text-slate-400">XP</span></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Record & Bonus Cards */}
                    <div className="flex flex-col gap-5 sm:col-span-2">
                        {recap.recordsXP > 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 group/card">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm group-hover/card:scale-110 transition-transform">
                                    <TrendingUp className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Titulaire du Panthéon</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">+250 <span className="text-xs text-slate-400">XP Record du Jour</span></p>
                                </div>
                                <div className="bg-white text-indigo-600 text-[10px] font-black px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">#1 VOLUME</div>
                            </div>
                        )}

                        {recap.manualXP !== 0 && (
                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-white hover:shadow-xl group/card">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-purple-600 border border-slate-100 shadow-sm group-hover/card:scale-110 transition-transform">
                                    <Award className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ajustement Personnel</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">{recap.manualXP > 0 ? '+' : ''}{recap.manualXP} <span className="text-xs text-slate-400">XP Bonus</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="mt-14 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronisation Antigravity • Cloud Engine V2</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Performance Consolidée</span>
                </div>
            </div>
        </section>
    )
}
