"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Trophy, Zap, Activity, PieChart, BarChart3, TrendingUp } from "lucide-react"
import RewardDetailSheet from "@/components/RewardDetailSheet"

export default function UserProfilePage() {
    const { data: session } = useSession()
    const params = useParams()
    const router = useRouter()
    const nickname = params.nickname as string
    const decodedNickname = decodeURIComponent(nickname)

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)
    const [analyticsData, setAnalyticsData] = useState<any>(null)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const [resUser, resAnalytics] = await Promise.all([
                    fetch(`/api/user/profile/${nickname}`),
                    fetch(`/api/user/analytics/${nickname}`)
                ])
                if (resUser.ok) {
                    const data = await resUser.json()
                    setUser(data)
                }
                if (resAnalytics.ok) {
                    const data = await resAnalytics.json()
                    setAnalyticsData(data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        if (session === null) {
            router.push("/login")
        } else {
            fetchUserData()
        }
    }, [session, nickname, router])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    )

    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <h1 className="text-4xl font-black text-gray-900 mb-4">MEC INTROUVABLE 🕵️‍♂️</h1>
            <p className="text-gray-500 font-bold mb-8 uppercase text-xs">Ce soldat n'est pas dans nos registres.</p>
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

                    <div className="text-center sm:text-left space-y-2 sm:space-y-3">
                        <div className="inline-block bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">PROFIL SOLDAT</div>
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-3">
                            <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tighter italic uppercase leading-none">
                                {user.nickname}
                            </h1>
                            <div className="flex gap-2">
                                {isInjured && <span className="text-xl sm:text-2xl animate-pulse cursor-help" title="Blessé / Mise à pied">🚑</span>}
                                {isVeteran && <span className="text-xl sm:text-2xl cursor-help" title="Vétéran / Libéré du service">🕊️</span>}
                                {!isInjured && !isVeteran && <span className="text-xl sm:text-2xl opacity-30 grayscale" title="Apte au service">✅</span>}
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-tight">
                            Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                    </div>
                </div>

                <div className="relative mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Total Reps</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-white tracking-tighter italic">{totalReps.toLocaleString()}</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">Reps</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Distinctions</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-indigo-400 tracking-tighter italic">{user.badges?.length || 0}</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">Badges</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Amendes Dues</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-4xl font-black text-rose-500 tracking-tighter italic">{unpaidFinesPot}€</span>
                            <span className="text-slate-600 font-bold text-[10px] sm:text-xs uppercase">💸</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hall of Fame */}
            {hallOfFame.length > 0 && (
                <section className="space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 px-2 text-slate-900">
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
                                    <div className="min-w-0">
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">{ownership.badge.rarity}</span>
                                        <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tighter leading-tight mt-0.5 truncate">{ownership.badge.name}</h3>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 mt-1 line-clamp-1 italic">"{ownership.badge.description}"</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Analytics Section */}
            <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-slate-900">
                        <span className="p-2 bg-blue-100/50 rounded-2xl text-xl">📊</span> Statistiques & Analytics
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                    {/* XP Breakdown Chart */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                           <PieChart size={16} className="text-gray-400" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Répartition des XP</h3>
                        </div>
                        {analyticsData?.xpBreakdown && (
                            <div className="space-y-4">
                                {Object.entries(analyticsData.xpBreakdown).map(([label, value]: [string, any]) => {
                                    if (value === 0 || label === "id") return null;
                                    const percentage = (value / analyticsData.totalXP) * 100;
                                    const labelMap: Record<string, { name: string, color: string }> = {
                                        repsXP: { name: "Répétitions", color: "bg-blue-500" },
                                        badgesXP: { name: "Badges & Trophées", color: "bg-amber-500" },
                                        finesXP: { name: "Assiduité (Bonus)", color: "bg-emerald-500" },
                                        recordsXP: { name: "Records", color: "bg-purple-500" },
                                        manualXP: { name: "Ajustements", color: "bg-slate-400" }
                                    };
                                    const info = labelMap[label] || { name: label, color: "bg-gray-400" };
                                    return (
                                        <div key={label} className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                                <span className="text-gray-500">{info.name}</span>
                                                <span className="text-gray-900 font-bold">{value.toLocaleString()} XP</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                <div className={`h-full ${info.color} rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.05)]`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Max Series Evolution */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                           <TrendingUp size={16} className="text-gray-400" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Max Séries (30j)</h3>
                        </div>
                        <div className="h-44 w-full bg-gray-50 rounded-[2rem] border border-gray-100 p-5 relative flex items-end gap-1.5">
                            {analyticsData?.maxSeriesData?.length > 0 ? (
                                analyticsData.maxSeriesData.map((d: any, idx: number) => {
                                    const maxVal = Math.max(...analyticsData.maxSeriesData.map((x: any) => Math.max(x.PUSHUP, x.PULLUP, x.SQUAT))) || 1;
                                    const hP = (d.PUSHUP / maxVal) * 100;
                                    const hT = (d.PULLUP / maxVal) * 100;
                                    const hS = (d.SQUAT / maxVal) * 100;
                                    
                                    return (
                                        <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-0.5 group relative">
                                            <div className="w-full bg-blue-500/80 rounded-t-sm transition-all group-hover:bg-blue-600" style={{ height: `${hP}%` }}></div>
                                            <div className="w-full bg-rose-500/80 rounded-t-sm transition-all group-hover:bg-rose-600" style={{ height: `${hT}%` }}></div>
                                            <div className="w-full bg-purple-500/80 rounded-t-sm transition-all group-hover:bg-purple-600" style={{ height: `${hS}%` }}></div>
                                            
                                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[7px] p-2 rounded-lg z-20 whitespace-nowrap font-bold shadow-xl">
                                                {new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}<br/>
                                                P:{d.PUSHUP} | T:{d.PULLUP} | S:{d.SQUAT}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
                                    <BarChart3 size={24} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">En attente de données</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Pompes</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Tractions</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Squats</span>
                        </div>
                    </div>

                    {/* XP Progression Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                           <Activity size={16} className="text-gray-400" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Activité & Progression</h3>
                        </div>
                        <div className="h-48 sm:h-64 w-full bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden group border border-slate-800">
                           <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                           
                            {analyticsData?.progressionData?.length > 1 ? (
                                <svg className="w-full h-full relative z-10 overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path 
                                        d={`M 0 300 ${analyticsData.progressionData.map((d: any, i: number) => {
                                            const x = (i / (analyticsData.progressionData.length - 1)) * 1000;
                                            const y = 300 - ((d.reps + d.badges * 50) / Math.max(...analyticsData.progressionData.map((p:any) => Math.max(1, p.reps + p.badges * 50)))) * 240;
                                            return `L ${x} ${y}`;
                                        }).join(' ')} L 1000 300 Z`}
                                        fill="url(#areaGrad)"
                                    />
                                    <path 
                                        d={analyticsData.progressionData.map((d: any, i: number) => {
                                            const x = (i / (analyticsData.progressionData.length - 1)) * 1000;
                                            const y = 300 - ((d.reps + d.badges * 50) / Math.max(...analyticsData.progressionData.map((p:any) => Math.max(1, p.reps + p.badges * 50)))) * 240;
                                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                    />
                                </svg>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-20">
                                    <Activity size={32} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Initialisation du flux...</span>
                                </div>
                            )}
                            
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center text-[7px] font-black text-blue-400/30 uppercase tracking-[0.5em]">
                                VOLUME CUMULÉ (30 DERNIERS JOURS)
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Badges Section */}
            <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-slate-900">
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
                    <h2 className="text-xl font-black uppercase italic tracking-tighter px-2 text-slate-900">💸 Dernières Prunes</h2>
                    <div className="bg-gray-50 rounded-[2.5rem] p-4 space-y-3 border border-gray-100">
                        {user.fines?.map((fine: any) => (
                            <div key={fine.id} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 font-black tracking-tighter">
                                        {fine.amountEur}€
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{fine.date}</p>
                                        <p className="text-xs font-bold text-gray-600">Amende de retard</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${fine.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {fine.status === 'paid' ? 'Réglée' : 'Impayée'}
                                </span>
                            </div>
                        ))}
                        {(!user.fines || user.fines.length === 0) && <p className="text-center py-12 text-gray-300 font-bold uppercase text-[10px]">Soldat exemplaire 🫡</p>}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter px-2 text-slate-900">🏥 Infirmerie</h2>
                    <div className="bg-gray-50 rounded-[2.5rem] p-4 space-y-3 border border-gray-100">
                        {user.medicalCertificates?.map((cert: any) => (
                            <div key={cert.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🩹</div>
                                    <div>
                                        <p className="text-xs font-black text-gray-800 leading-tight uppercase tracking-tight">{cert.note || "Arrêt Sportif"}</p>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">
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
