"use client"

// Nexus — Poker : VUE DE TABLE PARTAGÉE (felt vert, pot, board, sièges) avec les animations.
// Utilisée par SoloPokerPanel (1re partie) ET PokerPanel (multi) → look/feel identiques.
// Les deux reçoivent le MÊME type PublicTable (redacté). Chaque panneau garde ses propres CONTRÔLES.

import { useMemo } from "react"
import { SUIT_SYMBOL, type Card } from "@/lib/gamebook/yellow/poker/cards"
import { CATEGORY_LABEL, evaluateBest } from "@/lib/gamebook/yellow/poker/handEval"
import type { PublicTable } from "@/lib/gamebook/yellow/poker/room"

const RANK: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }
const rk = (r: number) => RANK[r] ?? String(r)

/** Keyframes partagées (à injecter une fois via <style>{POKER_CSS}</style>). */
export const POKER_CSS = `
@keyframes pkFlip { from { transform: rotateY(90deg) scale(0.9); opacity: 0 } to { transform: rotateY(0) scale(1); opacity: 1 } }
@keyframes pkChip { from { transform: scale(0) translateY(8px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }
@keyframes pkPot { 0%,100% { transform: scale(1) } 50% { transform: scale(1.14) } }
@keyframes pkSay { from { transform: translateY(6px) scale(0.8); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes pkWin { 0%,100% { box-shadow: 0 0 0 rgba(255,213,74,0) } 50% { box-shadow: 0 0 18px 4px rgba(255,213,74,0.85) } }
@keyframes pkPop { 0% { transform: scale(0.4); opacity: 0 } 45% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
`

export function PokerCard({ c, hidden, delay = 0 }: { c?: Card; hidden?: boolean; delay?: number }) {
    if (hidden || !c) return <div style={{ ...cardBox, background: "#2b3550", color: "#66789e", border: "1px solid #1b2236" }}>🂠</div>
    const red = c.suit === 1 || c.suit === 2
    return (
        <div style={{ ...cardBox, color: red ? "#c0392b" : "#141a2e", animation: `pkFlip 0.42s ease-out ${delay}s both` }}>
            <span>{rk(c.rank)}</span><span style={{ fontSize: 15 }}>{SUIT_SYMBOL[c.suit]}</span>
        </div>
    )
}

export function phaseLabel(p: string): string {
    return ({ preflop: "Pré-flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Abattage", handComplete: "Fin de main" } as Record<string, string>)[p] ?? p
}

