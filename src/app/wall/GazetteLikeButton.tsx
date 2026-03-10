"use client"

import { useState } from "react"

interface GazetteLikeButtonProps {
    eventId: string
    initialLikeCount: number
    initialHasLiked: boolean
}

export default function GazetteLikeButton({ eventId, initialLikeCount, initialHasLiked }: GazetteLikeButtonProps) {
    const [likeCount, setLikeCount] = useState(initialLikeCount)
    const [hasLiked, setHasLiked] = useState(initialHasLiked)
    const [isAnimating, setIsAnimating] = useState(false)

    const toggleLike = async () => {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 500)

        // Optimistic update
        const newHasLiked = !hasLiked
        setHasLiked(newHasLiked)
        setLikeCount(prev => newHasLiked ? prev + 1 : prev - 1)

        try {
            const res = await fetch(`/api/badges/events/${eventId}/like`, { method: "POST" })
            if (!res.ok) {
                // Rollback on error
                setHasLiked(!newHasLiked)
                setLikeCount(prev => !newHasLiked ? prev + 1 : prev - 1)
            }
        } catch (err) {
            console.error(err)
            // Rollback on error
            setHasLiked(!newHasLiked)
            setLikeCount(prev => !newHasLiked ? prev + 1 : prev - 1)
        }
    }

    return (
        <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${hasLiked
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                } ${isAnimating ? 'scale-110' : 'scale-100'}`}
        >
            <span className="text-xs font-black">{likeCount}</span>
            <span className={`text-base transition-transform ${isAnimating ? 'animate-bounce' : ''}`}>
                {hasLiked ? '❤️' : '🤍'}
            </span>
        </button>
    )
}
