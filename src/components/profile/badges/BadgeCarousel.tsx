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
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <span className="w-8 h-px bg-slate-800"></span>
                        {title}
                    </h3>
                    {subtitle && <p className="text-[10px] text-slate-600 mt-0.5 ml-10">{subtitle}</p>}
                </div>

                <div className="flex gap-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={() => scroll('left')}
                        className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
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
