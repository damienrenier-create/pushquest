"use client"

// Nexus — « Pokémon Kart » : VUE DE COURSE rendue DANS l'écran Game Boy.
// Pilotée par les VRAIS boutons de la coque (via inputRef, alimenté par onHoldChange) :
//   ◀▶ = braquer · A = accélérer · B = freiner · SELECT = nitro · START = quitter (géré par le parent).
// Le moteur (race/engine) est pur ; ici on ne fait que la boucle rAF + le rendu canvas + HUD.

import { useEffect, useRef, useState } from "react"
import { createRace, stepRace, ranking, type Entrant, type Racer, type RaceState } from "@/lib/gamebook/yellow/race/engine"
import { getTrack } from "@/lib/gamebook/yellow/race/track"
import { Rng } from "@/lib/gamebook/yellow/battle/rng"

export interface RaceInput { up: boolean; down: boolean; left: boolean; right: boolean; nitro: boolean }
export type BaseStats = { hp: number; atk: number; def: number; spe: number; spc: number }
export interface RaceCfg { trackId: string; base: BaseStats; pilotName: string }

const AI_NAMES = ["Turbo", "Bolide", "Comète", "Rafale", "Éclair"]
const KART_COLORS = ["#4cd964", "#e0574c", "#6aa0ec", "#ffd54a", "#b07be0", "#e08a2a"]

export default function RaceView({
    cfg, inputRef, onFinish,
}: {
    cfg: RaceCfg
    inputRef: React.RefObject<RaceInput>
    onFinish: (rk: Racer[]) => void
}) {
    const raceRef = useRef<RaceState | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const finishedRef = useRef(false)
    const [, force] = useState(0)

    // Création UNE fois (au montage) + boucle de jeu 60 fps. Un nouveau RaceView est monté par course.
    useEffect(() => {
        const rng = new Rng((Date.now() & 0x7fffffff) >>> 0)
        const ai = () => ({ hp: 55 + Math.floor(rng.next() * 75), atk: 55 + Math.floor(rng.next() * 75), def: 55 + Math.floor(rng.next() * 75), spe: 60 + Math.floor(rng.next() * 70), spc: 55 + Math.floor(rng.next() * 75) })
        const entrants: Entrant[] = [
            { id: "player", name: cfg.pilotName, base: cfg.base, isPlayer: true },
            ...AI_NAMES.map((n, i) => ({ id: `ai${i}`, name: n, base: ai() })),
        ]
        raceRef.current = createRace(getTrack(cfg.trackId), entrants, rng)
        let last = performance.now()
        let frame = 0
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000); last = now
            const race = raceRef.current
            if (!race) return
            const h = inputRef.current ?? { up: false, down: false, left: false, right: false, nitro: false }
            stepRace(race, { throttle: h.up, brake: h.down, steer: (h.right ? 1 : 0) - (h.left ? 1 : 0), nitro: h.nitro }, dt)
            draw(canvasRef.current, race)                 // canvas : à chaque frame (impératif, hors React)
            if (++frame % 6 === 0) force((x) => x + 1)     // HUD React : ~10 Hz seulement (évite 60 re-renders/s)
            if (race.status === "finished") {
                if (!finishedRef.current) { finishedRef.current = true; onFinish(ranking(race)) }
                return
            }
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Clavier (bureau) : complète les vrais boutons Game Boy — à la souris on ne peut tenir qu'un bouton
    // à la fois. Capture + stopPropagation pour ne pas déclencher les déplacements de la map dessous.
    useEffect(() => {
        const apply = (e: KeyboardEvent, v: boolean) => {
            const h = inputRef.current
            if (!h) return
            const k = e.key.toLowerCase()
            let hit = true
            if (e.key === "ArrowUp" || k === "z" || e.key === " " || k === "a") h.up = v          // A / ↑ = gaz
            else if (e.key === "ArrowDown" || k === "s" || k === "b") h.down = v                   // B / ↓ = frein
            else if (e.key === "ArrowLeft" || k === "q") h.left = v
            else if (e.key === "ArrowRight" || k === "d") h.right = v
            else if (e.key === "Shift" || e.key === "Tab") h.nitro = v                             // Select = nitro
            else hit = false
            if (hit) { e.preventDefault(); e.stopPropagation() }
        }
        const kd = (e: KeyboardEvent) => apply(e, true)
        const ku = (e: KeyboardEvent) => apply(e, false)
        window.addEventListener("keydown", kd, true)
        window.addEventListener("keyup", ku, true)
        return () => { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
    }, [inputRef])

    const race = raceRef.current
    const me = race?.racers.find((r) => r.isPlayer)
    const rk = race ? ranking(race) : []
    const pos = me ? rk.findIndex((r) => r.id === me.id) + 1 : 0

    return (
        <div style={wrap}>
            <canvas ref={canvasRef} width={360} height={240} style={canvasStyle} />
            {race && (
                <div style={hud}>
                    <span>{race.status === "countdown" ? `Départ ${Math.ceil(race.countdown)}…` : `⏱ ${race.time.toFixed(1)}s`}</span>
                    <span>Tour {Math.min((me?.lap ?? 0) + 1, race.track.laps)}/{race.track.laps}</span>
                    <span>Pos {pos}/{race.racers.length}</span>
                    <span>⚡ {Math.round((me?.kart.nitroGauge ?? 0) * 100)}%</span>
                </div>
            )}
            <div style={hint}>◀▶ tourner · A gaz · B frein · SEL nitro · START quitter</div>
        </div>
    )
}

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

const wrap: React.CSSProperties = { position: "relative", width: "100%", height: "100%", background: "#0c1a12", overflow: "hidden" }
const canvasStyle: React.CSSProperties = { width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }
const hud: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", gap: 4, padding: "3px 6px", fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(#000a,#0000)", textShadow: "0 1px 2px #000", fontFamily: "'Courier New', monospace" }
const hint: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", padding: "2px 4px", fontSize: 9, fontWeight: 700, color: "#cfe", background: "#000a", letterSpacing: 0.3, fontFamily: "'Courier New', monospace" }
