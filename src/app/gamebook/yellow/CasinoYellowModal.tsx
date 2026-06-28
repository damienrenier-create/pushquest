"use client"

// src/app/gamebook/yellow/CasinoYellowModal.tsx
//
// Nexus Jaune Éclair — ROULETTE PATTERN du labo (défi Surprise → Tonytony).
// Port yellow du casino pattern du Ch.1, mais 100 % CLIENT & déterministe :
// winningCase = motif fixe[spin % 20]. Mise 10-50 par case, gain = mise ×10.
// 5 victoires d'affilée → banqueroute. Objectif : 1000 énergies BRUTES gagnées.
//
// ANIMATION : au SPIN, la surbrillance balaie les cases 0→10→0… très vite, puis
// DÉCÉLÈRE et s'arrête pile sur la case gagnante (suspense). Le résultat (gain/perte)
// et la dépense d'énergie ne sont révélés/appliqués QU'À l'atterrissage.

import { useState, useRef, useEffect } from "react"
import { usePlayer, casinoSpin, type CasinoBet, type CasinoSpinResult } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { CASINO_NUM_CASES, CASINO_MIN_BET, CASINO_MAX_BET, CASINO_WIN_MULT, TONYTONY_TARGET, TONYTONY_SHINY_TARGET, casinoWinningCase } from "@/lib/gamebook/yellow/data/labDefis"

const GOLD = "#f1c40f", INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"

/**
 * Plan de timing du balayage (COSMÉTIQUE — n'affecte PAS le résultat déterministe). Trois phases :
 *   RAPIDE (1-4 s, ~40-55 ms = blur) → MOYENNE (3-6 s, 60→170 ms) → LENTE (3-5 s, 170→460 ms, décélère)
 * puis 0 à 3 SURSAUTS finaux (nudges à pause croissante : « presque arrêté… puis encore une case »).
 * Construit de sorte que la surbrillance après `delays.length` pas tombe PILE sur `target`.
 */
export function buildSpinDelays(target: number, n: number): number[] {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const delays: number[] = []
    let t: number
    // RAPIDE — blur (~40-55 ms), 0,8-2,8 s
    t = 0; const d1 = rnd(800, 2800)
    while (t < d1) { const dl = Math.round(rnd(38, 55)); delays.push(dl); t += dl }
    // MOYENNE — l'intervalle s'allonge 60 → 170 ms, 2,4-4,5 s
    t = 0; const d2 = rnd(2400, 4500)
    while (t < d2) { const dl = Math.max(45, Math.round(60 + (t / d2) * 110 + rnd(-8, 8))); delays.push(dl); t += dl }
    // LENTE — décélération 170 → 460 ms, 2-3,5 s
    t = 0; const d3 = rnd(2000, 3500)
    while (t < d3) { const dl = Math.round(170 + (t / d3) * 290); delays.push(dl); t += dl }
    // SURSAUTS finaux (0-3) : on aligne la fin de la phase lente sur (target − sursauts) pour qu'ils
    // terminent EXACTEMENT sur target ; chaque sursaut a une pause croissante (~500 / 730 / 960 ms).
    const sursauts = Math.floor(rnd(0, 4)) // 0..3
    const need = (((target - sursauts - delays.length) % n) + n) % n
    for (let i = 0; i < need; i++) delays.push(Math.round(rnd(420, 500)))
    for (let i = 0; i < sursauts; i++) delays.push(Math.round(500 + i * 230 + rnd(0, 140)))
    return delays
}

