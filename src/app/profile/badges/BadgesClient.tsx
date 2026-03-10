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
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

    const BadgeCard = ({ ownership, showOwner = false }: { ownership: Ownership, showOwner?: boolean }) => (
        <div
            onClick={() => setSelectedBadge(ownership.badge)}
            className="relative group cursor-pointer overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-6xl">{ownership.badge.emoji}</span>
            </div>

            <div className="relative flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl text-3xl shadow-inner">
                        {ownership.badge.emoji}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {ownership.badge.name}
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                                {ownership.badge.isUnique ? "🔥 Unique" : "✨ Standard"}
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-400 mb-6 flex-grow line-clamp-2">
                    {ownership.badge.description}
                </p>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                        <span className="text-slate-500">Record</span>
                        <span className="font-mono text-white text-sm">{ownership.currentValue}</span>
                    </div>
                    {showOwner && ownership.currentUser && (
                        <div className="flex flex-col text-right">
                            <span className="text-slate-500">Détenteur</span>
                            <Link
                                href={`/u/${encodeURIComponent(ownership.currentUser.nickname)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-indigo-400 font-bold hover:underline"
                            >
                                {ownership.currentUser.nickname}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    )

    return (
        <>
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                <button
                    onClick={() => setActiveTab('mes-badges')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'mes-badges' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Mes badges ({ownedBadges.length})
                </button>
                <button
                    onClick={() => setActiveTab('vitrine')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'vitrine' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Vitrine des concurrents
                </button>
            </div>

            {activeTab === 'mes-badges' ? (
                ownedBadges.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <span className="text-5xl">🌫️</span>
                        <p className="mt-4 text-slate-400">Tu n'as pas encore de badges. Continue l'entraînement !</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ownedBadges.map((ownership) => (
                            <BadgeCard key={ownership.badgeKey} ownership={ownership} />
                        ))}
                    </div>
                )
            ) : (
                <div className="space-y-12">
                    {allUsersWithBadges.filter(u => u.id !== currentUserId && u.badges.length > 0).map(user => (
                        <div key={user.id} className="space-y-4">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">👤</span>
                                <Link href={`/u/${encodeURIComponent(user.nickname)}`} className="hover:text-indigo-400 transition-colors">
                                    Exploits de <span className="text-indigo-500">{user.nickname}</span>
                                </Link>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {user.badges.map((ownership) => (
                                    <BadgeCard key={ownership.badgeKey} ownership={ownership} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-24 h-24 flex items-center justify-center bg-slate-800 rounded-3xl text-6xl shadow-inner border border-white/5">
                                    {selectedBadge.emoji}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">{selectedBadge.name}</h2>
                                    <span className="inline-block mt-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">
                                        {selectedBadge.isUnique ? "🔥 Badge Légendaire" : "✨ Badge Milestone"}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                                <p className="text-slate-300 leading-relaxed font-medium">
                                    {selectedBadge.description}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedBadge(null)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest"
                            >
                                C'est noté !
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
