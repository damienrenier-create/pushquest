"use client"

// Nexus — Roulette EU : COMPOSANT (Phase 2b). Rendu du tapis + roue + contrôles GBA, branché
// sur les moteurs PURS testés (engine/grid/tapis/stats/trachet). DÉCOUPLÉ : il gère un solde
// local (prop `initialBalance`) et rend `onClose(finalBalance)` à la sortie. Esthétique clean.
// L'intégration Nexus (énergie/tickets, persistance, map) = Phase 3, par-dessus ce composant.

import { useMemo, useRef, useState, useEffect } from "react"
import { buildTapis, type BetZone } from "@/lib/gamebook/yellow/roulette/tapis"
import { pointToZone, dpadMove, zoneToBet, type DpadDir } from "@/lib/gamebook/yellow/roulette/grid"
import {
    createRouletteState, placeBet, undoLast, clearZone, clearAll, cycleChip, lockBets, settle,
    totalStaked, type RouletteState,
} from "@/lib/gamebook/yellow/roulette/engine"
import { colorOf } from "@/lib/gamebook/yellow/roulette/wheel"
import { computeStats } from "@/lib/gamebook/yellow/roulette/stats"
import { trachetLine } from "@/lib/gamebook/yellow/roulette/trachet"

const CELL = 30 // px par unité-case

const COLOR_BG: Record<string, string> = { green: "#2f8f4e", red: "#c0392b", black: "#222831" }

/** Libellé court d'une zone « bande extérieure ». */
function outsideLabel(z: BetZone): string {
    switch (z.type) {
        case "DOZEN": return z.id === "dozen:1" ? "1-12" : z.id === "dozen:2" ? "13-24" : "25-36"
        case "COLUMN": return "2:1"
        case "LOW": return "MANQUE"; case "HIGH": return "PASSE"
        case "EVEN": return "PAIR"; case "ODD": return "IMPAIR"
        case "RED": return "ROUGE"; case "BLACK": return "NOIR"
        default: return ""
    }
}