export function PokerTableView({ table, myUserId, say }: {
    table: PublicTable | null
    myUserId: string
    say?: { seat: number; text: string; n: number } | null
}) {
    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const handDone = table?.phase === "handComplete"
    const winnerIdxs = useMemo(() => (handDone && table ? [...new Set(table.results.flatMap((p) => p.winners))] : []), [handDone, table])
    const iWon = winnerIdxs.includes(mySeatIdx)

    const myHandLabel = useMemo(() => {
        if (!me?.hole || me.hole.length < 2 || !table) return null
        const all = [...me.hole, ...table.community]
        if (all.length < 5) return null
        return CATEGORY_LABEL[evaluateBest(all).category]
    }, [me?.hole, table?.community]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* TABLE (feutre vert) : pot + board */}
            <div style={felt}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    <span key={table?.pot ?? 0} style={{ ...potChip, animation: "pkPot 0.5s ease-out" }}>POT&nbsp;<b>{table?.pot ?? 0}</b>&nbsp;⚡</span>
                </div>
                <div style={{ display: "flex", gap: 5, justifyContent: "center", minHeight: 48 }}>
                    {[0, 1, 2, 3, 4].map((i) => {
                        const c = table?.community[i]
                        return c ? <PokerCard key={`${c.rank}-${c.suit}`} c={c} delay={0.07 * i} /> : <PokerCard key={`b${i}`} hidden />
                    })}
                </div>
                <div style={{ textAlign: "center", fontSize: 11, opacity: 0.85, marginTop: 6, minHeight: 15 }}>
                    {table ? phaseLabel(table.phase) : "…"}{myHandLabel ? ` · ta main : ${myHandLabel}` : ""}
                </div>
            </div>

            {/* Sièges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, margin: "8px 0" }}>
                {(table?.seats ?? []).map((s, i) => {
                    const mine = s.id === myUserId
                    const turn = table && table.toAct === i && !handDone
                    const isWinner = winnerIdxs.includes(i)
                    return (
                        <div key={s.id} style={{
                            ...seatBox, position: "relative",
                            border: isWinner ? "2px solid #ffd54a" : turn ? "2px solid #ffe98a" : "1px solid #ffffff22",
                            opacity: s.folded ? 0.4 : 1,
                            animation: isWinner ? "pkWin 1s ease-in-out infinite" : undefined,
                        }}>
                            {say && say.seat === i && <div key={say.n} style={sayBubble}>{say.text}</div>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                                <span>{i === table?.button ? "🔘 " : ""}{s.name}{s.bot ? " 🤖" : ""}{mine ? " (toi)" : ""}</span>
                                <span style={{ color: "#ffd54a" }}>{s.stack} ⚡</span>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4, minHeight: 44 }}>
                                {s.hole && s.hole.length ? s.hole.map((c, k) => <PokerCard key={`${table?.handId}-${k}`} c={c} delay={0.08 * k} />)
                                    : Array.from({ length: s.holeCount }).map((_, k) => <PokerCard key={k} hidden />)}
                                <span style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                    {s.betThisRound > 0 && <span key={s.betThisRound} style={{ ...betChip, animation: "pkChip 0.35s ease-out" }}>🪙 {s.betThisRound}</span>}
                                    <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, color: s.allIn ? "#b07be0" : s.folded ? "#889" : "#cfd" }}>
                                        {s.sittingOut && !s.folded && !s.allIn ? "en attente" : s.allIn ? "ALL-IN" : s.folded ? "couché" : ""}
                                    </span>
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Résultat de main */}
            {handDone && winnerIdxs.length > 0 && (
                <div style={{ ...banner, background: iWon ? "#2a3d1e" : "#241c2e", animation: "pkPop 0.5s ease-out" }}>
                    {iWon ? "🎉 " : ""}<b>{winnerIdxs.map((wi) => table!.seats[wi]?.name).filter(Boolean).join(", ")}</b> {winnerIdxs.length > 1 ? "se partagent" : "remporte"} le pot !
                </div>
            )}
        </>
    )
}

// === STYLES PARTAGÉS ===
const felt: React.CSSProperties = { background: "radial-gradient(circle at 50% 35%, #1f7a3f, #124b27)", border: "3px solid #6b3f1e", borderRadius: 14, padding: "10px 10px 8px", boxShadow: "inset 0 0 24px #0a2e18, 0 2px 6px #0006", marginBottom: 4 }
const potChip: React.CSSProperties = { display: "inline-block", background: "#0e2a18", border: "2px solid #ffd54a88", color: "#ffe98a", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 800, letterSpacing: 0.4 }
const cardBox: React.CSSProperties = { width: 32, height: 44, borderRadius: 6, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, lineHeight: 1, boxShadow: "0 1px 3px #0006" }
const seatBox: React.CSSProperties = { background: "#1c2231", borderRadius: 9, padding: "6px 8px" }
const sayBubble: React.CSSProperties = { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#fff", color: "#1a1a2e", fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap", boxShadow: "0 2px 6px #0007", zIndex: 3, animation: "pkSay 0.25s ease-out" }
const betChip: React.CSSProperties = { background: "#3a2d0e", border: "1px solid #ffd54a66", color: "#ffe98a", borderRadius: 10, padding: "1px 6px", fontSize: 10.5, fontWeight: 800 }
const banner: React.CSSProperties = { borderRadius: 9, padding: "7px 10px", fontSize: 12.5, textAlign: "center", margin: "2px 0 8px" }
