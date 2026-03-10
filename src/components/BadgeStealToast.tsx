"use client";

import { useEffect, useState } from "react";
import { X, ShieldAlert } from "lucide-react";

export default function BadgeStealToast() {
    const [stolenBadges, setStolenBadges] = useState<any[]>([]);

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
                    </div>
                </div>
            ))}
        </div>
    );
}
