"use client";

import React from "react";
import { BadgeCheck, Lock, Target } from "lucide-react";

interface BadgeCardProps {
    badge: any;
    isPending?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, isPending = false }) => {
    const progress = badge.progress || 0;
    const isComplete = progress >= 100;

    return (
        <div className={`relative flex-shrink-0 w-40 group cursor-default transition-all duration-300 ${isPending && !isComplete ? 'opacity-70 hover:opacity-100' : ''}`}>
            {/* Glow Effect */}
            <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500
        ${badge.rarity === 'LEGENDARY' ? 'bg-amber-500' :
                    badge.rarity === 'EPIC' ? 'bg-purple-500' :
                        badge.rarity === 'RARE' ? 'bg-blue-500' : 'bg-slate-400'}`}
            ></div>

            <div className="relative bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center text-center h-full">
                {/* Badge Icon/Emoji */}
                <div className="relative mb-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner
            ${isPending && !isComplete ? 'grayscale brightness-50' : ''}`}>
                        {badge.emoji}
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute -bottom-1 -right-1">
                        {isPending ? (
                            isComplete ? (
                                <div className="bg-green-500 rounded-full p-1 border-2 border-slate-900 shadow-lg">
                                    <BadgeCheck className="w-3 h-3 text-white" />
                                </div>
                            ) : (
                                <div className="bg-slate-700 rounded-full p-1 border-2 border-slate-900 shadow-lg">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                </div>
                            )
                        ) : (
                            <div className="bg-amber-500 rounded-full p-1 border-2 border-slate-900 shadow-lg">
                                <Target className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1 mb-1">{badge.name}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-2 min-h-[2.5em] leading-tight">
                    {badge.description}
                </p>

                {/* Progress Bar (if pending) */}
                {isPending && !isComplete && (
                    <div className="w-full mt-3 space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                            <span>PROGRESS</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Rarity Tag */}
                <div className={`mt-auto pt-3 text-[8px] font-black uppercase tracking-widest
          ${badge.rarity === 'LEGENDARY' ? 'text-amber-500' :
                        badge.rarity === 'EPIC' ? 'text-purple-400' :
                            badge.rarity === 'RARE' ? 'text-blue-400' : 'text-slate-500'}`}>
                    {badge.rarity}
                </div>
            </div>
        </div>
    );
};

export default BadgeCard;
