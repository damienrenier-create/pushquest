"use client"

// Nexus — Poker CASH QUOTIDIEN vs les boss (SOLO, VRAIES reps). Table à 6 (toi + 5 boss). Chaque boss reçoit UNE fois
// par jour le tapis du MENU DE LA SEMAINE (ton buy-in ne le dépasse jamais), puis joue avec ce qu'il a. Un boss
// ruiné (tapis 0) part et revient demain. VERROUS 20/10/2026 : buy-in DÉBITÉ à l'assise (plus de free-roll au
// rechargement), gain net PLAFONNÉ par jour (POKER_DAILY_NET_CAP, l'excédent revient à la maison), robots aux cotes.

import { useEffect, useRef, useState } from "react"
import { usePlayer, creditReps, beginPokerCashGame, savePokerBossStacks, casinoBetAllowed, spendCasinoBet, getGameMode, casinoAllowanceLeft, settleCasinoNet, isCasinoRestricted, CASINO_VOW_MAX_BET } from "@/lib/gamebook/yellow/store/playerStore"
import { CASINO_DAILY_NET_CAP, cashAllowanceLeft, cashBlindsFor, cashBuyinBounds, cashDayStake, pokerMenuFor, menuBossStack, weekdayOfDayKey, POKER_WEEK_MENU, POKER_MENU_ORDER, MAX_TABLE_DEPTH_BB } from "@/lib/gamebook/yellow/poker/cashGame"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useCashPoker } from "@/lib/gamebook/yellow/multiplayer/useCashPoker"
import { PokerTableView, POKER_CSS } from "./PokerTableView"

const BOT_THINK_MS = 1150
const NEXT_HAND_MS = 5000
const todayKey = () => new Date().toISOString().slice(0, 10)

