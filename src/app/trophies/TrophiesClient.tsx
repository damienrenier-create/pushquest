"use client"

import { useState } from "react"
import Link from "next/link"
import { Trophy, Clock, Shield, History, Flame, TrendingUp, AlertTriangle, Crown, Star, ChevronRight } from "lucide-react"
import RewardLink from "@/components/RewardLink"
import RewardDetailSheet from "@/components/RewardDetailSheet"
import { getXPForReward } from "@/lib/rewards"

interface BadgeDef {
    key: string
    name: string
    emoji: string
    description: string
    isUnique?: boolean
    threshold?: number
    exerciseScope?: string
    metricType?: string
}

interface UserStats {
    totalPushups: number
    totalPullups: number
    totalSquats: number
    totalAll: number
    maxSetAll: number
}

interface BadgeLog {
    id: string
    eventType: 'CLAIM' | 'STEAL' | 'UNLOCK'
    badge: BadgeDef
    fromUser?: { nickname: string }
    toUser: { nickname: string }
    createdAt: string
}

interface DangerItem {
    badgeKey: string
    badgeName: string
    emoji: string
    holder: string
    challenger: string
    currentValue: number
    challengerValue: number
    diff: number
}

interface Ownership {
    badgeKey: string
    currentValue: number
    currentUser?: { nickname: string }
    badge: BadgeDef
}

interface EventConfig {
    name: string
    emoji: string
    startDate: string
    endDate: string
    description: string
}

const UPCOMING_EVENTS: EventConfig[] = [
    { name: "Halloween", emoji: "🎃", startDate: "2026-10-31", endDate: "2026-10-31", description: "Fête d'Halloween" },
    { name: "Pâques", emoji: "🥚", startDate: "2026-04-05", endDate: "2026-04-05", description: "Chasse aux oeufs" },
    { name: "Saint-Patrice", emoji: "🍀", startDate: "2026-03-17", endDate: "2026-03-17", description: "Le Saint-Patrice" },
]

