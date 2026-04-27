"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Trophy } from "lucide-react";
import BadgeCarousel from "./BadgeCarousel";
import BadgeCard from "./BadgeCard";

interface BadgeShowcaseProps {
    category: any;
    defaultOpen?: boolean;
    badgeOwnerships?: any[];
    currentUserRecords?: Record<string, number>;
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ category, defaultOpen = false, badgeOwnerships = [], currentUserRecords = {} }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const earnedCount = category.earned.length;
    const pendingCount = category.pending.length;
    const totalCount = earnedCount + pendingCount;

    return (
        <div className="mb-6 border border-slate-800/60 rounded-3xl overflow-hidden bg-slate-900/40 backdrop-blur-md shadow-2xl transition-all duration-500">
            {/* Header / Accordion Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-2xl shadow-lg border border-slate-700/30">
                        {category.emoji}
                    </div>
                    <div className="text-left">
                        <h2 className="text-xl font-black text-slate-100 tracking-tight">{category.label}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/30 flex items-center gap-1">
                                <Trophy size={10} className="text-amber-500" />
                                {earnedCount} ACQUIS
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/30 flex items-center gap-1">
                                <Sparkles size={10} className="text-blue-500" />
                                {pendingCount} DEFIS
                            </span>
                        </div>
                    </div>
                </div>

                <div className={`p-2 rounded-full bg-slate-800/80 text-slate-400 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {/* Content */}
            <div className={`transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 border-t border-slate-800/40 space-y-2">

                    {/* Floor 1: Earned */}
                    {earnedCount > 0 ? (
                        <BadgeCarousel title="Exploits Réalisés" subtitle="Vos trophées durement gagnés">
                            {category.earned.map((badge: any) => {
                                const bo = badgeOwnerships.find(o => o.badgeKey === badge.key);
                                const holder = bo ? { nickname: bo.currentUser?.nickname, value: bo.currentValue } : null;
                                return <BadgeCard key={badge.key} badge={badge} isPending={false} holder={holder} personalRecord={currentUserRecords[badge.key]} />;
                            })}
                        </BadgeCarousel>
                    ) : (
                        <div className="py-8 text-center text-slate-600 italic text-sm">
                            Aucun exploit dans cette catégorie pour le moment...
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent my-2">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-slate-900 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                            Arsenal & Défis
                        </div>
                    </div>

                    {/* Floor 2: Pending */}
                    {pendingCount > 0 ? (
                        <BadgeCarousel title="Prochains Défis" subtitle="Ce qu'il vous reste à conquérir">
                            {category.pending.map((badge: any) => {
                                const bo = badgeOwnerships.find(o => o.badgeKey === badge.key);
                                const holder = bo ? { nickname: bo.currentUser?.nickname, value: bo.currentValue } : null;
                                return <BadgeCard key={badge.key} badge={badge} isPending={true} holder={holder} personalRecord={currentUserRecords[badge.key]} />;
                            })}
                        </BadgeCarousel>
                    ) : (
                        <div className="py-8 text-center text-slate-600 italic text-sm">
                            Félicitations, vous avez conquis tous les défis de cette vitrine !
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BadgeShowcase;
