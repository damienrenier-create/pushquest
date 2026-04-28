"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Trophy, Zap, Activity, PieChart, BarChart3, TrendingUp, History, Info } from "lucide-react"
import RewardDetailSheet from "@/components/RewardDetailSheet"
import GraphsSection from "@/components/dashboard/GraphsSection"
import YesterdayXpRecap from "@/components/profile/YesterdayXpRecap"
import BadgeContainer from "@/components/profile/badges/BadgeContainer"

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
    const [allUsers, setAllUsers] = useState<any[]>([])

    useEffect(() => {
        fetch("/api/users/list").then(res => res.json()).then(setAllUsers).catch(console.error)
    }, [])

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

    const stats = user.stats || { pushups: 0, pullups: 0, squats: 0, planks: 0, total: 0 }
    const { pushups, pullups, squats, planks = 0, total: totalReps } = stats

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
                    <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-3xl sm:text-5xl shadow-2xl border border-slate-700/50 font-black text-white shrink-0 overflow-hidden">
                        {user.image ? (
                            <img src={user.image} alt={user.nickname} className="w-full h-full object-cover" />
                        ) : (
                            user.nickname.charAt(0).toUpperCase()
                        )}
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
                                <div className="group relative mt-4">
                                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative">
                                        {/* Decorative Quote Mark */}
                                        <div className="absolute -top-3 -left-2 text-4xl text-indigo-500/30 font-serif leading-none">“</div>

                                        <div className="flex items-start gap-4">
                                            <p className="text-slate-100 text-sm sm:text-base font-bold italic leading-relaxed flex-1">
                                                {user.status?.content ? user.status.content : (session?.user?.email === user.email ? "Aucun statut. Édicte tes ordres." : "Ce soldat est silencieux...")}
                                            </p>

                                            <div className="flex flex-col gap-2 shrink-0">
                                                {user.status && (
                                                    <button
                                                        onClick={handleLikeStatus}
                                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-full border border-slate-600 transition-all active:scale-95"
                                                    >
                                                        <span className={`${(user.status.likes || []).some((l: any) => l.userId === (session?.user as any).id) ? 'text-rose-500' : 'text-slate-400'}`}>❤️</span>
                                                        <span className="text-[10px] font-black text-slate-100">{(user.status.likes || []).length}</span>
                                                    </button>
                                                )}
                                                {session?.user?.email === user.email && (
                                                    <button
                                                        onClick={() => setIsEditingStatus(true)}
                                                        className="p-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 rounded-full border border-indigo-500/30 transition-all active:scale-95"
                                                        title="Éditer mon petit mot"
                                                    >
                                                        <Activity size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-tight mt-4">
                            Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                    </div>
                </div>

                <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                    <div className="bg-slate-800/40 backdrop-blur-md p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Total Éq. Reps</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg sm:text-2xl font-black text-white tracking-normal">{totalReps.toLocaleString()}</span>
                            <span className="text-slate-600 font-bold text-[8px] sm:text-[9px] uppercase">Reps</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Gainage Total</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg sm:text-2xl font-black text-white tracking-normal">{planks.toLocaleString()}</span>
                            <span className="text-slate-600 font-bold text-[8px] sm:text-[9px] uppercase">Secs</span>
                        </div>
                    </div>
                    <div className="bg-indigo-500/10 backdrop-blur-md p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-indigo-500/20 group hover:bg-indigo-500/20 transition-colors">
                        <span className="text-indigo-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={10} /> SÉRIE PARFAITE
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg sm:text-2xl font-black text-white tracking-normal">{user.currentPerfectStreak || 0}</span>
                            <span className="text-indigo-400 font-bold text-[8px] sm:text-[9px] uppercase">JOURS</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Distinctions</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg sm:text-2xl font-black text-indigo-400 tracking-normal">{user.badges?.length || 0}</span>
                            <span className="text-slate-600 font-bold text-[8px] sm:text-[9px] uppercase">Badges</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Amendes Dues</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg sm:text-2xl font-black text-rose-500 tracking-normal">{unpaidFinesPot}€</span>
                            <span className="text-slate-600 font-bold text-[8px] sm:text-[9px] uppercase">💸</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hall of Fame */}
            {hallOfFame.length > 0 && (
                <section className="space-y-3 sm:space-y-4">
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-normal flex items-center gap-3 px-2 text-slate-900">
                        <span className="text-yellow-500">✨</span> Hall of Fame
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                        {hallOfFame.map((ownership: any) => (
                            <Link
                                key={ownership.id}
                                href={`/faq?tab=catalogue#item-${ownership.badgeKey}`}
                                className={`relative group overflow-hidden border rounded-[1.2rem] sm:rounded-[1.5rem] p-3 sm:p-4 transition-all hover:scale-[1.02] cursor-pointer bg-white ${rarityStyles[ownership.badge.rarity]}`}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
                                    <Sparkles size={24} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl sm:text-3xl filter drop-shadow-lg shrink-0">{ownership.badge.emoji}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest opacity-60 leading-none">{ownership.badge.rarity}</span>
                                        </div>
                                        <h3 className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-normal leading-tight mt-0.5 truncate">{ownership.badge.name}</h3>
                                        <p className="text-[8px] font-bold text-gray-500 mt-0.5 line-clamp-1 italic">"{ownership.badge.description}"</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Yesterday Recap Section */}
            <YesterdayXpRecap
                recap={analyticsData?.yesterdayRecap}
                weeklyRecaps={analyticsData?.weeklyRecaps}
                topRecaps={analyticsData?.topRecaps}
            />

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
                        {/* Skills Radar Chart (Balanced View) */}
                        <div className="flex flex-col items-center space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">Équilibre des Forces</h3>
                            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-2xl">
                                    {/* Base Grids */}
                                    {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
                                        const r = 42 * scale;
                                        const p1 = { x: 50, y: 50 - r };
                                        const p2 = { x: 50 + r * 0.866, y: 50 + r * 0.5 };
                                        const p3 = { x: 50 - r * 0.866, y: 50 + r * 0.5 };
                                        return (
                                            <polygon
                                                key={scale}
                                                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                                                fill="none"
                                                stroke="#f1f5f9"
                                                strokeWidth="1"
                                                className="transition-all duration-1000"
                                            />
                                        );
                                    })}
                                    {/* Labels & Axis */}
                                    <line x1="50" y1="50" x2="50" y2="8" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                                    <line x1="50" y1="50" x2={50 + 42 * 0.866} y2={50 + 21} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                                    <line x1="50" y1="50" x2={50 - 42 * 0.866} y2={50 + 21} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />

                                    {(() => {
                                        const max = Math.max(pushups, pullups, squats, 1);
                                        const pScale = pushups / max;
                                        const tScale = pullups / max;
                                        const sScale = squats / max;
                                        const r = 42;
                                        const p1 = { x: 50, y: 50 - r * pScale };
                                        const p2 = { x: 50 + (r * tScale) * 0.866, y: 50 + (r * tScale) * 0.5 };
                                        const p3 = { x: 50 - (r * sScale) * 0.866, y: 50 + (r * sScale) * 0.5 };
                                        return (
                                            <g>
                                                <polygon
                                                    points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                                                    fill="rgba(99, 102, 241, 0.25)"
                                                    stroke="#4f46e5"
                                                    strokeWidth="2.5"
                                                    strokeLinejoin="round"
                                                    className="transition-all duration-1000"
                                                />
                                                <circle cx={p1.x} cy={p1.y} r="3" fill="#3b82f6" className="transition-all duration-1000" />
                                                <circle cx={p2.x} cy={p2.y} r="3" fill="#f97316" className="transition-all duration-1000" />
                                                <circle cx={p3.x} cy={p3.y} r="3" fill="#10b981" className="transition-all duration-1000" />
                                            </g>
                                        );
                                    })()}

                                    <text x="50" y="-8" textAnchor="middle" className="text-[5.5px] font-black fill-blue-600 uppercase tracking-widest leading-none">Force (Pompes)</text>
                                    <text x="96" y="65" textAnchor="middle" className="text-[5.5px] font-black fill-orange-500 uppercase tracking-widest">Tirage (Tractions)</text>
                                    <text x="4" y="65" textAnchor="middle" className="text-[5.5px] font-black fill-emerald-600 uppercase tracking-widest">Base (Squats)</text>
                                </svg>
                            </div>
                            <div className="text-center group pt-4">
                                <span className="text-4xl font-black text-slate-900 tracking-tighter block leading-none">{totalReps.toLocaleString()}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 block">Volume Cumulative</span>
                            </div>
                        </div>

                        {/* XP Pie Chart (Full Camembert) */}
                        <div className="flex flex-col items-center space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Origine du Prestige (XP)</h3>
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-xl overflow-visible">
                                    {(() => {
                                        if (!analyticsData?.xpBreakdown) return <circle cx="50" cy="50" r="40" fill="#f1f5f9" />;

                                        const breakdown = analyticsData.xpBreakdown;
                                        const total = analyticsData.totalXP || 1;
                                        const labels: any = {
                                            repsXP: "#6366f1", // Indigo
                                            regularityXP: "#10b981", // Emerald
                                            badgesXP: "#f59e0b", // Amber
                                            recordsXP: "#f43f5e", // Rose (Matches legend)
                                            manualXP: "#94a3b8"  // Slate
                                        };

                                        let cumulativePercent = 0;
                                        return (
                                            <>
                                                {/* Background base */}
                                                <circle cx="50" cy="50" r="44" fill="#f8fafc" />

                                                {Object.entries(breakdown).map(([key, val]: [string, any]) => {
                                                    if (val <= 0 || !labels[key]) return null;
                                                    const p = (val / total) * 100;
                                                    // Using large strokeWidth for "Pie" effect (filled donut)
                                                    const strokeWidth = 44;
                                                    const radius = 22;
                                                    const dashArray = `${p} ${100 - p}`;
                                                    const dashOffset = -cumulativePercent;
                                                    cumulativePercent += p;
                                                    return (
                                                        <circle
                                                            key={key}
                                                            cx="50" cy="50" r={radius}
                                                            fill="transparent"
                                                            stroke={labels[key]}
                                                            strokeWidth={strokeWidth}
                                                            strokeDasharray={dashArray}
                                                            strokeDashoffset={dashOffset}
                                                            className="transition-all duration-1000"
                                                        />
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                    <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-2xl shadow-sm border border-white/50">
                                        <span className="text-xl sm:text-2xl font-black text-indigo-900 leading-none">{(analyticsData?.totalXP || 0).toLocaleString()}</span>
                                        <span className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-0.5 block">TOTAL XP</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[8px] font-black uppercase tracking-wider max-w-sm px-4">
                                <div className="flex items-center gap-2 text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> {Math.round(analyticsData.xpBreakdown?.repsXP || 0).toLocaleString()} Entraînement</div>
                                <div className="flex items-center gap-2 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {Math.round(analyticsData.xpBreakdown?.regularityXP || 0).toLocaleString()} Régularité</div>
                                <div className="flex items-center gap-2 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500"></span> {Math.round(analyticsData.xpBreakdown?.badgesXP || 0).toLocaleString()} Trophées</div>
                                <div className="flex items-center gap-2 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500"></span> {Math.round(analyticsData.xpBreakdown?.recordsXP || 0).toLocaleString()} Records</div>
                                <div className="flex items-center gap-x-2 text-slate-500 col-span-2 justify-center mt-1 border-t border-slate-100 pt-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Bonus de Prestige : {Math.round((analyticsData.xpBreakdown?.finesXP || 0) + (analyticsData.xpBreakdown?.manualXP || 0)).toLocaleString()} XP
                                </div>
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
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal flex items-center gap-3 text-white">
                        <span className="p-1.5 sm:p-2 bg-indigo-100/10 rounded-xl sm:rounded-2xl text-lg sm:text-xl">🎖️</span> Distinction & Challenges
                    </h2>
                </div>

                <BadgeContainer nickname={decodedNickname} />
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

            {/* Quick Teammates Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in slide-in-from-bottom-10 duration-700">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar">
                    <div className="px-3 py-1 border-r border-white/10 shrink-0">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Camarades</span>
                    </div>
                    {allUsers.filter(u => u.nickname !== decodedNickname).map((u) => (
                        <Link
                            key={u.nickname}
                            href={`/u/${encodeURIComponent(u.nickname)}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group shrink-0"
                        >
                            {u.image ? (
                                <img src={u.image} alt={u.nickname} className="w-6 h-6 rounded-lg object-cover group-hover:scale-110 transition-transform" />
                            ) : (
                                <span className="text-lg group-hover:scale-125 transition-transform">{u.emoji}</span>
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white leading-none">{u.nickname}</span>
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{u.animal}</span>
                            </div>
                        </Link>
                    ))}
                    {allUsers.length <= 1 && (
                        <span className="text-[8px] font-bold text-slate-600 uppercase px-4 italic">Seul au front...</span>
                    )}
                </div>
            </div>
        </div>
    )
}
