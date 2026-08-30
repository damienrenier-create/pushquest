"use client"

// Nexus Jaune Éclair — MAÎTRE DES CAPACITÉS (étage du Centre Daemon).
// Fait RÉAPPRENDRE à un Daemon de l'équipe une attaque de son learnset qu'il a oubliée
// (palier de niveau atteint), contre des reps au prix CROISSANT. Ouvert par le PNJ via
// le flag store `moveReminderOpen` (comme LabPanel). Le remplacement de slot (4 capacités
// pleines) réutilise <MoveCompare/>.

import { useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer, relearnableMoves, moveReminderPrice, relearnMove } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { MOVES } from "@/lib/gamebook/yellow/data/moves"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import type { PokeType } from "@/lib/gamebook/yellow/battle/types"
import MoveCompare from "./MoveCompare"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"
const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace",
    COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte",
    ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée", METAL: "Métal", TENEBRES: "Ténèbres",
}
const TYPE_COLOR: Record<PokeType, string> = {
    NORMAL: "#9a9a82", FEU: "#e8623a", EAU: "#3a8ee0", PLANTE: "#4caf50", ELEC: "#f5c518", GLACE: "#5fc7d8",
    COMBAT: "#c0392b", POISON: "#9b59b6", SOL: "#caa15a", VOL: "#8eb4e8", PSY: "#e84a8a", INSECTE: "#9abb2a",
    ROCHE: "#b8a060", SPECTRE: "#6a5acd", DRAGON: "#7b5cd6", FEE: "#d85ab8", METAL: "#8a97a8", TENEBRES: "#4a4258",
}

