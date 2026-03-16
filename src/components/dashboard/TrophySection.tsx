
"use client"

import Link from "next/link"

interface TrophySectionProps {
    data: any
    setRewardDetail: (detail: any) => void
    toggleLike: (id: string) => Promise<void>
    session: any
}

export default function TrophySection({ data, setRewardDetail, toggleLike, session }: TrophySectionProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Compteur de Gloire */}
            <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">Compteur de gloire</h3>
                <span className="text-blue-600 font-black text-sm">
                    {(data?.badges?.competitive?.ownerships || []).filter((o: any) => o.currentUser?.nickname).length} / {(data?.badges?.competitive?.ownerships || []).length}
                </span>
            </div>

            {/* Activité Récente (Duplicate for this tab but styled differently in original) */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                    <h2 className="text-sm lg:text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <span className="p-1 px-2 bg-indigo-500 rounded-lg text-xs not-italic">LIVE</span>
                        Activité Récente
                    </h2>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar relative z-10 pr-2">
                    {(data?.badges?.competitive?.events || []).length > 0 ? (
                        (data?.badges?.competitive?.events || []).slice(0, 15).map((ev: any) => {
                            const currentUserId = (session?.user as any)?.id;
                            const likes = ev.likes || [];
                            const count = likes.length;
                            const hasLiked = currentUserId && likes.some((l: any) => l.userId === currentUserId);

                            let emoji = "👍";
                            if (count === 2) emoji = "👍👍";
                            else if (count === 3) emoji = "🔥";
                            else if (count === 4) emoji = "🔥🔥";
                            else if (count >= 5) emoji = "❤️";

                            return (
                                <div key={ev.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex gap-4 items-center">
                                        <span className="text-3xl sm:text-4xl shrink-0 group-hover:scale-110 transition-transform cursor-pointer" onClick={() => setRewardDetail({ ...ev.badge, type: 'Bataille', holder: ev.toUser?.nickname, achievedAt: ev.createdAt, currentValue: ev.newValue })}>
                                            {ev.badge?.emoji}
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-bold text-white leading-relaxed">
                                                {ev.eventType === 'STEAL' ? (
                                                    <>
                                                        <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-orange-400 hover:underline">{ev.toUser?.nickname}</Link> a volé <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-blue-400 hover:underline">[{ev.badge?.name}]</Link> à <Link href={`/u/${encodeURIComponent(ev.fromUser?.nickname || '')}`} className="hover:underline">{ev.fromUser?.nickname}</Link>
                                                    </>
                                                ) : ev.eventType === 'CLAIM' ? (
                                                    <>
                                                        <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-green-400 hover:underline">{ev.toUser?.nickname}</Link> a obtenu <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-blue-400 hover:underline">[{ev.badge?.name}]</Link>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-yellow-400 hover:underline">{ev.toUser?.nickname}</Link> a débloqué <Link href={`/faq?tab=catalogue#item-${ev.badge?.key}`} className="text-blue-400 hover:underline">[{ev.badge?.name}]</Link>
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                                                {new Date().getTime() - new Date(ev.createdAt).getTime() < 86400000
                                                    ? `Il y a ${Math.round((new Date().getTime() - new Date(ev.createdAt).getTime()) / 60000)} min`
                                                    : new Date(ev.createdAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                                        <div className="text-right sm:text-center shrink-0 border-r sm:border-r-0 sm:border-l border-white/10 pr-3 sm:pr-0 sm:pl-3">
                                            <p className="font-black text-white text-base leading-none">
                                                {(() => {
                                                    const mt = ev.badge?.metricType;
                                                    const val = ev.newValue;
                                                    if (mt === 'SERIES_COUNT') return `${val} SÉRIES`;
                                                    if (mt?.includes('STREAK')) return `${val} JOURS`;
                                                    if (mt?.includes('SET') || mt?.includes('REPS') || mt?.includes('VOLUME')) return `${val} REPS`;
                                                    if (mt === 'TOTAL_FINES_AMOUNT') return `${val} €`;
                                                    return `${val} XP`;
                                                })()}
                                            </p>
                                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Valeur</p>
                                        </div>
                                        <button
                                            onClick={() => toggleLike(ev.id)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-sm shrink-0 shadow-sm ${hasLiked ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-200' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <span className={`transition-all ${count === 0 ? 'opacity-40 grayscale' : 'scale-110'}`}>{emoji}</span>
                                            {count > 0 && <span className="text-xs">{count}</span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-slate-500 text-xs font-bold text-center italic py-4">Aucune activité récente.</p>
                    )}
                </div>
            </div>

            {/* Badges en Danger */}
            <div className="bg-red-50 rounded-[2.5rem] p-6 lg:p-8 space-y-6 shadow-sm border border-red-100">
                <h2 className="text-sm lg:text-lg font-black text-red-600 uppercase tracking-tighter italic flex items-center gap-2">
                    <span className="p-1 px-2 bg-red-100 rounded-lg text-xs not-italic">⚠️</span>
                    Badges en Danger
                </h2>
                <div className="space-y-3">
                    {(data?.badges?.competitive?.danger || []).length > 0 ? (
                        (data?.badges?.competitive?.danger || []).map((d: any) => (
                            <div
                                key={d.badgeKey}
                                onClick={() => setRewardDetail({
                                    name: d.badgeName,
                                    emoji: d.emoji,
                                    description: "Ce badge est activement disputé. Il récompense l'excellence et peut changer de main à tout moment !",
                                    type: 'COMPÉTITION DIRECTE',
                                    holder: d.holder,
                                    currentValue: d.currentValue,
                                    xpAtRisk: d.xpAtRisk
                                })}
                                className="bg-white p-4 rounded-3xl border border-red-100 flex justify-between items-center group shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <Link href={`/faq?tab=catalogue#item-${d.badgeKey}`} className="text-3xl sm:text-4xl hover:scale-110 transition-transform">
                                        {d.emoji}
                                    </Link>
                                    <div>
                                        <Link href={`/faq?tab=catalogue#item-${d.badgeKey}`} className="text-[10px] font-black text-slate-900 uppercase hover:underline">
                                            {d.badgeName}
                                        </Link>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1">
                                            Détenteur: <Link href={`/u/${encodeURIComponent(d.holder || '')}`} onClick={(e) => e.stopPropagation()} className="text-slate-900 hover:underline font-black">{d.holder}</Link> ({d.currentValue})
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-black text-red-600 uppercase">Menace: {d.challenger}</p>
                                    <div className="flex flex-col items-end gap-1 mt-1">
                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-50 inline-block px-2 py-0.5 rounded-full">
                                            {d.diff === 0 ? "Égalité" : `Écart: ${d.diff}`}
                                        </p>
                                        <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{d.xpAtRisk} XP EN JEU</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 text-xs font-bold text-center italic py-4 bg-white/50 rounded-2xl border border-dashed border-red-200">Tous les records sont hors d'atteinte... pour l'instant.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
