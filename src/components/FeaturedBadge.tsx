"use client"

import { useState, useEffect } from "react";
import { Trophy, Timer, Sparkles } from "lucide-react";

interface FeaturedBadgeData {
    key: string;
    name: string;
    emoji: string;
    description: string;
    rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    updatedAt: string;
}

export default function FeaturedBadge() {
    const [data, setData] = useState<FeaturedBadgeData | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/badges/featured");
                const json = await res.json();
                if (json.featured) setData(json.featured);
            } catch (err) {
                console.error("Failed to fetch featured badge", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!data) return;

        const timer = setInterval(() => {
            const updatedAt = new Date(data.updatedAt).getTime();
            const expiresAt = updatedAt + (7 * 24 * 60 * 60 * 1000);
            const now = Date.now();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setTimeLeft("Rotation imminente...");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${days}j ${hours}h ${minutes}m`);
        }, 1000);

        return () => clearInterval(timer);
    }, [data]);

    if (!data) return null;

    const rarityColors = {
        COMMON: "border-gray-200 bg-gray-50 text-gray-500",
        RARE: "border-blue-200 bg-blue-50 text-blue-600",
        EPIC: "border-purple-200 bg-purple-50 text-purple-600",
        LEGENDARY: "border-orange-200 bg-orange-50 text-orange-600",
    };

    const rarityGlow = {
        COMMON: "",
        RARE: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
        EPIC: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
        LEGENDARY: "shadow-[0_0_25px_rgba(249,115,22,0.4)] animate-pulse",
    };

    return (
        <div className={`relative overflow-hidden bg-white rounded-[2rem] p-6 border-2 transform transition-all hover:scale-[1.02] ${rarityColors[data.rarity]} ${rarityGlow[data.rarity]}`}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-current opacity-5 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
                {/* Badge Visual */}
                <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-inner flex items-center justify-center text-4xl border-2 border-current/10">
                        {data.emoji}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1.5 rounded-lg shadow-sm">
                        <Sparkles size={16} fill="currentColor" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
                            <Trophy size={20} className="text-yellow-500" />
                            Badge à l'Honneur
                        </h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10 ${rarityColors[data.rarity]}`}>
                            {data.rarity}
                        </span>
                    </div>
                    
                    <p className="text-gray-900 font-bold text-lg mb-1">{data.name}</p>
                    <p className="text-gray-500 text-xs font-medium leading-relaxed max-w-md">
                        {data.description}. <br/>
                        <span className="text-orange-600 font-black tracking-tight uppercase">Bonus: +50% XP sur ce badge !</span>
                    </p>
                </div>

                {/* Counter */}
                <div className="flex-shrink-0 bg-gray-900 text-white px-5 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] shadow-lg">
                    <Timer size={18} className="text-yellow-400 mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Expire dans</span>
                    <span className="text-sm font-black tracking-mono">{timeLeft}</span>
                </div>
            </div>
        </div>
    );
}
