"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Trophy, Zap, Activity, PieChart, BarChart3, TrendingUp, History, Info } from "lucide-react"
import RewardDetailSheet from "@/components/RewardDetailSheet"
import GraphsSection from "@/components/dashboard/GraphsSection"

export default function UserProfilePage() {
    const { data: session } = useSession()
    const params = useParams()
    const router = useRouter()
    const nickname = params.nickname as string
    const decodedNickname = decodeURIComponent(nickname)

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [errorInfo, setErrorInfo] = useState<any>(null)
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats')
    const [graphPeriod, setGraphPeriod] = useState<'30' | '365' | 'all'>('30')
    const [isEditingStatus, setIsEditingStatus] = useState(false)
    const [statusDraft, setStatusDraft] = useState("")
    const [isStatusLoading, setIsStatusLoading] = useState(false)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const [resUser, resAnalytics] = await Promise.all([
                    fetch(`/api/user/profile/${nickname}`),
                    fetch(`/api/user/analytics/${nickname}?period=${graphPeriod}`)
                ])
                if (resUser.ok) {
                    const data = await resUser.json()
                    setUser(data)
                    setStatusDraft(data.status?.content || "")
                } else {
                    const errorData = await resUser.json().catch(() => ({ message: "Inconnu" }))
                    setErrorInfo(errorData)
                }
                if (resAnalytics.ok) {
                    const data = await resAnalytics.json()
                    setAnalyticsData(data)
                }
            } catch (err: any) {
                console.error(err)
                setErrorInfo({ message: err.message, stack: err.stack })
            } finally {
                setLoading(false)
            }
        }

        if (session === null) {
            router.push("/login")
        } else {
            fetchUserData()
        }
    }, [session, nickname, router, graphPeriod])

    const handleUpdateStatus = async () => {
        setIsStatusLoading(true)
        try {
            const res = await fetch("/api/user/status", {
                method: "POST",
                body: JSON.stringify({ content: statusDraft })
            })
            if (res.ok) {
                const updatedStatus = await res.json()
                setUser({ ...user, status: updatedStatus })
                setIsEditingStatus(false)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsStatusLoading(false)
        }
    }

    const handleLikeStatus = async () => {
        if (!user.status) return
        try {
            const res = await fetch("/api/user/status/like", {
                method: "POST",
                body: JSON.stringify({ statusId: user.status.id })
            })
            if (res.ok) {
                const data = await res.json()
                // Refresh user data to get updated likes
                const resUser = await fetch(`/api/user/profile/${nickname}`)
                if (resUser.ok) setUser(await resUser.json())
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleLikeBadge = async (badgeKey: string) => {
        try {
            const res = await fetch("/api/user/badge/like", {
                method: "POST",
                body: JSON.stringify({ badgeKey })
            })
            if (res.ok) {
                // Refresh user data to get updated likes
                const resUser = await fetch(`/api/user/profile/${nickname}`)
                if (resUser.ok) setUser(await resUser.json())
            }
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    )

    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <h1 className="text-4xl font-black text-gray-900 mb-4">MEC INTROUVABLE 🕵️‍♂️</h1>
            <p className="text-gray-500 font-bold mb-4 uppercase text-xs">Ce soldat n'est pas dans nos registres.</p>
            {errorInfo && (
                <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-left max-w-md mx-auto overflow-auto border border-red-100">
                    <p className="font-black text-[10px] uppercase mb-1">Détails techniques :</p>
                    <p className="text-sm font-bold">{errorInfo.message || errorInfo.error}</p>
                    {errorInfo.stack && <pre className="text-[8px] mt-2 opacity-50 font-mono leading-tight">{errorInfo.stack.substring(0, 500)}...</pre>}
                </div>
            )}
            <Link href="/" className="bg-slate-900 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs">Retour au Front</Link>
        </div>
    )

    const stats = user.stats || { pushups: 0, pullups: 0, squats: 0, total: 0 }
    const { pushups, pullups, squats, total: totalReps } = stats

    const pushupPct = totalReps > 0 ? (pushups / totalReps) * 100 : 0
    const pullupPct = totalReps > 0 ? (pullups / totalReps) * 100 : 0
    const squatPct = totalReps > 0 ? (squats / totalReps) * 100 : 0

    const unpaidFinesPot = (user.fines || [])
        .filter((f: any) => f.status === 'unpaid')
        .reduce((acc: number, f: any) => acc + f.amountEur, 0)

    const isInjured = user.medicalCertificates?.some((c: any) => {
        const today = new Date().toISOString().split('T')[0];
        return today >= c.startDateISO && today <= c.endDateISO;
    });
    const isVeteran = user.buyoutPaid;

    const rarityStyles: Record<string, string> = {
        COMMON: "border-slate-100 bg-white text-slate-400 hover:border-indigo-200",
        RARE: "border-blue-100 bg-blue-50/30 text-blue-500 hover:border-blue-300 shadow-sm shadow-blue-900/5",
        EPIC: "border-purple-100 bg-purple-50/40 text-purple-600 hover:border-purple-300 shadow-sm shadow-purple-900/5",
        LEGENDARY: "border-orange-100 bg-orange-50/50 text-orange-700 hover:border-orange-300 shadow-lg shadow-orange-900/5 ring-1 ring-orange-100/10",
    };

    const hallOfFame = (user.badges || []).filter((b: any) => b.badge.rarity === 'LEGENDARY' || b.badge.rarity === 'EPIC');

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 pb-24 lg:pt-8">
            {/* Hero Section */}
            {/* ... (keep existing hero code) */}
            <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-50" />

                <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-3xl sm:text-5xl shadow-2xl border border-slate-700/50 font-black text-white shrink-0">
                        {user.nickname.charAt(0).toUpperCase()}
                    </div>

                    <div className="text-center sm:text-left space-y-2 sm:space-y-3 flex-1 min-w-0">
                        <div className="inline-block bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">PROFIL SOLDAT</div>
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-3">
                            <h1 className="text-3xl sm:text-6xl font-black text-white tracking-normal uppercase leading-none">
                                {user.nickname}
                            </h1>
                            <div className="flex gap-2">
                                {!isInjured && !isVeteran && <span className="text-xl sm:text-2xl opacity-30 grayscale" title="Apte au service">✅</span>}
                            </div>
                        </div>
                        
                        {/* Status Area */}
                        <div className="mt-4 max-w-lg">
                            {isEditingStatus ? (
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={statusDraft}
                                        onChange={(e) => setStatusDraft(e.target.value.substring(0, 300))}
                                        className="bg-slate-800 border border-slate-700 text-white rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                                        placeholder="Quelles sont les nouvelles, soldat ?"
                                    />
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] text-slate-500 font-bold">{statusDraft.length}/300</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingStatus(false)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Annuler</button>
                                            <button 
                                                onClick={handleUpdateStatus} 
                                                disabled={isStatusLoading}
                                                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                            >
                                                {isStatusLoading ? 'Appel...' : 'Poster'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    <div className="flex items-start gap-3">
                                        <p className="text-slate-300 text-xs sm:text-sm font-bold italic leading-relaxed">
                                            {user.status?.content ? `"${user.status.content}"` : (session?.user?.email === user.email ? "Aucun statut. Édicte tes ordres." : "")}
                                        </p>
                                        {user.status && (
                                            <button 
                                                onClick={handleLikeStatus}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 hover:bg-slate-800 rounded-full border border-slate-700 transition-colors"
                                            >
                                                <span className={`${(user.status.likes || []).some((l: any) => l.userId === (session?.user as any).id) ? 'text-rose-500' : 'text-slate-400'}`}>❤️</span>
                                                <span className="text-[9px] font-bold text-slate-300">{(user.status.likes || []).length}</span>
                                            </button>
                                        )}
                                        {session?.user?.email === user.email && (
                                            <button onClick={() => setIsEditingStatus(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-300">
                                                <Activity size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-tight mt-4">
                            Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                    </div>
                </div>

                <div className="relative mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Total Reps</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-white tracking-normal">{totalReps.toLocaleString()}</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">Reps</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Distinctions</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-indigo-400 tracking-normal">{user.badges?.length || 0}</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">Badges</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Amendes Dues</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-rose-500 tracking-normal">{unpaidFinesPot}€</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">💸</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hall of Fame */}
            {hallOfFame.length > 0 && (
                <section className="space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal flex items-center gap-3 px-2 text-slate-900">
                        <span className="text-yellow-500">✨</span> Hall of Fame
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {hallOfFame.map((ownership: any) => (
                            <Link
                                key={ownership.id}
                                href={`/faq?tab=catalogue#item-${ownership.badgeKey}`}
                                className={`relative group overflow-hidden border rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 transition-all hover:scale-[1.02] cursor-pointer bg-white ${rarityStyles[ownership.badge.rarity]}`}
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:rotate-12 transition-transform">
                                    <Sparkles size={32} />
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="text-3xl sm:text-4xl filter drop-shadow-lg shrink-0">{ownership.badge.emoji}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">{ownership.badge.rarity}</span>
                                            <div className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded-full text-[8px] font-black">
                                                <span>❤️</span>
                                                <span>{(ownership.likes || []).length}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-normal leading-tight mt-0.5 truncate">{ownership.badge.name}</h3>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 mt-1 line-clamp-1 italic">"{ownership.badge.description}"</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit mx-auto sm:mx-0">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Activity size={14} />
                    Résumé
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={14} />
                    Historique
                </button>
            </div>

            {/* Analytics Section */}
            <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-gray-100 space-y-10">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal flex items-center gap-3 text-slate-900">
                        <span className="p-2 bg-blue-100/50 rounded-2xl text-xl">{activeTab === 'stats' ? '📊' : '📈'}</span> 
                        {activeTab === 'stats' ? 'Statistiques & Analytics' : 'Courbe de Progression'}
                    </h2>
                </div>

                {activeTab === 'stats' ? (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Reps Distribution Wheel */}
                    <div className="flex flex-col items-center space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-slate-50 px-3 py-1 rounded-full">Répartition des Efforts</h3>
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                    const total = pushups + pullups + squats || 1;
                                    const p = (pushups / total) * 100;
                                    const t = (pullups / total) * 100;
                                    const s = (squats / total) * 100;
                                    
                                    let offset = 0;
                                    const createSegment = (val: number, color: string) => {
                                        const dashArray = `${val} ${100 - val}`;
                                        const dashOffset = -offset;
                                        offset += val;
                                        return (
                                            <circle
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke={color}
                                                strokeWidth="12"
                                                strokeDasharray={dashArray}
                                                strokeDashoffset={dashOffset}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000"
                                            />
                                        );
                                    };

                                    return (
                                        <>
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                            {pushups > 0 && createSegment(p, "#3b82f6")}
                                            {pullups > 0 && createSegment(t, "#f97316")}
                                            {squats > 0 && createSegment(s, "#10b981")}
                                        </>
                                    );
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{totalReps.toLocaleString()}</span>
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-1">TOTAL REPS</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 text-[9px] font-black uppercase tracking-wider">
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> {pushups.toLocaleString()} Pompes</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> {pullups.toLocaleString()} Tractions</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {squats.toLocaleString()} Squats</div>
                        </div>
                    </div>

                    {/* XP Distribution Wheel */}
                    <div className="flex flex-col items-center space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-indigo-50 px-3 py-1 rounded-full">Origine du Prestige (XP)</h3>
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                    if (!analyticsData?.xpBreakdown) return <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />;
                                    
                                    const breakdown = analyticsData.xpBreakdown;
                                    const total = analyticsData.totalXP || 1;
                                    const labels: any = {
                                        repsXP: "#6366f1",
                                        badgesXP: "#f59e0b",
                                        recordsXP: "#a855f7",
                                        finesXP: "#10b981",
                                        manualXP: "#94a3b8"
                                    };

                                    let offset = 0;
                                    return (
                                        <>
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                            {Object.entries(breakdown).map(([key, val]: [string, any]) => {
                                                if (val <= 0 || !labels[key]) return null;
                                                const p = (val / total) * 100;
                                                const dashArray = `${p} ${100 - p}`;
                                                const dashOffset = -offset;
                                                offset += p;
                                                return (
                                                    <circle
                                                        key={key}
                                                        cx="50" cy="50" r="40"
                                                        fill="transparent"
                                                        stroke={labels[key]}
                                                        strokeWidth="12"
                                                        strokeDasharray={dashArray}
                                                        strokeDashoffset={dashOffset}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000"
                                                    />
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl sm:text-3xl font-black text-indigo-600 leading-none">{(analyticsData?.totalXP || 0).toLocaleString()}</span>
                                <span className="text-[8px] font-black text-indigo-700 uppercase tracking-widest mt-1">TOTAL XP</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 text-[9px] font-black uppercase tracking-wider max-w-sm">
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> {Math.round(analyticsData.xpBreakdown.repsXP).toLocaleString()} Entraînement</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> {Math.round(analyticsData.xpBreakdown.badgesXP).toLocaleString()} Trophées</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> {Math.round(analyticsData.xpBreakdown.recordsXP).toLocaleString()} Records</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> {Math.round(analyticsData.xpBreakdown.finesXP + (analyticsData.xpBreakdown.manualXP || 0)).toLocaleString()} Bonus/Dons</div>
                        </div>
                    </div>
                </div>


                ) : (
                    <div className="animate-in fade-in duration-500">
                        <GraphsSection 
                            data={analyticsData}
                            graphPeriod={graphPeriod}
                            setGraphPeriod={setGraphPeriod}
                        />
                    </div>
                )}

                <div className="pt-8 border-t border-gray-50 flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center max-w-lg">
                        {activeTab === 'stats' 
                            ? "Ces données reflètent l'ensemble des records et sessions enregistrées sur ce profil."
                            : "Consultez l'historique complet pour identifier les plateaux de progression et les pics de forme."}
                    </p>
                </div>
            </section>

            {/* Badges Section */}
            <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal flex items-center gap-3 text-slate-900">
                        <span className="p-1.5 sm:p-2 bg-indigo-100 rounded-xl sm:rounded-2xl text-lg sm:text-xl">🎖️</span> Vitrine
                    </h2>
                </div>

                <div className="bg-gray-50 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 border border-gray-100">
                    {!user.badges || user.badges.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-[1.5rem] py-12 sm:py-16 text-center">
                            <p className="text-gray-300 font-bold uppercase text-[10px] sm:text-xs tracking-widest">Aucune médaille 🫡</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                            {user.badges.map((ownership: any) => (
                                <Link
                                    key={ownership.id}
                                    href={`/faq?tab=catalogue#item-${ownership.badgeKey}`}
                                    className={`group border rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-6 text-center transition-all hover:-translate-y-1 cursor-pointer active:scale-95 bg-white ${rarityStyles[ownership.badge.rarity]}`}
                                >
                                    <div className="text-3xl sm:text-5xl mb-2 sm:mb-4 filter drop-shadow-md group-hover:scale-110 transition-transform">
                                        {ownership.badge.emoji}
                                    </div>
                                    <h3 className="text-[9px] sm:text-xs font-black text-gray-900 uppercase tracking-tight line-clamp-1">
                                        {ownership.badge.name}
                                    </h3>
                                    <div className="mt-2 flex items-center justify-center gap-2">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleLikeBadge(ownership.badgeKey);
                                            }}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors"
                                        >
                                            <span className={`${(ownership.likes || []).some((l: any) => l.userId === (session?.user as any).id) ? 'text-rose-500' : 'text-slate-400'}`}>❤️</span>
                                            <span className="text-[8px] font-black text-slate-900">{(ownership.likes || []).length}</span>
                                        </button>
                                    </div>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1 italic">
                                        {new Date(ownership.achievedAt).toLocaleDateString("fr-FR", { month: 'short', year: 'numeric' })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>


            {/* Fines & Certificates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
                <section className="space-y-4">
                    <h2 className="text-xl font-black uppercase tracking-normal px-2 text-slate-900">💸 Dernières Prunes</h2>
                    <div className="bg-gray-50 rounded-[2.5rem] p-4 space-y-3 border border-gray-100">
                        {user.fines?.map((fine: any) => (
                            <div key={fine.id} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 font-black tracking-tighter">
                                        {fine.amountEur}€
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{fine.date}</p>
                                        <p className="text-xs font-black text-gray-900">Amende de retard</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${fine.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-500 text-white shadow-lg shadow-rose-200'}`}>
                                    {fine.status === 'paid' ? 'Réglée' : 'À RÉGLER'}
                                </span>
                            </div>
                        ))}
                        {(!user.fines || user.fines.length === 0) && <p className="text-center py-12 text-gray-300 font-bold uppercase text-[10px]">Soldat exemplaire 🫡</p>}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-black uppercase tracking-normal px-2 text-slate-900">🏥 Infirmerie</h2>
                    <div className="bg-gray-50 rounded-[2.5rem] p-4 space-y-3 border border-gray-100">
                        {user.medicalCertificates?.map((cert: any) => (
                            <div key={cert.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl shadow-inner">🩹</div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tight">{cert.note || "Arrêt Sportif"}</p>
                                        <p className="text-[10px] font-black text-blue-600 uppercase mt-1">
                                            Jusqu'au {new Date(cert.endDateISO).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!user.medicalCertificates || user.medicalCertificates.length === 0) && <p className="text-center py-12 text-gray-300 font-bold uppercase text-[10px]">Apte au service 💪</p>}
                    </div>
                </section>
            </div>

            <RewardDetailSheet detail={rewardDetail} onClose={() => setRewardDetail(null)} />
        </div>
    )
}
