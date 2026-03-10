"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function MoodFeed() {
    const [statuses, setStatuses] = useState<any[]>([])

    useEffect(() => {
        fetchStatuses()
    }, [])

    async function fetchStatuses() {
        try {
            const res = await fetch("/api/status")
            if (res.ok) {
                const s = await res.json()
                setStatuses(s)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const toggleLike = async (id: string) => {
        try {
            const res = await fetch(`/api/status/${id}/like`, { method: "POST" })
            if (res.ok) fetchStatuses()
        } catch (err) {
            console.error(err)
        }
    }

    if (statuses.length === 0) return null

    return (
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 overflow-hidden space-y-4">
            <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest italic leading-none">Humeurs du jour</h2>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{statuses.length} mood{statuses.length > 1 ? 's' : ''}</span>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
                {statuses.map((s) => (
                    <div key={s.id} className="flex-shrink-0 bg-gray-50/50 p-4 rounded-3xl border border-gray-100 min-w-[200px] max-w-[240px] transition-all hover:bg-white hover:shadow-md hover:border-blue-100 group">
                        <div className="flex items-center justify-between mb-2">
                            <Link href={`/u/${encodeURIComponent(s.nickname)}`} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter">
                                {s.nickname}
                            </Link>
                            <button
                                onClick={() => toggleLike(s.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${s.hasLiked ? 'bg-red-50 text-red-500' : 'bg-white text-gray-400 border border-gray-100'}`}
                            >
                                <span className="text-[10px] font-black">{s.likeCount}</span>
                                <span className="text-[10px]">{s.hasLiked ? '❤️' : '🤍'}</span>
                            </button>
                        </div>
                        <p className="text-sm font-bold text-gray-700 leading-snug italic">
                            “{s.content}”
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}
