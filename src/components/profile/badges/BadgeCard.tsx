"use client";

import React from "react";
import { BadgeCheck, Lock, Target, Info } from "lucide-react";

interface BadgeCardProps {
    badge: any;
    isPending?: boolean;
    holder?: {
        nickname: string;
        value: number;
        achievedAt?: string;
    } | null;
    personalRecord?: number;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, isPending = false, holder = null, personalRecord }) => {
    const progress = badge.progress || 0;
    const isComplete = progress >= 100;

    const showInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        const achievedDate = holder?.achievedAt ? new Date(holder.achievedAt).toLocaleDateString('fr-FR') : "N/A";
        const msg = `🏆 ${badge.name}\n\n` +
            `Valeur: ${badge.xp || 'Variable'} XP\n` +
            `Détenteur: ${holder?.nickname || 'Personne'}\n` +
            `Obtenu le: ${achievedDate}\n\n` +
            `Consultez la FAQ pour plus d'infos !`;
        alert(msg);
        window.open(`/faq?tab=catalogue#item-${badge.key}`, '_blank');
    };

    return (
        <div className={`relative flex-shrink-0 w-32 group cursor-default transition-all duration-300 ${isPending && !isComplete ? 'opacity-70 hover:opacity-100' : ''}`}>
            {/* Subtle Outer Shadow on Hover */}
            <div className={`absolute inset-0 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-20 transition duration-500
                ${badge.rarity === 'LEGENDARY' ? 'bg-amber-500 shadow-amber-500' :
                    badge.rarity === 'EPIC' ? 'bg-purple-500 shadow-purple-500' :
                        badge.rarity === 'RARE' ? 'bg-blue-500 shadow-blue-500' : 'bg-slate-400 shadow-slate-400'}`}
            ></div>

            <div className="relative bg-white border border-slate-100 rounded-[1.5rem] p-4 flex flex-col items-center text-center h-full shadow-sm group-hover:shadow-lg group-hover:border-slate-200 transition-all duration-300 overflow-hidden">
                {/* Info Icon */}
                <button
                    onClick={showInfo}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-indigo-500 transition-colors z-20"
                    title="Plus d'infos"
                >
                    <Info size={12} />
                </button>

                {/* Decorative Pattern / Lighting */}
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -mr-8 -mt-8 opacity-10 
                    ${badge.rarity === 'LEGENDARY' ? 'bg-amber-400' :
                        badge.rarity === 'EPIC' ? 'bg-purple-400' :
                            badge.rarity === 'RARE' ? 'bg-blue-400' : 'bg-slate-200'}`}
                ></div>

                {/* Badge Icon/Emoji */}
                <div className="relative mb-3">
                    <div className={`w-16 h-16 rounded-[1.2rem] bg-slate-50 flex items-center justify-center text-3xl shadow-inner border border-slate-100/50 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500
                        ${isPending && !isComplete ? 'grayscale opacity-30 brightness-110' : ''}`}>
                        {badge.emoji}
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute -bottom-1 -right-1">
                        {isPending ? (
                            isComplete ? (
                                <div className="bg-green-100 rounded-lg p-1 border-2 border-white shadow-lg">
                                    <BadgeCheck className="w-2.5 h-2.5 text-green-600" />
                                </div>
                            ) : (
                                <div className="bg-slate-100 rounded-lg p-1 border-2 border-white shadow-lg">
                                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                                </div>
                            )
                        ) : (
                            <div className="bg-amber-100 rounded-lg p-1 border-2 border-white shadow-lg">
                                <Target className="w-2.5 h-2.5 text-amber-600" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="min-h-[3rem] flex flex-col justify-center">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tighter line-clamp-2 leading-tight mb-0.5">{badge.name}</h4>
                    <p className="text-[8px] text-slate-400 font-bold leading-tight line-clamp-2 px-1">
                        {badge.description}
                    </p>
                </div>

                {/* Progress Bar (if pending) */}
                {isPending && !isComplete && (
                    <div className="w-full mt-3 space-y-1">
                        <div className="flex justify-between items-center text-[7px] text-slate-400 font-black tracking-widest px-1">
                            <span>OBJECTIF</span>
                            <span className="text-indigo-600">{progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Footer Section (Rarity or Champion) */}
                <div className="mt-auto w-full pt-3 space-y-1.5">
                    {holder ? (
                        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-100/50">
                            <p className="text-[6px] font-black text-rose-500 uppercase tracking-[0.1em] mb-0.5 leading-none">Champion</p>
                            <p className="text-[9px] font-black text-slate-800 uppercase truncate max-w-full leading-tight">{holder.nickname}</p>
                            <p className="text-[7px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                                <span className="opacity-50 font-black">Score:</span>
                                <span className="text-slate-900">{holder.value}</span>
                            </p>
                        </div>
                    ) : (
                        <div className={`text-[7px] font-black uppercase tracking-[0.2em] py-0.5 px-2 rounded-full inline-block
                            ${badge.rarity === 'LEGENDARY' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                badge.rarity === 'EPIC' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                    badge.rarity === 'RARE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                            {badge.rarity}
                        </div>
                    )}

                    {/* Personal Record Comparison */}
                    {personalRecord !== undefined && (
                        <div className="pt-1.5 border-t border-slate-50">
                            <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/30">
                                <span className="text-[6px] font-black text-indigo-400 uppercase tracking-tighter">Mon Record</span>
                                <span className="text-[8px] font-black text-indigo-600">{personalRecord}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BadgeCard;
