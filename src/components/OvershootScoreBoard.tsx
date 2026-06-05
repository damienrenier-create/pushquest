"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

interface TeamStats {
    total: number
    members: Record<string, number>
}

interface OvershootData {
    mode: "overshoot"
    competitionStart: string
    competitionEnd: string
    teams: Record<string, TeamStats>
    display: Record<string, { label?: string; emoji?: string; color?: string }>
    leader: string | null
}

// Mapping couleur logique → classes Tailwind
const COLOR_CLASSES: Record<string, { text: string; bg: string; bar: string; border: string }> = {
    green: { text: "text-green-400", bg: "bg-green-950/20", bar: "bg-green-500", border: "border-green-500/30" },
    blue: { text: "text-blue-400", bg: "bg-blue-950/20", bar: "bg-blue-500", border: "border-blue-500/30" },
    yellow: { text: "text-yellow-400", bg: "bg-yellow-950/20", bar: "bg-yellow-500", border: "border-yellow-500/30" },
    red: { text: "text-red-400", bg: "bg-red-950/20", bar: "bg-red-500", border: "border-red-500/30" },
}
const fallback = COLOR_CLASSES.green

function TeamColumn({
    teamKey, stats, display, isLeader,
}: { teamKey: string; stats: TeamStats; display: OvershootData["display"][string]; isLeader: boolean }) {
    const c = COLOR_CLASSES[display?.color ?? ""] ?? fallback
    const label = display?.label ?? teamKey
    const emoji = display?.emoji ?? ""

    return (
        <div className={`p-3 rounded-2xl border transition-colors ${isLeader ? `${c.bg} ${c.border}` : "bg-stone-950/50 border-stone-800/60"}`}>
            <div className="flex justify-between items-center mb-2 border-b border-stone-800/40 pb-1.5">
                <span className={`${c.text} font-black text-xs uppercase tracking-wide`}>{emoji} {label}</span>
                {isLeader && <span className="text-[10px] animate-pulse">🔥 MÈNE</span>}
            </div>
            <p className={`${c.text} font-black text-2xl mb-2`}>{stats.total.toLocaleString("fr-FR")} <span className="text-[10px] text-slate-500 font-bold">pts</span></p>
            <div className="space-y-1">
                {Object.entries(stats.members)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, pts]) => (
                        <div key={name} className="flex justify-between items-center text-[11px] text-slate-400">
                            <span className="truncate mr-1">{name}</span>
                            <span className="font-bold text-slate-200">+{pts}</span>
                        </div>
                    ))}
            </div>
        </div>
    )
}

export default function OvershootScoreBoard({ bets }: { bets: any[] }) {
    const [data, setData] = useState<OvershootData | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    // Premier teamBet "overshoot" encore actif
    const overshootBet = useMemo(() => bets.find(b => {
        try {
            const m = typeof b.metadata === "string" ? JSON.parse(b.metadata) : b.metadata
            return m?.teamConfig?.metric === "QUOTA_OVERSHOOT" && (b.status === "OPEN" || b.status === "LOCKED")
        } catch { return false }
    }), [bets])

    const fetchScore = useCallback(async () => {
        if (!overshootBet) return
        try {
            const res = await fetch(`/api/bets/team-score?betId=${overshootBet.id}`)
            if (res.ok) {
                const json = await res.json()
                if (json?.mode === "overshoot") {
                    setData(json)
                    setLastUpdated(new Date())
                }
            }
        } catch (e) {
            console.error("Erreur fetch overshoot score:", e)
        }
    }, [overshootBet])

    useEffect(() => {
        fetchScore()
        const id = setInterval(() => {
            if (document.visibilityState === "visible") fetchScore()
        }, 30000)
        return () => clearInterval(id)
    }, [fetchScore])

    if (!overshootBet || !data) return null

    const teamKeys = Object.keys(data.teams)

    return (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-6 space-y-4 font-mono text-sm text-slate-300">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <h3 className="text-amber-400 font-bold uppercase tracking-wider text-xs">
                        ⚔️ Défi du Dépassement
                    </h3>
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-500">
                            Màj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </div>

                <p className="text-[11px] text-slate-500 italic leading-snug">
                    Chaque rep au-dessus de TON quota du jour = 1 point pour ton équipe. Période {data.competitionStart} → {data.competitionEnd}.
                </p>

                <div className="grid grid-cols-2 gap-3">
                    {teamKeys.map(k => (
                        <TeamColumn
                            key={k}
                            teamKey={k}
                            stats={data.teams[k]}
                            display={data.display?.[k] ?? {}}
                            isLeader={data.leader === k}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
