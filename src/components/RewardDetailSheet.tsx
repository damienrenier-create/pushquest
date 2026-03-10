"use client"

import { X, Trophy, Target, Calendar, User, Zap, History as HistoryIcon } from "lucide-react"

interface RewardDetail {
    key?: string
    name: string
    emoji: string
    description: string
    condition?: string
    achievedAt?: string
    currentValue?: number | string
    previousValue?: number | string
    holder?: string
    type?: string
    xp?: number
}

interface RewardDetailSheetProps {
    detail: RewardDetail | null
    onClose: () => void
}

export default function RewardDetailSheet({ detail, onClose }: RewardDetailSheetProps) {
    if (!detail) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 pointer-events-auto">
                {/* Header with Emoji */}
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pt-12 pb-8 px-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] shadow-2xl mb-4 text-5xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        {detail.emoji}
                    </div>

                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none px-4">
                        {detail.name}
                    </h2>
                    {detail.type && (
                        <div className="mt-3 inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white border border-white/20 uppercase tracking-widest">
                            {detail.type}
                        </div>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    {/* Description Section */}
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Description</span>
                        </div>
                        <p className="text-gray-600 font-bold leading-relaxed">
                            {detail.description}
                        </p>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {detail.xp !== undefined && (
                            <div className="col-span-2 bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-600" />
                                    <span className="text-[9px] font-black text-yellow-600 uppercase tracking-wider">Valeur de Gloire</span>
                                </div>
                                <p className="font-black text-yellow-700">+{detail.xp} XP</p>
                            </div>
                        )}

                        {detail.holder && (
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <User size={14} className="text-blue-500" />
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Détenteur</span>
                                </div>
                                <p className="font-black text-blue-600 truncate">{detail.holder}</p>
                            </div>
                        )}

                        {(detail.currentValue !== undefined || detail.previousValue !== undefined) && (
                            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <HistoryIcon size={14} className="text-orange-500" />
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Record</span>
                                </div>
                                <p className="font-black text-orange-600">
                                    {detail.currentValue} {detail.previousValue ? <span className="text-[10px] text-orange-300">(vs {detail.previousValue})</span> : ""}
                                </p>
                            </div>
                        )}

                        {detail.achievedAt && (
                            <div className="col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Obtenu le</span>
                                </div>
                                <p className="font-bold text-gray-700 text-sm">
                                    {new Date(detail.achievedAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                    </div>

                    {detail.condition && (
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                            <span className="text-lg">💡</span>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Comment l'avoir ?</span>
                                <p className="text-xs font-bold text-indigo-800 mt-0.5">{detail.condition}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            Fermer
                        </button>
                        {detail.key && (
                            <a
                                href={`/faq?tab=catalogue#item-${detail.key}`}
                                className="flex-[1.5] bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs text-center"
                            >
                                Voir dans la FAQ
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
