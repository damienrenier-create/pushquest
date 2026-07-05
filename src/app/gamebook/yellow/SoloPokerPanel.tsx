"use client"

// Nexus — Poker : PREMIÈRE PARTIE (tuto SOLO vs 3 bots, 100 % LOCAL, house-funded).
// Composant ISOLÉ (n'affecte pas la table multijoueur). Règles : la maison offre 100 ⚡ à jouer,
// triche au-dessus de 1000, et reprend son prêt à la sortie (>200 → 100, >500 → 200). Risque nul :
// les reps du joueur ne sont jamais débités, il ne fait qu'encaisser (0 → 800).

import { useEffect, useMemo, useRef, useState } from "react"
import { usePlayer, grantReps, markPokerFirstGameDone } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useLocalPoker } from "@/lib/gamebook/yellow/multiplayer/useLocalPoker"
import { FIRST_GAME_GIFT } from "@/lib/gamebook/yellow/poker/soloSession"
import { SUIT_SYMBOL, type Card } from "@/lib/gamebook/yellow/poker/cards"
import { CATEGORY_LABEL, evaluateBest } from "@/lib/gamebook/yellow/poker/handEval"

const RANK: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }
const rk = (r: number) => RANK[r] ?? String(r)

function CardView({ c, hidden }: { c?: Card; hidden?: boolean }) {
    if (hidden || !c) return <div style={{ ...cardBox, background: "#33405e", color: "#7a8bb0" }}>🂠</div>
    const red = c.suit === 1 || c.suit === 2
    return <div style={{ ...cardBox, color: red ? "#c0392b" : "#1a1a2e" }}><span>{rk(c.rank)}</span><span>{SUIT_SYMBOL[c.suit]}</span></div>
}

