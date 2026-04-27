"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BadgeCarouselProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

const BadgeCarousel: React.FC<BadgeCarouselProps> = ({ children, title, subtitle }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    return (
        <div className="space-y-4 py-4 group/carousel">
            <div className="flex items-center justify-between px-4">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <span className="w-10 h-0.5 bg-indigo-500/20 rounded-full"></span>
                        {title}
                    </h3>
                    {subtitle && <p className="text-[11px] font-black text-slate-800 mt-1 ml-13">{subtitle}</p>}
                </div>

                <div className="flex gap-1.5">
                    <button
                        onClick={() => scroll('left')}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100 transition-all hover:scale-110 active:scale-95"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100 transition-all hover:scale-110 active:scale-95"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>
        </div>
    );
};

export default BadgeCarousel;
