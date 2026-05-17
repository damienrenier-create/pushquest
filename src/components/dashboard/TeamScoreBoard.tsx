"use client"

import { useState, useEffect, useCallback } from "react"

interface TeamStats {
  total: number
  members: Record<string, number>
}

interface TeamScoreData {
  betId: string
  betTitle: string
  exercise: string
  competitionStart: string
  competitionEnd: string
  jaune: TeamStats
  rouge: TeamStats
  leader: "jaune" | "rouge" | "tied" | null
  unit: string
}

const EXERCISE_LABELS: Record<string, string> = {
  PUSHUP: "Pompes 💪",
  PULLUP: "Tractions 🏋️",
  SQUAT: "Squats 🦵",
  PLANK: "Gainage 🧘",
}

const TAGLINES: Record<string, string> = {
  PUSHUP: "Les bras qui plient décident du destin.",
  PULLUP: "S'élever ou périr — la gravité ne pardonne pas.",
  SQUAT: "Les jambes portent les empires.",
  PLANK: "La tempête s'en prend aux faibles. Les forts tiennent.",
}

function ScoreCard({ data }: { data: TeamScoreData }) {
  const { jaune, rouge, leader, unit, exercise } = data
  const total = jaune.total + rouge.total
  const jaunePercent = total > 0 ? (jaune.total / total) * 100 : 50
  const rougePercent = total > 0 ? (rouge.total / total) * 100 : 50

  const formatVal = (v: number) =>
    exercise === "PLANK"
      ? `${v.toLocaleString("fr-FR")}s`
      : `${v.toLocaleString("fr-FR")}`

  return (
    <div className="bg-stone-900/80 border border-green-700/30 rounded-2xl p-4 space-y-3">
      {/* Titre exercice */}
      <div className="flex items-center justify-between">
        <p className="text-amber-400 font-black uppercase tracking-wider text-xs">
          {EXERCISE_LABELS[exercise] || exercise}
        </p>
        {leader === "jaune" && <span className="text-[10px] font-black text-yellow-400 animate-pulse">🟡 🔥 MÈNE</span>}
        {leader === "rouge" && <span className="text-[10px] font-black text-red-400 animate-pulse">🔴 🔥 MÈNE</span>}
        {leader === "tied" && <span className="text-[10px] font-black text-slate-400">⚖️ ÉGALITÉ</span>}
        {leader === null && <span className="text-[10px] text-slate-500 font-mono">En attente</span>}
      </div>

      {/* Tagline */}
      <p className="text-amber-200/50 italic text-[11px] font-serif leading-snug">
        "{TAGLINES[exercise]}"
      </p>

      {/* Barre de progression */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        <div
          className="bg-yellow-500 transition-all duration-700"
          style={{ width: `${jaunePercent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-700"
          style={{ width: `${rougePercent}%` }}
        />
      </div>

      {/* Scores par équipe */}
      <div className="grid grid-cols-2 gap-3">
        {/* Jaune */}
        <div className={`rounded-xl p-3 ${leader === "jaune" ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-stone-800/60"}`}>
          <p className="text-yellow-400 font-black text-xs mb-1">🟡 JAUNE</p>
          <p className="font-mono text-white font-black text-lg">{formatVal(jaune.total)}</p>
          <div className="mt-2 space-y-0.5">
            {Object.entries(jaune.members).map(([name, val]) => (
              <div key={name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-medium">{name}</span>
                <span className="text-slate-300 font-mono">{formatVal(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rouge */}
        <div className={`rounded-xl p-3 ${leader === "rouge" ? "bg-red-500/15 border border-red-500/30" : "bg-stone-800/60"}`}>
          <p className="text-red-400 font-black text-xs mb-1">🔴 ROUGE</p>
          <p className="font-mono text-white font-black text-lg">{formatVal(rouge.total)}</p>
          <div className="mt-2 space-y-0.5">
            {Object.entries(rouge.members).map(([name, val]) => (
              <div key={name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-medium">{name}</span>
                <span className="text-slate-300 font-mono">{formatVal(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamScoreBoard({ teamBetIds }: { teamBetIds: string[] }) {
  const [scores, setScores] = useState<Record<string, TeamScoreData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchScores = useCallback(async () => {
    if (teamBetIds.length === 0) return
    try {
      const results = await Promise.all(
        teamBetIds.map(id =>
          fetch(`/api/bets/team-score?betId=${id}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      )
      const map: Record<string, TeamScoreData> = {}
      for (const r of results) {
        if (r && r.betId) map[r.betId] = r
      }
      setScores(map)
      setLastUpdated(new Date())
    } catch (e) {
      // silently fail — scores stay as-is
    } finally {
      setLoading(false)
    }
  }, [teamBetIds])

  useEffect(() => {
    fetchScores()
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchScores()
    }, 30000)
    return () => clearInterval(id)
  }, [fetchScores])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 bg-stone-900/60 rounded-2xl animate-pulse border border-green-700/20" />
        ))}
      </div>
    )
  }

  const scoreList = Object.values(scores)
  if (scoreList.length === 0) return null

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-amber-400 font-black uppercase tracking-widest text-xs">
          ⚔️ Scores de la Semaine
        </h3>
        {lastUpdated && (
          <span className="text-[10px] text-green-600/60 font-mono">
            Mis à jour {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Grille 2x2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {teamBetIds
          .filter(id => scores[id])
          .map(id => (
            <ScoreCard key={id} data={scores[id]} />
          ))}
      </div>

      {/* Légende équipes */}
      <div className="flex gap-4 justify-center text-[11px] font-bold text-slate-500">
        <span>🟡 Xa · Embi · Gg</span>
        <span>🔴 Neuneu · Mools · Milka</span>
      </div>
    </div>
  )
}
