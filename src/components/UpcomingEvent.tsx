"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Zap } from "lucide-react";
import { SPECIAL_DAYS } from "@/config/specialDays";
import { SPECIAL_WORKOUTS } from "@/config/specialWorkouts";
import { getTodayISO } from "@/lib/challenge";

interface UnifiedEvent {
    type: 'DAY' | 'WORKOUT';
    key: string;
    date: string;
    endDate?: string;
    label: string;
    emoji: string;
    description: string;
    reward: string;
}

export default function UpcomingEvent() {
    const [nextEvent, setNextEvent] = useState<UnifiedEvent | null>(null);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isMounted, setIsMounted] = useState<boolean>(false);

    useEffect(() => {
        setIsMounted(true);
        const today = getTodayISO();

        let allEvents: UnifiedEvent[] = [];

        // Add Special Days
        Object.entries(SPECIAL_DAYS).forEach(([date, day]) => {
            allEvents.push({
                type: 'DAY',
                key: date,
                date: date,
                label: day.label,
                emoji: day.emoji,
                description: day.description,
                reward: day.reward
            });
        });

        // Add Special Workouts
        SPECIAL_WORKOUTS.forEach(workout => {
            allEvents.push({
                type: 'WORKOUT',
                key: workout.slug,
                date: workout.date,
                endDate: workout.endDate,
                label: workout.name,
                emoji: "🏋️",
                description: workout.description.split('.')[0] + '.', // Keep it short
                reward: `+${workout.xpBonus} XP`
            });
        });

        // Determine the next or active event
        let activeEvent = null;
        let upcomingEvents = [];

        for (const ev of allEvents) {
            if (ev.endDate) {
                // It's a period (like Pyramide)
                if (today >= ev.date && today <= ev.endDate) {
                    activeEvent = ev;
                    break;
                } else if (today < ev.date) {
                    upcomingEvents.push(ev);
                }
            } else {
                // One-day event
                if (today === ev.date) {
                    activeEvent = ev;
                    break;
                } else if (today < ev.date) {
                    upcomingEvents.push(ev);
                }
            }
        }

        if (activeEvent) {
            setIsActive(true);
            setNextEvent(activeEvent);
        } else {
            // Sort by upcoming date ascending
            upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (upcomingEvents.length > 0) {
                setIsActive(false);
                setNextEvent(upcomingEvents[0]);
            }
        }

    }, []);

    if (!isMounted || !nextEvent) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long'
        });
    };

    const dateDisplay = isActive
        ? "En cours aujourd'hui !"
        : nextEvent.endDate
            ? `À partir du ${formatDate(nextEvent.date)}`
            : `Le ${formatDate(nextEvent.date)}`;

    return (
        <div className={`relative overflow-hidden bg-white rounded-[2rem] p-6 border-2 transform transition-all hover:scale-[1.02] ${isActive ? 'border-purple-200 bg-purple-50' : 'border-blue-200 bg-blue-50'} shadow-sm`}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-current opacity-5 rounded-full blur-2xl text-blue-600" />
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-current opacity-5 rounded-full blur-xl text-purple-600" />

            <div className="relative flex flex-col sm:flex-row items-center gap-6">
                {/* Visual Icon */}
                <div className="relative flex-shrink-0 group/icon">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl border border-current/10">
                        {nextEvent.emoji}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <h3 className={`text-sm font-black uppercase tracking-tight flex items-center justify-center sm:justify-start gap-1.5 ${isActive ? 'text-purple-600' : 'text-blue-600'}`}>
                            {isActive ? <Zap size={14} className="animate-pulse" /> : <Calendar size={14} />}
                            {isActive ? "Événement en cours" : "Prochain événement"}
                        </h3>
                    </div>

                    <h4 className="text-gray-900 font-bold text-lg leading-tight mb-1">{nextEvent.label}</h4>
                    <p className="text-gray-500 text-xs font-medium max-w-sm mb-2">{nextEvent.description}</p>
                    <span className="inline-block px-2.5 py-1 rounded bg-white font-mono text-[10px] font-black uppercase tracking-wider text-gray-700 shadow-sm border border-gray-100">
                        {dateDisplay}
                    </span>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                    <Link
                        href={`/faq?tab=catalogue`}
                        className={`group flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm border border-current/10 transition-colors ${isActive ? 'text-purple-600 hover:bg-purple-600 hover:text-white' : 'text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                    >
                        <ChevronRight size={24} className="transform group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
