"use client"

// src/app/gamebook/yellow/LabPanel.tsx
//
// Nexus Jaune Éclair — TERMINAL D'EXPÉRIENCES (labo, étage de l'infirmerie).
// HUB des défis du labo : 3 onglets.
//   PHYSIQUE : 50 pompes/1h, 150 squats/série (1×), quota×2 → demain×3  (validés SERVEUR sur tes vraies reps)
//   CT       : choisis un type + une CT, inflige puissance×100 dégâts du type (compté en combat)
//   SURPRISE : roulette dorée → gagne 1000 énergies cumulées → Tonytony
// PAUSE : tant que tu es Champion sans avoir récupéré la Daemonflûte, le labo est réservé à ta récompense.

import { useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import {
    usePlayer, startLabDefi, clearLabDefi, grantReps, grantCt, recordCtEarned,
    setTomorrowEnergyMult, markSquat150Done, grantTonytony, ctDefiProgress,
} from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import {
    PHYSICAL_DEFIS, PHYSICAL_ENERGY_REWARD, QUOTA2X_MULT,
    ctDefiOptions, ctDefiThreshold, ctEarnedCountByType, CT_PER_TYPE_MAX, TONYTONY_TARGET,
} from "@/lib/gamebook/yellow/data/labDefis"
import { postLabDefiStart, postLabDefiCheck } from "@/lib/gamebook/yellow/labDefiApi"
import { getCt } from "@/lib/gamebook/yellow/data/cts"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { POKE_TYPES, type PokeType } from "@/lib/gamebook/yellow/battle/types"
import CasinoYellowModal from "./CasinoYellowModal"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"
const FLUTE_ITEM = "daemonflute"

const TYPE_EMOJI: Record<string, string> = {
    NORMAL: "⭐", FEU: "🔥", EAU: "💧", PLANTE: "🌿", ELEC: "⚡", GLACE: "🧊", COMBAT: "🥊",
    POISON: "☠️", SOL: "⛰️", VOL: "🕊️", PSY: "🔮", INSECTE: "🐛", ROCHE: "🪨", SPECTRE: "👻", DRAGON: "🐉",
}

/** Demain (YYYY-MM-DD) à partir d'une date ISO du jour (arithmétique UTC, sans dérive de fuseau). */
function addOneDay(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

export default function LabPanel() {
    const open = useGameStore((s) => s.labOpen)
    const close = useGameStore((s) => s.closeLab)
    const player = usePlayer()
    const [tab, setTab] = useState<"phys" | "ct" | "surprise">("phys")
    const [ctType, setCtType] = useState<PokeType | null>(null)
    const [casino, setCasino] = useState(false)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    if (!open) return null

    const d = player.labDefi
    const active = d.active
    const paused = player.isChampion && (player.items[FLUTE_ITEM] ?? 0) <= 0 && !player.sylvebarbeAwake
    const today = player.creditedThrough || new Date().toISOString().slice(0, 10)

    // ── Actions ──
    const startPhys = async (kind: "pushup1h" | "squat150" | "quota2x") => {
        setBusy(true); setMsg(null)
        const resp = await postLabDefiStart(kind)
        startLabDefi({ kind, startedAt: resp.now ?? new Date().toISOString(), startSnapshot: kind === "pushup1h" ? (resp.snapshot ?? 0) : undefined })
        persistYellowSave(); setBusy(false)
        setMsg(kind === "pushup1h" ? "⏱️ Chrono lancé : 50 pompes en 1 heure !" : "Défi lancé. Reviens réclamer une fois réussi.")
    }
    const claimPhys = async () => {
        if (!active) return
        setBusy(true); setMsg(null)
        const r = await postLabDefiCheck(active.kind, active.startSnapshot, active.startedAt)
        setBusy(false)
        if (!r.validated) {
            setMsg(r.expired ? "⏱️ Délai dépassé — défi raté. Relance-le." : "Pas encore réussi. Continue tes reps !")
            if (r.expired) { clearLabDefi(); persistYellowSave() }
            return
        }
        if (active.kind === "quota2x") {
            setTomorrowEnergyMult(QUOTA2X_MULT, addOneDay(today))
            setMsg(`✅ Quota doublé ! Tes énergies de demain seront ×${QUOTA2X_MULT}.`)
        } else {
            if (active.kind === "squat150") markSquat150Done()
            const got = grantReps(PHYSICAL_ENERGY_REWARD)
            setMsg(`✅ Défi réussi ! +${got} énergie.`)
        }
        clearLabDefi(); persistYellowSave()
    }
    const startCt = (ctId: string, type: PokeType, power: number) => {
        const earned = ctEarnedCountByType(d.ctEarned, type)
        const mv = getCt(ctId)
        startLabDefi({ kind: "ct", startedAt: new Date().toISOString(), ctType: type, ctMoveId: mv?.moveId, ctTargetCtId: ctId, ctThreshold: ctDefiThreshold(power, earned) })
        persistYellowSave()
        setMsg(`Défi CT lancé : inflige ${ctDefiThreshold(power, earned)} dégâts ${type} en combat.`)
    }
    const claimCt = () => {
        if (!active || active.kind !== "ct" || !active.ctTargetCtId || !active.ctThreshold) return
        if (ctDefiProgress() < active.ctThreshold) { setMsg(`Pas encore : ${ctDefiProgress()}/${active.ctThreshold} dégâts ${active.ctType}.`); return }
        grantCt(active.ctTargetCtId); recordCtEarned(active.ctTargetCtId)
        const move = active.ctMoveId ? getMove(active.ctMoveId)?.name : active.ctTargetCtId
        clearLabDefi(); persistYellowSave()
        setMsg(`✅ CT gagnée : ${move} ! Le scientifique te la remet.`)
    }
    const abandon = () => { clearLabDefi(); persistYellowSave(); setMsg("Défi abandonné.") }
    const claimTonytony = () => {
        const where = grantTonytony()
        persistYellowSave()
        setMsg(where ? `🥚 TONYTONY rejoint ${where === "team" ? "ton équipe" : "ton PC"} !` : "Cumul insuffisant ou déjà obtenu.")
    }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🖥️ TERMINAL D'EXPÉRIENCES <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>Labo scientifique</span></div>

                {paused ? (
                    <div style={{ padding: 16, fontSize: 12, color: INK, lineHeight: 1.5 }}>
                        🔒 Le labo est réservé à ta <b>récompense de sacre</b>. Parle d'abord au <b>scientifique</b> pour récupérer la <b>Daemonflûte</b>, puis reviens — les défis rouvriront.
                    </div>
                ) : (
                    <>
                        {/* Onglets */}
                        <div style={{ display: "flex", borderBottom: `2px solid ${DARK}` }}>
                            {([["phys", "⚡ Physique"], ["ct", "💿 CT"], ["surprise", "🎁 Surprise"]] as const).map(([k, lbl]) => (
                                <button key={k} onClick={() => { setTab(k); setMsg(null) }} style={{ ...tabBtn, ...(tab === k ? tabOn : {}) }}>{lbl}</button>
                            ))}
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                            {/* ─── PHYSIQUE ─── */}
                            {tab === "phys" && (active?.kind && active.kind !== "ct" ? (
                                <ActiveBox title={PHYSICAL_DEFIS.find((x) => x.kind === active.kind)?.label ?? "Défi"} desc={PHYSICAL_DEFIS.find((x) => x.kind === active.kind)?.desc ?? ""}>
                                    <button onClick={claimPhys} disabled={busy} style={primary}>{busy ? "…" : "Vérifier / Réclamer"}</button>
                                    <button onClick={abandon} disabled={busy} style={ghost}>Abandonner</button>
                                </ActiveBox>
                            ) : (
                                <>
                                    <Hint>Défis sur tes <b>vraies reps PushQuest</b> (vérifiés serveur). Un seul défi à la fois.</Hint>
                                    {PHYSICAL_DEFIS.filter((x) => !(x.kind === "squat150" && d.squat150Done)).map((x) => (
                                        <Card key={x.kind} title={x.label} desc={x.desc} reward={x.reward}>
                                            <button onClick={() => startPhys(x.kind)} disabled={busy || !!active} style={primary}>{active ? "Défi en cours…" : "Lancer"}</button>
                                        </Card>
                                    ))}
                                    {d.squat150Done && <Hint>✅ « 150 squats en 1 série » déjà accompli (à vie).</Hint>}
                                </>
                            ))}

                            {/* ─── CT ─── */}
                            {tab === "ct" && (active?.kind === "ct" ? (
                                <ActiveBox title={`Défi CT — ${active.ctType}`} desc={`Inflige des dégâts ${active.ctType} en combat.`}>
                                    <div style={{ fontSize: 12, color: INK, margin: "4px 0 8px" }}>Progression : <b>{ctDefiProgress()}</b> / {active.ctThreshold} dégâts</div>
                                    <button onClick={claimCt} disabled={ctDefiProgress() < (active.ctThreshold ?? Infinity)} style={ctDefiProgress() >= (active.ctThreshold ?? Infinity) ? primary : ghost}>Réclamer la CT</button>
                                    <button onClick={abandon} style={ghost}>Abandonner</button>
                                </ActiveBox>
                            ) : (
                                <>
                                    <Hint>Choisis un <b>type</b>, puis une CT. Inflige <b>puissance × 100</b> dégâts de ce type en combat. Max {CT_PER_TYPE_MAX}/type (la 2ᵉ coûte ×2).</Hint>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 10 }}>
                                        {POKE_TYPES.map((t) => (
                                            <button key={t} onClick={() => setCtType(t)} title={t} style={{ ...typeBtn, ...(ctType === t ? typeOn : {}) }}>{TYPE_EMOJI[t]}</button>
                                        ))}
                                    </div>
                                    {ctType && <CtOptions type={ctType} earned={d.ctEarned} owned={player.ownedCts} onPick={startCt} />}
                                </>
                            ))}

                            {/* ─── SURPRISE ─── */}
                            {tab === "surprise" && (
                                <Card title="🎰 Roulette dorée → 🥚 Tonytony" desc="Gagne 1000 énergies cumulées au jeu pour décrocher Tonytony, le Daemon porte-bonheur. La bonne case suit un motif… à percer." reward={`Cumul : ${d.casinoTotalWon} / ${TONYTONY_TARGET}`}>
                                    {d.tonytonyClaimed ? (
                                        <div style={{ fontSize: 12, color: "#1e8449" }}>🥚 Tonytony déjà obtenu. Merci d'avoir joué !</div>
                                    ) : d.casinoTotalWon >= TONYTONY_TARGET ? (
                                        <button onClick={claimTonytony} style={primary}>🥚 Réclamer Tonytony</button>
                                    ) : (
                                        <button onClick={() => setCasino(true)} style={primary}>🎰 Jouer à la roulette</button>
                                    )}
                                </Card>
                            )}

                            {msg && <div style={{ marginTop: 10, padding: 8, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, fontSize: 12, color: INK }}>{msg}</div>}
                        </div>
                    </>
                )}
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
            {casino && <CasinoYellowModal onClose={() => setCasino(false)} />}
        </div>
    )
}

