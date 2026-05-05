"use client";

import { useEffect, useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import { REACTION_PHRASES } from "@/config/notifications";

export default function BadgeStealToast() {
    const [stolenBadges, setStolenBadges] = useState<any[]>([]);
    const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
    const [sendingId, setSendingId] = useState<string | null>(null);

    const handleReact = async (ev: any, category: 'well_played' | 'revenge') => {
        if (reactedIds.has(ev.id) || sendingId) return;
        setSendingId(ev.id);
        try {
            const phrases = REACTION_PHRASES[category];
            const message = phrases[Math.floor(Math.random() * phrases.length)];
            await fetch("/api/badges/react", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    badgeKey: ev.badgeKey,
                    toUserId: ev.toUserId, // le voleur reçoit la réaction
                    message,
                    category
                })
            });
            setReactedIds(prev => new Set([...prev, ev.id]));
        } catch (e) {
            console.error("Erreur réaction", e);
        } finally {
            setSendingId(null);
        }
    };

    useEffect(() => {
        // Fetch recent stolen badges for current user
        const fetchStolen = async () => {
            try {
                const res = await fetch('/api/badges/stolen');
                if (!res.ok) return;

                const data = await res.json();

                // Retrieve previously seen IDs from localStorage
                const seenIdsStr = localStorage.getItem('seenStolenBadgeEvents');
                const seenIds = seenIdsStr ? JSON.parse(seenIdsStr) : [];

                // Filter events that haven't been shown yet
                const unseenEvents = data.events.filter((ev: any) => !seenIds.includes(ev.id));

                if (unseenEvents.length > 0) {
                    setStolenBadges(unseenEvents);

                    // Update localStorage with new IDs immediately so they aren't shown again on refresh
                    const newSeenIds = [...seenIds, ...unseenEvents.map((ev: any) => ev.id)];
                    localStorage.setItem('seenStolenBadgeEvents', JSON.stringify(newSeenIds));
                }
            } catch (err) {
                console.error("Failed to fetch stolen badges", err);
            }
        };

        fetchStolen();
    }, []);

    const dismissToast = (index: number) => {
        setStolenBadges(prev => prev.filter((_, i) => i !== index));
    };

    if (stolenBadges.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 w-[320px] max-w-[calc(100vw-2rem)]">
            {stolenBadges.map((ev, idx) => (
                <div
                    key={ev.id}
                    className="bg-red-50 border border-red-200 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-right-8 fade-in duration-500 flex items-start gap-4 relative"
                >
                    <button
                        onClick={() => dismissToast(idx)}
                        className="absolute top-2 right-2 text-red-300 hover:text-red-500 p-1"
                    >
                        <X size={14} />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                        <ShieldAlert size={20} />
                    </div>

                    <div className="pt-0.5">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Badge Volé !</p>
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                            <span className="text-red-700">{ev.toUser?.nickname}</span> a battu votre record de <span className="font-black text-slate-900">{ev.badge?.name}</span> {ev.badge?.emoji}
                        </p>
                        <p className="text-xs text-red-500/80 font-medium italic mt-1">Vous l'avez perdu...</p>

                        {/* Boutons de réaction */}
                        {!reactedIds.has(ev.id) ? (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleReact(ev, 'well_played')}
                                    disabled={sendingId === ev.id}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-100 border border-red-200 hover:bg-red-200 transition-all group disabled:opacity-50"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">😌</span>
                                    <span className="text-[9px] font-black uppercase text-red-500 mt-0.5">Bien joué</span>
                                </button>
                                <button
                                    onClick={() => handleReact(ev, 'revenge')}
                                    disabled={sendingId === ev.id}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-100 border border-red-200 hover:bg-red-200 transition-all group disabled:opacity-50"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">😈</span>
                                    <span className="text-[9px] font-black uppercase text-red-500 mt-0.5">Je reviens</span>
                                </button>
                            </div>
                        ) : (
                            <p className="mt-2 text-[10px] font-black text-red-400 italic text-center">
                                ✓ Réponse envoyée
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
