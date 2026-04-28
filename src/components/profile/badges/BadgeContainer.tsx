"use client";

import React, { useEffect, useState } from "react";
import BadgeShowcase from "./BadgeShowcase";
import { Loader2 } from "lucide-react";

interface BadgeContainerProps {
    nickname: string;
}

const BadgeContainer: React.FC<BadgeContainerProps> = ({ nickname }) => {
    const [showcases, setShowcases] = useState<any[]>([]);
    const [ownerships, setOwnerships] = useState<any[]>([]);
    const [globalOwnerships, setGlobalOwnerships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const res = await fetch(`/api/user/badges/${nickname}`);
                const data = await res.json();
                if (data.showcases) {
                    setShowcases(data.showcases);
                    setOwnerships(data.badgeOwnerships || []);
                    setGlobalOwnerships(data.globalOwnerships || []);
                }
            } catch (error) {
                console.error("Failed to fetch badges:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, [nickname]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">Chargement de la vitrine...</p>
            </div>
        );
    }

    if (showcases.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-500 italic">Aucune distinction répertoriée dans le catalogue.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {showcases.map((showcase, index) => (
                <BadgeShowcase
                    key={showcase.id}
                    category={showcase}
                    badgeOwnerships={globalOwnerships} // Pass global ones here
                    defaultOpen={false} // Closed by default
                />
            ))}
        </div>
    );
};

export default BadgeContainer;
