"use client"

import React from "react"

interface RewardLinkProps {
    badge: {
        key: string
        name: string
        emoji?: string
    }
    xp?: number
    onClick: () => void
    className?: string
}

export default function RewardLink({ badge, xp, onClick, className = "" }: RewardLinkProps) {
    return (
        <button
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClick()
            }}
            className={`
                inline-flex items-center gap-1 px-1.5 py-0.5 
                bg-blue-500/10 hover:bg-blue-500/20 
                text-blue-500 hover:text-blue-400 
                border border-blue-500/20 hover:border-blue-500/30
                rounded-md transition-all duration-200
                font-black uppercase text-[10px] tracking-tight
                group cursor-pointer
                ${className}
            `}
            title={`Cliquez pour voir les détails de ${badge.name}`}
        >
            <span>{badge.emoji}</span>
            <span className="underline decoration-blue-500/30 group-hover:decoration-blue-400/50 underline-offset-2">
                [{badge.name}] {xp !== undefined ? `(+${xp} XP)` : ''}
            </span>
        </button>
    )
}