export default function CasinoYellowModal({ onClose }: { onClose: () => void }) {
    const player = usePlayer()
    const d = player.labDefi
    const [bets, setBets] = useState<Record<number, number>>({})
    const [result, setResult] = useState<CasinoSpinResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [spinning, setSpinning] = useState(false)
    const [highlight, setHighlight] = useState(-1) // case en surbrillance pendant le balayage (-1 = aucune)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Stoppe le balayage si la modale se ferme en plein spin (abandon → aucune dépense appliquée).
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

    const bankruptActive = !!d.casinoBankruptUntil && new Date(d.casinoBankruptUntil).getTime() > Date.now()
    const placed = Object.keys(bets).map(Number)
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0)
    const canSpin = !spinning && !bankruptActive && placed.length > 0 && totalBet > 0 && totalBet <= player.reps
    const won = d.casinoTotalWon
    // Palier en cours : 🥚 Tonytony (1000) → ✨ Tonytony shiny (5000) → plus de palier (cumul libre).
    const nextTarget = !d.tonytonyClaimed ? TONYTONY_TARGET : !d.tonytonyShiny ? TONYTONY_SHINY_TARGET : 0
    const nextLabel = !d.tonytonyClaimed ? "🥚 Tonytony" : !d.tonytonyShiny ? "✨ Tonytony SHINY" : "Cumul gagné"
    const pct = nextTarget ? Math.min(100, Math.round((won / nextTarget) * 100)) : 100

    const toggle = (c: number) => {
        if (spinning) return
        if (bets[c] !== undefined) { const { [c]: _drop, ...rest } = bets; void _drop; setBets(rest) }
        else setBets({ ...bets, [c]: CASINO_MIN_BET })
    }
    const setAmt = (c: number, a: number) => setBets({ ...bets, [c]: Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, a)) })

    const spin = () => {
        if (!canSpin) return
        const payload: CasinoBet[] = Object.entries(bets).map(([c, a]) => ({ case: Number(c), amount: a }))
        // Case gagnante connue d'avance (déterministe) — sert de CIBLE au balayage ; casinoSpin recalculera
        // la MÊME (même spinIndex tant qu'aucun spin n'est appliqué) au moment de l'atterrissage.
        const target = casinoWinningCase(d.casinoSpinIndex)
        setError(null); setResult(null); setSpinning(true)
        // Plan de timing aléatoire (rapide → moyen → lent → sursauts) ; surbrillance finale = target.
        const delays = buildSpinDelays(target, CASINO_NUM_CASES)
        let k = 0
        const tick = () => {
            setHighlight(k % CASINO_NUM_CASES)
            if (k >= delays.length) {
                const r = casinoSpin(payload, Date.now()) // applique : dépense/gain + état casino (même winningCase)
                if (!r.ok) { setError(r.reason ?? "Erreur"); setSpinning(false); return }
                persistYellowSave(); setBets({})
                // La case gagnante CLIGNOTE ~1 s avant que le résultat s'affiche (on voit où la boule s'arrête).
                const win = r.winningCase
                let blinks = 0
                const blink = () => {
                    blinks++
                    setHighlight(blinks % 2 === 1 ? -1 : win)
                    if (blinks >= 6) { setHighlight(win); setResult(r); setSpinning(false); return }
                    timerRef.current = setTimeout(blink, 170)
                }
                setHighlight(win)
                timerRef.current = setTimeout(blink, 320)
                return
            }
            timerRef.current = setTimeout(tick, delays[k++])
        }
        tick()
    }

    return (
        <div onClick={onClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🎰 ROULETTE DORÉE <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>Labo — défi Surprise</span></div>
                <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                    {/* Progression Tonytony */}
                    <div style={{ fontSize: 11, color: INK, marginBottom: 4 }}>{nextLabel} : <b>{won}</b>{nextTarget ? ` / ${nextTarget}` : ""}</div>
                    <div style={{ height: 8, background: DARK, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: !nextTarget || won >= nextTarget ? "#4cd964" : GOLD }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8, background: "#fff8e8", padding: 6, borderRadius: 4, border: `1px solid ${DARK}` }}>
                        <span>⚡ <b>{player.reps}</b></span>
                        <span>🎯 Spin #<b>{d.casinoSpinIndex + 1}</b></span>
                        <span>🔥 Série <b style={{ color: d.casinoWinStreak >= 3 ? "#c0392b" : INK }}>{d.casinoWinStreak}</b></span>
                    </div>
                    <div style={{ fontSize: 10, color: INK, opacity: 0.7, marginBottom: 8 }}>
                        11 cases (0-10). Mise <b>{CASINO_MIN_BET}-{CASINO_MAX_BET}</b>/case. Gain = mise × <b>{CASINO_WIN_MULT}</b> sur la bonne case. Tente ta chance !
                    </div>

                    {bankruptActive ? (
                        <div style={{ background: "#2c1010", color: "#e74c3c", padding: 12, borderRadius: 6, textAlign: "center", fontSize: 12 }}>
                            💥 CASINO EN BANQUEROUTE<br />
                            <span style={{ fontSize: 9, opacity: 0.8 }}>Reviens après {d.casinoBankruptUntil ? new Date(d.casinoBankruptUntil).toLocaleString("fr-FR") : "..."}.</span>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 8 }}>
                                {Array.from({ length: CASINO_NUM_CASES }, (_, i) => {
                                    const lit = (spinning && highlight === i) || (!spinning && result?.winningCase === i) // reste allumée à l'atterrissage
                                    return (
                                        <button key={i} onClick={() => toggle(i)} disabled={spinning}
                                            style={{ ...caseBtn, ...(bets[i] !== undefined ? caseOn : {}), ...(lit ? caseLit : {}) }}>{i}</button>
                                    )
                                })}
                            </div>
                            {placed.length > 0 && (
                                <div style={{ background: "#fff8e8", padding: 8, borderRadius: 4, marginBottom: 8, border: `1px solid ${DARK}` }}>
                                    {placed.map((c) => (
                                        <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 11 }}>
                                            <span style={{ width: 20, color: "#c0392b", fontWeight: 800 }}>{c}</span>
                                            <input type="range" min={CASINO_MIN_BET} max={CASINO_MAX_BET} step={1} value={bets[c]} onChange={(e) => setAmt(c, Number(e.target.value))} disabled={spinning} style={{ flex: 1 }} />
                                            <span style={{ width: 34, textAlign: "right" }}>{bets[c]} ⚡</span>
                                            <button onClick={() => toggle(c)} disabled={spinning} style={xBtn}>✕</button>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: 4, fontSize: 11, textAlign: "right", color: totalBet > player.reps ? "#c0392b" : INK }}>Total : <b>{totalBet} ⚡</b></div>
                                </div>
                            )}
                            <button onClick={spin} disabled={!canSpin} style={{ ...spinBtn, ...(canSpin ? {} : spinOff) }}>{spinning ? "🎰 ……" : "🎰 SPIN"}</button>
                        </>
                    )}

                    {/* Résultat : caché pendant le balayage, révélé à l'atterrissage */}
                    {result && !spinning && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 4, background: result.totalWin ? "#eafaef" : "#fbeaea", border: `2px solid ${result.totalWin ? "#4cd964" : "#e74c3c"}` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>La boule tombe sur la case <span style={{ color: "#c0392b", fontSize: 16 }}>{result.winningCase}</span></div>
                            {result.totalWin ? (
                                <div style={{ fontSize: 11, color: "#1e8449" }}>✅ Gain : <b>+{result.totalWin} ⚡</b>{result.bankrupt && " — 💰 BANQUEROUTE ! (casino fermé 24 h)"}</div>
                            ) : (
                                <div style={{ fontSize: 11, color: "#c0392b" }}>❌ Mise perdue : -{result.totalBet} ⚡. Série remise à 0.</div>
                            )}
                            {!d.tonytonyClaimed && won >= TONYTONY_TARGET && <div style={{ fontSize: 11, color: "#1e8449", marginTop: 4, fontWeight: 700 }}>🥚 1000 atteint ! Ferme et réclame TONYTONY au labo.</div>}
                            {d.tonytonyClaimed && !d.tonytonyShiny && won >= TONYTONY_SHINY_TARGET && <div style={{ fontSize: 11, color: "#1e8449", marginTop: 4, fontWeight: 700 }}>✨ 5000 atteint ! Ferme et rends ton Tonytony SHINY au labo.</div>}
                        </div>
                    )}
                    {error && <div style={{ marginTop: 8, padding: 6, background: "#fbeaea", color: "#c0392b", fontSize: 10, borderRadius: 3 }}>{error}</div>}
                </div>
                <button onClick={onClose} style={closeBtn}>QUITTER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "88%", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const caseBtn: React.CSSProperties = { background: "#fff8e8", border: `1px solid ${DARK}`, color: INK, padding: "8px 4px", fontSize: 14, fontWeight: 800, cursor: "pointer", borderRadius: 3, transition: "transform 60ms, box-shadow 60ms" }
const caseOn: React.CSSProperties = { background: GOLD, border: `2px solid ${INK}` }
const caseLit: React.CSSProperties = { background: "#c0392b", color: "#fff", border: `2px solid ${GOLD}`, transform: "scale(1.12)", boxShadow: `0 0 10px ${GOLD}` }
const xBtn: React.CSSProperties = { background: "#fff", color: "#c0392b", border: `1px solid ${DARK}`, padding: "1px 6px", fontSize: 10, cursor: "pointer", borderRadius: 2 }
const spinBtn: React.CSSProperties = { width: "100%", padding: 10, background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 800, letterSpacing: 1, cursor: "pointer" }
const spinOff: React.CSSProperties = { background: DARK, cursor: "not-allowed" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
