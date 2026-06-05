"use client"

// Nexus Jaune Éclair — écran de combat (UI minimale, style Game Boy).
// Le moteur résout un tour COMPLET et produit une file d'événements ordonnée
// (messages, variations de PV, K.O., changements…). Cet écran REJOUE cette file
// pas à pas : un message attend un tap ; un changement de PV s'anime (la barre
// descend + le Daemon touché tremble) puis on enchaîne. Ainsi les attaques
// paraissent bien séquentielles (jamais simultanées). Aucune règle recalculée ici.

import { useEffect, useRef, useState } from "react"
import { useBattle, submitPlayerAction, endBattle, getBattleEnergy } from "@/lib/gamebook/yellow/store/battleStore"
import { speciesOf, maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { BattleMon } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { ITEMS } from "@/lib/gamebook/yellow/data/items"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { moveCostReps, STRUGGLE_INDEX } from "@/lib/gamebook/yellow/data/combatCostConfig"

type Menu = "root" | "moves" | "switch" | "bag"

interface DispHp { p: number; pMax: number; e: number; eMax: number }

/** Dernier message affiché à (ou avant) l'index courant, pour garder le texte
 *  visible pendant qu'un changement de PV s'anime. */
function lastMessageAt(events: readonly { kind: string; text?: string }[], step: number): string {
    for (let i = Math.min(step, events.length - 1); i >= 0; i--) {
        const e = events[i]
        if (e.kind === "message") return e.text ?? ""
    }
    return ""
}

export default function BattleScreen() {
    const battle = useBattle()
    const [step, setStep] = useState(0)
    const [menu, setMenu] = useState<Menu>("root")
    const [disp, setDisp] = useState<DispHp | null>(null)
    const [shakeP, setShakeP] = useState(0)
    const [shakeE, setShakeE] = useState(0)
    const [ball, setBall] = useState<{ phase: "throw" | "shake" | "result"; shakes: number; caught: boolean } | null>(null)
    const repsWallet = usePlayer()
    const lastBattle = useRef(battle)

    // Initialise les PV affichés au tout début du combat (ils sont ensuite
    // CONSERVÉS d'un tour à l'autre → pas de saut visuel entre les tours).
    useEffect(() => {
        if (battle && disp === null) {
            const p = battle.player.team[battle.player.activeIndex]
            const e = battle.enemy.team[battle.enemy.activeIndex]
            setDisp({ p: p.currentHp, pMax: maxHpOf(p), e: e.currentHp, eMax: maxHpOf(e) })
        }
    }, [battle, disp])

    // Lecture de la file : reset au nouveau tour, sinon traite l'événement courant.
    useEffect(() => {
        if (!battle) return
        // Nouveau tour résolu → on repart au début de la file (et on attend le re-render).
        if (lastBattle.current !== battle) {
            lastBattle.current = battle
            setStep(0)
            setMenu("root")
            setBall(null)
            return
        }
        const ev = battle.events[step]
        if (!ev) return                      // file terminée → menu/fin
        if (ev.kind === "message") return    // on attend un tap du joueur

        // Événement non-textuel : on l'applique puis on enchaîne automatiquement.
        let delay = 140
        if (ev.kind === "ball") {
            if (ev.action === "throw") { setBall({ phase: "throw", shakes: 0, caught: false }); delay = 620 }
            else if (ev.action === "shake") { setBall({ phase: "shake", shakes: ev.shakes ?? 0, caught: false }); delay = Math.max(500, (ev.shakes ?? 0) * 460 + 360) }
            else { setBall({ phase: "result", shakes: 0, caught: !!ev.caught }); delay = 850 }
        } else if (ev.kind === "hp") {
            setDisp((d) => {
                if (!d) return d
                const next = { ...d }
                if (ev.side === "player") {
                    if (ev.hp < d.p) setShakeP((k) => k + 1)
                    next.p = ev.hp; next.pMax = ev.max
                } else {
                    if (ev.hp < d.e) setShakeE((k) => k + 1)
                    next.e = ev.hp; next.eMax = ev.max
                }
                return next
            })
            delay = 340
        } else if (ev.kind === "faint") {
            delay = 320
        }
        const t = setTimeout(() => setStep((s) => s + 1), delay)
        return () => clearTimeout(t)
    }, [battle, step])

    if (!battle) return null

    const events = battle.events
    const playbackDone = step >= events.length
    const waitingForTap = !playbackDone && events[step]?.kind === "message"
    const shownMsg = lastMessageAt(events, step)

    const player = battle.player.team[battle.player.activeIndex]
    const enemy = battle.enemy.team[battle.enemy.activeIndex]

    const isEnded = battle.phase === "ended"
    const needSwitch = battle.forcedSwitch === "player"

    // --- handlers ---
    const advance = () => { if (waitingForTap) setStep((s) => s + 1) }
    const useMove = (i: number) => { submitPlayerAction({ kind: "move", moveIndex: i }); setMenu("root") }
    const useStruggle = () => { submitPlayerAction({ kind: "move", moveIndex: STRUGGLE_INDEX }); setMenu("root") }
    const doSwitch = (i: number) => { submitPlayerAction({ kind: "switch", teamIndex: i }); setMenu("root") }
    const throwBall = (itemId: string) => { submitPlayerAction({ kind: "ball", itemId }); setMenu("root") }
    const useItem = (itemId: string) => { submitPlayerAction({ kind: "item", itemId }); setMenu("root") }
    const run = () => submitPlayerAction({ kind: "run" })

    const pHp = disp?.p ?? player.currentHp
    const pMax = disp?.pMax ?? maxHpOf(player)
    const eHp = disp?.e ?? enemy.currentHp
    const eMax = disp?.eMax ?? maxHpOf(enemy)

    // L'ennemi est "aspiré" par la ball (lancer/secousses, et capture réussie).
    const enemyHiddenByBall = !!ball && (ball.phase === "throw" || ball.phase === "shake" || (ball.phase === "result" && ball.caught))

    // Énergie = LE MÊME portefeuille de reps que la jauge GameBoy (X/repsCap).
    // (Le cap d'énergie PAR COMBAT reste géré côté store et affiché dans le menu Attaque.)
    const reps = repsWallet.reps
    const repsCap = repsWallet.repsCap
    const walletPct = Math.max(0, Math.min(100, (reps / Math.max(1, repsCap)) * 100))

    return (
        <div style={S.root} onClick={waitingForTap ? advance : undefined}>
            {/* ===== Bandeau énergie (= portefeuille de reps, identique à la coque) ===== */}
            <div style={S.energyBar}>
                <span style={{ fontSize: 13 }}>⚡</span>
                <div style={S.energyTrack}><div style={{ ...S.energyFill, width: `${walletPct}%` }} /></div>
                <span style={S.energyTxt}>{reps}/{repsCap}</span>
            </div>

            {/* ===== Scène ===== */}
            <div style={S.scene}>
                <div style={S.enemyRow}>
                    <MonInfo mon={enemy} hp={eHp} max={eMax} />
                    <div style={S.enemySpot}>
                        {!enemyHiddenByBall && <MonSprite mon={enemy} facing="front" alive={eHp > 0} hitKey={shakeE} />}
                        {ball && <BallAnim phase={ball.phase} shakes={ball.shakes} caught={ball.caught} />}
                    </div>
                </div>
                <div style={S.playerRow}>
                    <MonSprite mon={player} facing="back" alive={pHp > 0} hitKey={shakeP} />
                    <MonInfo mon={player} self hp={pHp} max={pMax} />
                </div>
            </div>

            {/* ===== Boîte du bas ===== */}
            <div style={S.bottom}>
                {!playbackDone ? (
                    <div style={S.msgBox}>
                        <p style={S.msgText}>{shownMsg}</p>
                        {waitingForTap && <span style={S.next}>▶</span>}
                    </div>
                ) : isEnded ? (
                    <EndBox outcome={battle.outcome} />
                ) : needSwitch ? (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} forced />
                ) : menu === "root" ? (
                    <div style={S.menuGrid}>
                        <button style={S.btn} onClick={() => setMenu("moves")}>ATTAQUE</button>
                        <button style={S.btn} onClick={() => setMenu("bag")}>SAC</button>
                        <button style={S.btn} onClick={() => setMenu("switch")}>DAEMON</button>
                        <button style={battle.isWild ? S.btn : S.btnDim} disabled={!battle.isWild} onClick={battle.isWild ? run : undefined}>FUITE</button>
                    </div>
                ) : menu === "moves" ? (
                    <MoveMenu mon={player} onPick={useMove} onStruggle={useStruggle} onBack={() => setMenu("root")} />
                ) : menu === "bag" ? (
                    <BagMenu isWild={battle.isWild} mon={player} onUse={useItem} onThrow={throwBall} onBack={() => setMenu("root")} />
                ) : (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} onBack={() => setMenu("root")} />
                )}
            </div>

            <style jsx>{`
                @keyframes hitShake {
                    0% { transform: translateX(0); }
                    15% { transform: translateX(-6px); }
                    30% { transform: translateX(5px); }
                    45% { transform: translateX(-4px); }
                    60% { transform: translateX(3px); }
                    75% { transform: translateX(-2px); }
                    100% { transform: translateX(0); }
                }
                @keyframes ballThrow {
                    0% { transform: translate(-150px, -70px) scale(0.5) rotate(-200deg); opacity: 0; }
                    30% { opacity: 1; }
                    100% { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes ballShake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-18deg) translateX(-3px); }
                    75% { transform: rotate(18deg) translateX(3px); }
                }
                @keyframes ballCaught {
                    0% { transform: scale(1); filter: none; }
                    30% { transform: translateY(-6px) scale(1.05); }
                    55% { transform: translateY(0) scale(1); }
                    60% { filter: brightness(2.2) drop-shadow(0 0 10px #f5d020); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                @keyframes ballEscape {
                    0% { transform: scale(1); opacity: 1; filter: brightness(1); }
                    40% { transform: scale(1.5); opacity: 1; filter: brightness(2.5); }
                    100% { transform: scale(1.9); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

// ============================================================
// Sous-composants
// ============================================================

function MonInfo({ mon, self, hp, max }: { mon: BattleMon; self?: boolean; hp: number; max: number }) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100))
    const col = pct > 50 ? "#48c048" : pct > 20 ? "#f0c040" : "#e04040"
    return (
        <div style={{ ...S.info, alignSelf: self ? "flex-end" : "flex-start" }}>
            <div style={S.infoTop}>
                <span style={S.monName}>{displayName(mon).toUpperCase()}</span>
                <span style={S.monLvl}>N.{mon.level}</span>
            </div>
            <div style={S.hpRow}>
                <span style={S.hpLabel}>PV</span>
                <div style={S.hpTrack}><div style={{ ...S.hpFill, width: `${pct}%`, background: col }} /></div>
            </div>
            {self && <div style={S.hpNum}>{Math.max(0, Math.round(hp))}/{max}</div>}
            {hp > 0 && mon.status !== "NONE" && <span style={S.statusTag}>{mon.status}</span>}
        </div>
    )
}

function MonSprite({ mon, facing, alive, hitKey }: { mon: BattleMon; facing: "front" | "back"; alive: boolean; hitKey: number }) {
    // Sprite PNG (public/) avec repli sur l'initiale si le fichier manque.
    // `key={hitKey}` force un remount à chaque coup encaissé → l'animation de tremblement rejoue.
    const sp = speciesOf(mon)
    const [err, setErr] = useState(false)
    return (
        <div
            key={hitKey}
            style={{
                ...(err ? S.sprite : S.spriteBox),
                opacity: alive ? 1 : 0.25,
                transform: facing === "back" ? "scaleX(-1)" : "none",
                animation: hitKey > 0 ? "hitShake 0.3s ease-in-out" : "none",
            }}
        >
            {err
                ? <span style={S.spriteGlyph}>{sp.name[0]}</span>
                : <img src={sp.sprite} alt={sp.name} onError={() => setErr(true)}
                    style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

function MoveMenu({ mon, onPick, onStruggle, onBack }: { mon: BattleMon; onPick: (i: number) => void; onStruggle: () => void; onBack: () => void }) {
    const reps = usePlayer().reps
    const energy = getBattleEnergy()
    const remainingEnergy = Math.max(0, energy.cap - energy.spent)
    // Les PP sont illimités : chaque attaque coûte des reps (PP bas = plus cher).
    // Une attaque est jouable si on a les reps ET assez d'énergie restante ce combat.
    const costs = mon.moves.map((slot) => moveCostReps(slot.ppMax, mon.level))
    const usable = (c: number) => c <= reps && c <= remainingEnergy
    const canUseAny = costs.some(usable)
    return (
        <div style={S.menuGrid}>
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, display: "flex", justifyContent: "space-between", opacity: 0.85 }}>
                <span>⚡ {remainingEnergy}/{energy.cap} ce combat</span>
                <span>💪 {reps} reps</span>
            </div>
            {mon.moves.map((slot, i) => {
                const m = getMove(slot.moveId)
                const cost = costs[i]
                const off = !usable(cost)
                return (
                    <button key={i} style={off ? S.btnDim : S.btn} disabled={off} onClick={() => onPick(i)}>
                        {m?.name ?? slot.moveId} <span style={S.pp}>⚡{cost}</span>
                    </button>
                )
            })}
            {Array.from({ length: Math.max(0, 4 - mon.moves.length) }).map((_, i) => <span key={`e${i}`} />)}
            {/* Secours gratuit anti soft-lock : visible quand aucune attaque n'est jouable. */}
            {!canUseAny && (
                <button style={{ ...S.btn, gridColumn: "1 / -1", background: "#f0d8a0" }} onClick={onStruggle}>
                    Charge Désespérée <span style={S.pp}>gratuit · recul</span>
                </button>
            )}
            <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>
        </div>
    )
}

function SwitchMenu({ team, activeIndex, onPick, onBack, forced }: {
    team: BattleMon[]; activeIndex: number; onPick: (i: number) => void; onBack?: () => void; forced?: boolean
}) {
    return (
        <div style={S.menuGrid}>
            {forced && <p style={{ ...S.msgText, gridColumn: "1 / -1" }}>Choisis un Daemon !</p>}
            {team.map((m, i) => {
                const ko = m.currentHp <= 0
                const cur = i === activeIndex
                const disabled = ko || cur
                return (
                    <button key={m.uid} style={disabled ? S.btnDim : S.btn} disabled={disabled} onClick={() => onPick(i)}>
                        {displayName(m)} {ko ? "(K.O.)" : `${m.currentHp}PV`}
                    </button>
                )
            })}
            {!forced && onBack && <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>}
        </div>
    )
}

function BagMenu({ isWild, mon, onUse, onThrow, onBack }: {
    isWild: boolean; mon: BattleMon; onUse: (id: string) => void; onThrow: (id: string) => void; onBack: () => void
}) {
    const items = usePlayer().items
    const heals = Object.values(ITEMS).filter((it) => it.category === "HEAL" && (items[it.id] ?? 0) > 0)
    const balls = isWild ? Object.values(ITEMS).filter((it) => it.category === "BALL" && (items[it.id] ?? 0) > 0) : []
    const full = mon.currentHp >= maxHpOf(mon)
    return (
        <div style={S.menuGrid}>
            {heals.length === 0 && balls.length === 0 && (
                <div style={{ gridColumn: "1 / -1", fontSize: 11, fontStyle: "italic", opacity: 0.7, padding: 4 }}>
                    Sac vide ! Va à la boutique.
                </div>
            )}
            {heals.map((it) => (
                <button key={it.id} style={full ? S.btnDim : S.btn} disabled={full} onClick={() => onUse(it.id)}>
                    {it.name} <span style={S.pp}>×{items[it.id]}</span>
                </button>
            ))}
            {balls.map((b) => (
                <button key={b.id} style={S.btn} onClick={() => onThrow(b.id)}>
                    {b.name} <span style={S.pp}>×{items[b.id]}</span>
                </button>
            ))}
            <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>
        </div>
    )
}

function EndBox({ outcome }: { outcome: string | null }) {
    const txt = outcome === "win" ? "Tu remportes le combat !"
        : outcome === "lose" ? "Tous tes Daemons sont K.O…"
            : outcome === "run" ? "Tu as pris la fuite."
                : outcome === "caught" ? "Daemon capturé !"
                    : "Fin du combat."
    return (
        <div style={S.msgBox}>
            <p style={S.msgText}>{txt}</p>
            <button style={{ ...S.btn, marginTop: 8 }} onClick={() => endBattle()}>QUITTER</button>
        </div>
    )
}

// ============================================================
// Styles (GBC-ish, inline pour rester autonome)
// ============================================================

// Nexus-Ball animée : lancer (arc) → secousses (×N) → clic (capturé) ou éclatement (raté).
function BallAnim({ phase, shakes, caught }: { phase: "throw" | "shake" | "result"; shakes: number; caught: boolean }) {
    const anim = phase === "throw" ? "ballThrow 0.6s ease-out forwards"
        : phase === "shake" ? `ballShake 0.42s ease-in-out ${Math.max(0, shakes)}`
            : caught ? "ballCaught 0.8s ease-out forwards"
                : "ballEscape 0.6s ease-out forwards"
    return (
        <div style={{ ...S.ball, animation: anim }}>
            <div style={S.ballTop} />
            <div style={S.ballBand} />
            <div style={S.ballBtn} />
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { width: "100%", maxWidth: 460, margin: "0 auto", fontFamily: "'Courier New', monospace", color: "#1c1408", userSelect: "none" },
    scene: { background: "linear-gradient(#9bd0e0 0%, #c8e89c 60%, #a8d878 100%)", border: "3px solid #1c1408", borderRadius: 6, padding: 14, display: "flex", flexDirection: "column", gap: 18, minHeight: 240 },
    enemyRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    playerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    energyBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#1c1408", border: "2px solid #1c1408", borderRadius: 8, padding: "5px 10px" },
    energyTrack: { flex: 1, height: 12, background: "#3a2c18", borderRadius: 6, overflow: "hidden", border: "1px solid #000" },
    energyFill: { height: "100%", background: "linear-gradient(90deg,#ffe24a,#ff9500)", transition: "width 0.3s ease" },
    energyTxt: { fontSize: 11, fontWeight: 700, color: "#f5d020", minWidth: 92, textAlign: "right" },
    enemySpot: { position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" },
    ball: { position: "absolute", width: 38, height: 38, borderRadius: "50%", background: "#f5f5f5", border: "2px solid #1c1408", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" },
    ballTop: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(#e8503a,#c8301a)" },
    ballBand: { position: "absolute", top: "calc(50% - 2px)", left: 0, right: 0, height: 4, background: "#1c1408" },
    ballBtn: { position: "absolute", top: "calc(50% - 5px)", left: "calc(50% - 5px)", width: 10, height: 10, borderRadius: "50%", background: "#f8f8e8", border: "2px solid #1c1408" },
    info: { background: "#f8f8e8", border: "2px solid #1c1408", borderRadius: 6, padding: "6px 10px", minWidth: 160 },
    infoTop: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 700 },
    monName: { letterSpacing: 1 },
    monLvl: { opacity: 0.8 },
    hpRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
    hpLabel: { fontSize: 9, fontWeight: 700, color: "#c89000" },
    hpTrack: { flex: 1, height: 7, background: "#404040", borderRadius: 4, overflow: "hidden", border: "1px solid #1c1408" },
    hpFill: { height: "100%", transition: "width 0.4s ease" },
    hpNum: { textAlign: "right", fontSize: 10, fontWeight: 700, marginTop: 2 },
    statusTag: { display: "inline-block", marginTop: 3, fontSize: 8, fontWeight: 700, background: "#8868c0", color: "#fff", padding: "1px 5px", borderRadius: 3, letterSpacing: 1 },
    sprite: { width: 72, height: 72, borderRadius: "50%", background: "#ffffff80", border: "3px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center" },
    spriteBox: { width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" },
    spriteGlyph: { fontSize: 34, fontWeight: 900 },
    bottom: { marginTop: 8, minHeight: 96 },
    msgBox: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: 14, minHeight: 72, display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", position: "relative" },
    msgText: { fontSize: 14, lineHeight: 1.5, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 12, animation: "none" },
    menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    btn: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: "12px 10px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1c1408", textAlign: "left" },
    btnDim: { background: "#d8d8c8", border: "3px solid #888", borderRadius: 6, padding: "12px 10px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#888", textAlign: "left" },
    pp: { float: "right", fontSize: 10, opacity: 0.7 },
}
