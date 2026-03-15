"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, Trophy, Crown, Timer } from "lucide-react";

interface PossessionData {
    today: {
        holder: string;
        time: string | null;
        req: number;
    };
    legacy: {
        holder: string;
        record: number;
        badge: {
            name: string;
            emoji: string;
            description: string;
        } | null;
    };
}

export default function PossessionSection() {
    const [data, setData] = useState<PossessionData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/badges/possession");
                const json = await res.json();
                if (json.today) setData(json);
            } catch (err) {
                console.error("Failed to fetch possession data", err);
            }
        };
        fetchData();
    }, []);

    if (!data) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <Flame size={24} className="text-orange-600 fill-orange-600 animate-pulse" />
                    Bataille de Possession
                </h2>
                <Link href="/faq?tab=rules" className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors">
                    <Info size={12} />
                    Comment ça marche ?
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Torchbearer */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-orange-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-500 opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity" />
                    
                    <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl shadow-inner border border-orange-100">
                            🔥
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 flex items-center gap-1">
                                <Timer size={12} />
                                Détenteur du Flambeau
                            </p>
                            <Link href={data.today.holder !== "Personne pour le moment" ? `/u/${encodeURIComponent(data.today.holder)}` : "#"} className={`text-lg font-black text-gray-900 uppercase block leading-tight ${data.today.holder !== "Personne pour le moment" ? 'hover:text-orange-600 hover:underline' : ''}`}>
                                {data.today.holder}
                            </Link>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">
                                1er à valider son quota aujourd'hui
                            </p>
                            {data.today.time && (
                                <p className="text-xs text-orange-600 font-black mt-2 bg-orange-50 inline-block px-2 py-0.5 rounded-lg border border-orange-100">
                                    Validé à {new Date(data.today.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                            {!data.today.time && (
                                <p className="text-xs text-gray-400 font-medium mt-2">
                                    Objectif : {data.today.req} reps
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legacy Torchbearer */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-purple-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity" />
                    <div className="absolute top-4 right-4 bg-gray-900/5 text-gray-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-900/10">
                        Milestone
                    </div>
                    
                    <div className="relative flex items-center gap-4">
                        <Link href={`/faq?tab=catalogue#item-torch_legacy`} className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shadow-inner border border-purple-100 transition-transform hover:scale-110">
                            {data.legacy.badge?.emoji || "🚩"}
                        </Link>
                        <div>
                            <Link href={`/faq?tab=catalogue#item-torch_legacy`} className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-1 hover:underline">
                                <Crown size={12} />
                                {data.legacy.badge?.name || "Gardien du Flambeau"}
                            </Link>
                            <Link href={data.legacy.holder !== "Inconnu" ? `/u/${encodeURIComponent(data.legacy.holder)}` : "#"} className={`text-lg font-black text-gray-900 uppercase block leading-tight ${data.legacy.holder !== "Inconnu" ? 'hover:text-purple-600 hover:underline' : ''}`}>
                                {data.legacy.holder}
                            </Link>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">
                                A gardé le Flambeau pendant plusieurs jours
                            </p>
                            <p className="text-xs text-purple-600 font-black mt-2 bg-purple-50 inline-block px-2 py-0.5 rounded-lg border border-purple-100 italic">
                                Record : {data.legacy.record} jours
                            </p>
                        </div>
                        <div className="ml-auto opacity-20 group-hover:opacity-100 transition-opacity">
                            <Trophy size={24} className="text-yellow-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-900/5 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-indigo-900/60">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="text-[10px] font-bold leading-relaxed">
                        <span className="text-orange-600 font-black uppercase">Détenteur</span> : Sois le premier à valider ton quota de reps aujourd'hui pour gagner <span className="font-black text-indigo-900">+100 XP</span>.
                    </p>
                    <p className="text-[10px] font-bold leading-relaxed">
                        <span className="text-purple-600 font-black uppercase">Gardien</span> : Le recordman historique de la plus longue série consécutive de Flambeaux détenus.
                    </p>
                </div>
            </div>
        </div>
    );
}
