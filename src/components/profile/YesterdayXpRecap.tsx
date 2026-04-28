"use client"

import React, { useState } from 'react'
import { Zap, Trophy, Target, Award, Sparkles, TrendingUp, History, CheckCircle2, ChevronLeft, ChevronRight, Crown } from 'lucide-react'

interface RecapData {
    date: string
    repsXP: number
    regularityXP: number
    regularityDetail: { base: number, flex: number }
    badgesXP: number
    badgesDetail: { name: string, xp: number, emoji: string, label?: string }[]
    recordsXP: number
    manualXP: number
    total: number
}

interface YesterdayXpRecapProps {
    recap: RecapData | null
    weeklyRecaps?: RecapData[]
    topRecaps?: RecapData[]
}

export default function YesterdayXpRecap({ recap, weeklyRecaps = [], topRecaps = [] }: YesterdayXpRecapProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const reports = weeklyRecaps.length > 0 ? weeklyRecaps : (recap ? [recap] : []);

    if (reports.length === 0) return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center relative overflow-hidden group shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-50" />
            <div className="relative">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-center">Rapports de Combat</p>
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                    <History className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-500 font-black text-sm uppercase tracking-tight">Aucun rapport récent. 🛌</p>
            </div>
        </div>
    )

    const activeReport = reports[currentIndex];
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="space-y-8">
            <section className="relative overflow-hidden bg-white border border-slate-100 rounded-[3rem] p-6 sm:p-12 shadow-xl shadow-slate-200/40 group transition-all duration-500">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-28 -ml-28 w-[30rem] h-[30rem] bg-purple-50/30 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative flex flex-col gap-8">
                    {/* Header & Carousel Nav */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-50 pb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                                <History size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                                    Rapport de Combat
                                </h2>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{formatDate(activeReport.date)}</p>
                            </div>
                        </div>

                        {reports.length > 1 && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button
                                    onClick={() => setCurrentIndex(prev => Math.min(prev + 1, reports.length - 1))}
                                    disabled={currentIndex === reports.length - 1}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all disabled:opacity-20"
                                >
                                    <ChevronLeft size={18} className="text-slate-600" />
                                </button>
                                <span className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">
                                    {currentIndex === 0 ? "HIER" : reports.length - currentIndex + " JOURS"}
                                </span>
                                <button
                                    onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
                                    disabled={currentIndex === 0}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all disabled:opacity-20"
                                >
                                    <ChevronRight size={18} className="text-slate-600" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                        <div className="space-y-6 max-w-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 font-black tracking-widest flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 size={10} />
                                    CERTIFIÉ
                                </span>
                            </div>

                            <div className="relative">
                                <div className="flex items-baseline gap-4">
                                    <span className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                                        +{activeReport.total.toLocaleString()}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-indigo-600 font-black text-xl uppercase tracking-widest leading-none">XP</span>
                                        <span className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] mt-1.5 border-l-2 border-indigo-500 pl-2">Total Gagné</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:max-w-xl">
                            {/* Reps Card */}
                            <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-4 flex items-center gap-4 transition-all hover:bg-white hover:shadow-lg group/card">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 border border-slate-100 shadow-sm">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Entraînement</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">+{activeReport.repsXP} <span className="text-[10px] text-slate-400">XP</span></p>
                                </div>
                            </div>

                            {/* Regularity Card */}
                            <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-4 flex items-center gap-4 transition-all hover:bg-white hover:shadow-lg group/card">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 border border-slate-100 shadow-sm">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Régularité</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">+{activeReport.regularityXP} <span className="text-[10px] text-slate-400">XP</span></p>
                                </div>
                            </div>

                            {/* Trophies Section (Smaller) */}
                            {activeReport.badgesXP > 0 && (
                                <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-5 sm:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Distinctions Débloquées</span>
                                        </div>
                                        <span className="text-sm font-black text-amber-600">+{activeReport.badgesXP} XP</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {activeReport.badgesDetail.map((b, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-50 shadow-sm">
                                                <span className="text-xl">{b.emoji}</span>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase truncate">{b.name}</span>
                                                    <span className="text-[8px] font-bold text-amber-600/70">{b.label || "Exploit"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bonus Card */}
                            {(activeReport.recordsXP > 0 || activeReport.manualXP !== 0) && (
                                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-[1.5rem] p-4 flex items-center justify-between sm:col-span-2">
                                    <div className="flex items-center gap-4">
                                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Bonus & Records</p>
                                            <p className="text-lg font-black text-slate-900 leading-none">+{activeReport.recordsXP + (activeReport.manualXP || 0)} XP</p>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-black bg-white px-2 py-1 rounded-lg border border-indigo-100">MODIFICATEUR ACTIF</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Top 3 Ever Section */}
            {topRecaps.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Top 3 Ever - Hall of Profitability</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {topRecaps.map((top, i) => (
                            <div key={top.date} className="relative bg-white border border-slate-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                <div className="absolute -top-2 -right-2 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                </div>
                                <div className="relative space-y-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{formatDate(top.date)}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-900">+{top.total}</span>
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">XP</span>
                                    </div>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                                        {top.badgesDetail.slice(0, 3).map((b, bi) => (
                                            <span key={bi} title={b.name} className="text-lg cursor-help">{b.emoji}</span>
                                        ))}
                                        {top.badgesDetail.length > 3 && <span className="text-[8px] font-black text-slate-300 flex items-center">+{top.badgesDetail.length - 3}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
