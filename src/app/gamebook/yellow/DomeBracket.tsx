"use client"

// ZONE DE COMBAT — DÔME : panneau de bracket (présentationnel, lecture seule).
// Lit l'état du tournoi (dome.state) et affiche les paires du ROUND COURANT, en surlignant
// le match du joueur. Ne touche AUCUNE logique (dome.ts reste pur). DomeState n'historise pas
// les manches passées (alive est écrasé à chaque round) → on montre le round courant.

import type { DomeState } from "@/lib/gamebook/yellow/frontier/dome"

const ROUND_NAMES = ["Quart", "Demi", "Finale"]

export default function DomeBracket({ state }: { state: DomeState }) {
    const pairs: Array<[number, number | null]> = []
    for (let i = 0; i < state.alive.length; i += 2) pairs.push([state.alive[i], state.alive[i + 1] ?? null])
    const roundName = ROUND_NAMES[state.round] ?? `Manche ${state.round + 1}`

    return (
        <div style={wrap}>
            <div style={head}>🏆 {roundName} · {state.alive.length} dresseurs en lice</div>
            <div style={listS}>
                {pairs.map(([a, b], i) => {
                    const ea = state.entrants[a]
                    const eb = b != null ? state.entrants[b] : null
                    const mine = a === state.playerId || b === state.playerId
                    return (
                        <div key={i} style={{ ...rowS, ...(mine ? rowMine : null) }}>
                            <span style={{ ...nameS, ...(a === state.playerId ? meS : null) }}>{ea?.name ?? "?"}</span>
                            <span style={vsS}>{eb ? "⚔" : "(exempt)"}</span>
                            {eb && <span style={{ ...nameS, ...(b === state.playerId ? meS : null) }}>{eb.name}</span>}
                            {mine && <span style={tagS}>toi</span>}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const wrap: React.CSSProperties = { width: "100%", marginBottom: 8 }
const head: React.CSSProperties = { fontSize: 11, fontWeight: 800, opacity: 0.9, marginBottom: 6, textAlign: "center" }
const listS: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 }
const rowS: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 8px", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }
const rowMine: React.CSSProperties = { background: "rgba(241,196,15,0.18)", border: "1px solid #f1c40f" }
const nameS: React.CSSProperties = { flex: 1, textAlign: "center" }
const meS: React.CSSProperties = { fontWeight: 800, color: "#f1c40f" }
const vsS: React.CSSProperties = { opacity: 0.6, fontSize: 10, flexShrink: 0 }
const tagS: React.CSSProperties = { fontSize: 8, fontWeight: 800, color: "#1a1a22", background: "#f1c40f", borderRadius: 5, padding: "1px 5px", flexShrink: 0 }
