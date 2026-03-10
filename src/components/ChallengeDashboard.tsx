"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { HelpCircle } from "lucide-react"
import RewardDetailSheet from "./RewardDetailSheet"

interface DashboardData {
    todayISO: string
    selectedDateISO: string
    requiredReps: { selected: number; today: number }
    setsSelected: { pushups: number[]; pullups: number[]; squats: number[]; planks: number[] }
    totalsSelected: { pushups: number; pullups: number; squats: number; planks: number; total: number }
    leaderboard: Array<{
        id: string
        nickname: string
        completionRate: number
        streakCurrent: number
        totalRepsAllTime: number
        totalPushupsAllTime: number
        totalPullupsAllTime: number
        totalSquatsAllTime: number
        repsToday: number
        finesDueEur: number
        isInjured?: boolean
        isVeteran?: boolean
        currentMedicalNote?: string | null
    }>
    records: Record<string, {
        badge: string
        pushups: { winner: string; maxReps: number; top3Sets?: any[]; top3Volume?: any[] }
        pullups: { winner: string; maxReps: number; top3Sets?: any[]; top3Volume?: any[] }
        squats: { winner: string; maxReps: number; top3Sets?: any[]; top3Volume?: any[] }
    }>
    badges: {
        earned: {
            trophies: Array<{ id: string; label: string; emoji: string; winners: string[] }>
            specialDays: Array<{ date: string; label: string; emoji: string; winners: string[] }>
        }
        available: {
            trophies: Array<{ id: string; label: string; emoji: string }>
            specialDays: Array<{ date: string; label: string; emoji: string }>
        }
        competitive: {
            ownerships: any[]
            events: any[]
            danger: any[]
        }
    }
    cagnotte: {
        enabled: boolean
        potEur: number
        currentReward: { label: string; min: number }
        nextReward?: { label: string; min: number }
        finesList: Array<{ nickname: string; amount: number }>
    }
    sallyUp: {
        enabledForSelectedDate: boolean
        selectedDateReps: number
        monthPodium: Array<{ nickname: string; reps: number; totalPushupsAllTime: number }>
    }
    graphs: {
        myDaily: Array<{ date: string; pushups: number; pullups: number; squats: number; total: number }>
        myDaily365?: Array<{ date: string; pushups: number; pullups: number; squats: number; total: number }>
    }
    xp?: {
        leaderboard: Array<{
            id: string; totalXP: number; level: number; animal: string; emoji: string; belt: string; xpCurrentLvl: number; xpNextLvl: number; progress: number;
        }>
        currentUser?: {
            id: string; totalXP: number; level: number; animal: string; emoji: string; belt: string; xpCurrentLvl: number; xpNextLvl: number; progress: number;
        }
    }
}

