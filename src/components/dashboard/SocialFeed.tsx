
"use client"

import Link from "next/link"
import { useState } from 'react';

interface SocialFeedProps {
    mood: string
    setMood: (val: string) => void
    saveMood: () => Promise<void>
    statuses: any[]
    toggleStatusLike: (id: string) => Promise<void>
    recentEvents: any[]
    toggleLike: (id: string) => Promise<void>
    session: any
    router: any
}

export default function SocialFeed({
    mood,
    setMood,
    saveMood,
    statuses,
    toggleStatusLike,
    recentEvents,
    toggleLike,
    session,
    router
}: SocialFeedProps) {
    const currentUserId = (session?.user as any)?.id;
    const [isFeedCollapsed, setIsFeedCollapsed] = useState(true);

    return (
        <div className="space-y-6">
            {/* MOOD / STATUS INPUT */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💭</span>
                        <span className="font-black text-gray-800 uppercase text-[10px] tracking-widest">Quel est ton mood ?</span>
                    </div>
                    <span className={`text-[10px] font-bold ${mood.length > 45 ? 'text-red-500' : 'text-gray-400'}`}>{mood.length}/50</span>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={mood}
                        onChange={(e) => setMood(e.target.value.substring(0, 50))}
                        placeholder="C'est quoi le moral aujourd'hui ?"
                        className="flex-1 h-12 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-4 font-bold text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300"
                    />
                    <button
                        onClick={saveMood}
                        className="h-12 px-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                    >
                        Partager
                    </button>
                </div>
            </div>

            {/* MOOD HORIZONTAL FEED */}
            {statuses.length > 0 && (
                <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 ml-1">
                        <span className="text-xs">✨</span>
                        <span className="font-black text-gray-400 uppercase text-[9px] tracking-widest italic">Humeurs récentes (24h)</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                        {statuses.map((s: any) => (
                            <div key={s.id} className="flex-shrink-0 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm min-w-[140px] max-w-[200px] relative group">
                                <div className="flex items-center justify-between mb-2">
                                    <Link href={`/u/${s.nickname}`} className="text-[9px] font-black text-blue-600 hover:underline truncate uppercase">{s.nickname}</Link>
                                    <button
                                        onClick={() => toggleStatusLike(s.id)}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all ${s.hasLiked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <span className="text-[10px] font-black">{s.likeCount}</span>
                                        <span className="text-[10px]">{s.hasLiked ? '❤️' : '🤍'}</span>
                                    </button>
                                </div>
                                <p className="text-xs font-bold text-gray-700 leading-tight italic line-clamp-2">“{s.content}”</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BADGE EVENTS FEED */}
            <div className="space-y-4">
                <button 
                    onClick={() => setIsFeedCollapsed(!isFeedCollapsed)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-white/50 hover:bg-white rounded-2xl border border-gray-100 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📢</span>
                        <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest leading-none">Actu Gloire & Honneur</h3>
                        {recentEvents.length > 0 && (
                            <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                {recentEvents.length}
                            </span>
                        )}
                    </div>
                    <span className={`text-gray-400 group-hover:text-blue-500 transition-transform duration-300 ${isFeedCollapsed ? '' : 'rotate-180'}`}>
                        ⌄
                    </span>
                </button>

                {!isFeedCollapsed && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        {recentEvents.length > 0 ? (
                            recentEvents.map((ev: any) => {
                                const hasLiked = ev.likes?.some((l: any) => l.userId === currentUserId);
                                return (
                                    <div key={ev.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-2xl drop-shadow-sm hover:scale-110 transition-transform">
                                                {ev.badge?.emoji || '🏆'}
                                            </Link>
                                            <div className="leading-tight">
                                                <p className="text-xs font-bold text-gray-800">
                                                    <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname)}`} className="text-blue-600 uppercase font-black hover:underline">
                                                        {ev.toUser?.nickname}
                                                    </Link>
                                                    {ev.eventType === 'STEAL' ? (
                                                        <> a <span className="text-red-500 uppercase font-black">volé</span> <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-gray-900 hover:underline">[{ev.badge?.name}]</Link> à <Link href={`/u/${encodeURIComponent(ev.fromUser?.nickname)}`} className="text-gray-400 font-bold uppercase hover:underline">{ev.fromUser?.nickname}</Link></>
                                                    ) : (
                                                        <> a obtenu <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-indigo-600 uppercase font-black hover:underline">[{ev.badge?.name}]</Link></>
                                                    )}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter italic">
                                                    {(() => {
                                                        const mt = ev.badge?.metricType;
                                                        const val = ev.newValue;
                                                        const eventType = ev.eventType;
                                                        
                                                        if (eventType === 'LEVEL_UP' || eventType === 'LEVEL_DOWN') return `Niveau : ${val}`;
                                                        
                                                        if (mt === 'MAX_BONUS') return `Record : ${val} reps bonus`;
                                                        if (mt === 'MAX_SET' || mt === 'MILESTONE_SET' || mt?.startsWith('DATE_COMPETITIVE_SET')) return `Record : ${val} reps`;
                                                        if (mt === 'SERIES_COUNT') return `Performance : ${val} séries`;
                                                        if (mt === 'MILESTONE_TOTAL' || mt === 'DATE_COMPETITIVE_REPS' || mt === 'MONTH_TOP_VOLUME' || mt === 'APRIL_FOOLS_TIER') return `Total : ${val} reps`;
                                                        if (mt?.includes('STREAK') || mt?.includes('TIME_AWARD') || mt === 'STREAK_NO_FINES') return `Série : ${val} jours`;
                                                        if (mt === 'STEAL_COUNT') return `Vols : ${val}`;
                                                        if (mt === 'BALANCE_RATIO') return `Équilibre : ${val}%`;
                                                        if (mt === 'SPRINTER_COUNT') return `Victoires : ${val}`;
                                                        if (mt === 'HEADHUNTER_COUNT') return `Chasses : ${val}`;
                                                        if (mt === 'TOTAL_FINES_AMOUNT') return `Dons : ${val} €`;
                                                        
                                                        return `Valeur : ${val} XP`;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => toggleLike(ev.id)}
                                            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${hasLiked ? 'bg-indigo-50 text-indigo-600 scale-105' : 'bg-gray-50 text-gray-300 hover:bg-gray-100 hover:scale-105'}`}
                                        >
                                            <span className={`text-xs ${hasLiked ? 'animate-bounce' : ''}`}>{hasLiked ? '🔥' : '👊'}</span>
                                            <span className="text-[9px] font-black">{ev.likes?.length || 0}</span>
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                                <p className="text-gray-400 font-bold text-xs uppercase italic tracking-widest">Aucun mouvement récent</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
