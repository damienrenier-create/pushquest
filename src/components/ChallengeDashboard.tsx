"use client"

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { HelpCircle } from "lucide-react"
import RewardDetailSheet from "./RewardDetailSheet"
import WorkoutEntry from "./dashboard/WorkoutEntry"
import StatCards from "./dashboard/StatCards"
import SocialFeed from "./dashboard/SocialFeed"
import TrophySection from "./dashboard/TrophySection"
import GraphsSection from "./dashboard/GraphsSection"
import CagnotteSection from "./dashboard/CagnotteSection"
import RecordsAssiduiteSection from "./dashboard/RecordsAssiduiteSection"
import FeatureDiscoveryCarousel from "./FeatureDiscoveryCarousel"

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
    const [showHonorPopup, setShowHonorPopup] = useState<{ badge: any; holder: string; recordValue: number; myValue: number; type: string } | null>(null)
    const [honorChecked, setHonorChecked] = useState(false)
    const [graphPeriod, setGraphPeriod] = useState<'30' | '365' | 'all'>('30')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [mood, setMood] = useState("")
    const [statuses, setStatuses] = useState<any[]>([])
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)

    const lastInputRef = useRef<HTMLInputElement | null>(null)

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }, [setToast])

    const getTodayISO = useCallback(() => getLocalISO(), [])

    const fetchStatuses = useCallback(async () => {
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
    }, [session?.user, setStatuses, setMood]) // session.user is a dependency because of myStatus check

    const fetchData = useCallback(async (dateISO?: string) => {
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
    }, [session?.user, showToast, setData, setSelectedDate, setSallyReps, setLocalSets, fetchStatuses, getTodayISO])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['saisie', 'graphs', 'cagnotte', 'trophees'].includes(tab)) {
            setActiveTab(tab as any)
        }
    }, [searchParams]) // React on search params change

    useEffect(() => {
        fetchData()
    }, [fetchData])

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
            } else {
                const data = await res.json().catch(() => ({}));
                console.error("Save Mood error data:", data);
                showToast(data?.message || "Erreur serveur lors du partage", "error")
            }
        } catch (err) {
            console.error("Save Mood fetch error:", err);
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

        // Potential badge check (A12) - Client side preview with Noise Filter & Context
        let beatenRecord: any = null;
        let myBestValue = 0;

        data.badges.competitive.ownerships.forEach(bo => {
            if (bo.locked) return;
            const def = bo.badge;

            if (def.metricType === "MAX_SET") {
                const scope = def.exerciseScope;
                let maxInLocal = 0;
                let threshold = 0;

                if (scope === "PUSHUPS") {
                    maxInLocal = Math.max(0, ...localSets.pushups.map(r => Number(r) || 0));
                    threshold = 40;
                } else if (scope === "PULLUPS") {
                    maxInLocal = Math.max(0, ...localSets.pullups.map(r => Number(r) || 0));
                    threshold = 10;
                } else if (scope === "SQUATS") {
                    maxInLocal = Math.max(0, ...localSets.squats.map(r => Number(r) || 0));
                    threshold = 100;
                } else if (scope === "ALL") {
                    const mp = Math.max(0, ...localSets.pushups.map(r => Number(r) || 0));
                    const mt = Math.max(0, ...localSets.pullups.map(r => Number(r) || 0));
                    const ms = Math.max(0, ...localSets.squats.map(r => Number(r) || 0));
                    const mg = Math.max(0, ...localSets.planks.map(r => Number(r) || 0));
                    maxInLocal = Math.max(mp, mt, ms, mg);
                    threshold = 40;
                    if (mt === maxInLocal) threshold = 10;
                    if (ms === maxInLocal) threshold = 100;
                }

                if (maxInLocal > bo.currentValue && maxInLocal >= threshold) {
                    beatenRecord = bo;
                    myBestValue = maxInLocal;
                }
            }
        });

        const isHonorConfirmed = forceHonor === true || honorChecked;

        if (beatenRecord && !isHonorConfirmed) {
            setShowHonorPopup({
                badge: beatenRecord.badge,
                holder: beatenRecord.currentUser?.nickname || "Personne",
                recordValue: beatenRecord.currentValue,
                myValue: myBestValue,
                type: 'pre-save'
            });
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
    const currentTotal = sumSets(localSets?.pushups || []) + sumSets(localSets?.pullups || []) + sumSets(localSets?.squats || []) + Math.floor(sumSets(localSets?.planks || []) / 5)
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
            <FeatureDiscoveryCarousel />
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-bold transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-normal text-blue-600 leading-none">POMPES APP</h1>
                        <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Version 3.1 • Clean State</p>
                    </div>
                </div>

                <StatCards
                    xp={data.xp}
                    todayISO={data.todayISO}
                    selectedDate={selectedDate}
                    requiredReps={data.requiredReps?.selected || 0}
                    currentTotal={currentTotal}
                    league={(session?.user as any)?.league}
                    handleSwitchEgo={handleSwitchEgo}
                    session={session}
                />

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
                    <WorkoutEntry
                        league={(session?.user as any)?.league}
                        localSets={localSets}
                        setLocalSets={setLocalSets}
                        saving={saving}
                        saveLogs={saveLogs}
                    />

                    <SocialFeed
                        mood={mood}
                        setMood={setMood}
                        saveMood={saveMood}
                        statuses={statuses}
                        toggleStatusLike={toggleStatusLike}
                        recentEvents={data.badges.competitive.events}
                        toggleLike={toggleLike}
                        session={session}
                        router={router}
                    />

                    {data?.sallyUp?.enabledForSelectedDate && (
                        <div className="bg-yellow-50 rounded-3xl p-6 border-2 border-yellow-200 space-y-4">
                            <div className="flex justify-between items-center text-yellow-800">
                                <h3 className="font-black uppercase tracking-normal">Bring Sally Up 💪</h3>
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
                                {(data?.sallyUp?.monthPodium || []).length > 0 ? data.sallyUp.monthPodium.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                                        <Link href={`/u/${encodeURIComponent(p?.nickname || '')}`} className="font-bold text-yellow-900 hover:underline">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p?.nickname || 'Anonyme'}</Link>
                                        <div className="text-right">
                                            <p className="font-black text-yellow-700 text-sm">{p?.reps ?? 0} reps</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center font-black text-yellow-600 text-[10px] uppercase tracking-normal">Pas encore de record</p>}
                            </div>
                        </div>
                    )}

                    <RecordsAssiduiteSection
                        data={data}
                        setRewardDetail={setRewardDetail}
                        session={session}
                        router={router}
                        getStreakEmoji={getStreakEmoji}
                    />
                </>
            )}

            {activeTab === 'graphs' && (
                <GraphsSection
                    graphPeriod={graphPeriod}
                    setGraphPeriod={setGraphPeriod}
                    data={data}
                />
            )}

            {activeTab === 'cagnotte' && (
                <CagnotteSection
                    data={data}
                />
            )}

            {activeTab === 'trophees' && (
                <TrophySection
                    data={data}
                    setRewardDetail={setRewardDetail}
                    session={session}
                    toggleLike={toggleLike}
                />
            )}


            {/* PREMIUM HONOR POPUP (A12) */}
            {
                showHonorPopup && (
                    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
                        {/* Animated background particles/glow */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                        </div>

                        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] p-1 border border-yellow-500/30 max-w-sm w-full shadow-2xl shadow-yellow-500/40 relative z-10 animate-in zoom-in-95 duration-500 spring-bounce transform-gpu">
                            <div className="bg-slate-900 rounded-[2.8rem] p-8 space-y-8 relative overflow-hidden text-center">
                                {/* Badge Preview Header */}
                                <div className="space-y-4">
                                    <div className="relative inline-block">
                                        <span className="text-8xl drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] block animate-bounce-slow">{showHonorPopup.badge?.emoji || '🏆'}</span>
                                        <div className="absolute -inset-6 bg-yellow-400/20 blur-2xl rounded-full -z-10 animate-pulse"></div>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-normal bg-gradient-to-br from-white via-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                                            {showHonorPopup.badge?.name || 'VÉRITABLE EXPLOIT'}
                                        </h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Détection de Niveau S</p>
                                    </div>
                                </div>

                                {/* Contextual Info Box */}
                                <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 space-y-4 transform hover:scale-[1.02] transition-transform">
                                    <div className="flex items-center justify-between text-left border-b border-white/5 pb-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Détrône</span>
                                            <span className="text-sm font-black text-white">{showHonorPopup.holder}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Record Actuel</span>
                                            <span className="text-sm font-black text-slate-400">{showHonorPopup.recordValue}</span>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-lg font-black text-white italic">
                                            VOTRE NOUVEAU RECORD : <span className="text-yellow-400 text-2xl">{showHonorPopup.myValue}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* The Oath */}
                                <div className="space-y-4">
                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed px-2">
                                        "Je scelle ce résultat par mon honneur. Ma forme était <span className="text-white">stricte</span>, ma volonté <span className="text-white">inflexible</span>."
                                    </p>

                                    <button
                                        onClick={() => {
                                            setHonorChecked(true);
                                            saveLogs(true);
                                        }}
                                        className="w-full relative group overflow-hidden rounded-full p-0.5"
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full opacity-70 group-hover:opacity-100 blur-sm transition-opacity duration-300 animate-gradient-x"></span>
                                        <div className="relative bg-slate-900 px-8 py-5 rounded-full flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-slate-800/80 group-active:scale-95 border border-yellow-500/30">
                                            <span className="text-xl">⚔️</span>
                                            <span className="font-black text-xs text-white uppercase tracking-[0.2em]">
                                                Signer mon Exploit
                                            </span>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowHonorPopup(null)}
                                    className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
                                >
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
