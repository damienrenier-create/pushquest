"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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

    useEffect(() => {
        if (session === null) {
            router.push("/login")
        } else {
            fetchUserData()
        }
    }, [session, nickname])

    const fetchUserData = async () => {
        try {
            const res = await fetch(`/api/user/profile/${nickname}`)
            if (res.ok) {
                const data = await res.json()
                setUser(data)
            } else {
                console.error("User not found")
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
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

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 pb-24 lg:pt-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-50" />

                <div className="relative flex flex-col sm:flex-row items-center gap-8">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl shadow-2xl border border-slate-700/50 font-black text-white shrink-0">
                        {user.nickname.charAt(0).toUpperCase()}
                    </div>

                    <div className="text-center sm:text-left space-y-3">
                        <div className="inline-block bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">PROFIL SOLDAT</div>
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3">
                            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter italic uppercase leading-none">
                                {user.nickname}
                            </h1>
                            <div className="flex gap-2">
                                {isInjured && <span className="text-2xl animate-pulse cursor-help" title="Blessé / Mise à pied">🚑</span>}
                                {isVeteran && <span className="text-2xl cursor-help" title="Vétéran / Libéré du service">🕊️</span>}
                                {!isInjured && !isVeteran && <span className="text-2xl opacity-30 grayscale" title="Apte au service">✅</span>}
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">
                            Membre depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                    </div>
                </div>

                <div className="relative mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Reps</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-4xl font-black text-white tracking-tighter italic">{totalReps.toLocaleString()}</span>
                            <span className="text-slate-600 font-bold text-xs uppercase">Reps</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Distinctions</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-4xl font-black text-indigo-400 tracking-tighter italic">{user.badges?.length || 0}</span>
                            <span className="text-slate-600 font-bold text-xs uppercase">Badges</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 group hover:bg-slate-800/60 transition-colors">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Amendes Dues</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-4xl font-black text-rose-500 tracking-tighter italic">{unpaidFinesPot}€</span>
                            <span className="text-slate-600 font-bold text-xs uppercase">💸</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* distribution Chart */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <span className="text-blue-600">📊</span> Répartition des efforts
                    </h2>
                </div>

                <div className="space-y-6">
                    <div className="flex w-full h-10 rounded-2xl overflow-hidden bg-gray-50 shadow-inner border border-gray-100 p-1">
                        <div style={{ width: `${pushupPct}%` }} className="bg-blue-500 rounded-xl h-full transition-all flex items-center justify-center text-[10px] font-black text-white shadow-lg overflow-hidden whitespace-nowrap" title={`Pompes: ${pushups}`}>
                            {pushupPct > 10 && `${Math.round(pushupPct)}%`}
                        </div>
                        <div style={{ width: `${pullupPct}%` }} className="bg-indigo-500 rounded-xl h-full transition-all flex items-center justify-center text-[10px] font-black text-white shadow-lg mx-0.5 overflow-hidden whitespace-nowrap" title={`Tractions: ${pullups}`}>
                            {pullupPct > 10 && `${Math.round(pullupPct)}%`}
                        </div>
                        <div style={{ width: `${squatPct}%` }} className="bg-purple-500 rounded-xl h-full transition-all flex items-center justify-center text-[10px] font-black text-white shadow-lg overflow-hidden whitespace-nowrap" title={`Squats: ${squats}`}>
                            {squatPct > 10 && `${Math.round(squatPct)}%`}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">💪 Pompes</p>
                            <p className="text-2xl font-black text-blue-600 tracking-tighter">{pushups.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🦍 Tractions</p>
                            <p className="text-2xl font-black text-indigo-600 tracking-tighter">{pullups.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🦵 Squats</p>
                            <p className="text-2xl font-black text-purple-600 tracking-tighter">{squats.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Badges Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <span className="p-2 bg-indigo-100 rounded-2xl text-xl">🎖️</span> Vitrine des Trophées
                    </h2>
                </div>

                {!user.badges || user.badges.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] py-16 text-center">
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Aucune médaille au compteur 🫡</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {user.badges.map((ownership: any) => (
                            <div
                                key={ownership.id}
                                onClick={() => setRewardDetail({
                                    ...ownership.badge,
                                    holder: user.nickname,
                                    achievedAt: ownership.achievedAt,
                                    currentValue: ownership.currentValue,
                                    type: ownership.badge.metricType === 'TOTAL_REPS' ? 'PALIER' : 'COMPÉTITION'
                                })}
                                className="group bg-white border border-gray-100 rounded-[2rem] p-6 text-center hover:border-indigo-400 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-95 shadow-sm"
                            >
                                <div className="text-5xl mb-4 filter drop-shadow-md group-hover:scale-110 transition-transform">
                                    {ownership.badge.emoji}
                                </div>
                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-tight line-clamp-1">
                                    {ownership.badge.name}
                                </h3>
                                <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                                    {new Date(ownership.achievedAt).toLocaleDateString("fr-FR", { month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Fines & Certificates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
                <section className="space-y-4">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter px-2">💸 Dernières Prunes</h2>
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
                    <h2 className="text-xl font-black uppercase italic tracking-tighter px-2">🏥 Infirmerie</h2>
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