export default function RouletteTable({ initialBalance, onClose }: { initialBalance: number; onClose?: (finalBalance: number) => void }) {
    const ZONES = useMemo(() => buildTapis(), [])
    const [s, setS] = useState<RouletteState>(() => createRouletteState(initialBalance))
    const [cursorId, setCursorId] = useState("straight:17") // case ciblée par le D-pad
    const [spinning, setSpinning] = useState(false)
    const [lastWin, setLastWin] = useState<number | null>(null)
    const [talk, setTalk] = useState<string>("Place tes mises. La banque t'observe. 🍝")
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const chipsByZone = useMemo(() => {
        const m: Record<string, number> = {}
        for (const b of s.bets) m[b.zoneId] = b.chips
        return m
    }, [s.bets])
    const stats = useMemo(() => computeStats(s.history, { topK: 3 }), [s.history])

    // Zones visibles : pleins (cases) + bandes extérieures. Les chevaux/carrés/etc. sont des
    // cibles de clic (snapping) + des pastilles de jeton, pas des cases dessinées.
    const numberCells = ZONES.filter((z) => z.type === "STRAIGHT")
    const outsideZones = ZONES.filter((z) => ["DOZEN", "COLUMN", "RED", "BLACK", "EVEN", "ODD", "LOW", "HIGH"].includes(z.type))

    // ── Actions ──
    const place = (zoneId: string) => setS((st) => {
        const z = ZONES.find((x) => x.id === zoneId); if (!z) return st
        return placeBet(st, zoneToBet(z, st.chipValue))
    })
    const onTapTapis = (e: React.MouseEvent) => {
        if (spinning) return
        const rect = e.currentTarget.getBoundingClientRect()
        const cx = (e.clientX - rect.left) / CELL, cy = (e.clientY - rect.top) / CELL
        const z = pointToZone(cx, cy, ZONES)
        if (z) { setCursorId(z.id); place(z.id) }
    }
    const startHoldA = () => { // appui long A : auto-fire (dépose en boucle, accéléré)
        place(cursorId)
        let n = 0
        holdRef.current = setInterval(() => { n++; for (let k = 0; k < Math.min(5, 1 + Math.floor(n / 3)); k++) place(cursorId) }, 180)
    }
    const stopHold = () => { if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null } }
    useEffect(() => () => stopHold(), [])

    const onStart = () => {
        if (spinning || s.bets.length === 0) return
        setSpinning(true)
        setS((st) => lockBets(st))
        // RNG LOCAL pour la démo solo ; en multijoueur (Phase 4) le numéro viendra du SERVEUR.
        const winning = Math.floor(Math.random() * 37)
        window.setTimeout(() => {
            setS((st) => {
                const { state, result } = settle(st, winning)
                const insistedCold = result.net < 0 && st.bets.some((b) => b.type === "STRAIGHT" && stats.cold.some((c) => c.n === b.numbers[0]))
                setLastWin(winning)
                setTalk(trachetLine({ won: result.net > 0, net: result.net, winning, isZero: winning === 0, insistedColdNumber: insistedCold, bankroll: state.balance }))
                return state
            })
            setSpinning(false)
        }, 1600)
    }

    return (
        <div style={S.root}>
            {/* ── En-tête : solde · jeton · roue ── */}
            <div style={S.header}>
                <div style={S.stat}><span style={S.statLbl}>SOLDE</span><span style={S.statVal}>{s.balance}</span></div>
                <div style={{ ...S.wheel, ...(spinning ? { animation: "rouletteSpin 0.5s linear infinite" } : null) }}>
                    {spinning ? "🎡" : lastWin === null ? "—" : <span style={{ color: COLOR_BG[colorOf(lastWin)] === "#222831" ? "#fff" : "#fff" }}>{lastWin}</span>}
                </div>
                <div style={S.stat}><span style={S.statLbl}>JETON</span><span style={{ ...S.statVal, color: "#e0c020" }}>{s.chipValue}</span></div>
            </div>

            {/* ── Le TAPIS (clic = snapping ; pastilles = mises ; halo = curseur) ── */}
            <div style={{ position: "relative", width: 14 * CELL, height: 5 * CELL, margin: "0 auto" }} onClick={onTapTapis}>
                {/* Pleins (0 + 1..36) */}
                {numberCells.map((z) => (
                    <div key={z.id} style={{
                        position: "absolute", left: (z.x - z.w / 2) * CELL, top: (z.y - z.h / 2) * CELL, width: z.w * CELL, height: z.h * CELL,
                        background: COLOR_BG[colorOf(z.numbers[0])], color: "#fff", border: "1px solid #0b3d1f",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, boxSizing: "border-box",
                    }}>{z.numbers[0]}</div>
                ))}
                {/* Bandes extérieures */}
                {outsideZones.map((z) => (
                    <div key={z.id} style={{
                        position: "absolute", left: (z.x - z.w / 2) * CELL, top: (z.y - z.h / 2) * CELL, width: z.w * CELL, height: z.h * CELL,
                        background: z.type === "RED" ? "#c0392b" : z.type === "BLACK" ? "#222831" : "#143a24",
                        color: "#fff", border: "1px solid #0b3d1f", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, letterSpacing: 0.5, boxSizing: "border-box", textAlign: "center",
                    }}>{outsideLabel(z)}</div>
                ))}
                {/* Jetons posés */}
                {Object.entries(chipsByZone).map(([id, chips]) => {
                    const z = ZONES.find((x) => x.id === id); if (!z) return null
                    return (
                        <div key={"chip-" + id} style={{
                            position: "absolute", left: z.x * CELL - 9, top: z.y * CELL - 9, width: 18, height: 18, borderRadius: "50%",
                            background: "#e0c020", color: "#1a1400", border: "2px solid #fff", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 9, fontWeight: 800, pointerEvents: "none", zIndex: 5,
                        }}>{chips}</div>
                    )
                })}
                {/* Curseur D-pad */}
                {(() => {
                    const z = ZONES.find((x) => x.id === cursorId); if (!z) return null
                    return <div style={{ position: "absolute", left: z.x * CELL - 12, top: z.y * CELL - 12, width: 24, height: 24, borderRadius: 6, border: "2px solid #fff", boxShadow: "0 0 6px #fff", pointerEvents: "none", zIndex: 6 }} />
                })()}
            </div>

            {/* ── Trachet Talk + total misé ── */}
            <div style={S.talk}>{talk}</div>
            <div style={S.staked}>Misé : <b>{totalStaked(s)}</b></div>

            {/* ── Stats temps réel ── */}
            <div style={S.statsRow}>
                <span>🔴 {stats.colors.redPct}% · ⚫ {stats.colors.blackPct}% · 🟢 {stats.colors.greenPct}%</span>
                <span>🔥 {stats.hot.map((h) => h.n).join(" ")} · 🧊 {stats.cold.map((c) => c.n).join(" ")}</span>
                {stats.streaks.color && <span>série {stats.streaks.color.value === "red" ? "🔴" : stats.streaks.color.value === "black" ? "⚫" : "🟢"} ×{stats.streaks.color.len}</span>}
            </div>

            {/* ── Contrôles GBA ── */}
            <div style={S.pad}>
                <div style={S.dpad}>
                    {(["up", "down", "left", "right"] as DpadDir[]).map((d) => (
                        <button key={d} style={{ ...S.dbtn, gridArea: d }} disabled={spinning} onClick={() => setCursorId((c) => dpadMove(c, d, ZONES))}>
                            {d === "up" ? "▲" : d === "down" ? "▼" : d === "left" ? "◀" : "▶"}
                        </button>
                    ))}
                </div>
                <div style={S.btns}>
                    <button style={{ ...S.btn, background: "#4cd964" }} disabled={spinning}
                        onMouseDown={startHoldA} onMouseUp={stopHold} onMouseLeave={stopHold}
                        onTouchStart={startHoldA} onTouchEnd={stopHold}>A · Miser</button>
                    <button style={{ ...S.btn, background: "#e0533a" }} disabled={spinning}
                        onClick={() => setS(undoLast)}
                        onContextMenu={(e) => { e.preventDefault(); setS((st) => clearZone(st, cursorId)) }}>B · Retirer</button>
                    <button style={{ ...S.btn, background: "#6aa0ec" }} disabled={spinning} onClick={() => setS(cycleChip)}>Select · Jeton</button>
                    <button style={{ ...S.btn, background: "#e0c020", color: "#1a1400" }} disabled={spinning || s.bets.length === 0} onClick={onStart}>START · Lancer</button>
                </div>
                <div style={S.footer}>
                    <button style={S.linkBtn} disabled={spinning} onClick={() => setS(clearAll)}>Tout retirer</button>
                    <button style={S.linkBtn} disabled={spinning} onClick={() => onClose?.(clearAll(s).balance)}>Encaisser & quitter ▶</button>
                </div>
            </div>

            <style jsx>{`@keyframes rouletteSpin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { width: "min(460px, 98vw)", margin: "0 auto", background: "#0e1512", border: "2px solid #1c3a28", borderRadius: 14, padding: 12, color: "#eef", fontFamily: "'Courier New', monospace", userSelect: "none" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    stat: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 },
    statLbl: { fontSize: 9, opacity: 0.6, letterSpacing: 1 },
    statVal: { fontSize: 18, fontWeight: 800 },
    wheel: { width: 54, height: 54, borderRadius: "50%", background: "radial-gradient(#1c3a28, #0b1f14)", border: "3px solid #e0c020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 },
    talk: { marginTop: 10, fontSize: 12, fontStyle: "italic", textAlign: "center", minHeight: 32, color: "#cfe" },
    staked: { textAlign: "center", fontSize: 11, opacity: 0.8, marginTop: 2 },
    statsRow: { display: "flex", flexDirection: "column", gap: 2, fontSize: 10, opacity: 0.85, margin: "8px 0", textAlign: "center" },
    pad: { display: "flex", flexDirection: "column", gap: 8, marginTop: 6 },
    dpad: { display: "grid", gridTemplateAreas: `". up ." "left . right" ". down ."`, gridTemplateColumns: "40px 40px 40px", gridTemplateRows: "32px 32px 32px", justifyContent: "center", gap: 3 },
    dbtn: { background: "#1c3a28", color: "#fff", border: "1px solid #2f5a40", borderRadius: 6, fontSize: 14, cursor: "pointer" },
    btns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
    btn: { color: "#0a1a0f", fontWeight: 800, border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
    footer: { display: "flex", justifyContent: "space-between", marginTop: 4 },
    linkBtn: { background: "transparent", color: "#9fd", border: "1px solid #2f5a40", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
}
