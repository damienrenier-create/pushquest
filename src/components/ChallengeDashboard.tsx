"use client"

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { HelpCircle } from "lucide-react"
import RewardDetailSheet from "./RewardDetailSheet"
import WorkoutEntry from "./dashboard/WorkoutEntry"
import GiftRepsCard from "./dashboard/GiftRepsCard"
import StatCards from "./dashboard/StatCards"
import SocialFeed from "./dashboard/SocialFeed"
import TrophySection from "./dashboard/TrophySection"
import BetsSection from "./dashboard/BetsSection"
import GraphsSection from "./dashboard/GraphsSection"
import CagnotteSection from "./dashboard/CagnotteSection"
import RecordsAssiduiteSection from "./dashboard/RecordsAssiduiteSection"
import FeatureDiscoveryCarousel from "./FeatureDiscoveryCarousel"
import GuestNexusHint from "./GuestNexusHint"
import NotificationToast from "./NotificationToast"
import { REACTION_PHRASES } from "@/config/notifications"

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
    clockChallenge?: {
        enabledForSelectedDate: boolean
        clockDate?: string | null // le 12 tant qu'il est dans la fenêtre d'encodage (visible 12→15), sinon null
        selectedDateSeconds: number
        monthPodium: Array<{ nickname: string; seconds: number; totalPushupsAllTime: number }>
    }
    clock300?: {
        enabledForSelectedDate: boolean
        selectedDateSeconds: number
        monthPodium: Array<{ nickname: string; seconds: number; totalPushupsAllTime: number }>
    }
    ggBirthday?: {
        enabledForSelectedDate: boolean
        ggNickname: string
        viewerIsGg: boolean
        bonus: number
        perExo: Array<{ exo: string; mine: number; gg: number; beatsCount: number }>
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

// Renvoie une Date dont les composantes LOCALES valent l'heure d'Europe/Paris (le fuseau OFFICIEL du jeu, côté
// serveur). Indispensable pour que le jour calculé côté client corresponde EXACTEMENT à getAllowedEncodingDates
// du serveur — sinon un device hors fuseau Paris (ou près de minuit) envoie un jour refusé « Date non autorisée » (403).
function parisDate(d: Date = new Date()) {
    return new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
}
function getLocalISO(d: Date = parisDate()) {
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
    clockChallenge: { enabledForSelectedDate: false, clockDate: null, selectedDateSeconds: 0, monthPodium: [] },
    clock300: { enabledForSelectedDate: false, selectedDateSeconds: 0, monthPodium: [] },
    graphs: { myDaily: [] }
}

export default function ChallengeDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData>(DEFAULT_DASHBOARD_DATA)
    const [loading, setLoading] = useState(true)
    // isGuest n'est pas dans la session NextAuth → on le lit via /api/user/me (null = inconnu).
    // Pilote l'onboarding : un invité ne voit pas le carousel mais la bannière GuestNexusHint.
    const [isGuest, setIsGuest] = useState<boolean | null>(null)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'saisie' | 'graphs' | 'cagnotte' | 'trophees' | 'paris'>('saisie')
    const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DASHBOARD_DATA.selectedDateISO)
    const lastFetchTime = useRef<number>(Date.now())
    const [localSets, setLocalSets] = useState<{ pushups: (number | "")[]; pullups: (number | "")[]; squats: (number | "")[]; planks: (number | "")[] }>({
        pushups: [""],
        pullups: [""],
        squats: [""],
        planks: [""],
    })
    const [sallyReps, setSallyReps] = useState<number>(0)
    const [clockMin, setClockMin] = useState<number>(0)
    const [clockSec, setClockSec] = useState<number>(0)
    const [clock300Min, setClock300Min] = useState<number>(0)
    const [clock300Sec, setClock300Sec] = useState<number>(0)
    const [showHonorPopup, setShowHonorPopup] = useState<{ badge: any; holder: string; recordValue: number; myValue: number; type: string } | null>(null)
    const [honorChecked, setHonorChecked] = useState(false)
    const [graphPeriod, setGraphPeriod] = useState<'30' | '365' | 'all'>('30')
    const [notification, setNotification] = useState<{ id: string; message: string; type: 'success' | 'error' | 'competitive'; subType?: 'loss' | 'thief' | 'reaction'; event?: any } | null>(null)
    const [mood, setMood] = useState("")
    const [statuses, setStatuses] = useState<any[]>([])
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)

    const lastInputRef = useRef<HTMLInputElement | null>(null)

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setNotification({ id: Date.now().toString(), message, type })
    }, [setNotification])

    // Statut INVITÉ (hors session) → gate l'onboarding (carousel vs bannière Nexus).
    useEffect(() => {
        let alive = true
        fetch("/api/user/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive && d) setIsGuest(d.isGuest === true) })
            .catch(() => { if (alive) setIsGuest(false) })
        return () => { alive = false }
    }, [])

    const fetchQuickData = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/quick")
            if (res.ok) {
                const q = await res.json()
                setData(prev => ({
                    ...prev,
                    todayISO: q.todayISO,
                    selectedDateISO: q.todayISO,
                    requiredReps: { selected: q.requiredReps, today: q.requiredReps },
                    totalsSelected: { ...prev.totalsSelected, total: q.currentTotal }
                }))
            }
        } catch (err) {
            // silencieux — fetchData prendra le relais
        }
    }, [setData])

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

                // --- Competitive Notifications Detection ---
                if (d.badges?.competitive?.events?.length > 0) {
                    const myId = (session?.user as any)?.id;
                    const latestEvents = d.badges.competitive.events.filter((ev: any) =>
                        new Date(ev.createdAt).getTime() > lastFetchTime.current
                    );

                    if (latestEvents.length > 0) {
                        // Priority 1: I lost a badge (Victim)
                        const loss = latestEvents.find((ev: any) => ev.eventType === 'STEAL' && ev.fromUserId === myId);
                        if (loss) {
                            setNotification({
                                id: loss.id,
                                message: `On t'a volé [${loss.badge?.name}] par ${loss.toUser?.nickname} ! 😈`,
                                type: 'competitive',
                                subType: 'loss',
                                event: loss
                            });
                        } else {
                            // Priority 2: Someone reacted to my theft
                            const reaction = latestEvents.find((ev: any) => ev.eventType === 'STEAL_REACTION' && ev.toUserId === myId);
                            if (reaction) {
                                let content = "Quelqu'un a réagi à ton vol !";
                                try {
                                    const meta = JSON.parse(reaction.metadata || "{}");
                                    content = `${reaction.fromUser?.nickname} : "${meta.message}"`;
                                } catch (e) { }

                                setNotification({
                                    id: reaction.id,
                                    message: content,
                                    type: 'competitive',
                                    subType: 'reaction',
                                    event: reaction
                                });
                            } else {
                                // Priority 3: I stole a badge (Thief)
                                const theft = latestEvents.find((ev: any) => ev.eventType === 'STEAL' && ev.toUserId === myId);
                                if (theft) {
                                    setNotification({
                                        id: theft.id,
                                        message: `Tu as dépouillé ${theft.fromUser?.nickname} de son badge [${theft.badge?.name}] ! 🏴‍☠️`,
                                        type: 'competitive',
                                        subType: 'thief',
                                        event: theft
                                    });
                                }
                            }
                        }
                    }
                }
                lastFetchTime.current = Date.now()

                setData(d)
                setSelectedDate(d.selectedDateISO || getTodayISO())
                setSallyReps(d.sallyUp?.selectedDateReps || 0)
                const clockTotal = d.clockChallenge?.selectedDateSeconds || 0
                setClockMin(Math.floor(clockTotal / 60))
                setClockSec(clockTotal % 60)
                const clock300Total = d.clock300?.selectedDateSeconds || 0
                setClock300Min(Math.floor(clock300Total / 60))
                setClock300Sec(clock300Total % 60)

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
    }, [session?.user, showToast, setData, setSelectedDate, setSallyReps, setClockMin, setClockSec, setClock300Min, setClock300Sec, setLocalSets, fetchStatuses, getTodayISO])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['saisie', 'graphs', 'cagnotte', 'trophees'].includes(tab)) {
            setActiveTab(tab as any)
        }
    }, [searchParams]) // React on search params change

    useEffect(() => {
        fetchQuickData()
        fetchData()
    }, [fetchData, fetchQuickData])

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

    const saveClock = async () => {
        const total = clockMin * 60 + clockSec
        if (total <= 0) { showToast("Entre ton temps (min + sec)", "error"); return }
        // Le défi cible TOUJOURS le 12 (clockDate), quelle que soit la date sélectionnée → encodable toute la fenêtre.
        const clockTargetDate = data?.clockChallenge?.clockDate
        if (!clockTargetDate) { showToast("Le défi de l'Horloge n'est plus encodable.", "error"); return }
        setSaving(true)
        try {
            const res = await fetch("/api/challenge/clock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: clockTargetDate, seconds: total }),
            })
            if (res.ok) {
                showToast("Temps de l'Horloge sauvegardé", "success")
                fetchData(selectedDate)
            }
        } catch (err) {
            showToast("Erreur réseau", "error")
        } finally {
            setSaving(false)
        }
    }

    const saveClock300 = async () => {
        const total = clock300Min * 60 + clock300Sec
        if (total <= 0) { showToast("Entre ton temps (min + sec)", "error"); return }
        setSaving(true)
        try {
            const res = await fetch("/api/challenge/clock300", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: selectedDate, seconds: total }),
            })
            if (res.ok) {
                showToast("Temps des 300 sauvegardé", "success")
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

    const handleReact = async (category: 'well_played' | 'revenge') => {
        if (!notification?.event) return;
        const phrases = REACTION_PHRASES[category];
        const message = phrases[Math.floor(Math.random() * phrases.length)];

        try {
            await fetch("/api/badges/react", {
                method: "POST",
                body: JSON.stringify({
                    badgeKey: notification.event.badgeKey,
                    toUserId: notification.event.toUserId, // Thief is the recipient
                    message,
                    category
                }),
                headers: { "Content-Type": "application/json" }
            });
            setNotification(null);
            showToast("Réponse envoyée ! 🫡", "success");
        } catch (e) {
            showToast("Erreur d'envoi", "error");
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
        const d = parisDate() // base = AUJOURD'HUI à Paris (cohérent avec le serveur), puis on recule de i jours
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
            <FeatureDiscoveryCarousel isGuest={isGuest} />
            <GuestNexusHint isGuest={isGuest} />
            {notification && (
                <NotificationToast
                    notification={notification}
                    onClose={() => setNotification(null)}
                    onReact={handleReact}
                />
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
                    currentUserStats={data.leaderboard.find(u => (u as any).id === (session?.user as any)?.id)}
                />

                <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('saisie')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'saisie' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Saisie</button>
                    <button onClick={() => setActiveTab('graphs')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'graphs' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Graphiques</button>
                    <button onClick={() => setActiveTab('cagnotte')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'cagnotte' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Cagnotte</button>
                    <button onClick={() => setActiveTab('trophees')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'trophees' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Trophées</button>
                    <button onClick={() => setActiveTab('paris')} className={`flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'paris' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>🎲 Paris</button>
                    <Link
                      href="/gamebook"
                      prefetch={false}
                      className="flex-1 min-w-[80px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all text-gray-500 hover:bg-slate-900 hover:text-yellow-400 text-center flex items-center justify-center"
                    >
                      🍝 Nexus
                    </Link>
                </div>

                {activeTab === 'saisie' && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {allowedDates.map((d, idx) => {
                            const dayInfo = data.graphs.myDaily.find(day => day.date === d.iso);
                            // Only alert for past days (J-1, J-2, J-3) if not validated
                            const showAlert = idx > 0 && dayInfo && (dayInfo as any).isValidated === false;

                            return (
                                <button
                                    key={d.iso}
                                    onClick={() => handleDateChange(d.iso)}
                                    className={`relative flex-1 min-w-[100px] py-3 rounded-2xl font-black text-xs border-2 transition-all ${selectedDate === d.iso
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                        : showAlert
                                            ? 'bg-red-50 border-red-100 text-red-500 hover:border-red-300'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                                        }`}
                                >
                                    {d.label}
                                    {showAlert && (
                                        <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
                                    )}
                                </button>
                            );
                        })}
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

                    <GiftRepsCard
                        currentUserId={(session?.user as any)?.id}
                        today={data.todayISO}
                        onSaved={() => fetchData(selectedDate)}
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

                    {data?.clockChallenge?.clockDate && (
                        <div className="bg-indigo-50 rounded-3xl p-6 border-2 border-indigo-200 space-y-4">
                            <div className="flex justify-between items-center text-indigo-800">
                                <h3 className="font-black uppercase tracking-normal">Défi de l'Horloge ⏰</h3>
                                <span className="bg-indigo-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">📅 {data.clockChallenge.clockDate.slice(8, 10)}/{data.clockChallenge.clockDate.slice(5, 7)}</span>
                            </div>
                            <p className="text-[11px] font-bold text-indigo-700 leading-snug">1+2+…+12 = 78 pompes le plus vite possible (le plus rapide gagne). Ton chrono du <b>12</b> — encodable encore quelques jours.</p>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-indigo-700 uppercase mb-1 ml-1">Minutes</label>
                                    <input type="number" min={0} value={clockMin} onChange={(e) => setClockMin(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-14 bg-white border-2 border-indigo-300 rounded-2xl text-center font-black text-xl outline-none focus:border-indigo-500 text-gray-900" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-indigo-700 uppercase mb-1 ml-1">Secondes</label>
                                    <input type="number" min={0} max={59} value={clockSec} onChange={(e) => setClockSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full h-14 bg-white border-2 border-indigo-300 rounded-2xl text-center font-black text-xl outline-none focus:border-indigo-500 text-gray-900" />
                                </div>
                                <button onClick={saveClock} className="h-14 px-8 bg-indigo-400 hover:bg-indigo-500 text-indigo-900 font-black rounded-2xl transition-all shadow-md">OK</button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-indigo-200">
                                {(data?.clockChallenge?.monthPodium || []).length > 0 ? data.clockChallenge.monthPodium.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                                        <Link href={`/u/${encodeURIComponent(p?.nickname || '')}`} className="font-bold text-indigo-900 hover:underline">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p?.nickname || 'Anonyme'}</Link>
                                        <div className="text-right">
                                            <p className="font-black text-indigo-700 text-sm">{Math.floor((p?.seconds ?? 0) / 60)}:{String((p?.seconds ?? 0) % 60).padStart(2, '0')}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center font-black text-indigo-600 text-[10px] uppercase tracking-normal">Pas encore de record</p>}
                            </div>
                        </div>
                    )}

                    {data?.clock300?.enabledForSelectedDate && (
                        <div className="bg-red-50 rounded-3xl p-6 border-2 border-red-200 space-y-4">
                            <div className="flex justify-between items-center text-red-800">
                                <h3 className="font-black uppercase tracking-normal">Défi des 300 ⚔️</h3>
                                <span className="bg-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">24-27 octobre</span>
                            </div>
                            <p className="text-[11px] font-bold text-red-700 leading-snug">Les 24 Heures de l'Horloge : 1+2+…+24 = <b>300 pompes</b> le plus vite possible. Le meilleur temps gagne.</p>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-red-700 uppercase mb-1 ml-1">Minutes</label>
                                    <input type="number" min={0} value={clock300Min} onChange={(e) => setClock300Min(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-14 bg-white border-2 border-red-300 rounded-2xl text-center font-black text-xl outline-none focus:border-red-500 text-gray-900" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-red-700 uppercase mb-1 ml-1">Secondes</label>
                                    <input type="number" min={0} max={59} value={clock300Sec} onChange={(e) => setClock300Sec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full h-14 bg-white border-2 border-red-300 rounded-2xl text-center font-black text-xl outline-none focus:border-red-500 text-gray-900" />
                                </div>
                                <button onClick={saveClock300} className="h-14 px-8 bg-red-400 hover:bg-red-500 text-red-900 font-black rounded-2xl transition-all shadow-md">OK</button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-red-200">
                                {(data?.clock300?.monthPodium || []).length > 0 ? data.clock300.monthPodium.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                                        <Link href={`/u/${encodeURIComponent(p?.nickname || '')}`} className="font-bold text-red-900 hover:underline">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p?.nickname || 'Anonyme'}</Link>
                                        <div className="text-right">
                                            <p className="font-black text-red-700 text-sm">{Math.floor((p?.seconds ?? 0) / 60)}:{String((p?.seconds ?? 0) % 60).padStart(2, '0')}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center font-black text-red-600 text-[10px] uppercase tracking-normal">Pas encore de record</p>}
                            </div>
                        </div>
                    )}

                    {data?.ggBirthday?.enabledForSelectedDate && (
                        <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-300 space-y-4">
                            <div className="flex justify-between items-center text-amber-800">
                                <h3 className="font-black uppercase tracking-normal">🎂 Défi Bats {data?.ggBirthday?.ggNickname}</h3>
                                <span className="bg-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">Anniv · 26 juin</span>
                            </div>
                            <p className="text-[11px] font-bold text-amber-700 leading-snug">
                                {data?.ggBirthday?.viewerIsGg
                                    ? `C'est TON anniversaire ! +${data?.ggBirthday?.bonus ?? 100} XP par exo × joueur que tu bats aujourd'hui.`
                                    : `Dépasse ${data?.ggBirthday?.ggNickname} sur chaque exo aujourd'hui → +${data?.ggBirthday?.bonus ?? 100} XP par exo (gainage compté en secondes).`}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {(data?.ggBirthday?.perExo || []).map((e: any) => {
                                    const label = ({ PUSHUP: "Pompes", PULLUP: "Tractions", SQUAT: "Squats", PLANK: "Gainage (s)" } as Record<string, string>)[e.exo] || e.exo
                                    const bonus = data?.ggBirthday?.bonus ?? 100
                                    if (data?.ggBirthday?.viewerIsGg) {
                                        return (
                                            <div key={e.exo} className="flex justify-between items-center px-4 py-2 bg-white/60 rounded-xl">
                                                <span className="font-bold text-amber-900">{label}</span>
                                                <span className="font-black text-amber-700 text-sm">{e.gg} · tu bats {e.beatsCount} → +{e.beatsCount * bonus} XP</span>
                                            </div>
                                        )
                                    }
                                    const won = e.mine > e.gg
                                    return (
                                        <div key={e.exo} className={`flex justify-between items-center px-4 py-2 rounded-xl ${won ? 'bg-green-100' : 'bg-white/60'}`}>
                                            <span className="font-bold text-amber-900">{label}</span>
                                            <span className="font-black text-sm">
                                                <span className="text-amber-900">Toi {e.mine}</span> <span className="text-amber-400">vs</span> <span className="text-amber-700">{data?.ggBirthday?.ggNickname} {e.gg}</span>
                                                {won ? <span className="text-green-600"> ✅ +{bonus}</span> : <span className="text-amber-600"> ⚔️ +{Math.max(1, e.gg - e.mine + 1)}</span>}
                                            </span>
                                        </div>
                                    )
                                })}
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

            {activeTab === 'paris' && (
                <BetsSection session={session} />
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
