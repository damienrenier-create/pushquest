"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { dailyCarousels, DailyCarouselSlide } from "@/config/dailyCarousels";

const LS_KEY_PREFIX = "pushquest_daily_seen_";

export default function DailyDiscoveryCarousel() {
    const router = useRouter();
    const [activeCarousel, setActiveCarousel] = useState<typeof dailyCarousels[0] | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Logic to determine which carousel to show based on date
        // Target: May 1st to May 10th, 2026
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed, May is 4
        const day = now.getDate();

        // --- FOR TESTING PURPOSES ONLY ---
        // Uncomment to force a specific day during development
        // const forceDay = 1; 
        // if (forceDay) { ... }
        // ---------------------------------

        if (year === 2026 && month === 4 && day >= 1 && day <= 10) {
            const carousel = dailyCarousels.find(c => c.day === day);
            if (carousel) {
                const lsKey = `${LS_KEY_PREFIX}${day}_202604`;
                const seen = localStorage.getItem(lsKey);

                if (seen !== "true") {
                    setActiveCarousel(carousel);
                    setIsVisible(true);
                }
            }
        }
    }, []);

    if (!isVisible || !activeCarousel) return null;

    const currentSlide: DailyCarouselSlide = activeCarousel.slides[currentIndex];
    const isLastSlide = currentIndex === activeCarousel.slides.length - 1;

    const saveDismissal = () => {
        try {
            const now = new Date();
            const day = now.getDate();
            const lsKey = `${LS_KEY_PREFIX}${day}_202604`;
            localStorage.setItem(lsKey, "true");
        } catch (e) {
            console.error("LocalStorage error:", e);
        }
    };

    const closePermanently = () => {
        saveDismissal();
        setIsVisible(false);
    };

    const markAsSeen = () => {
        saveDismissal();
        setIsVisible(false);

        // If there's a href, navigate to it
        if (activeCarousel.href) {
            router.push(activeCarousel.href);
        }
    };

    const nextSlide = () => {
        if (!isLastSlide) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col transform-gpu animate-in zoom-in-95 duration-300 spring-bounce-200 border-4 border-indigo-500/20">

                {/* Header with progress and close */}
                <div className="flex justify-between items-center px-6 pt-6 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                            <Sparkles size={14} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Découverte {currentIndex + 1} / 3
                        </span>
                    </div>
                    <button
                        onClick={closePermanently}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-inner animate-in slide-in-from-bottom-2 duration-500 border border-indigo-100/50">
                        {currentSlide.emoji}
                    </div>

                    <div className="space-y-1 mb-4">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">{activeCarousel.theme}</span>
                        <h2 className="text-xl font-black text-slate-800 leading-tight">
                            {currentSlide.title}
                        </h2>
                    </div>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 min-h-[60px]">
                        {currentSlide.text}
                    </p>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 w-full">
                        {currentIndex > 0 ? (
                            <button
                                onClick={prevSlide}
                                className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
                            >
                                <ChevronLeft size={24} strokeWidth={3} />
                            </button>
                        ) : null}

                        {!isLastSlide ? (
                            <button
                                onClick={nextSlide}
                                className="flex-1 h-14 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Suivant <ChevronRight size={20} strokeWidth={3} />
                            </button>
                        ) : (
                            <button
                                onClick={markAsSeen}
                                className="flex-1 h-14 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all animate-in pulse duration-1000 infinite active:scale-95 text-xs uppercase tracking-tight"
                            >
                                {currentSlide.cta}
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress bar at the bottom */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-slate-50 w-full">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
