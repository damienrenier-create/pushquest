"use client"

// Nexus — « Pokémon Kart » : overlays de SÉLECTION (pilote + circuit) et de RÉSULTATS.
// La COURSE elle-même est rendue DANS l'écran Game Boy (RaceView) et pilotée par les VRAIS
// boutons de la coque — cf. YellowDevClient (raceCfg / raceResults + onHoldChange) :
//   ◀▶ tourner · A gaz · B frein · SELECT nitro · START quitter.

import { useState } from "react"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { TRACKS } from "@/lib/gamebook/yellow/race/track"
import { deriveKartStats } from "@/lib/gamebook/yellow/race/kart"
import { type Racer } from "@/lib/gamebook/yellow/race/engine"
import { type RaceCfg, type BaseStats } from "./RaceView"

const REAL_TRACKS = TRACKS.filter((t) => t.id !== "test_ring")

export default function RacePanel({
    mode, results, onSelect, onReplay, onClose,
}: {
    mode: "select" | "results"
    results: Racer[] | null
    onSelect: (cfg: RaceCfg) => void
    onReplay: () => void
    onClose: () => void
}) {
    const player = usePlayer()
    const [trackId, setTrackId] = useState(REAL_TRACKS[0]?.id ?? TRACKS[0].id)

    const team = player.team
        .map((m) => ({ uid: m.uid, name: m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId, base: getSpecies(m.speciesId)?.baseStats }))
        .filter((t): t is { uid: string; name: string; base: BaseStats } => !!t.base)

    return (
        <div style={overlay}>
            <div style={panel}>
                {mode === "select" && (
                    <>
                        <b>🏎️ Pokémon Kart — choisis ton pilote</b>
                        <div style={{ fontSize: 11, opacity: 0.8, margin: "6px 0" }}>Circuit :{" "}
                            <select value={trackId} onChange={(e) => setTrackId(e.target.value)} style={sel}>
                                {REAL_TRACKS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.72, marginBottom: 7, lineHeight: 1.5 }}>
                            🎮 Pilotage aux vrais boutons Game Boy : <b>◀▶</b> tourner · <b>A</b> gaz · <b>B</b> frein · <b>SELECT</b> nitro · <b>START</b> quitter.
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                            {team.map((t) => { const ks = deriveKartStats(t.base); return (
                                <button key={t.uid} onClick={() => onSelect({ trackId, base: t.base, pilotName: t.name })} style={pilotBtn}>
                                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                                    <div style={{ fontSize: 9.5, opacity: 0.85, lineHeight: 1.5 }}>
                                        🏁 {pct(ks.topSpeed)} · 🛞 {pct(ks.grip)} · 🛑 {pct(ks.braking)}<br />🎮 {pct(ks.handling)} · ⚡ {pct(ks.nitro)}
                                    </div>
                                </button>
                            ) })}
                            {team.length === 0 && <div style={{ opacity: 0.7, fontSize: 12 }}>Aucun Daemon en équipe.</div>}
                        </div>
                        <button style={{ ...btn, background: "#334", marginTop: 8 }} onClick={onClose}>Fermer</button>
                    </>
                )}

                {mode === "results" && results && (
                    <>
                        <b>🏁 Arrivée !</b>
                        <ol style={{ margin: "6px 0", paddingLeft: 22, fontSize: 12 }}>
                            {results.map((r) => <li key={r.id} style={{ color: r.isPlayer ? "#ffd54a" : "#fff", fontWeight: r.isPlayer ? 800 : 400 }}>{r.name} — {r.finishTime.toFixed(2)}s</li>)}
                        </ol>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button style={{ ...btn, background: "#4cd964" }} onClick={onReplay}>Rejouer</button>
                            <button style={{ ...btn, background: "#334" }} onClick={onClose}>Quitter</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

const pct = (v: number) => `${Math.round(v * 100)}`

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 372, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", flex: 1 }
const pilotBtn: React.CSSProperties = { background: "#1c2231", color: "#fff", border: "1px solid #ffffff22", borderRadius: 9, padding: "7px 8px", cursor: "pointer", textAlign: "left" }
const sel: React.CSSProperties = { background: "#0e1119", color: "#fff", border: "1px solid #445", borderRadius: 6, padding: "3px 6px", fontSize: 12 }
