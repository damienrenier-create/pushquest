"use client"

import { useState } from "react"
import Link from "next/link"

interface Badge {
    key: string
    name: string
    emoji: string
    description: string
    isUnique: boolean
}

interface Ownership {
    badgeKey: string
    currentValue: number
    achievedAt: string | Date
    badge: Badge
    currentUser?: {
        nickname: string
    }
}

interface UserWithBadges {
    id: string
    nickname: string
    badges: Ownership[]
}

export default function BadgesClient({
    ownedBadges,
    allUsersWithBadges,
    currentUserId
}: {
    ownedBadges: Ownership[],
    allUsersWithBadges: UserWithBadges[],
    currentUserId: string
}) {
    const [activeTab, setActiveTab] = useState<'mes-badges' | 'vitrine'>('mes-badges')

    const BadgeCard = ({ ownership, showOwner = false }: { ownership: Ownership, showOwner?: boolean }) => (
        <Link
            href={`/faq?tab=catalogue#item-${ownership.badgeKey}`}
            className="relative group cursor-pointer overflow-hidden bg-white border border-slate-100 rounded-2xl p-3 sm:p-5 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-50 block"
        >
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <span className="text-5xl sm:text-7xl">{ownership.badge.emoji}</span>
            </div>

            <div className="relative flex flex-col h-full">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xl sm:text-3xl shadow-sm group-hover:scale-110 transition-transform shrink-0">
                        {ownership.badge.emoji}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[11px] sm:text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none mb-1 truncate">
                            {ownership.badge.name}
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[8px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                {ownership.badge.isUnique ? "🔥 Unique" : "✨ Std"}
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mb-3 sm:mb-6 flex-grow line-clamp-2 leading-relaxed italic">
                    "{ownership.badge.description}"
                </p>

                <div className="pt-2 sm:pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                    <div className="flex flex-col">
                        <span className="text-slate-400 uppercase tracking-widest text-[8px] sm:text-[9px]">Série</span>
                        <span className="text-slate-900">{ownership.currentValue}</span>
                    </div>
                    {showOwner && ownership.currentUser && (
                        <div className="flex flex-col text-right min-w-0">
                            <span className="text-slate-400 uppercase tracking-widest text-[8px] sm:text-[9px]">Titulaire</span>
                            <Link
                                href={`/u/${encodeURIComponent(ownership.currentUser.nickname)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-indigo-600 hover:underline truncate"
                            >
                                {ownership.currentUser.nickname}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12">
            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit mb-6 sm:mb-12">
                <button
                    onClick={() => setActiveTab('mes-badges')}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'mes-badges' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Mes Badges
                </button>
                <button
                    onClick={() => setActiveTab('vitrine')}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'vitrine' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Vitrine
                </button>
            </div>

            {activeTab === 'mes-badges' ? (
                ownedBadges.length === 0 ? (
                    <div className="text-center py-12 bg-slate-100 rounded-2xl border border-slate-200">
                        <span className="text-5xl">🌫️</span>
                        <p className="mt-4 text-slate-500 text-sm">Tu n'as pas encore de badges.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                        {ownedBadges.map((ownership) => (
                            <BadgeCard key={ownership.badgeKey} ownership={ownership} />
                        ))}
                    </div>
                )
            ) : (
                <div className="space-y-8 sm:space-y-12">
                    {allUsersWithBadges.filter(u => u.id !== currentUserId && u.badges.length > 0).map(user => (
                        <div key={user.id} className="space-y-3 sm:space-y-4">
                            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs sm:text-sm">👤</span>
                                <Link href={`/u/${encodeURIComponent(user.nickname)}`} className="hover:text-indigo-400 transition-colors">
                                    <span className="text-indigo-500">{user.nickname}</span>
                                </Link>
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                {user.badges.map((ownership) => (
                                    <BadgeCard key={ownership.badgeKey} ownership={ownership} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}


        </div>
    )
}
