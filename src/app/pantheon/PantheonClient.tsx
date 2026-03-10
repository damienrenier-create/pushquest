"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    Trophy,
    Search,
    Calendar,
    Users,
    Star,
    Clock,
    Shield,
    History,
    ChevronRight,
    Target,
    Filter,
    X,
    Info,
    CheckCircle2,
    CircleDashed,
    RefreshCw
} from "lucide-react";
import { SPECIAL_DAYS } from "@/config/specialDays";
import { useRouter } from "next/navigation";
import RewardLink from "@/components/RewardLink";
import RewardDetailSheet from "@/components/RewardDetailSheet";
import { getXPForReward } from "@/lib/rewards";

// Replace date-fns with native Intl
const formatTime = (dateStr: any) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
};

interface User {
    id: string;
    nickname: string;
}

interface PantheonClientProps {
    currentUser: any;
    allUsers: User[];
    badgeDefinitions: any[];
    badgeOwnerships: any[];
    recentEvents: any[];
    virtualizedData: any[];
    dangerList: any[];
    serverTime?: string;
    xpScores?: any[];
}

export default function PantheonClient({
    currentUser,
    allUsers,
    badgeDefinitions,
    badgeOwnerships,
    recentEvents,
    virtualizedData,
    dangerList,
    serverTime,
    xpScores
}: PantheonClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [localEvents, setLocalEvents] = useState(recentEvents);
    const router = useRouter();

    const [selectedReward, setSelectedReward] = useState<any>(null);

    React.useEffect(() => {
        setLocalEvents(recentEvents);
    }, [recentEvents]);

    const handleRewardClick = (badgeKey: string) => {
        const def = badgeDefinitions.find(d => d.key === badgeKey);
        if (def) {
            setSelectedReward({
                ...def,
                xp: getXPForReward(badgeKey)
            });
        }
    };

    const toggleLike = async (eventId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const currentUserId = currentUser?.id;
        if (!currentUserId) return;

        setLocalEvents(prev => prev.map(ev => {
            if (ev.id === eventId) {
                const likes = ev.likes || [];
                const hasLiked = likes.some((l: any) => l.userId === currentUserId);
                return {
                    ...ev,
                    likes: hasLiked ? likes.filter((l: any) => l.userId !== currentUserId) : [...likes, { userId: currentUserId }]
                };
            }
            return ev;
        }));

        try {
            await fetch(`/api/badges/events/${eventId}/like`, { method: "POST" });
        } catch (error) {
            // Silencing error for optimistic UI
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    // Filtered Badge Catalog
    const filteredCatalog = useMemo(() => {
        return badgeDefinitions.filter(def => {
            const matchesSearch = def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                def.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = !filterType || def.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [searchTerm, filterType, badgeDefinitions]);

    // Current User's Virtual Status
    const userVirtualData = virtualizedData.find(v => v.userId === currentUser?.id);

    // Events Data from config
    const today = new Date().toISOString().split("T")[0];
    const eventDefinitions = useMemo(() => {
        return Object.entries(SPECIAL_DAYS)
            .filter(([date]) => date >= today)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .slice(0, 3)
            .map(([date, info]) => ({
                id: date,
                date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                name: info.label,
                emoji: info.emoji,
                description: `Série(s) obligatoire(s) lors du ${info.label}`
            }));
    }, []);

    return (
        <>
            <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
                {/* Header / Hero */}
                <div className="bg-white border-b border-slate-200 pt-16 pb-12 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full">
                                        Hall of Fame
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
                                    Le <span className="text-indigo-600">Panthéon</span>
                                </h1>
                                <p className="text-slate-500 font-medium max-w-xl">
                                    L'arène ultime des champions. Consultez vos titres, découvrez le catalogue et surveillez la progression de vos rivaux.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="bg-white hover:bg-slate-50 text-indigo-600 font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 border border-slate-200 shadow-sm disabled:opacity-50"
                                >
                                    <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                                    <span className="hidden sm:inline">Actualiser</span>
                                </button>
                                <Link
                                    href="/"
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-slate-200 shadow-sm"
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                    Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                    {/* SECTION A: PANTHÉON GLOBAL (À LA UNE) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

                        {/* Activité Récente */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <History size={20} />
                                    </div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Journal de Gloire</h2>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temps réel</span>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                {localEvents.length > 0 ? localEvents.map((event: any, i: number) => {
                                    const currentUserId = currentUser?.id;
                                    const likes = event.likes || [];
                                    const count = likes.length;
                                    const hasLiked = currentUserId && likes.some((l: any) => l.userId === currentUserId);

                                    let emoji = "👍";
                                    if (count === 2) emoji = "👍👍";
                                    else if (count === 3) emoji = "🔥";
                                    else if (count === 4) emoji = "🔥🔥";
                                    else if (count >= 5) emoji = "❤️";

                                    const isLevelUp = event.eventType === "LEVEL_UP";
                                    let metaDataObj: any = null;
                                    try {
                                        if (event.metadata) metaDataObj = JSON.parse(event.metadata);
                                    } catch (e) { }

                                    return (
                                        <div key={i} className={`flex gap-4 p-4 rounded-2xl border bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group ${isLevelUp ? 'border-indigo-100' : 'border-slate-50'}`}>
                                            <div className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">
                                                {isLevelUp ? '⭐' : event.badge?.emoji}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                        {event.eventType === 'STEAL' ? (
                                                            <React.Fragment><span className="text-orange-600">{event.toUser?.nickname}</span> a <span className="underline decoration-orange-200">volé</span></React.Fragment>
                                                        ) : isLevelUp ? (
                                                            <React.Fragment><span className="text-indigo-600">{event.toUser?.nickname}</span></React.Fragment>
                                                        ) : <span className="text-green-600">{event.toUser?.nickname}</span>}
                                                    </p>
                                                    <span className="text-[9px] font-bold text-slate-300">{formatTime(event.createdAt)}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 font-medium">
                                                    {event.eventType === 'STEAL' ? (
                                                        <React.Fragment>Le badge <RewardLink badge={event.badge} xp={getXPForReward(event.badge?.key, event.createdAt)} onClick={() => handleRewardClick(event.badge?.key)} /> à {event.fromUser?.nickname}</React.Fragment>
                                                    ) : isLevelUp ? (
                                                        <React.Fragment>
                                                            A atteint le Niveau <span className="font-black text-indigo-600">{event.newValue}</span>
                                                            {metaDataObj?.animal && <span className="text-xs font-bold text-slate-500 ml-1">[{metaDataObj.animal} {metaDataObj.emoji}]</span>}
                                                        </React.Fragment>
                                                    ) : (
                                                        <React.Fragment>A débloqué la distinction <RewardLink badge={event.badge} xp={getXPForReward(event.badge?.key, event.createdAt)} onClick={() => handleRewardClick(event.badge?.key)} /></React.Fragment>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center shrink-0 border-l border-slate-100 pl-4 ml-2">
                                                <button
                                                    onClick={(e) => toggleLike(event.id, e)}
                                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-sm shadow-sm ${hasLiked ? 'bg-indigo-50 border border-indigo-200 text-indigo-500' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <span className={`transition-all ${count === 0 ? 'opacity-40 grayscale' : 'scale-110'}`}>{emoji}</span>
                                                    {count > 0 && <span className="text-xs">{count}</span>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (

                                    <p className="text-slate-400 text-center py-10 font-medium italic">Aucun mouvement récent...</p>
                                )}
                            </div>
                        </div>

                        {/* Danger List & Kings */}
                        <div className="lg:col-span-7 flex flex-col gap-6">

                            {/* Menaces Imminentes */}
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                            <Shield size={20} />
                                        </div>
                                        <h2 className="text-lg font-black uppercase tracking-tight">Menaces de Vol</h2>
                                    </div>
                                    {serverTime && <span className="text-[10px] font-bold text-slate-400 mt-1 block tracking-widest uppercase">Snapshot : {serverTime}</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dangerList.length > 0 ? dangerList.map((danger, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100 group">
                                            <div>
                                                <p className="text-[10px] font-black text-red-600 uppercase mb-0.5">{danger.badgeName}</p>
                                                <p className="text-xs text-slate-600 font-bold">
                                                    Détenteur: <span className="text-slate-900">{danger.holder}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-red-400 uppercase">Écart: {danger.diff} <span className="text-[8px] text-red-300">({danger.currentValue} vs {danger.challengerValue})</span></p>
                                                <p className="text-[11px] font-bold text-red-700">⚔️ {danger.challenger}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="md:col-span-2 py-6 text-center">
                                            <CheckCircle2 className="mx-auto text-green-200 mb-2" size={32} />
                                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Tous les rois dorment tranquilles</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hall of Kings (Top Holders) */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 h-full">
                                {badgeOwnerships
                                    .filter(bo => bo.badge?.type === "COMPETITIVE" && bo.currentUserId)
                                    .slice(0, 3)
                                    .map((bo, i) => (
                                        <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform relative">
                                            <span className="text-4xl mb-3 group-hover:scale-125 transition-transform">{bo.badge?.emoji}</span>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{bo.badge?.name}</p>
                                            <p className="text-xs font-black text-slate-800 uppercase">{bo.currentUser?.nickname}</p>
                                            <div className="absolute top-2 right-2 text-[9px] font-black text-slate-300">VAL: {bo.currentValue}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
                    {/* SECTION B: MES DISTINCTIONS */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
                                <Star size={20} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Mes Distinctions Personnel</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Transferable / Earned Badges */}
                            <div className="space-y-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Titres Possédés</p>
                                {(() => {
                                    const personalBadges = badgeOwnerships.filter(bo => bo.currentUserId === currentUser?.id);
                                    return personalBadges.length > 0 ? personalBadges.map((b: any, i: number) => (
                                        <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group relative cursor-help">
                                            <span className="text-3xl">{b.badge?.emoji}</span>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-sm font-black text-slate-900 uppercase">{b.badge?.name}</h3>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${b.badge?.type === 'COMPETITIVE' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {b.badge?.type}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium leading-tight mb-1">{b.badge?.description}</p>
                                                {b.badge?.type === 'MILESTONE' && b.currentValue > 1 && (
                                                    <p className="text-[9px] font-black text-indigo-500 uppercase">Valeur/Série courante : {b.currentValue}</p>
                                                )}
                                                {b.badge?.type === 'COMPETITIVE' && (
                                                    <p className="text-[9px] font-black text-orange-500 uppercase">Score actuel : {b.currentValue}</p>
                                                )}
                                            </div>

                                            {/* Tooltip Hover */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-900 text-white text-[10px] font-bold p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                                <p className="text-indigo-300 mb-1">{b.badge?.name}</p>
                                                {b.badge?.description}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                                            <CircleDashed className="mx-auto text-slate-200 mb-2 animate-spin-slow" size={32} />
                                            <p className="text-xs font-bold text-slate-400 uppercase">Aucun titre pour le moment</p>
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Virtual Milestones */}
                            <div className="space-y-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Milestones & Fun</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(userVirtualData?.virtualBadges || {}).map(([key, value]: [string, any], i) => {
                                        const def = badgeDefinitions.find(d => d.key === key);
                                        if (!def) return null;
                                        return (
                                            <div key={i} className={`group relative p-4 rounded-2xl border transition-all flex items-center justify-between cursor-help ${value ? 'bg-indigo-50/50 border-indigo-100 opacity-100 shadow-sm' : 'bg-white border-slate-100 opacity-60 grayscale shadow-none hover:grayscale-0'}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{def.emoji}</span>
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-slate-800 uppercase leading-none">{def.name}</h4>
                                                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">{value ? '✅ OBTENU' : '◻️ EN COURS'}</p>
                                                    </div>
                                                </div>
                                                {!!value && <Star className="text-yellow-400 fill-yellow-400" size={14} />}

                                                {/* Tooltip Hover */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-900 text-white text-[10px] font-bold p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                                    <p className="text-purple-300 mb-1">{def.name}</p>
                                                    {def.description}
                                                    {!value && <p className="mt-2 text-slate-400 font-normal italic">Objectif non rempli.</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION D: EVENTS À VENIR */}
                    <div className="lg:col-span-4">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                <Calendar size={20} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Calendrier</h2>
                        </div>

                        <div className="space-y-4">
                            {eventDefinitions.map((event, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedEvent(event)}
                                    className="w-full text-left bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl group-hover:rotate-12 transition-transform">{event.emoji}</span>
                                        <div>
                                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">{event.date}</p>
                                            <h3 className="text-sm font-black text-slate-900 uppercase">{event.name}</h3>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors">
                                        <Info size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SECTION C: CATALOGUE COMPLET */}
                <div className="mb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <Target size={20} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Le Catalogue de Distinctions</h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Chercher un badge..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-white border border-slate-200 text-sm font-bold pl-12 pr-6 py-3 rounded-2xl w-full sm:w-64 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                            <select
                                onChange={(e) => setFilterType(e.target.value === 'all' ? null : e.target.value)}
                                className="bg-white border border-slate-200 text-xs font-black uppercase pl-6 pr-10 py-3 rounded-2xl focus:outline-none shadow-sm cursor-pointer hover:bg-slate-50"
                            >
                                <option value="all">Tous les types</option>
                                <option value="COMPETITIVE">Compétitif</option>
                                <option value="LEGENDARY">Légendaire</option>
                                <option value="MILESTONE">Milestone</option>
                                <option value="EVENT">Événement</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredCatalog.map((def, i) => {
                            const holder = badgeOwnerships.find(bo => bo.badgeKey === def.key && bo.currentUserId);
                            return (
                                <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 transition-all flex flex-col h-full relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                        <Trophy size={120} />
                                    </div>

                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-5xl group-hover:scale-110 transition-transform origin-left">{def.emoji}</div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${def.type === 'LEGENDARY' ? 'bg-indigo-100 text-indigo-700' :
                                            def.type === 'COMPETITIVE' ? 'bg-orange-100 text-orange-700' :
                                                def.type === 'EVENT' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {def.type}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-base font-black text-slate-900 uppercase mb-2 tracking-tight leading-tight">{def.name}</h3>
                                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic mb-4">"{def.description}"</p>
                                    </div>

                                    {def.type === 'COMPETITIVE' && (
                                        <div className="pt-6 border-t border-slate-50">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Détenteur actuel</p>
                                            {holder ? (
                                                <div className="flex items-center gap-2 group/h">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                                                        {(holder.currentUser?.nickname as string || "U").charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-800 uppercase group-hover/h:text-indigo-600 transition-colors">
                                                            {holder.currentUser?.nickname}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400">Score: {holder.currentValue}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 italic">Personne pour le moment</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION E: VITRINE DES CONCURRENTS */}
                <div id="vitrine" className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[100px] opacity-10 -ml-24 -mb-24"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-white/10 text-white rounded-xl backdrop-blur-md">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">Vitrine des Concurrents</h2>
                            </div>
                            <p className="text-slate-400 font-medium">L'inventaire complet de la communauté. Cliquez sur un profil pour voir ses exploits.</p>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {allUsers.map((user, i) => {
                            const userXP = xpScores?.find(x => x.id === user.id);
                            const userOwnerships = badgeOwnerships.filter(bo => bo.currentUserId === user.id && bo.badge?.type === 'COMPETITIVE');
                            const virtuals = virtualizedData.find(v => v.userId === user.id)?.virtualBadges || {};
                            const virtualScore = Object.values(virtuals).filter(Boolean).length;

                            return (
                                <Link
                                    key={i}
                                    href={`/u/${encodeURIComponent(user.nickname)}`}
                                    className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-[2rem] hover:bg-white/10 hover:border-white/20 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-sm shrink-0">
                                                {userXP ? userXP.emoji : user.nickname.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-white uppercase group-hover:text-indigo-400 transition-colors">
                                                    {userXP ? <span className="text-xs text-slate-400 font-bold mr-1.5" title={userXP.animal}>Lv.{userXP.level}</span> : null}
                                                    {user.nickname}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{userOwnerships.length + virtualScore} Titre(s)</p>
                                                    {userXP && <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase"> {userXP.totalXP.toLocaleString('fr-FR')} XP</span>}
                                                </div>
                                                {userXP && (
                                                    <div className="w-full max-w-[120px]" title={`Prochain niveau : Lv.${userXP.level + 1} ${userXP.nextAnimal} ${userXP.nextEmoji}`}>
                                                        <div className="h-1 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${userXP.progress}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 group-hover:cursor-help" title="Cliquez pour les détails">
                                        {userOwnerships.slice(0, 3).map((bo, j) => (
                                            <span
                                                key={j}
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRewardClick(bo.badge?.key || ''); }}
                                                className="text-lg bg-white/5 w-8 h-8 flex items-center justify-center rounded-lg hover:scale-125 transition-transform cursor-pointer"
                                                title={bo.badge?.name}
                                            >
                                                {bo.badge?.emoji}
                                            </span>
                                        ))}
                                        {Object.entries(virtuals).filter(([_, v]) => !!v).slice(0, 3).map(([key, _]: [string, any], j) => {
                                            const def = badgeDefinitions.find(d => d.key === key);
                                            return (
                                                <span
                                                    key={`v-${j}`}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRewardClick(key); }}
                                                    className="text-lg bg-white/5 w-8 h-8 flex items-center justify-center rounded-lg grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all hover:scale-125 cursor-pointer"
                                                    title={def?.name}
                                                >
                                                    {def?.emoji}
                                                </span>
                                            );
                                        })}
                                        {(userOwnerships.length + virtualScore > 6) && (
                                            <span className="text-[9px] font-black text-slate-600 flex items-center justify-center px-1">+{userOwnerships.length + virtualScore - 6}</span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            {
                selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
                        <div className="relative bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="h-2 bg-purple-500 w-full"></div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="p-10 text-center">
                                <div className="text-7xl mb-6">{selectedEvent.emoji}</div>
                                <p className="text-xs font-black text-purple-600 uppercase tracking-[0.3em] mb-2">{selectedEvent.date}</p>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">{selectedEvent.name}</h2>
                                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                    {selectedEvent.description}
                                </p>

                                <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-left border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conditions d'obtention</h4>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3 text-sm text-slate-700 font-bold">
                                            <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle2 size={12} />
                                            </div>
                                            Validez au moins une série ce jour-là.
                                        </li>
                                        {['st_patrick', 'dday', 'nouvel_an'].includes(selectedEvent.id) && (
                                            <li className="flex items-start gap-3 text-sm text-slate-700 font-bold">
                                                <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 ml-0.5">
                                                    <Target size={10} />
                                                </div>
                                                HARDCORE : Atteindre le quota total du jour (Jours de l'année).
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    J'ai compris
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reward Detail Sheet */}
            <RewardDetailSheet
                detail={selectedReward}
                onClose={() => setSelectedReward(null)}
            />

            <style jsx global>{`
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
            `}</style>
        </>
    );
}