export default function SoloPokerPanel({ onDone, myUserId }: { onDone: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, join, act, nextHand, leave, firstHandDone, settleInfo } = useLocalPoker(myUserId, "Toi")
    const [raiseTo, setRaiseTo] = useState(0)
    const [phase, setPhase] = useState<"intro" | "play" | "done">("intro")
    const nextTimer = useRef<number | null>(null)
    const cashingRef = useRef(false) // anti double-encaissement (double-clic / ré-entrance)

    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const myTurn = !!(table && me && !me.folded && !me.allIn && table.toAct === mySeatIdx)
    const toCall = table && me ? Math.max(0, table.currentBet - me.betThisRound) : 0
    const canCheck = toCall === 0
    const minRaiseTo = table ? table.currentBet + table.minRaise : 0
    const maxRaiseTo = me ? me.betThisRound + me.stack : 0

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante ~4 s après une fin de main (déclenche la triche éventuelle).
    // On NE relance PAS si le joueur a fait tapis (stack 0) → il encaisse et part (pas de bots à l'infini).
    useEffect(() => {
        if (phase !== "play" || !table) return
        const meNow = table.seats.find((s) => s.id === myUserId)
        if (meNow && meNow.stack <= 0) return
        if (table.phase === "handComplete") {
            if (nextTimer.current) return
            nextTimer.current = window.setTimeout(() => { nextTimer.current = null; void nextHand() }, 4000)
        }
        return () => { if (nextTimer.current) { window.clearTimeout(nextTimer.current); nextTimer.current = null } }
    }, [table?.phase, table?.handId, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    const myHandLabel = useMemo(() => {
        if (!me?.hole || me.hole.length < 2 || !table) return null
        const all = [...me.hole, ...table.community]
        if (all.length < 5) return null
        return CATEGORY_LABEL[evaluateBest(all).category]
    }, [me?.hole, table?.community]) // eslint-disable-line react-hooks/exhaustive-deps

    async function start() { await join(FIRST_GAME_GIFT); setPhase("play") }
    async function cashOut() {
        if (cashingRef.current) return   // garde : jamais deux encaissements (double-clic)
        cashingRef.current = true
        const kept = await leave()
        if (kept > 0) grantReps(kept)
        markPokerFirstGameDone()   // 1re partie CONSOMMÉE dès l'encaissement → anti re-tuto / anti-farm (reps crédités 1 seule fois)
        persistYellowSave()
        setPhase("done")
    }

    return (
        <div style={overlay}>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — ta première partie</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Blindes 1/2 · offerte par la maison</span>
                </div>

                {phase === "intro" && (
                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <p style={{ margin: "4px 0" }}>La maison t'offre <b>{FIRST_GAME_GIFT} ⚡</b> pour découvrir le poker, en solo contre 3 bots. Tu es <b>obligé de les jouer</b> (au moins une main).</p>
                        <ul style={{ margin: "6px 0", paddingLeft: 18, opacity: 0.9 }}>
                            <li>Au-dessus de <b>1000 ⚡</b>, la maison triche et te reprend l'excédent 😈</li>
                            <li>En partant : tapis <b>&gt; 200</b> → tu rends 100 · <b>&gt; 500</b> → tu rends 200 (intérêts)</li>
                            <li><b>Risque nul</b> : ce sont les jetons de la maison. Tu ne peux <b>rien perdre</b> de tes reps — juste encaisser (0 → 800 ⚡).</li>
                        </ul>
                        <button style={{ ...btn, background: "#4cd964", width: "100%", marginTop: 6 }} onClick={start}>Recevoir {FIRST_GAME_GIFT} ⚡ et jouer</button>
                        <button style={{ ...btn, background: "#334", width: "100%", marginTop: 6 }} onClick={onDone}>Plus tard</button>
                    </div>
                )}

                {phase === "play" && (
                    <>
                        {/* Board */}
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", margin: "10px 0", minHeight: 46 }}>
                            {[0, 1, 2, 3, 4].map((i) => <CardView key={i} c={table?.community[i]} hidden={!table?.community[i]} />)}
                        </div>
                        <div style={{ textAlign: "center", fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                            {table ? phaseLabel(table.phase) : "…"}{myHandLabel ? ` · ta main : ${myHandLabel}` : ""} · Pot {table?.pot ?? 0} ⚡
                        </div>

                        {/* Sièges */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                            {(table?.seats ?? []).map((s, i) => {
                                const mine = s.id === myUserId
                                const turn = table && table.toAct === i
                                return (
                                    <div key={s.id} style={{ ...seatBox, border: turn ? "2px solid #ffd54a" : "1px solid #ffffff22", opacity: s.folded ? 0.45 : 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                                            <span>{i === table?.button ? "🔘 " : ""}{s.name}{s.bot ? " 🤖" : ""}{mine ? " (toi)" : ""}</span>
                                            <span style={{ color: "#ffd54a" }}>{s.stack} ⚡</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                                            {s.hole && s.hole.length ? s.hole.map((c, k) => <CardView key={k} c={c} />)
                                                : Array.from({ length: s.holeCount }).map((_, k) => <CardView key={k} hidden />)}
                                            <span style={{ fontSize: 10, opacity: 0.75, marginLeft: "auto" }}>
                                                {s.allIn ? "ALL-IN" : s.folded ? "couché" : s.betThisRound > 0 ? `mise ${s.betThisRound}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {table?.phase === "handComplete" && table.results.length > 0 && (
                            <div style={{ ...banner, background: "#1e3a24" }}>
                                {table.results.flatMap((p) => p.winners).map((wi) => table.seats[wi]?.name).filter((n, i, a) => n && a.indexOf(n) === i).join(", ")} remporte(nt) le pot ! <span style={{ opacity: 0.7 }}>(main suivante…)</span>
                            </div>
                        )}

                        {/* Actions */}
                        {myTurn ? (
                            <div style={controls}>
                                <button style={{ ...btn, background: "#e0574c" }} onClick={() => act({ kind: "fold" })}>Se coucher</button>
                                {canCheck
                                    ? <button style={{ ...btn, background: "#6aa0ec" }} onClick={() => act({ kind: "check" })}>Check</button>
                                    : <button style={{ ...btn, background: "#6aa0ec" }} onClick={() => act({ kind: "call" })}>Suivre ({Math.min(toCall, me?.stack ?? 0)})</button>}
                                {maxRaiseTo > minRaiseTo && (
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <input type="range" min={minRaiseTo} max={maxRaiseTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} />
                                        <button style={{ ...btn, background: "#ffd54a", color: "#1a1a22" }} onClick={() => act({ kind: "raise", to: raiseTo })}>Relancer à {raiseTo}</button>
                                    </span>
                                )}
                                <button style={{ ...btn, background: "#b07be0" }} onClick={() => act({ kind: "allin" })}>Tapis ({me?.stack ?? 0})</button>
                            </div>
                        ) : (
                            <div style={{ ...controls, opacity: 0.85, fontSize: 12 }}>
                                {table?.phase === "handComplete" ? "Main terminée." : "Les bots réfléchissent…"}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                            {firstHandDone ? (
                                <button style={{ ...btn, background: "#4cd964", color: "#0a2a12" }} onClick={cashOut}>
                                    Encaisser et partir ({me?.stack ?? 0} ⚡ de tapis)
                                </button>
                            ) : (
                                // Échappatoire tant que la 1re main n'est pas finie : quitter sans gain (aucun reps, on pourra retenter).
                                <button style={{ ...btn, background: "#334", color: "#aab" }} onClick={onDone} title="Tu dois jouer au moins une main pour encaisser">
                                    Abandonner (aucun gain)
                                </button>
                            )}
                        </div>
                    </>
                )}

                {phase === "done" && settleInfo && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
                        <div style={{ fontSize: 34, margin: "6px 0" }}>{settleInfo.kept > 0 ? "🎉" : "🫥"}</div>
                        <p style={{ margin: "4px 0" }}>Fin de ta première partie !</p>
                        <div style={{ ...banner, background: "#1c2231", textAlign: "left", fontSize: 12 }}>
                            {settleInfo.repay > 0 && <div>🏦 La maison reprend son prêt : <b>−{settleInfo.repay} ⚡</b></div>}
                            <div style={{ marginTop: 4, color: "#4cd964" }}>💰 Tu encaisses : <b>+{settleInfo.kept} ⚡</b></div>
                        </div>
                        <p style={{ fontSize: 11, opacity: 0.75, margin: "6px 0" }}>Les prochaines parties se jouent à la vraie table, avec tes potes — 100 % aléatoire, sans filet.</p>
                        <button style={{ ...btn, background: "#4cd964", width: "100%" }} onClick={onDone}>Terminer</button>
                    </div>
                )}
            </div>
        </div>
    )
}

function phaseLabel(p: string): string {
    return ({ preflop: "Pré-flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Abattage", handComplete: "Fin de main" } as Record<string, string>)[p] ?? p
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 380, maxWidth: "94vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const cardBox: React.CSSProperties = { width: 30, height: 42, borderRadius: 5, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, lineHeight: 1 }
const seatBox: React.CSSProperties = { background: "#1c2231", borderRadius: 8, padding: "5px 7px" }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center", padding: "8px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }
const banner: React.CSSProperties = { borderRadius: 8, padding: "6px 10px", fontSize: 12, textAlign: "center", marginBottom: 8 }
