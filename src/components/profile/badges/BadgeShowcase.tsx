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
        <div className="mb-8 border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-500">
            {/* Header / Accordion Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
            >
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner border border-slate-100">
                        {category.emoji}
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{category.label}</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-2.5 py-1 rounded-xl border border-slate-100 flex items-center gap-1.5 shadow-sm">
                                <Trophy size={11} className="text-amber-500" />
                                {earnedCount} ACQUIS
                            </span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-2.5 py-1 rounded-xl border border-slate-100 flex items-center gap-1.5 shadow-sm">
                                <Sparkles size={11} className="text-indigo-500" />
                                {pendingCount} À CONQUÉRIR
                            </span>
                        </div>
                    </div>
                </div>

                <div className={`p-2.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100 transition-transform duration-500 ${isOpen ? 'rotate-180 text-indigo-600 border-indigo-100 bg-indigo-50' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {/* Content */}
            <div className={`transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 border-t border-slate-50 space-y-4">

                    {/* Floor 1: Earned */}
                    {earnedCount > 0 ? (
                        <div className="bg-white/40 rounded-3xl p-2 border border-slate-50 shadow-inner">
                            <BadgeCarousel title="Trophées Acquis" subtitle="Tes victoires éclatantes">
                                {category.earned.map((badge: any) => {
                                    const bo = badgeOwnerships.find(o => o.badgeKey === badge.key);
                                    const holder = bo ? { nickname: bo.currentUser?.nickname, value: bo.currentValue, achievedAt: bo.achievedAt } : null;
                                    return <BadgeCard key={badge.key} badge={badge} isPending={false} holder={holder} personalRecord={currentUserRecords[badge.key]} />;
                                })}
                            </BadgeCarousel>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            Aucun exploit dans cette vitrine...
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative h-px w-full bg-slate-100 my-6">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 bg-white text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            CHALLENGES
                        </div>
                    </div>

                    {/* Floor 2: Pending */}
                    {pendingCount > 0 ? (
                        <div className="bg-white/40 rounded-3xl p-2 border border-slate-50 shadow-inner">
                            <BadgeCarousel title="Prochains Défis" subtitle="Ce qu'il te reste à accomplir">
                                {category.pending.map((badge: any) => {
                                    const bo = badgeOwnerships.find(o => o.badgeKey === badge.key);
                                    const holder = bo ? { nickname: bo.currentUser?.nickname, value: bo.currentValue, achievedAt: bo.achievedAt } : null;
                                    return <BadgeCard key={badge.key} badge={badge} isPending={true} holder={holder} personalRecord={currentUserRecords[badge.key]} />;
                                })}
                            </BadgeCarousel>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-indigo-400 font-black uppercase tracking-widest text-[10px] bg-indigo-50/30 rounded-3xl border border-dashed border-indigo-100">
                            👏 VITRINE COMPLÉTÉE 👏
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BadgeShowcase;
