"use client"

// Nexus — « Pokémon Kart » : rendu canvas top-down + contrôles temps réel (solo vs 5 IA).
// Touches : A/Espace/↑ = accélérer · B/↓ = freiner · ←→/Q D = braquer · Maj/Tab (Select) = nitro.
// Moteur pur : race/engine + race/kart + race/track. Stats du Daemon choisi = normalisées (level-independent).

import { useEffect, useRef, useState } from "react"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { createRace, stepRace, ranking, type Entrant, type RaceState } from "@/lib/gamebook/yellow/race/engine"
import { TRACKS, getTrack } from "@/lib/gamebook/yellow/race/track"
import { deriveKartStats } from "@/lib/gamebook/yellow/race/kart"
import { Rng } from "@/lib/gamebook/yellow/battle/rng"

const AI_NAMES = ["Turbo", "Bolide", "Comète", "Rafale", "Éclair"]
const KART_COLORS = ["#4cd964", "#e0574c", "#6aa0ec", "#ffd54a", "#b07be0", "#e08a2a"]

export default function RacePanel({ close }: { close: () => void }) {
    const player = usePlayer()
    const [phase, setPhase] = useState<"select" | "racing" | "results">("select")
    const [trackId, setTrackId] = useState(TRACKS[0].id)
    const raceRef = useRef<RaceState | null>(null)
    const held = useRef({ up: false, down: false, left: false, right: false, nitro: false })
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const [, force] = useState(0)

    const team = player.team
        .map((m) => ({ uid: m.uid, name: m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId, base: getSpecies(m.speciesId)?.baseStats }))
        .filter((t): t is { uid: string; name: string; base: { hp: number; atk: number; def: number; spe: number; spc: number } } => !!t.base)

    function startRace(base: { hp: number; atk: number; def: number; spe: number; spc: number }) {
        const rng = new Rng((Date.now() & 0x7fffffff) >>> 0)
        const ai = (i: number) => ({ hp: 55 + Math.floor(rng.next() * 75), atk: 55 + Math.floor(rng.next() * 75), def: 55 + Math.floor(rng.next() * 75), spe: 60 + Math.floor(rng.next() * 70), spc: 55 + Math.floor(rng.next() * 75) })
        const entrants: Entrant[] = [
            { id: "player", name: "Toi", base, isPlayer: true },
            ...AI_NAMES.map((n, i) => ({ id: `ai${i}`, name: n, base: ai(i) })),
        ]
        raceRef.current = createRace(getTrack(trackId), entrants, rng)
        setPhase("racing")
    }

    // Boucle de jeu.
    useEffect(() => {
        if (phase !== "racing") return
        let last = performance.now()
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000); last = now
            const race = raceRef.current
            if (!race) return
            const h = held.current
            stepRace(race, { throttle: h.up, brake: h.down, steer: (h.right ? 1 : 0) - (h.left ? 1 : 0), nitro: h.nitro }, dt)
            draw(canvasRef.current, race)
            force((x) => x + 1)
            if (race.status === "finished") { setPhase("results"); return }
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [phase])

    // Contrôles clavier (pendant la course).
    useEffect(() => {
        if (phase !== "racing") return
        const apply = (e: KeyboardEvent, v: boolean) => {
            const k = e.key.toLowerCase()
            let hit = true
            if (e.key === "ArrowUp" || k === "z" || e.key === " " || k === "a") held.current.up = v
            else if (e.key === "ArrowDown" || k === "s" || k === "b") held.current.down = v
            else if (e.key === "ArrowLeft" || k === "q") held.current.left = v
            else if (e.key === "ArrowRight" || k === "d") held.current.right = v
            else if (e.key === "Shift" || e.key === "Tab") held.current.nitro = v
            else hit = false
            if (hit) { e.preventDefault(); e.stopPropagation() }
        }
        const kd = (e: KeyboardEvent) => apply(e, true)
        const ku = (e: KeyboardEvent) => apply(e, false)
        window.addEventListener("keydown", kd, true)
        window.addEventListener("keyup", ku, true)
        return () => { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
    }, [phase])

    const race = raceRef.current
    const me = race?.racers.find((r) => r.isPlayer)
    const rk = race ? ranking(race) : []
    const pos = me ? rk.findIndex((r) => r.id === me.id) + 1 : 0
    const hold = (key: keyof typeof held.current) => ({
        onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); held.current[key] = true },
        onPointerUp: () => { held.current[key] = false },
        onPointerLeave: () => { held.current[key] = false },
    })

    return (
        <div style={overlay}>
            <div style={panel}>
                {phase === "select" && (
                    <>
                        <b>🏎️ Pokémon Kart — choisis ton pilote</b>
                        <div style={{ fontSize: 11, opacity: 0.8, margin: "6px 0" }}>Circuit :{" "}
                            <select value={trackId} onChange={(e) => setTrackId(e.target.value)} style={sel}>
                                {TRACKS.filter((t) => t.id !== "test_ring").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                            {team.map((t) => { const ks = deriveKartStats(t.base); return (
                                <button key={t.uid} onClick={() => startRace(t.base)} style={pilotBtn}>
                                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                                    <div style={{ fontSize: 9.5, opacity: 0.85, lineHeight: 1.5 }}>
                                        🏁 {pct(ks.topSpeed)} · 🛞 {pct(ks.grip)} · 🛑 {pct(ks.braking)}<br />🎮 {pct(ks.handling)} · ⚡ {pct(ks.nitro)}
                                    </div>
                                </button>
                            ) })}
                            {team.length === 0 && <div style={{ opacity: 0.7, fontSize: 12 }}>Aucun Daemon en équipe.</div>}
                        </div>
                        <button style={{ ...btn, background: "#334", marginTop: 8 }} onClick={close}>Fermer</button>
                    </>
                )}

                {(phase === "racing" || phase === "results") && (
                    <>
                        <canvas ref={canvasRef} width={340} height={300} style={{ width: "100%", borderRadius: 10, background: "#0c1a12", display: "block" }} />
                        {race && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, margin: "6px 2px" }}>
                                <span>{race.status === "countdown" ? `Départ dans ${Math.ceil(race.countdown)}…` : `⏱ ${race.time.toFixed(1)}s`}</span>
                                <span>Tour {Math.min((me?.lap ?? 0) + 1, race.track.laps)}/{race.track.laps}</span>
                                <span>Pos {pos}/{race.racers.length}</span>
                                <span>⚡ {Math.round((me?.kart.nitroGauge ?? 0) * 100)}%</span>
                            </div>
                        )}
                        {phase === "racing" && (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 4, userSelect: "none", touchAction: "none" }}>
                                <button style={ctlBtn} {...hold("left")}>◀</button>
                                <button style={{ ...ctlBtn, background: "#e0574c" }} {...hold("down")}>B<br /><span style={ctlSub}>frein</span></button>
                                <button style={{ ...ctlBtn, background: "#b07be0" }} {...hold("nitro")}>⚡<br /><span style={ctlSub}>nitro</span></button>
                                <button style={{ ...ctlBtn, background: "#4cd964" }} {...hold("up")}>A<br /><span style={ctlSub}>gaz</span></button>
                                <button style={ctlBtn} {...hold("right")}>▶</button>
                            </div>
                        )}
                        {phase === "results" && race && (
                            <div style={{ marginTop: 6 }}>
                                <b>🏁 Arrivée !</b>
                                <ol style={{ margin: "6px 0", paddingLeft: 22, fontSize: 12 }}>
                                    {ranking(race).map((r) => <li key={r.id} style={{ color: r.isPlayer ? "#ffd54a" : "#fff", fontWeight: r.isPlayer ? 800 : 400 }}>{r.name} — {r.finishTime.toFixed(2)}s</li>)}
                                </ol>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button style={{ ...btn, background: "#4cd964" }} onClick={() => setPhase("select")}>Rejouer</button>
                                    <button style={{ ...btn, background: "#334" }} onClick={close}>Quitter</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

const pct = (v: number) => `${Math.round(v * 100)}`

/** Rendu canvas : ajuste le circuit à la vue, dessine la route, la ligne d'arrivée, les karts. */
function draw(canvas: HTMLCanvasElement | null, race: RaceState) {
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const wps = race.track.waypoints, pad = race.track.width + 30
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of wps) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }
    minX -= pad; minY -= pad; maxX += pad; maxY += pad
    const scale = Math.min(W / (maxX - minX), H / (maxY - minY))
    const ox = (W - (maxX - minX) * scale) / 2, oy = (H - (maxY - minY) * scale) / 2
    const tx = (x: number) => (x - minX) * scale + ox
    const ty = (y: number) => (y - minY) * scale + oy

    ctx.clearRect(0, 0, W, H)
    // Route (trait épais le long de la ligne centrale).
    ctx.strokeStyle = "#2b2f3a"; ctx.lineWidth = race.track.width * 2 * scale; ctx.lineJoin = "round"; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(tx(wps[0].x), ty(wps[0].y))
    for (let i = 1; i <= wps.length; i++) { const p = wps[i % wps.length]; ctx.lineTo(tx(p.x), ty(p.y)) }
    ctx.stroke()
    // Ligne médiane pointillée.
    ctx.strokeStyle = "#4a5570"; ctx.lineWidth = Math.max(1, 3 * scale); ctx.setLineDash([8, 10]); ctx.stroke(); ctx.setLineDash([])
    // Ligne d'arrivée (waypoint 0).
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(tx(wps[0].x), ty(wps[0].y), Math.max(3, 5 * scale), 0, Math.PI * 2); ctx.fill()
    // Karts.
    race.racers.forEach((r, i) => {
        ctx.fillStyle = r.isPlayer ? "#ffd54a" : KART_COLORS[i % KART_COLORS.length]
        ctx.beginPath(); ctx.arc(tx(r.kart.x), ty(r.kart.y), r.isPlayer ? 6 : 5, 0, Math.PI * 2); ctx.fill()
        if (r.kart.boosting) { ctx.strokeStyle = "#ff7"; ctx.lineWidth = 2; ctx.stroke() }
    })
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 372, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", flex: 1 }
const pilotBtn: React.CSSProperties = { background: "#1c2231", color: "#fff", border: "1px solid #ffffff22", borderRadius: 9, padding: "7px 8px", cursor: "pointer", textAlign: "left" }
const sel: React.CSSProperties = { background: "#0e1119", color: "#fff", border: "1px solid #445", borderRadius: 6, padding: "3px 6px", fontSize: 12 }
const ctlBtn: React.CSSProperties = { flex: 1, background: "#2a3346", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 16, fontWeight: 800, cursor: "pointer", lineHeight: 1.1 }
const ctlSub: React.CSSProperties = { fontSize: 8, opacity: 0.85, fontWeight: 600 }
