"use client"

// ZONE DE COMBAT — DÔME : panneau de bracket (présentationnel, lecture seule).
// Lit l'état du tournoi (dome.state) et affiche les paires du ROUND COURANT + les ÉQUIPES des
// adversaires (toutes connues dès createDome) → le joueur SCOUTE avant de se lancer. Ne touche
// AUCUNE logique (dome.ts reste pur). DomeState n'historise pas les manches passées.

import type { DomeState } from "@/lib/gamebook/yellow/frontier/dome"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

const ROUND_NAMES = ["Quart", "Demi", "Finale"]

function TeamPreview({ team }: { team: { speciesId: string; level: number }[] }) {
    return (
        <div style={teamS}>
            {team.map((m, i) => {
                const sp = getSpecies(m.speciesId)
                return (
                    <img key={i} src={sp?.sprite ?? `/yellow/sprites/dex/${m.speciesId}.png`} alt={sp?.name ?? m.speciesId}
                        title={`${sp?.name ?? m.speciesId} · N.${m.level}`} width={22} height={22} style={{ imageRendering: "pixelated" }} />
                )
            })}
        </div>
    )
}

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
                    const entrant = (idx: number | null, e: typeof ea | null) => e && (
                        <div style={entrantS}>
                            <span style={{ ...nameS, ...(idx === state.playerId ? meS : null) }}>{e.name}{idx === state.playerId ? " (toi)" : ""}</span>
                            <TeamPreview team={e.team} />
                        </div>
                    )
                    return (
                        <div key={i} style={{ ...rowS, ...(mine ? rowMine : null) }}>
                            {entrant(a, ea)}
                            <span style={vsS}>{eb ? "⚔" : "(exempt)"}</span>
                            {entrant(b, eb)}
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
const rowS: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }
const rowMine: React.CSSProperties = { background: "rgba(241,196,15,0.18)", border: "1px solid #f1c40f" }
const entrantS: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }
const nameS: React.CSSProperties = { textAlign: "center", fontSize: 10.5 }
const meS: React.CSSProperties = { fontWeight: 800, color: "#f1c40f" }
const vsS: React.CSSProperties = { opacity: 0.6, fontSize: 10, flexShrink: 0 }
const teamS: React.CSSProperties = { display: "flex", gap: 2, justifyContent: "center" }