export default function MoveReminderPanel() {
    const open = useGameStore((s) => s.moveReminderOpen)
    const close = useGameStore((s) => s.closeMoveReminder)
    const player = usePlayer()
    const [uid, setUid] = useState<string | null>(null)
    const [pending, setPending] = useState<string | null>(null) // move choisi qui attend un remplacement de slot (4 pleins)
    const [msg, setMsg] = useState<string | null>(null)

    if (!open) return null
    const team = player.team
    const mon = uid ? team.find((m) => m.uid === uid) ?? null : null
    const price = moveReminderPrice()
    const reps = player.reps

    const back = () => { setUid(null); setPending(null); setMsg(null) }
    const doClose = () => { back(); close() }

    // Enseigne un move (branche <4 slots → direct ; 4 slots → passe par MoveCompare via `pending`).
    function tryLearn(mv: string) {
        if (!mon) return
        setMsg(null)
        if (reps < price) { setMsg(`Pas assez d'énergie : il te faut ⚡${price}.`); return }
        if (mon.moves.length < 4) {
            const r = relearnMove(mon.uid, mv)
            if (r.ok) { persistYellowSave(); setMsg(`✅ ${MOVES[mv]?.name ?? mv} réappris ! (−⚡${price})`) }
            else setMsg(r.reason === "reps" ? `Pas assez d'énergie : il te faut ⚡${price}.` : "Impossible d'apprendre cette capacité.")
        } else {
            setPending(mv) // 4 capacités → l'écran de remplacement choisit laquelle oublier
        }
    }

    return (
        <div onClick={doClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>
                    🥋 MAÎTRE DES CAPACITÉS
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7a5a1e" }}>⚡ {reps}</span>
                </div>

                {!mon && (
                    <>
                        <div style={intro}>« Un Daemon a oublié une capacité ? Je peux la lui rappeler… contre un peu d'énergie. Choisis-le. »</div>
                        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                            {team.length === 0 && <div style={muted}>Aucun Daemon dans ton équipe.</div>}
                            {team.map((m) => {
                                const sp = getSpecies(m.speciesId)
                                const n = relearnableMoves(m).length
                                return (
                                    <div key={m.uid} style={{ ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}
                                        role="button" tabIndex={0} onClick={() => { setUid(m.uid); setMsg(null) }}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setUid(m.uid); setMsg(null) } }}>
                                        <span style={{ position: "relative", width: 30, height: 30, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: TYPE_COLOR[sp?.types[0] ?? "NORMAL"], borderRadius: 6, color: "#fff", fontWeight: 800, fontSize: 13 }}>
                                            {(sp?.name ?? "?")[0]}
                                            {sp && <img src={sp.sprite} alt="" width={30} height={30} style={{ position: "absolute", inset: 0, objectFit: "contain", imageRendering: "pixelated" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
                                        </span>
                                        <span style={{ fontWeight: 800, color: INK, flex: 1 }}>{sp?.name ?? m.speciesId} <span style={{ fontWeight: 600, opacity: 0.7 }}>Niv {m.level}</span></span>
                                        <span style={n > 0 ? okChip : muteChip}>{n > 0 ? `${n} à réapprendre` : "rien à réapprendre"}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {mon && !pending && (() => {
                    const sp = getSpecies(mon.speciesId)
                    const relearn = relearnableMoves(mon)
                    return (
                        <>
                            <div style={intro}>
                                <b>{sp?.name ?? mon.speciesId}</b> (Niv {mon.level}) — {mon.moves.length}/4 capacités.
                                <span style={{ float: "right", fontWeight: 800, color: reps >= price ? "#1d7a34" : "#b3402a" }}>Prix : ⚡{price}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                                {relearn.length === 0 && <div style={muted}>Ce Daemon connaît déjà toutes les capacités qu'il peut réapprendre à son niveau.</div>}
                                {relearn.map((mv) => {
                                    const mo = MOVES[mv]
                                    if (!mo) return null
                                    const cat = mo.power <= 0 ? "Statut" : moveCategory(mo.type) === "PHYSICAL" ? "Physique" : "Spécial"
                                    return (
                                        <div key={mv} style={{ ...card, cursor: "pointer" }} role="button" tabIndex={0} onClick={() => tryLearn(mv)}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tryLearn(mv) } }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{mo.name}</span>
                                                <span style={{ ...typeChip, background: TYPE_COLOR[mo.type] }}>{mo.displayType ?? TYPE_FR[mo.type]}</span>
                                                <span style={catChip}>{cat}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: INK, opacity: 0.8, marginTop: 3 }}>
                                                {mo.power > 0 ? <>💥 {mo.power} · </> : null}🎯 {mo.accuracy === 0 ? "∞" : `${mo.accuracy}%`} · PP {mo.pp}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )
                })()}

                {mon && pending && (
                    <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                        <div style={intro}>4 capacités déjà connues : laquelle <b>oublier</b> pour apprendre <b>{MOVES[pending]?.name ?? pending}</b> ?</div>
                        <MoveCompare
                            mon={mon}
                            newMoveId={pending}
                            onForget={(slot) => {
                                const r = relearnMove(mon.uid, pending, slot)
                                if (r.ok) { persistYellowSave(); setMsg(`✅ ${MOVES[pending]?.name ?? pending} réappris ! (−⚡${price})`) }
                                else setMsg(r.reason === "reps" ? `Pas assez d'énergie : il te faut ⚡${price}.` : "Impossible.")
                                setPending(null)
                            }}
                            onGiveUp={() => setPending(null)}
                        />
                    </div>
                )}

                {msg && <div style={toast}>{msg}</div>}
                <div style={{ display: "flex", gap: 8, padding: 10 }}>
                    {mon && !pending && <button onClick={back} style={{ ...btn, background: "#fff", color: INK, border: `2px solid ${DARK}` }}>◀ Retour</button>}
                    <button onClick={doClose} style={{ ...btn, flex: 1 }}>FERMER</button>
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }
const intro: React.CSSProperties = { padding: "8px 12px", fontSize: 11.5, color: "#4a3520", borderBottom: `1px solid ${DARK}`, fontStyle: "italic" }
const muted: React.CSSProperties = { fontSize: 12, color: INK, opacity: 0.6, textAlign: "center", padding: 20 }
const card: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: "7px 9px", marginBottom: 8 }
const typeChip: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#fff", padding: "2px 7px", borderRadius: 10, letterSpacing: 0.4, textShadow: "0 1px 1px rgba(0,0,0,0.35)" }
const catChip: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: INK, background: "#e8dcb8", border: `1px solid ${DARK}`, padding: "2px 6px", borderRadius: 10 }
const okChip: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#1d7a34", background: "#dcf3e0", border: "1px solid #9cd8a8", padding: "2px 7px", borderRadius: 10 }
const muteChip: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: "#8a7a55", background: "#efe6c8", border: `1px solid ${DARK}`, padding: "2px 7px", borderRadius: 10 }
const toast: React.CSSProperties = { margin: "0 10px", padding: "7px 10px", background: "#fff2cf", border: `2px solid ${DARK}`, borderRadius: 8, fontSize: 11.5, fontWeight: 700, color: INK, textAlign: "center" }
const btn: React.CSSProperties = { padding: "8px 12px", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
