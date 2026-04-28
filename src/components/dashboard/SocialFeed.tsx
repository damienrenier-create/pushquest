
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
                            <div key={s.id} className="flex-shrink-0 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm min-w-[140px] max-w-[200px] relative group transition-all hover:shadow-md">
                                <div className="flex items-center gap-2 mb-2 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-gray-100">
                                        {s.image ? (
                                            <img src={s.image} alt={s.nickname} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[8px] font-black text-gray-400 flex items-center justify-center h-full uppercase">{s.nickname.charAt(0)}</span>
                                        )}
                                    </div>
                                    <Link href={`/u/${s.nickname}`} className="text-[9px] font-black text-blue-600 hover:underline truncate uppercase flex-1">{s.nickname}</Link>
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
        </div>
    )
}