export default function TrophiesClient({
    earnedBadges,
    badgeDefinitions,
    userStats,
    recentEvents,
    dangerList,
    badgeOwnerships
}: {
    earnedBadges: string[],
    badgeDefinitions: BadgeDef[],
    userStats: UserStats,
    recentEvents: BadgeLog[],
    dangerList: DangerItem[],
    badgeOwnerships: Ownership[]
}) {
    const [selectedBadge, setSelectedBadge] = useState<BadgeDef | null>(null)
    const [selectedReward, setSelectedReward] = useState<any>(null)

    const handleRewardClick = (badgeKey: string) => {
        const def = badgeDefinitions.find(d => d.key === badgeKey)
        if (def) {
            setSelectedReward({
                ...def,
                xp: getXPForReward(badgeKey)
            })
        }
    }

    // Progression logic
    const nextBadges = badgeDefinitions
        .filter(b => !earnedBadges.includes(b.key) && b.threshold)
        .map(b => {
            let current = 0
            if (b.metricType === "MILESTONE_TOTAL") {
                current = userStats.totalAll
            } else if (b.metricType === "MILESTONE_SET") {
                current = userStats.maxSetAll
            } else if (b.exerciseScope === "PUSHUPS") {
                current = userStats.totalPushups
            } else if (b.exerciseScope === "PULLUPS") {
                current = userStats.totalPullups
            } else if (b.exerciseScope === "SQUATS") {
                current = userStats.totalSquats
            }

            const progress = Math.min(100, (current / (b.threshold || 1)) * 100)
            return { ...b, current, progress }
        })
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3)

    const BadgeItem = ({ badge, isEarned = false }: { badge: BadgeDef, isEarned?: boolean }) => (
        <div
            onClick={() => setSelectedBadge(badge)}
            className={`cursor-pointer p-4 rounded-3xl border transition-all ${isEarned ? 'bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/20 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-60 grayscale'}`}
        >
            <div className="flex items-center gap-4">
                <span className="text-3xl">{badge.emoji}</span>
                <div>
                    <p className="text-[11px] font-black text-white uppercase leading-none mb-1">{badge.name}</p>
                    {isEarned ? (
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Acquis ✅</span>
                    ) : (
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Verrouillé</span>
                    )}
                </div>
            </div>
        </div>
    )

    const getDaysUntil = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - new Date().getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Panthéon CTA */}
            <div className="max-w-7xl mx-auto px-4 mb-8">
                <Link href="/pantheon" className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2rem] text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Star size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Découvrez le Panthéon</h2>
                            <p className="text-white/80 text-sm font-medium italic">Une nouvelle expérience unifiée pour vos badges et trophées.</p>
                        </div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                        <ChevronRight size={24} />
                    </div>
                </Link>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                {/* Activité Récente */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                            <span className="p-1 px-2 bg-indigo-500 rounded-lg text-xs not-italic">LIVE</span>
                            Activité Récente
                        </h2>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {recentEvents.map(ev => (
                            <div key={ev.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group">
                                <p className="text-[11px] font-bold text-white leading-relaxed">
                                    {ev.eventType === 'STEAL' ? (
                                        <>
                                            <Link href={`/u/${encodeURIComponent(ev.toUser.nickname)}`} className="text-orange-400 hover:underline">{ev.toUser.nickname}</Link> a volé <RewardLink badge={ev.badge} xp={getXPForReward(ev.badge.key, ev.createdAt)} onClick={() => handleRewardClick(ev.badge.key)} /> à <Link href={`/u/${encodeURIComponent(ev.fromUser?.nickname || '')}`} className="hover:underline">{ev.fromUser?.nickname}</Link>
                                        </>
                                    ) : ev.eventType === 'CLAIM' ? (
                                        <>
                                            <Link href={`/u/${encodeURIComponent(ev.toUser.nickname)}`} className="text-green-400 hover:underline">{ev.toUser.nickname}</Link> a obtenu <RewardLink badge={ev.badge} xp={getXPForReward(ev.badge.key, ev.createdAt)} onClick={() => handleRewardClick(ev.badge.key)} />
                                        </>
                                    ) : (
                                        <>
                                            <Link href={`/u/${encodeURIComponent(ev.toUser.nickname)}`} className="text-yellow-400 hover:underline">{ev.toUser.nickname}</Link> a débloqué <RewardLink badge={ev.badge} xp={getXPForReward(ev.badge.key, ev.createdAt)} onClick={() => handleRewardClick(ev.badge.key)} />
                                        </>
                                    )}
                                </p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Il y a {Math.round((new Date().getTime() - new Date(ev.createdAt).getTime()) / 60000)} min</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Badges en Danger */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <span className="p-1 px-2 bg-red-500 rounded-lg text-xs not-italic">DANGER</span>
                        Badges en Péril
                    </h2>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {dangerList.map(d => (
                            <div key={d.badgeKey} className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl group-hover:scale-110 transition-transform">{d.emoji}</span>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase">{d.badgeName}</p>
                                        <p className="text-[8px] font-bold text-slate-500 italic">
                                            Détenteur: <Link href={`/u/${encodeURIComponent(d.holder || '')}`} className="text-white hover:underline">{d.holder}</Link> ({d.currentValue})
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-tighter">MENACE: {d.challenger}</p>
                                    <p className="text-[10px] font-black text-white uppercase">Écart: -{d.diff}</p>
                                </div>
                            </div>
                        ))}
                        {dangerList.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                <span className="text-4xl mb-4">🛡️</span>
                                <p className="text-xs font-black text-slate-500 uppercase">Tout est sous contrôle. <br /> La hiérarchie est stable.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🎯 PROCHAINS BADGES */}
            <section className="space-y-4">
                <h2 className="text-xl font-black text-white px-2 flex justify-between items-center">
                    🎯 Prochains objectifs
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">{earnedBadges.length} / {badgeDefinitions.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {nextBadges.map(b => (
                        <div key={b.key} onClick={() => setSelectedBadge(b)} className="group cursor-pointer bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-4 hover:border-indigo-500/50 transition-all shadow-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-4xl group-hover:scale-110 transition-transform">{b.emoji}</span>
                                <span className="text-xs font-black text-indigo-400">{Math.round(b.progress)}%</span>
                            </div>
                            <div>
                                <p className="text-sm font-black text-white uppercase">{b.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{b.current} / {b.threshold} Reps</p>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${b.progress}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 👑 VUE GLOBALE DES DETENTEURS (Competitive & Unique) */}
            <section className="space-y-6">
                <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                    <h2 className="text-xl font-black text-white mb-8 border-l-4 border-indigo-600 pl-4">🏆 Tableau de Chasse Mondial</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {badgeDefinitions.filter(b => b.key.includes('unique') || b.key.includes('flex') || b.key.includes('king') || b.key === 'centurion').map(b => {
                            const ownership = badgeOwnerships.find(bo => bo.badgeKey === b.key)
                            return (
                                <div key={b.key} onClick={() => setSelectedBadge(b)} className="bg-white/5 p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-3xl group-hover:rotate-12 transition-transform">{b.emoji}</span>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase leading-tight">{b.name}</p>
                                            {b.isUnique && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Légendaire</span>}
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1 italic">Détenteur actuel:</p>
                                        {ownership?.currentUser ? (
                                            <Link href={`/u/${encodeURIComponent(ownership.currentUser.nickname)}`} onClick={(e) => e.stopPropagation()} className="text-[11px] font-black text-indigo-400 hover:underline">
                                                👑 {ownership.currentUser.nickname} ({ownership.currentValue})
                                            </Link>
                                        ) : (
                                            <p className="text-[11px] font-black text-slate-600 uppercase">En attente...</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* 🔥 TOUS LES AUTRES (Milestones etc.) */}
            <section className="space-y-4">
                <h2 className="text-xl font-black text-white px-2">🎖️ Médailles & Milestones</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {badgeDefinitions.filter(b => !b.key.includes('unique') && !b.key.includes('flex') && !b.key.includes('king') && b.key !== 'centurion').map(b => (
                        <BadgeItem key={b.key} badge={b} isEarned={earnedBadges.includes(b.key)} />
                    ))}
                </div>
            </section>

            {/* 🎉 EVENTS */}
            <section className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-8">
                    <h2 className="text-xl font-black text-white mb-6">🎉 Events à venir</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {UPCOMING_EVENTS.filter(e => getDaysUntil(e.startDate) >= 0).sort((a, b) => getDaysUntil(a.startDate) - getDaysUntil(b.startDate)).map(e => (
                            <div key={e.name} className="flex gap-4 items-center bg-white/5 p-4 rounded-3xl border border-white/5">
                                <span className="text-4xl">{e.emoji}</span>
                                <div>
                                    <p className="text-sm font-black text-white uppercase">{e.name}</p>
                                    <p className="text-xs font-bold text-indigo-400">J-{getDaysUntil(e.startDate)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reward Detail Sheet */}
            <RewardDetailSheet
                detail={selectedReward || selectedBadge ? {
                    ...(selectedReward || selectedBadge),
                    xp: (selectedReward || selectedBadge).xp ?? getXPForReward((selectedReward || selectedBadge).key)
                } : null}
                onClose={() => {
                    setSelectedReward(null)
                    setSelectedBadge(null)
                }}
            />
        </div>
    )
}