function getLocalISO(d: Date = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_DASHBOARD_DATA: DashboardData = {
    todayISO: getLocalISO(),
    selectedDateISO: getLocalISO(),
    requiredReps: { selected: 10, today: 10 },
    setsSelected: { pushups: [], pullups: [], squats: [], planks: [] },
    totalsSelected: { pushups: 0, pullups: 0, squats: 0, planks: 0, total: 0 },
    leaderboard: [],
    records: {},
    badges: {
        earned: { trophies: [], specialDays: [] },
        available: { trophies: [], specialDays: [] },
        competitive: { ownerships: [], events: [], danger: [] }
    },
    cagnotte: {
        enabled: false,
        potEur: 0,
        currentReward: { label: "Encore un effort 😄", min: 0 },
        finesList: []
    },
    sallyUp: { enabledForSelectedDate: false, selectedDateReps: 0, monthPodium: [] },
    graphs: { myDaily: [] }
}

export default function ChallengeDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData>(DEFAULT_DASHBOARD_DATA)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'saisie' | 'graphs' | 'cagnotte' | 'trophees'>('saisie')
    const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DASHBOARD_DATA.selectedDateISO)
    const lastFetchTime = useRef<number>(Date.now())
    const [localSets, setLocalSets] = useState<{ pushups: (number | "")[]; pullups: (number | "")[]; squats: (number | "")[]; planks: (number | "")[] }>({
        pushups: [""],
        pullups: [""],
        squats: [""],
        planks: [""],
    })
    const [sallyReps, setSallyReps] = useState<number>(0)
    const [showHonorPopup, setShowHonorPopup] = useState<{ badge: any; type: string } | null>(null)
    const [honorChecked, setHonorChecked] = useState(false)
    const [graphPeriod, setGraphPeriod] = useState<'30' | '365'>('30')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [mood, setMood] = useState("")
    const [statuses, setStatuses] = useState<any[]>([])
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)

    const lastInputRef = useRef<HTMLInputElement | null>(null)

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchData = async (dateISO?: string) => {
        try {
            const url = dateISO ? `/api/dashboard?date=${dateISO}` : "/api/dashboard"
            const res = await fetch(url)
            if (res.ok) {
                const d: DashboardData = await res.json()

                // --- Stolen Badge Toast Detection ---
                if (d.badges?.competitive?.events?.length > 0) {
                    const latestSteal = d.badges.competitive.events.find((ev: any) =>
                        ev.eventType === 'STEAL' &&
                        ev.fromUserId === (session?.user as any)?.id &&
                        new Date(ev.createdAt).getTime() > lastFetchTime.current
                    )
                    if (latestSteal) {
                        // Increased display time for the "Devil" message (A11)
                        setToast({ message: `On t'a volé [${latestSteal.badge?.name}] 😈`, type: 'error' })
                        setTimeout(() => setToast(null), 8000)
                    }
                }
                lastFetchTime.current = Date.now()

                setData(d)
                setSelectedDate(d.selectedDateISO || getTodayISO())
                setSallyReps(d.sallyUp?.selectedDateReps || 0)

                setLocalSets({
                    pushups: d.setsSelected?.pushups?.length > 0 ? d.setsSelected.pushups : [""],
                    pullups: d.setsSelected?.pullups?.length > 0 ? d.setsSelected.pullups : [""],
                    squats: d.setsSelected?.squats?.length > 0 ? d.setsSelected.squats : [""],
                    planks: d.setsSelected?.planks?.length > 0 ? d.setsSelected.planks : [""],
                })
            }
        } catch (err) {
            showToast("Erreur de chargement", "error")
        } finally {
            setLoading(false)
            fetchStatuses()
        }
    }

    const handleSwitchEgo = async () => {
        const currentLeague = (session?.user as any)?.league || "POMPES";
        const targetVerse = currentLeague === "GAINAGE" ? "Pompes" : "Gainage";

        if (!confirm(`Basculer vers le verse ${targetVerse} ?`)) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/switch-ego", { method: "POST" });
            if (res.ok) {
                // Perform a re-login with the SAME identity to refresh the JWT with the new league
                await signIn("credentials", {
                    identifier: (session?.user as any)?.name || (session?.user as any)?.email,
                    code: "switched",
                    redirect: true,
                    callbackUrl: window.location.pathname + window.location.search
                });
            } else {
                const d = await res.json();
                showToast(d.message || "Erreur de bascule", "error");
            }
        } catch (err) {
            showToast("Erreur réseau", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchStatuses = async () => {
        try {
            const res = await fetch("/api/status")
            if (res.ok) {
                const s = await res.json()
                setStatuses(s)
                // If current user has a status, pre-fill the mood input
                const myStatus = s.find((x: any) => x.userId === (session?.user as any)?.id)
                if (myStatus) setMood(myStatus.content)
            }
        } catch (err) {
            console.error("Fetch Statuses Error:", err)
        }
    }

    const saveMood = async () => {
        if (!mood.trim()) return
        try {
            const res = await fetch("/api/status", {
                method: "POST",
                body: JSON.stringify({ content: mood }),
                headers: { "Content-Type": "application/json" }
            })
            if (res.ok) {
                showToast("Mood partagé ! ✨", "success")
                fetchStatuses()
            }
        } catch (err) {
            showToast("Erreur lors du partage du mood", "error")
        }
    }

    const toggleStatusLike = async (statusId: string) => {
        try {
            const res = await fetch(`/api/status/${statusId}/like`, { method: "POST" })
            if (res.ok) {
                fetchStatuses()
            }
        } catch (err) {
            console.error("Like Error:", err)
        }
    }

    const getTodayISO = () => getLocalISO()

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['saisie', 'graphs', 'cagnotte', 'trophees'].includes(tab)) {
            setActiveTab(tab as any)
        }
    }, [searchParams]) // React on search params change

    useEffect(() => {
        fetchData()
    }, [])

    const handleDateChange = (date: string) => {
        setLoading(true)
        setSelectedDate(date) // Crucial: update local state immediately
        fetchData(date)
    }

    const addSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks') => {
        const current = localSets[type] || []
        // Copie la valeur précédente si elle existe
        const prevValue = current.length > 0 ? current[current.length - 1] : ""
        setLocalSets({ ...localSets, [type]: [...current, prevValue] })
        setTimeout(() => lastInputRef.current?.focus(), 10)
    }

    const removeSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number) => {
        setLocalSets({ ...localSets, [type]: (localSets[type] || []).filter((_, i) => i !== index) })
    }

    const handleSetChange = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number, val: string) => {
        const newSets = [...(localSets[type] || [])]
        if (val === "") {
            newSets[index] = ""
        } else {
            newSets[index] = parseInt(val) || 0
        }
        setLocalSets({ ...localSets, [type]: newSets })
    }

    const adjustSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number, delta: number) => {
        const newSets = [...(localSets[type] || [])]
        const current = Number(newSets[index]) || 0
        newSets[index] = Math.max(0, current + delta)
        setLocalSets({ ...localSets, [type]: newSets })
    }

    const saveLogs = async (forceHonor: boolean = false) => {
        // Validation: prevent empty or <= 0 (A4)
        const allReps = [...localSets.pushups, ...localSets.pullups, ...localSets.squats, ...localSets.planks].map(r => Number(r) || 0);
        const total = allReps.reduce((a, b) => a + b, 0);

        if (total <= 0) {
            showToast("Veuillez entrer au moins une répétition", "error");
            return;
        }

        // Potential badge check (A12) - Client side preview
        const willEarnCompetitive = data.badges.competitive.ownerships.some(bo => {
            if (bo.locked) return false;
            const def = bo.badge;
            const currentTotalAll = data.leaderboard.find(u => (u as any).id === (session?.user as any)?.id)?.totalRepsAllTime || 0;
            const newTotalAll = currentTotalAll + total;

            if (def.metricType === "MAX_SET") {
                const maxInLocal = Math.max(0, ...allReps);
                return maxInLocal > bo.currentValue;
            }
            // Simple check for main competitive metrics
            return false;
        });

        const isHonorConfirmed = forceHonor === true || honorChecked;

        if (willEarnCompetitive && !isHonorConfirmed) {
            setShowHonorPopup({ badge: null, type: 'pre-save' });
            return;
        }

        // High reps confirmation (A4)
        const highRepSet = allReps.find(r => r >= 200);
        if (highRepSet && !confirm(`Vous avez saisi une série de ${highRepSet} répétitions. Confirmer ?`)) {
            return;
        }

        setSaving(true)
        try {
            const res = await fetch("/api/logs/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: selectedDate, sets: localSets }),
            })
            if (res.ok) {
                showToast("Progression sauvegardée", "success")
                setHonorChecked(false)
                setShowHonorPopup(null)
                fetchData(selectedDate)
            }
        } catch (err) {
            showToast("Erreur réseau", "error")
        } finally {
            setSaving(false)
        }
    }

    const saveSally = async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/challenge/sally", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: selectedDate, seconds: sallyReps }),
            })
            if (res.ok) {
                showToast("Sally Up sauvegardé", "success")
                fetchData(selectedDate)
            }
        } catch (err) {
            showToast("Erreur réseau", "error")
        } finally {
            setSaving(false)
        }
    }

    const toggleLike = async (eventId: string) => {
        const currentUserId = (session?.user as any)?.id;
        if (!currentUserId) {
            showToast("Connectez-vous pour réagir", "error");
            return;
        }

        setData(prev => {
            const newData = { ...prev };
            const evIndex = newData.badges.competitive.events.findIndex(e => e.id === eventId);
            if (evIndex >= 0) {
                const ev = newData.badges.competitive.events[evIndex];
                const likes = ev.likes || [];
                const hasLiked = likes.some((l: any) => l.userId === currentUserId);

                if (hasLiked) {
                    newData.badges.competitive.events[evIndex].likes = likes.filter((l: any) => l.userId !== currentUserId);
                } else {
                    newData.badges.competitive.events[evIndex].likes = [...likes, { userId: currentUserId }];
                }
            }
            return newData;
        });

        try {
            await fetch(`/api/badges/events/${eventId}/like`, { method: "POST" });
        } catch (e) {
            showToast("Erreur lors du like", "error");
        }
    }

    if (loading && !data?.todayISO) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            {/* MOOD / REWARD DETAIL OVERLAY (NEW) */}
            <RewardDetailSheet
                detail={rewardDetail}
                onClose={() => setRewardDetail(null)}
            />
        </div>
    )

    const allowedDates = []
    for (let i = 0; i < 4; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const iso = getLocalISO(d)
        allowedDates.push({ iso, label: i === 0 ? "Aujourd'hui" : i === 1 ? "Hier" : i === 2 ? "J-2" : "J-3" })
    }

    const sumSets = (sets: (number | "")[]) => sets.reduce<number>((a, b) => a + (Number(b) || 0), 0)
    const currentTotal = sumSets(localSets?.pushups || []) + sumSets(localSets?.pullups || []) + sumSets(localSets?.squats || []) + sumSets(localSets?.planks || [])
    const missing = Math.max(0, (data?.requiredReps?.selected ?? 0) - currentTotal)

    const totalSquatsAllTime = data.leaderboard.find(u => (u as any).id === (session?.user as any)?.id)?.totalSquatsAllTime || 0;
    const badgesCount = data.badges.earned.trophies.length + data.badges.earned.specialDays.length;

    const showKM = totalSquatsAllTime >= 1000;
    const showStretching = badgesCount >= 5;

    const getStreakEmoji = (rate: number, streak: number) => {
        if (rate >= 100) return { label: "Parfait", emoji: "👑" };
        if (streak >= 5) return { label: "Streak", emoji: "🔥" };
        if (rate >= 80) return { label: "Solide", emoji: "🧱" };
        return { label: "Débutant", emoji: "🌱" };
    }

    const getSetEmoji = (reps: number) => {
        if (reps >= 50) return "👑";
        if (reps >= 40) return "🚀";
        if (reps >= 30) return "🦾";
        if (reps >= 20) return "🔥";
        if (reps >= 10) return "💪";
        return "";
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-bold transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-blue-600 leading-none">POMPES APP</h1>
                        <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Version 3.1 • Clean State</p>
                    </div>
                </div>

                {/* Saint Marvin Banner - Moved to top level for visibility */}
                {data.todayISO === "2026-03-08" && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-5 shadow-xl animate-pulse border border-white/20 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <span className="text-4xl">🔥</span>
                            <div>
                                <h4 className="text-white font-black uppercase text-sm tracking-widest">Événement : Saint Marvin</h4>
                                <p className="text-orange-50 text-[11px] font-bold leading-tight mt-1 uppercase">
                                    Double XP sur toutes vos séries aujourd'hui + 500 XP bonus en validant votre cible !
                                </p>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    </div>
                )}

                {data?.xp && data?.xp.currentUser && (
                    <div className="bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col gap-3">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-inner border border-white/10 shrink-0">
                                    {data.xp.currentUser.emoji}
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-lg uppercase tracking-tight leading-none">{data.xp.currentUser.animal}</h3>
                                    <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">{data.xp.currentUser.belt}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-white font-black text-xl tracking-tight">Lv. {data.xp.currentUser.level}</span>
                                <div className="flex gap-2">
                                    {((session?.user as any)?.name === 'Dam' || (session?.user as any)?.email === 'damien.renier@gmail.com' || (session?.user as any)?.league === 'GAINAGE') && (
                                        <button
                                            onClick={handleSwitchEgo}
                                            className="flex items-center gap-1.5 text-emerald-400 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all group"
                                            title="Basculer de Verse"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                {(session?.user as any)?.league === 'GAINAGE' ? 'Verse Pompes' : 'Verse Gainage'}
                                            </span>
                                            <span className="text-sm">🔄</span>
                                        </button>
                                    )}
                                    <Link href="/faq" className="flex items-center gap-1.5 text-indigo-400 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all group" title="Comment ça marche ?">
                                        <HelpCircle size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 pt-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 px-0.5">
                                <span>{data.xp.currentUser.totalXP.toLocaleString('fr-FR')} XP</span>
                                <span>{data.xp.currentUser.xpNextLvl.toLocaleString('fr-FR')} XP</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out" style={{ width: `${data.xp.currentUser.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('saisie')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'saisie' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Saisie</button>
                    <button onClick={() => setActiveTab('graphs')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'graphs' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Graphiques</button>
                    <button onClick={() => setActiveTab('cagnotte')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'cagnotte' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Cagnotte</button>
                    <button onClick={() => setActiveTab('trophees')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'trophees' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Trophées</button>
                </div>

                {activeTab === 'saisie' && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {allowedDates.map(d => (
                            <button
                                key={d.iso}
                                onClick={() => handleDateChange(d.iso)}
                                className={`flex-1 min-w-[100px] py-3 rounded-2xl font-black text-xs border-2 transition-all ${selectedDate === d.iso ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activeTab === 'saisie' && (
                <>
                    {/* TOP: CIBLE */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Cible {selectedDate === data?.todayISO ? "Aujourd'hui" : selectedDate}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black">{data?.requiredReps?.selected ?? 0}</span>
                                    <span className="text-slate-500 font-bold uppercase text-xs">reps</span>
                                </div>
                                <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                    Effectué : <span className="text-white">{currentTotal} {(session?.user as any)?.league === 'GAINAGE' ? 'secondes' : 'reps'}</span>
                                    {currentTotal > (data?.requiredReps?.selected ?? 0) && (
                                        <span className="ml-2 text-green-400">+{currentTotal - (data?.requiredReps?.selected ?? 0)} bonus {(session?.user as any)?.league === 'GAINAGE' ? 's' : '💪'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                {missing > 0 ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-3xl font-black text-orange-400">-{missing}</span>
                                        <span className="text-[10px] font-black text-slate-400 italic uppercase">{(session?.user as any)?.league === 'GAINAGE' ? 'SECONDES' : 'À FAIRE'}</span>
                                    </div>
                                ) : (
                                    <div className="bg-green-500 text-white px-4 py-2 rounded-full font-black text-sm shadow-lg animate-bounce">VALIDÉ ✅</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SETS INPUT */}
                    <div className="space-y-4">
                        {(session?.user as any)?.league === 'GAINAGE' ? (
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">🧘</span>
                                        <span className="font-black text-gray-800 uppercase text-xs">Gainage (Secondes)</span>
                                    </div>
                                    <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs">
                                        {sumSets(localSets.planks)}s
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {localSets.planks.map((val, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-2">
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={val}
                                                    placeholder="0"
                                                    onChange={(e) => handleSetChange('planks', idx, e.target.value)}
                                                    className="w-20 h-16 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center font-black text-gray-900 transition-all text-xl outline-none"
                                                />
                                                <button onClick={() => removeSet('planks', idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg">✕</button>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => adjustSet('planks', idx, -10)} className="w-8 h-8 bg-gray-100 rounded-lg font-black text-gray-500">-10</button>
                                                <button onClick={() => adjustSet('planks', idx, 10)} className="w-8 h-8 bg-blue-50 rounded-lg font-black text-blue-600">+10</button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => addSet('planks')} className="w-20 h-16 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:text-blue-500 hover:border-blue-300 transition-all font-black text-2xl flex items-center justify-center">+</button>
                                </div>
                            </div>
                        ) : (
                            (['pushups', 'pullups', 'squats'] as const).map(type => (
                                <div key={type} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{type === 'pushups' ? '💪' : type === 'pullups' ? '🦍' : '🦵'}</span>
                                            <span className="font-black text-gray-800 uppercase text-xs">{type === 'pushups' ? 'Pompes' : type === 'pullups' ? 'Tractions' : 'Squats'}</span>
                                        </div>
                                        <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs">
                                            {(localSets[type] || []).reduce<number>((a, b) => a + (Number(b) || 0), 0)} reps
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {(localSets[type] || []).map((val, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-2">
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        value={val}
                                                        placeholder="0"
                                                        ref={idx === (localSets[type]?.length ?? 0) - 1 ? lastInputRef : null}
                                                        onChange={(e) => handleSetChange(type, idx, e.target.value)}
                                                        className="w-20 h-16 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center font-black text-gray-900 transition-all text-xl outline-none"
                                                    />
                                                    {getSetEmoji(Number(val) || 0) && <span className="absolute -bottom-1 -left-1 text-xs">{getSetEmoji(Number(val) || 0)}</span>}
                                                    <button onClick={() => removeSet(type, idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg">✕</button>
                                                </div>
                                                {/* Stepper buttons (A3) */}
                                                <div className="flex gap-1">
                                                    <button onClick={() => adjustSet(type, idx, -5)} className="w-8 h-8 bg-gray-100 rounded-lg font-black text-gray-500">-5</button>
                                                    <button onClick={() => adjustSet(type, idx, 5)} className="w-8 h-8 bg-blue-50 rounded-lg font-black text-blue-600">+5</button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => addSet(type)} className="w-20 h-16 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:text-blue-500 hover:border-blue-300 transition-all font-black text-2xl flex items-center justify-center">+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button onClick={() => saveLogs()} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-3xl shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm transform active:scale-[0.98]">
                        {saving ? "Sauvegarde..." : "Valider la séance"}
                    </button>

                    {/* MOOD / STATUS INPUT (NEW) */}
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

                    {/* MOOD HORIZONTAL FEED (NEW) */}
                    {statuses.length > 0 && (
                        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 border border-gray-100 overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 ml-1">
                                <span className="text-xs">✨</span>
                                <span className="font-black text-gray-400 uppercase text-[9px] tracking-widest italic">Humeurs récentes (24h)</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                                {statuses.map((s: any) => (
                                    <div key={s.id} className="flex-shrink-0 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm min-w-[140px] max-w-[200px] relative group">
                                        <div className="flex items-center justify-between mb-2">
                                            <Link href={`/u/${s.nickname}`} className="text-[9px] font-black text-blue-600 hover:underline truncate uppercase">{s.nickname}</Link>
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

                    {/* RENAME & REPOSITION: 🏆 RECORDS HIGHLIGHT (NOW BELOW SAVE) */}
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
                                            <span className="text-lg">{pRec?.badge ?? '-'}</span>
                                        </div>
                                        {(['pushups', 'pullups', 'squats'] as const).map(ex => (
                                            <div key={ex} className="flex justify-between items-start mb-2 border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                                <span className="text-md opacity-90 mt-1">{ex === 'pushups' ? '💪' : ex === 'pullups' ? '🦍' : '🦵'}</span>
                                                <div className="flex flex-col items-end gap-1">
                                                    {(pRec?.[ex]?.top3Sets || []).map((s: any, idx: number) => (
                                                        <div key={idx} className={`flex items-center justify-end gap-1.5 ${idx === 0 ? '' : 'opacity-60'}`}>
                                                            <p className="text-[8px] font-bold text-gray-400 truncate max-w-[50px] uppercase tracking-tighter hover:text-blue-500 underline decoration-gray-200" onClick={(e) => { e.stopPropagation(); router.push(`/u/${encodeURIComponent(s.winner)}`) }}>{s.winner}</p>
                                                            <p className={`font-black text-gray-800 leading-none ${idx === 0 ? 'text-xs' : 'text-[10px]'}`}>{s.maxReps}</p>
                                                            <span className="text-[8px]">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                        </div>
                                                    ))}
                                                    {!(pRec?.[ex]?.top3Sets?.length) && <p className="text-[8px] text-gray-400 italic">Vide</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* NEW SECTION: A3 TOP VOLUME */}
                    <div className="space-y-3 pt-4">
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
                                            <span className="text-lg">{pRec?.badge ?? '-'}</span>
                                        </div>
                                        {(['pushups', 'pullups', 'squats'] as const).map(ex => (
                                            <div key={`vol-${ex}`} className="flex justify-between items-start mb-2 border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                                <span className="text-md opacity-90 mt-1">{ex === 'pushups' ? '💪' : ex === 'pullups' ? '🦍' : '🦵'}</span>
                                                <div className="flex flex-col items-end gap-1">
                                                    {(pRec?.[ex]?.top3Volume || []).map((s: any, idx: number) => (
                                                        <div key={idx} className={`flex items-center gap-1.5 justify-end ${idx === 0 ? '' : 'opacity-60'}`}>
                                                            <p className="text-[8px] font-bold text-gray-400 truncate max-w-[50px] uppercase tracking-tighter">{s.nickname}</p>
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

                    {/* SALLY UP SECTION */}
                    {data?.sallyUp?.enabledForSelectedDate && (
                        <div className="bg-yellow-50 rounded-3xl p-6 border-2 border-yellow-200 space-y-4">
                            <div className="flex justify-between items-center text-yellow-800">
                                <h3 className="font-black uppercase italic tracking-tighter">Bring Sally Up 💪</h3>
                                <span className="bg-yellow-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">Challenge Mensuel</span>
                            </div>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-yellow-700 uppercase mb-1 ml-1">Total Pompes Réalisées</label>
                                    <input type="number" value={sallyReps} onChange={(e) => setSallyReps(parseInt(e.target.value) || 0)} className="w-full h-14 bg-white border-2 border-yellow-300 rounded-2xl text-center font-black text-xl outline-none focus:border-yellow-500 text-gray-900" />
                                </div>
                                <button onClick={saveSally} className="h-14 px-8 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-2xl transition-all shadow-md">OK</button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-yellow-200">
                                {(data?.sallyUp?.monthPodium || []).length > 0 ? data.sallyUp.monthPodium.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                                        <span className="font-bold text-yellow-900">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p?.nickname || 'Anonyme'}</span>
                                        <div className="text-right">
                                            <p className="font-black text-yellow-700 text-sm">{p?.reps ?? 0} reps</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center font-black text-yellow-600 text-[10px] uppercase italic">Pas encore de record</p>}
                            </div>
                        </div>
                    )}

                    {/* ASSIDUITE (NOW BOTTOM) */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-center items-center gap-2">
                            <span className="text-xs">✨</span>
                            <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest text-center">Classement Assiduité</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {(data?.leaderboard || []).map((u, i) => {
                                const ind = getStreakEmoji(u.completionRate, u.streakCurrent);
                                return (
                                    <div key={u.nickname || i} className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 text-center font-black ${i < 3 ? 'text-blue-500' : 'text-gray-300'}`}>{i + 1}</span>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    {(() => {
                                                        const userXP = data?.xp?.leaderboard.find((x: any) => x.id === u.id);
                                                        return userXP ? <span className="text-xs font-black text-slate-400" title={userXP.animal}>[Lv.{userXP.level} {userXP.emoji}]</span> : null;
                                                    })()}
                                                    <Link href={`/u/${encodeURIComponent(u.nickname || '')}`} className="font-black text-gray-900 text-sm leading-none hover:text-blue-600 hover:underline transition-color shrink-0" title={`Visiter le profil de ${u.nickname}`}>
                                                        {u.nickname || 'Anonyme'}
                                                    </Link>
                                                    <div className="flex gap-1">
                                                        {u.isInjured && <span className="text-[10px] animate-pulse cursor-help" title={`Mise à pied médicale : ${u.currentMedicalNote || 'Certificat valide'}`}>🚑</span>}
                                                        {u.isVeteran && <span className="text-[10px] cursor-help" title="Vétéran : Libéré du service (Buyout payé)">🕊️</span>}
                                                        {!u.isInjured && !u.isVeteran && <span className="text-[10px] opacity-20 grayscale" title="Apte au service">✅</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 cursor-help" title={`Statut moyen des apports par rapport à la consigne du jour`}>
                                                    <span className="text-[10px]">{ind.emoji}</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight">{ind.label}</span>
                                                    {u.streakCurrent > 0 && <span className="text-[8px] font-black text-orange-400" title={`🔥 Jours consécutifs avec dépassement de consigne`}>({u.streakCurrent}j 🔥)</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right cursor-help" title="Taux d'accomplissement des objectifs journaliers">
                                            <p className="font-black text-blue-600 text-sm">{Math.round(u.completionRate)}%</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'graphs' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6 border-b pb-2">
                            <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest">Répartition Globale</h3>
                            <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                <button onClick={() => setGraphPeriod('30')} className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${graphPeriod === '30' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>30J</button>
                                <button onClick={() => setGraphPeriod('365')} className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${graphPeriod === '365' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>365J</button>
                            </div>
                        </div>
                        {(() => {
                            const dataset = graphPeriod === '365' ? data?.graphs?.myDaily365 : data?.graphs?.myDaily;
                            const t = (dataset || []).reduce((acc: any, d: any) => ({
                                pushups: acc.pushups + (d?.pushups || 0),
                                pullups: acc.pullups + (d?.pullups || 0),
                                squats: acc.squats + (d?.squats || 0),
                                all: acc.all + (d?.total || 0)
                            }), { pushups: 0, pullups: 0, squats: 0, all: 0 })

                            if (t.all === 0) return <p className="text-center py-10 text-gray-300 font-bold uppercase text-xs italic tracking-widest">Aucune donnée sur les {graphPeriod} derniers jours</p>

                            return (
                                <div className="space-y-6">
                                    <div className="h-10 w-full flex rounded-2xl overflow-hidden shadow-inner border border-gray-100 font-black text-white text-[10px]">
                                        {t.pushups > 0 && <div className="bg-blue-500 h-full flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(t.pushups / t.all) * 100}%` }}>{Math.round((t.pushups / t.all) * 100)}%</div>}
                                        {t.pullups > 0 && <div className="bg-orange-500 h-full flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(t.pullups / t.all) * 100}%` }}>{Math.round((t.pullups / t.all) * 100)}%</div>}
                                        {t.squats > 0 && <div className="bg-green-500 h-full flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(t.squats / t.all) * 100}%` }}>{Math.round((t.squats / t.all) * 100)}%</div>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl mb-1">💪</p>
                                            <p className="text-xs font-black text-gray-700">{t.pushups}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">Pompes</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl mb-1">🦍</p>
                                            <p className="text-xs font-black text-gray-700">{t.pullups}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">Tractions</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl mb-1">🦵</p>
                                            <p className="text-xs font-black text-gray-700">{t.squats}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">Squats</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {activeTab === 'cagnotte' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-transparent"></div>
                        <p className="relative z-10 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Cagnotte des Amendes 💸</p>
                        <p className="relative z-10 text-7xl font-black text-white italic tracking-tighter">{data?.cagnotte?.potEur ?? 0}€</p>

                        <div className="relative z-10 mt-8 pt-8 border-t border-white/10">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🎁 ON PEUT S'OFFRIR...</h4>
                            <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10">
                                <p className="text-2xl mb-1">✨</p>
                                <p className="text-white font-black text-lg uppercase tracking-tight">{data?.cagnotte?.currentReward?.label}</p>
                                {data?.cagnotte?.nextReward && (
                                    <p className="text-blue-400 font-bold text-[10px] mt-2 italic uppercase">
                                        Prochain palier : {data.cagnotte.nextReward.label} ({data.cagnotte.nextReward.min}€)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Leurs Pénitences, Nos Bières</h3>
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{data?.cagnotte?.finesList?.length || 0} contributeurs</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                            {(data?.cagnotte?.finesList || []).map(f => (
                                <div key={f.nickname} className="flex justify-between items-center p-5 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-black">
                                            {f.nickname.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-800 uppercase text-xs tracking-tighter">{f.nickname}</span>
                                            <span className="text-[10px] font-bold text-gray-400 mt-0.5">La grande famille te remercie ! 🍻</span>
                                        </div>
                                    </div>
                                    <span className="font-black text-red-500 bg-red-50 px-4 py-1 rounded-full text-sm">{f.amount}€</span>
                                </div>
                            ))}
                            {(data?.cagnotte?.finesList || []).length === 0 && <p className="text-center py-10 font-black text-gray-300 uppercase italic text-xs leading-relaxed tracking-widest">Tout le monde est à jour. <br /> C'est suspect.</p>}
                        </div>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'trophees' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Compteur de Gloire */}
                        <div className="flex justify-between items-center px-2">
                            <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">Compteur de gloire</h3>
                            <span className="text-blue-600 font-black text-sm">{(data?.badges?.competitive?.ownerships || []).filter((o: any) => o.currentUser?.nickname).length} / {(data?.badges?.competitive?.ownerships || []).length}</span>
                        </div>

                        {/* Activité Récente */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between relative z-10">
                                <h2 className="text-sm lg:text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                                    <span className="p-1 px-2 bg-indigo-500 rounded-lg text-xs not-italic">LIVE</span>
                                    Activité Récente
                                </h2>
                            </div>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar relative z-10 pr-2">
                                {(data?.badges?.competitive?.events || []).length > 0 ? (
                                    (data?.badges?.competitive?.events || []).slice(0, 15).map((ev: any) => (
                                        <div key={ev.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="flex gap-4 items-center">
                                                <span className="text-3xl sm:text-4xl shrink-0 group-hover:scale-110 transition-transform">{ev.badge?.emoji}</span>
                                                <div>
                                                    <p className="text-[11px] font-bold text-white leading-relaxed">
                                                        {ev.eventType === 'STEAL' ? (
                                                            <>
                                                                <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-orange-400 hover:underline">{ev.toUser?.nickname}</Link> a volé <span className="text-blue-400 cursor-pointer hover:bg-white/5 rounded px-1 transition-colors" onClick={() => setRewardDetail({ ...ev.badge, type: 'BADGE COMPÉTITIF', holder: ev.toUser?.nickname, achievedAt: ev.createdAt, currentValue: ev.newValue })}>[{ev.badge?.name}]</span> à <Link href={`/u/${encodeURIComponent(ev.fromUser?.nickname || '')}`} className="hover:underline">{ev.fromUser?.nickname}</Link>
                                                            </>
                                                        ) : ev.eventType === 'CLAIM' ? (
                                                            <>
                                                                <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-green-400 hover:underline">{ev.toUser?.nickname}</Link> a obtenu <span className="text-blue-400 cursor-pointer hover:bg-white/5 rounded px-1 transition-colors" onClick={() => setRewardDetail({ ...ev.badge, type: 'BADGE PERSONNEL', holder: ev.toUser?.nickname, achievedAt: ev.createdAt, currentValue: ev.newValue })}>[{ev.badge?.name}]</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Link href={`/u/${encodeURIComponent(ev.toUser?.nickname || '')}`} className="text-yellow-400 hover:underline">{ev.toUser?.nickname}</Link> a débloqué <span className="text-blue-400 cursor-pointer hover:bg-white/5 rounded px-1 transition-colors" onClick={() => setRewardDetail({ ...ev.badge, type: 'ÉVÉNEMENT', holder: ev.toUser?.nickname, achievedAt: ev.createdAt, currentValue: ev.newValue })}>[{ev.badge?.name}]</span>
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
                                                {ev.newValue > 0 && (
                                                    <div className="text-right sm:text-center shrink-0 border-r sm:border-r-0 sm:border-l border-white/10 pr-3 sm:pr-0 sm:pl-3">
                                                        <p className="font-black text-white text-lg leading-none">{ev.newValue}</p>
                                                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Record</p>
                                                    </div>
                                                )}
                                                {(() => {
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
                                                        <button
                                                            onClick={() => toggleLike(ev.id)}
                                                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-sm shrink-0 shadow-sm ${hasLiked ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-200' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            <span className={`transition-all ${count === 0 ? 'opacity-40 grayscale' : 'scale-110'}`}>{emoji}</span>
                                                            {count > 0 && <span className="text-xs">{count}</span>}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))
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
                                                currentValue: d.currentValue
                                            })}
                                            className="bg-white p-4 rounded-3xl border border-red-100 flex justify-between items-center group shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">{d.emoji}</span>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-900 uppercase">{d.badgeName}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 mt-1">
                                                        Détenteur: <Link href={`/u/${encodeURIComponent(d.holder || '')}`} onClick={(e) => e.stopPropagation()} className="text-slate-900 hover:underline font-black">{d.holder}</Link> ({d.currentValue})
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-black text-red-600 uppercase">Menace: {d.challenger}</p>
                                                <p className="text-[8px] font-black text-red-400 mt-1 uppercase tracking-widest bg-red-50 inline-block px-2 py-0.5 rounded-full">
                                                    {d.diff === 0 ? "Égalité" : `Écart: ${d.diff}`}
                                                </p>
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


            {/* HONOR POPUP (A12) */}
            {
                showHonorPopup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="text-center">
                                <span className="text-6xl mb-4 block">🏆</span>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">PROUESSE DÉTECTÉE</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase mt-2">Vous êtes sur le point de marquer l'histoire.</p>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                                <p className="text-sm text-yellow-800 font-bold leading-relaxed">
                                    Je jure sur l'honneur que les répétitions saisies ont été effectuées avec une forme exemplaire.
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={honorChecked}
                                    onChange={(e) => {
                                        setHonorChecked(e.target.checked);
                                        if (e.target.checked) {
                                            saveLogs(true);
                                        }
                                    }}
                                    className="w-6 h-6 rounded-lg border-2 border-gray-200 checked:bg-blue-600 transition-all font-black"
                                />
                                <span className="font-bold text-sm text-gray-600 group-hover:text-blue-600 transition-colors uppercase">Je le jure</span>
                            </label>

                            <div className="flex flex-col gap-2">
                                <button onClick={() => setShowHonorPopup(null)} className="w-full py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600">
                                    Fermer sans enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    )
}