// ── Sous-composant : options de CT pour un type ──
function CtOptions({ type, earned, owned, onPick }: { type: PokeType; earned: string[]; owned: string[]; onPick: (ctId: string, type: PokeType, power: number) => void }) {
    const earnedOfType = ctEarnedCountByType(earned, type)
    if (earnedOfType >= CT_PER_TYPE_MAX) return <Hint>Plafond atteint pour ce type ({CT_PER_TYPE_MAX} CT gagnées).</Hint>
    const opts = ctDefiOptions().filter((o) => o.type === type && !earned.includes(o.ctId) && !owned.includes(o.ctId))
    if (opts.length === 0) return <Hint>Aucune CT {type} restante à gagner ici.</Hint>
    return (
        <>
            {opts.map((o) => {
                const move = getMove(o.moveId)
                return (
                    <Card key={o.ctId} title={`${move?.name ?? o.moveId} (${o.power})`} desc={`CT ${type}`} reward={`Seuil : ${ctDefiThreshold(o.power, earnedOfType)} dégâts`}>
                        <button onClick={() => onPick(o.ctId, type, o.power)} style={primary}>Lancer ce défi</button>
                    </Card>
                )
            })}
        </>
    )
}

// ── Petits composants de présentation ──
function Card({ title, desc, reward, children }: { title: string; desc: string; reward: string; children: React.ReactNode }) {
    return (
        <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{title}</div>
            <div style={{ fontSize: 11, color: INK, opacity: 0.75, margin: "2px 0 4px" }}>{desc}</div>
            <div style={{ fontSize: 11, color: "#1e8449", fontWeight: 700, marginBottom: 6 }}>🎁 {reward}</div>
            {children}
        </div>
    )
}
function ActiveBox({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
    return (
        <div style={{ ...cardStyle, border: "2px solid #3a8ee0", background: "#eaf4ff" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>⏳ En cours : {title}</div>
            <div style={{ fontSize: 11, color: INK, opacity: 0.75, marginBottom: 6 }}>{desc}</div>
            {children}
        </div>
    )
}
function Hint({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, color: INK, opacity: 0.7, lineHeight: 1.4, marginBottom: 10 }}>{children}</div>
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 460, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const tabBtn: React.CSSProperties = { flex: 1, padding: "8px 4px", background: "transparent", border: "none", borderBottom: "3px solid transparent", color: INK, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const tabOn: React.CSSProperties = { borderBottom: "3px solid #3a8ee0", background: "#fff8e8" }
const cardStyle: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: 10, marginBottom: 8 }
const primary: React.CSSProperties = { width: "100%", padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: "pointer", marginTop: 2 }
const ghost: React.CSSProperties = { width: "100%", padding: "6px 0", background: "transparent", color: INK, border: `1px solid ${DARK}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer", marginTop: 6 }
const typeBtn: React.CSSProperties = { padding: "8px 2px", background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 4, fontSize: 16, cursor: "pointer" }
const typeOn: React.CSSProperties = { border: "2px solid #3a8ee0", background: "#eaf4ff" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