export default function DailyPokerPanel({ onDone, myUserId }: { onDone: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, joinCash, act, botTurn, nextHand, leaveCash, bossBustNote, bossesLeft } = useCashPoker(myUserId, "Toi")
    const [phase, setPhase] = useState<"intro" | "play" | "done">("intro")
    // MENU DE LA SEMAINE (Sartay 20/10/2026) : le JOUR fixe le tapis des boss (le montant du jour, sans dépasser le % de
    //   ta jauge) et ton buy-in ne le dépasse jamais. BLINDES : au moins 2 BB par 1 000 ⚡ de jauge, et la table fait
    //   entre 10 et 100 grosses blindes de profondeur (les jours prestigieux, les blindes montent avec les tapis).
    const today = todayKey()
    const menu = pokerMenuFor(today)
    const dayStake = cashDayStake({ date: player.pokerCashDate, cap: player.pokerCashCap }, today, player.repsCap)
    const restricted = isCasinoRestricted()
    const blinds = cashBlindsFor(player.repsCap, restricted, dayStake)
    const { min: MIN_BUYIN, def: DEFAULT_BUYIN, max: MAX_BUYIN } = buyinBoundsFor(blinds.bb, dayStake, restricted)
    const [buyin, setBuyin] = useState(DEFAULT_BUYIN)
    const [raiseTo, setRaiseTo] = useState(0)
    const [say, setSay] = useState<{ seat: number; text: string; n: number } | null>(null)
    const [result, setResult] = useState<{ tapis: number; net: number; taken: number } | null>(null)
    const seatBuyin = Math.max(MIN_BUYIN, Math.min(MAX_BUYIN, Math.floor(buyin) || 0)) // ce que « S'asseoir » engagera
    const todayNet = player.casinoNetDate === todayKey() ? (player.casinoNetToday ?? 0) : 0 // net CASINO du jour (un autre jour enregistré = marge neuve)
    const allowance = cashAllowanceLeft(todayNet) // marge de gain restante aujourd'hui (plafond net)
    const spentRef = useRef(0)
    const cashingRef = useRef(false)
    const nextTimer = useRef<number | null>(null)
    const sayNonce = useRef(0)

    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const myTurn = !!(table && me && !me.folded && !me.allIn && table.toAct === mySeatIdx)
    const toCall = table && me ? Math.max(0, table.currentBet - me.betThisRound) : 0
    const canCheck = toCall === 0
    const minRaiseTo = table ? table.currentBet + table.minRaise : 0
    const maxRaiseTo = me ? me.betThisRound + me.stack : 0
    const handDone = table?.phase === "handComplete"
    const dayOver = phase === "play" && !!table && bossesLeft === 0 // tous les boss ruinés
    const meRuined = phase === "play" && !!me && me.stack <= 0 && !dayOver // toi ruiné (boss encore là)
    // On n'encaisse qu'ENTRE les mains (main finie / journée finie) : sinon les jetons déjà dans le pot ne
    // seraient pas comptés dans les tapis-du-jour des boss (perte conservatrice + faux « boss ruiné »).
    const canCashOut = handDone || dayOver

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // TEMPO — au tour d'un BOSS (main live), il joue UNE action après un délai.
    useEffect(() => {
        if (phase !== "play" || !table) return
        const live = table.phase === "preflop" || table.phase === "flop" || table.phase === "turn" || table.phase === "river"
        if (!live || table.toAct < 0) return
        const actor = table.seats[table.toAct]
        if (!actor || !actor.bot) return
        const timer = window.setTimeout(() => { const r = botTurn(); if (r) { sayNonce.current += 1; setSay({ ...r, n: sayNonce.current }) } }, BOT_THINK_MS)
        return () => window.clearTimeout(timer)
    }, [table?.toAct, table?.handId, table?.phase, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante (sauf si le joueur est ruiné, ou tous les boss ruinés → on encaisse).
    useEffect(() => {
        if (phase !== "play" || !table || dayOver) return
        const meNow = table.seats.find((s) => s.id === myUserId)
        if (meNow && meNow.stack <= 0) return
        if (table.phase === "handComplete") {
            if (nextTimer.current) return
            nextTimer.current = window.setTimeout(() => { nextTimer.current = null; setSay(null); nextHand() }, NEXT_HAND_MS)
        }
        return () => { if (nextTimer.current) { window.clearTimeout(nextTimer.current); nextTimer.current = null } }
    }, [table?.phase, table?.handId, phase, dayOver]) // eslint-disable-line react-hooks/exhaustive-deps

    function start() {
        // Le tapis des boss du jour est FIXÉ ici (1re assise du jour, menu de la semaine) ; le buy-in ne le dépasse jamais.
        const { cap, bossStacks } = beginPokerCashGame(todayKey(), player.repsCap)
        const bl = cashBlindsFor(player.repsCap, restricted, cap)
        const bounds = buyinBoundsFor(bl.bb, cap, restricted)
        const bi = Math.max(bounds.min, Math.min(player.reps, bounds.max, Math.floor(buyin) || bounds.min))
        if (player.reps < bi) return
        if (!casinoBetAllowed(bi).ok) return // VŒU DU GÉNIE : buy-in au-dessus du cap casino par mise → interdit
        // Marge du jour épuisée → le croupier refuse l'assise (le bouton est déjà grisé ; garde-fou).
        if (casinoAllowanceLeft() <= 0) return
        // BUY-IN DÉBITÉ À L'ASSISE (20/10/2026) : avant, réglé en net à la sortie → recharger la page effaçait une partie
        //   perdue (free-roll). Désormais quitter sans encaisser = perdre son buy-in, comme à une vraie table.
        if (!spendCasinoBet(bi).ok) return
        spentRef.current = bi
        persistYellowSave() // verrouille le débit + le tapis du jour du cash même si la session est ensuite abandonnée
        joinCash(bi, cap, bossStacks, bl)
        setPhase("play")
    }
    function playerAct(move: Parameters<typeof act>[0], text: string) {
        sayNonce.current += 1; setSay({ seat: mySeatIdx, text, n: sayNonce.current })
        act(move)
    }
    function cashOut() {
        if (cashingRef.current) return
        cashingRef.current = true
        const { playerTapis, bossStacks } = leaveCash()
        // Règlement : le buy-in a déjà été débité à l'assise → on rend le tapis, le GAIN net étant borné par la marge du
        //   jour (POKER_DAILY_NET_CAP) ; l'excédent est repris par la maison (« la maison plafonne », comme le tuto).
        const net = playerTapis - spentRef.current
        const principal = Math.min(playerTapis, spentRef.current) // ta mise qui revient (jamais tronquée : c'est ton argent)
        if (principal > 0) creditReps(principal)
        const settled = settleCasinoNet("🃏 Poker", net) // gain borné par la marge CASINO du jour, perte comptée en négatif
        const back = principal + Math.max(0, settled.credit)
        savePokerBossStacks(bossStacks)
        persistYellowSave()
        setResult({ tapis: back, net: settled.credit, taken: settled.taken })
        setPhase("done")
    }

    return (
        <div style={overlay}>
            <style>{POKER_CSS}</style>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — cash du jour vs les boss</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>{menu.dish} · Blindes {blinds.sb}/{blinds.bb}</span>
                </div>

                {phase === "intro" && (
                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <p style={{ margin: "4px 0" }}>Table à <b>6</b> : toi + <b>5 boss</b> de la Ligue et des arènes. {getGameMode() === "fun" ? <>Ta <b>vraie énergie ⚡</b> est en jeu</> : <><b>Vraies reps</b></>} — tu gagnes et tu perds pour de vrai.</p>
                        <div style={menuBox}>
                            <div style={{ fontWeight: 800, marginBottom: 4 }}>🧑‍⚖️ Le croupier : « Mesdames et messieurs, le menu de la semaine ! »</div>
                            <table style={menuTable}>
                                <thead>
                                    <tr><th style={menuTh}>Jour</th><th style={menuTh}>Au menu</th><th style={{ ...menuTh, textAlign: "right" }}>Par boss</th><th style={{ ...menuTh, textAlign: "right" }}>Pour toi</th></tr>
                                </thead>
                                <tbody>
                                    {POKER_MENU_ORDER.map((wd) => {
                                        const m = POKER_WEEK_MENU[wd]
                                        const isToday = wd === weekdayOfDayKey(today)
                                        return (
                                            <tr key={wd} style={isToday ? menuToday : undefined}>
                                                <td style={menuNum}>{isToday ? "▶ " : ""}{m.day.slice(0, 3)}</td>
                                                <td style={menuTd}>{m.dish}</td>
                                                <td style={{ ...menuNum, textAlign: "right", opacity: 0.75 }}>{fmtN(m.amount)} · {m.pct} %</td>
                                                <td style={{ ...menuNum, textAlign: "right", fontWeight: 800 }}>{fmtN(isToday ? dayStake : menuBossStack(m, player.repsCap))} ⚡</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 4 }}>Par boss : le montant du jour, sans dépasser ce % de ta jauge (« pour toi » : avec ta jauge de {fmtN(player.repsCap)} ⚡). Tu ne t'assois jamais plus gros qu'un boss, et le plafond du casino (+{fmtN(CASINO_DAILY_NET_CAP)} ⚡ net par jour) tient même le samedi.</div>
                        </div>
                        <ul style={{ margin: "6px 0", paddingLeft: 18, opacity: 0.9 }}>
                            <li>Aujourd'hui (<b>{menu.day}</b>, {menu.dish}), chaque boss reçoit <b>une fois</b> un tapis de <b>{fmtN(dayStake)} ⚡</b>, puis joue avec ce qu'il a : il <b>garde ses gains</b>, ses pertes ne lui sont pas rendues.</li>
                            <li>Ton buy-in : de {fmtN(MIN_BUYIN)} à <b>{fmtN(MAX_BUYIN)} ⚡</b>, jamais plus gros qu'un boss. Il est <b>débité à l'assise</b> : quitter sans encaisser, c'est le perdre.</li>
                            <li>Blindes <b>{blinds.sb}/{blinds.bb}</b> : au moins 2 BB par 1 000 ⚡ de ta jauge, et jamais plus de {MAX_TABLE_DEPTH_BB} BB de profondeur — les jours prestigieux, les blindes montent avec les tapis.</li>
                            <li>Le casino <b>plafonne</b> : au plus <b>+{CASINO_DAILY_NET_CAP} ⚡ net par jour</b>, poker, roulette et blackjack confondus (il te reste <b>{allowance} ⚡</b> de marge aujourd'hui) ; l'excédent revient à la maison.</li>
                            <li>Un boss que tu <b>ruines</b> (tapis 0) <b>quitte la table</b> et ne revient que <b>demain</b>.</li>
                            <li>Tu peux <b>encaisser</b> ton tapis et partir quand tu veux.</li>
                        </ul>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                            <span style={{ fontSize: 12 }}>{getGameMode() === "fun" ? "Énergie" : "Reps"} : <b>{player.reps} ⚡</b> · Buy-in :</span>
                            <input type="number" min={MIN_BUYIN} max={Math.min(player.reps, MAX_BUYIN)} value={buyin} onChange={(e) => setBuyin(Number(e.target.value))} style={inp} />
                            <button style={{ ...btn, background: "#334", padding: "6px 9px" }} onClick={() => setBuyin(Math.max(MIN_BUYIN, Math.min(player.reps, MAX_BUYIN)))}>max</button>
                        </div>
                        {buyin > MAX_BUYIN && <div style={{ fontSize: 10.5, color: "#ffd54a", textAlign: "center", marginBottom: 4 }}>🧑‍⚖️ « Pas plus gros qu&apos;un boss : {fmtN(MAX_BUYIN)} ⚡ au plus aujourd&apos;hui. »</div>}
                        {allowance <= 0 && <div style={{ ...bustBanner, background: "#3a2e1e" }}>🧑‍⚖️ Le croupier : « Tu as assez plumé la maison pour aujourd'hui. Reviens demain. »</div>}
                        <button style={{ ...bigBtn, background: allowance > 0 ? "#4cd964" : "#334", color: allowance > 0 ? "#0a2a12" : "#889", width: "100%" }} disabled={allowance <= 0 || player.reps < seatBuyin} onClick={start}>
                            S'asseoir ({seatBuyin} ⚡)
                        </button>
                        {player.reps < seatBuyin && <div style={{ fontSize: 10.5, color: "#e0a0a0", textAlign: "center", marginTop: 4 }}>Pas assez {getGameMode() === "fun" ? "d'énergie" : "de reps"} (min {MIN_BUYIN} ⚡).</div>}
                        <button style={{ ...btn, background: "#334", width: "100%", marginTop: 6 }} onClick={onDone}>Fermer</button>
                    </div>
                )}

                {phase === "play" && (
                    <>
                        {bossBustNote && <div key={bossBustNote} style={{ ...bustBanner, animation: "pkPop 0.5s ease-out" }}>{bossBustNote}</div>}
                        <PokerTableView table={table} myUserId={myUserId} say={say} />

                        {dayOver ? (
                            <div style={{ ...bustBanner, background: "#2a3d1e" }}>🏆 Tu as ruiné tous les boss du jour ! Encaisse — ils reviennent demain.</div>
                        ) : meRuined ? (
                            <div style={{ ...bustBanner, background: "#3a1e1e" }}>💥 Tu es ruiné — encaisse pour régler tes pertes (attends la fin de la main).</div>
                        ) : handDone ? (
                            <div style={{ textAlign: "center", fontSize: 11, opacity: 0.65, marginBottom: 4 }}>main suivante…</div>
                        ) : null}

                        {myTurn && !dayOver ? (
                            <div style={controls}>
                                <button style={{ ...bigBtn, background: "#e0574c" }} onClick={() => playerAct({ kind: "fold" }, "je me couche")}>Se coucher</button>
                                {canCheck
                                    ? <button style={{ ...bigBtn, background: "#5b8fe0" }} onClick={() => playerAct({ kind: "check" }, "check")}>Check</button>
                                    : <button style={{ ...bigBtn, background: "#5b8fe0" }} onClick={() => playerAct({ kind: "call" }, "je suis")}>Suivre {Math.min(toCall, me?.stack ?? 0)}</button>}
                                <button style={{ ...bigBtn, background: "#b07be0" }} onClick={() => playerAct({ kind: "allin" }, "TAPIS !")}>Tapis ({me?.stack ?? 0})</button>
                                {maxRaiseTo > minRaiseTo && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", marginTop: 2 }}>
                                        <input type="range" min={minRaiseTo} max={maxRaiseTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} style={{ flex: 1, maxWidth: 150 }} />
                                        <button style={{ ...bigBtn, background: "#ffd54a", color: "#1a1a22" }} onClick={() => playerAct({ kind: "raise", to: raiseTo }, `relance à ${raiseTo}`)}>Relancer à {raiseTo}</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ ...controls, opacity: 0.9, fontSize: 12, minHeight: 36, alignItems: "center" }}>
                                {dayOver || meRuined || handDone ? "" : "⏳ les boss réfléchissent…"}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                            <button style={{ ...btn, background: canCashOut ? "#4cd964" : "#334", color: canCashOut ? "#0a2a12" : "#889" }} disabled={!canCashOut} onClick={cashOut}
                                title={canCashOut ? "" : "Attends la fin de la main pour encaisser"}>
                                Encaisser et partir ({me?.stack ?? 0} ⚡)
                            </button>
                        </div>
                    </>
                )}

                {phase === "done" && result && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
                        <div style={{ fontSize: 38, margin: "6px 0", animation: "pkPop 0.6s ease-out" }}>{result.net > 0 ? "🤑" : result.net < 0 ? "😬" : "😐"}</div>
                        <p style={{ margin: "4px 0" }}>Tu quittes la table avec <b>{result.tapis} ⚡</b>.</p>
                        <div style={{ ...bustBanner, background: result.net >= 0 ? "#1e3a24" : "#3a1e1e" }}>
                            {result.net >= 0 ? `💰 Bénéfice du jour : +${result.net} ⚡` : `📉 Perte : ${result.net} ⚡`}
                        </div>
                        {result.taken > 0 && <div style={{ ...bustBanner, background: "#3a2e1e" }}>🧑‍⚖️ La maison plafonne : <b>{result.taken} ⚡</b> repris (max +{CASINO_DAILY_NET_CAP} ⚡ net par jour, tout casino confondu).</div>}
                        <p style={{ fontSize: 11, opacity: 0.75, margin: "6px 0" }}>Les boss ruinés reviennent demain, plus remontés que jamais.</p>
                        <button style={{ ...bigBtn, background: "#4cd964", color: "#0a2a12", width: "100%" }} onClick={onDone}>Terminer</button>
                    </div>
                )}
            </div>
        </div>
    )
}

/** Bornes de buy-in du jour ; sous vœu du génie, la mise reste aussi ≤ CASINO_VOW_MAX_BET. */
function buyinBoundsFor(bb: number, stake: number, restricted: boolean): { min: number; def: number; max: number } {
    const b = cashBuyinBounds(bb, stake)
    const max = restricted ? Math.min(b.max, CASINO_VOW_MAX_BET) : b.max
    return { min: Math.min(b.min, max), def: Math.min(b.def, max), max }
}
const fmtN = (n: number) => Math.floor(n).toLocaleString("fr-FR")

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 400, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", justifyContent: "center", padding: "6px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }
const bigBtn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 11, padding: "12px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", minWidth: 84, boxShadow: "0 2px 5px #0005" }
const inp: React.CSSProperties = { width: 72, padding: "7px 6px", borderRadius: 6, border: "1px solid #445", background: "#0e1119", color: "#fff", fontSize: 13 }
const bustBanner: React.CSSProperties = { borderRadius: 9, padding: "7px 10px", fontSize: 12.5, textAlign: "center", margin: "2px 0 8px", background: "#3a1e2e", fontWeight: 700 }
const menuBox: React.CSSProperties = { background: "#1b2130", border: "1px solid #2c3550", borderRadius: 10, padding: "8px 10px", margin: "8px 0", fontSize: 11.5, lineHeight: 1.45 }
const menuTable: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }
const menuTh: React.CSSProperties = { textAlign: "left", fontSize: 9.5, fontWeight: 700, opacity: 0.6, padding: "2px 4px", textTransform: "uppercase", letterSpacing: 0.4 }
const menuTd: React.CSSProperties = { padding: "3px 4px", borderTop: "1px solid #ffffff12" }
const menuNum: React.CSSProperties = { ...menuTd, whiteSpace: "nowrap" }
const menuToday: React.CSSProperties = { background: "#ffd54a22", color: "#ffd54a" }
