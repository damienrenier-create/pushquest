
"use client"

import Link from "next/link"
import { useState } from "react"
import TeamBadge from "@/components/TeamBadge"
import { getTeamRowClass } from "@/lib/teamBadge"

interface RecordsAssiduiteSectionProps {
    data: any
    setRewardDetail: (detail: any) => void
    session: any
    router: any
    getStreakEmoji: (rate: number, streak: number) => { label: string, emoji: string }
}

function RegularitySubline({ u, ind }: { u: any, ind: any }) {
    const [showGlobal, setShowGlobal] = useState(false);

    const formatLastEntry = (dateStr: string | null) => {
        if (!dateStr) return "Aucun encodage";
        const d = new Date(dateStr);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `aujourd'hui ${timeStr}`;
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return `hier ${timeStr}`;
        return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${timeStr}`;
    };

    const monthRate = Math.round(u.monthStats?.rate || 0);
    const globalRate = Math.round(u.globalStats?.rate || 0);
    const monthStreak = u.monthStats?.streak || 0;
    const globalStreak = u.globalStats?.streak || 0;

    const rate = showGlobal ? globalRate : monthRate;
    const streak = showGlobal ? globalStreak : monthStreak;
    const label = showGlobal ? "GLOBAL" : "MOIS";

    return (
        <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px]">{ind.emoji}</span>
            <button
                onClick={(e) => { e.stopPropagation(); setShowGlobal(v => !v); }}
                className="flex items-center gap-1 select-none active:opacity-50"
            >
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                    {label} {rate}%
                </span>
                {streak > 0 && (
                    <span className="text-[11px] font-bold text-orange-400">· 🔥{streak}j</span>
                )}
                <span className="text-[11px] text-gray-300 font-bold">›</span>
            </button>
            <span className="text-[11px] text-gray-400 italic truncate">
                ⌚ {formatLastEntry(u.lastEntryAt)}
            </span>
        </div>
    );
}

export default function RecordsAssiduiteSection({
    data,
    setRewardDetail,
    session,
    router,
    getStreakEmoji
}: RecordsAssiduiteSectionProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* RECORDS GRID (BEST SETS) */}
            <div className="space-y-3 pt-2">
                <div className="flex flex-col ml-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest leading-none">Records — Plus longue série</h3>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-7 tracking-tighter">Meilleure série sur la période (pas le total du jour)</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(['day', 'week', 'month', 'year'] as const).map(pid => {
                        const pRec = data?.records?.[pid];
                        return (
                            <div
                                key={pid}
                                onClick={() => setRewardDetail({
                                    name: `Record ${pid === 'day' ? 'du jour' : pid === 'week' ? 'de la semaine' : pid === 'month' ? 'du mois' : 'de l\'année'}`,
                                    emoji: pRec?.badge || '🏆',
                                    description: `Meilleure série réalisée sur cette période. Les records poussent tout le monde vers le haut !`,
                                    type: "RECORD"
                                })}
                                className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-95"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{pid === 'day' ? 'Jour' : pid === 'week' ? 'Semaine' : pid === 'month' ? 'Mois' : 'Année'}</span>
                                    <Link href="/faq?tab=catalogue" className="text-lg hover:scale-110 transition-transform">{pRec?.badge ?? '-'}</Link>
                                </div>
                                {(['pushups', 'pullups', 'squats', 'planks'] as const).map(ex => (
                                    <div key={ex} className="flex justify-between items-start mb-2 border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-md opacity-90 mt-1">{ex === 'pushups' ? '💪' : ex === 'pullups' ? '🦍' : ex === 'squats' ? '🦵' : '🛡️'}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            {(pRec?.[ex]?.top3Sets || []).map((s: any, idx: number) => (
                                                <div key={idx} className={`flex items-center justify-end gap-1.5 ${idx === 0 ? '' : 'opacity-60'}`}>
                                                    <Link href={`/u/${encodeURIComponent(s.winner)}`} className="text-[8px] font-bold text-gray-400 truncate max-w-[50px] uppercase tracking-tighter hover:text-blue-500 underline decoration-gray-200">
                                                        {s.winner}
                                                    </Link>
                                                    <p className={`font-black text-gray-800 leading-none ${idx === 0 ? 'text-xs' : 'text-[10px]'}`}>{s.maxReps}</p>
                                                    <span className="text-[8px]">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                </div>
                                            ))}
                                            {!(pRec?.[ex]?.top3Sets?.length) && <p className="text-[8px] text-gray-400 italic">Vide</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RECORDS GRID (VOLUME) */}
            <div className="space-y-3">
                <div className="flex flex-col ml-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest leading-none">Records — Volume Total Accumulé</h3>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-7 tracking-tighter">Somme de toutes les répétitions sur la période</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(['day', 'week', 'month', 'year'] as const).map(pid => {
                        const pRec = data?.records?.[pid];
                        return (
                            <div key={`vol-${pid}`} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{pid === 'day' ? 'Jour' : pid === 'week' ? 'Semaine' : pid === 'month' ? 'Mois' : 'Année'}</span>
                                    <Link href="/faq?tab=catalogue" className="text-lg hover:scale-110 transition-transform">{pRec?.badge ?? '-'}</Link>
                                </div>
                                {(['pushups', 'pullups', 'squats', 'planks'] as const).map(ex => (
                                    <div key={`vol-${ex}`} className="flex justify-between items-start mb-2 border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-md opacity-90 mt-1">{ex === 'pushups' ? '💪' : ex === 'pullups' ? '🦍' : ex === 'squats' ? '🦵' : '🛡️'}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            {(pRec?.[ex]?.top3Volume || []).map((s: any, idx: number) => (
                                                <div key={idx} className={`flex items-center gap-1.5 justify-end ${idx === 0 ? '' : 'opacity-60'}`}>
                                                    <Link href={`/u/${encodeURIComponent(s.nickname || '')}`} className="text-[8px] font-bold text-gray-400 truncate max-w-[50px] uppercase tracking-tighter hover:text-blue-500 underline decoration-gray-200">{s.nickname}</Link>
                                                    <p className={`font-black text-gray-800 leading-none ${idx === 0 ? 'text-xs text-blue-600' : 'text-[10px]'}`}>{s.totalVolume}</p>
                                                    <span className="text-[8px]">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                </div>
                                            ))}
                                            {!(pRec?.[ex]?.top3Volume?.length) && <p className="text-[8px] text-gray-400 italic">Vide</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* GÉNÉROSITÉ — Cadeau de reps à Milka */}
            {data?.generosity && (['day', 'week', 'month', 'year'] as const).some(p => (data.generosity[p] || []).length > 0) && (
                <div className="space-y-3">
                    <div className="flex flex-col ml-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎁</span>
                            <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest leading-none">Générosité — Reps offertes à Milka 🍼</h3>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-7 tracking-tighter">Les plus généreux du jour, semaine, mois et année</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {([['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois'], ['year', 'Année']] as const).map(([pid, label]) => (
                            <div key={pid} className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-3xl border border-pink-100 shadow-sm">
                                <span className="text-[9px] font-black text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full uppercase">{label}</span>
                                <div className="mt-3 space-y-2">
                                    {((data.generosity[pid] || []).slice(0, 3)).map((g: any, i: number) => (
                                        <div key={g.nickname + i} className="flex justify-between items-center text-[11px]">
                                            <span className="font-bold text-gray-600 truncate mr-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {g.nickname}</span>
                                            <span className="font-black text-pink-600">{g.total}</span>
                                        </div>
                                    ))}
                                    {!(data.generosity[pid] || []).length && <p className="text-[9px] text-gray-400 italic">Personne encore</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ASSIDUITE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-center items-center gap-2">
                    <span className="text-xs">✨</span>
                    <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest text-center">Classement Assiduité</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {(data?.leaderboard || []).map((u: any, i: number) => {
                        const ind = getStreakEmoji(u.completionRate, u.streakCurrent);
                        return (
                            <div key={u.nickname || i} className={`flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors ${getTeamRowClass(u.id)}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 text-center font-black ${i < 3 ? 'text-blue-500' : 'text-gray-300'}`}>{i + 1}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm border border-gray-100 overflow-hidden shrink-0">
                                        {u.image ? (
                                            <img src={u.image} alt={u.nickname} className="w-full h-full object-cover" />
                                        ) : (
                                            (() => {
                                                const userXP = data?.xp?.leaderboard.find((x: any) => x.id === u.id);
                                                return userXP ? userXP.emoji : '👤';
                                            })()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {(() => {
                                                const userXP = data?.xp?.leaderboard.find((x: any) => x.id === u.id);
                                                return userXP ? <span className="text-[10px] font-black text-slate-400" title={userXP.animal}>Lv.{userXP.level}</span> : null;
                                            })()}
                                            <Link href={`/u/${encodeURIComponent(u.nickname || '')}`} className="font-black text-gray-900 text-sm leading-none hover:text-blue-600 hover:underline transition-color shrink-0" title={`Visiter le profil de ${u.nickname}`}>
                                                {u.nickname || 'Anonyme'}
                                            </Link>
                                            <div className="flex gap-1">
                                                {u.isInjured && <span className="text-[10px] animate-pulse cursor-help" title={`Mise à pied médicale : ${u.currentMedicalNote || 'Certificat valide'}`}>🚑</span>}
                                                {u.isVeteran && <span className="text-[10px] cursor-help" title="Vétéran : Libéré du service (Buyout payé)">🕊️</span>}
                                                {!u.isInjured && !u.isVeteran && <span className="text-[10px] opacity-20 grayscale" title="Apte au service">✅</span>}
                                            </div>
                                            <TeamBadge userId={u.id} showText={true} />
                                        </div>
                                        <RegularitySubline u={u} ind={ind} />
                                    </div>
                                </div>
                                <div className="text-right cursor-help" title="Taux d'accomplissement (30j)">
                                    <p className="font-black text-blue-600 text-sm">{Math.round(u.completionRate)}%</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
