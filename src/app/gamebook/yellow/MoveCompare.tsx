"use client"

// Nexus Jaune Éclair — TABLEAU COMPARATIF d'apprentissage d'attaque.
// Quand un Daemon doit oublier une capacité pour en apprendre une nouvelle, on affiche TOUTES les infos
// utiles (type, catégorie, puissance, précision, PP, STAB, alignement sur la meilleure stat, effet) pour
// la nouvelle ET les 4 actuelles → on choisit en connaissance de cause. Partagé par les 3 écrans d'apprentissage.

import { useState } from "react"
import type { MonInstance, MoveData, PokeType } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { moveCategory, resolveAdaptiveStab } from "@/lib/gamebook/yellow/battle/typeChart"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { TYPE_COLORS } from "./dex/dexShared"

const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace",
    COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte",
    ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée",
}

// Tag d'effet COURT (la raison de garder/jeter une attaque au-delà des chiffres).
function effectTag(mv: MoveData): string | null {
    const e = mv.effect
    if (!e) return null
    if (e.adaptiveStab) return "Type & catégorie adaptatifs (toujours STAB, meilleure stat)"
    if (e.recoilPct) return `Recul ${e.recoilPct}%`
    if (e.drainPct) return `Vol de PV ${e.drainPct}%`
    if (e.healPct) return `Soigne ${e.healPct}% PV`
    if (e.fixedDamage) return `${e.fixedDamage} PV fixes`
    if (e.multiHit) { const [a, b] = e.multiHit; return a === b ? `Frappe ${a}×` : `Frappe ${a}-${b}×` }
    if (e.inflictStatus) return e.chance && e.chance < 100 ? `${e.inflictStatus} ${e.chance}%` : `${e.inflictStatus}`
    if (e.inflictVolatile) return `${e.inflictVolatile}`
    if (e.flinch) return e.chance ? `Apeure ${e.chance}%` : "Peut apeurer"
    if (e.statChanges?.length) { const c = e.statChanges[0]; return `${c.stages > 0 ? "+" : ""}${c.stages} ${c.stat}${c.target === "self" ? "" : " adv."}` }
    if (e.highCrit) return "Crit élevé"
    if (e.sureHit) return "Ne rate jamais"
    if (e.twoTurn || e.dig || e.fly) return "Charge 2 tours"
    return null
}

interface Line {
    name: string; effType: PokeType; isPhysical: boolean; isStatus: boolean
    power: number; accuracy: number; pp: number; stab: boolean; aligned: boolean; adaptive: boolean; tag: string | null
}

function lineFor(moveId: string, types: PokeType[], atk: number, spc: number): Line | null {
    const mv = getMove(moveId)
    if (!mv) return null
    const isStatus = mv.power <= 0
    let effType = mv.type
    let isPhysical = (mv.category ?? moveCategory(mv.type)) === "PHYSICAL"
    const adaptive = !!mv.effect?.adaptiveStab && !isStatus
    if (adaptive) { const r = resolveAdaptiveStab(types, atk, spc); effType = r.type; isPhysical = r.isPhysical }
    const bestIsPhysical = atk >= spc
    return {
        name: mv.name, effType, isPhysical, isStatus,
        power: mv.power, accuracy: mv.accuracy, pp: mv.pp,
        stab: !isStatus && types.includes(effType),
        aligned: !isStatus && isPhysical === bestIsPhysical, // frappe sur ta meilleure stat offensive ?
        adaptive, tag: effectTag(mv),
    }
}

function MoveCard({ line, isNew, onClick }: { line: Line; isNew?: boolean; onClick?: () => void }) {
    const cat = line.isStatus ? { label: "STATUT", color: "#8868c0" } : line.isPhysical ? { label: "PHYS", color: "#c0532a" } : { label: "SPÉ", color: "#3a7ae0" }
    const inner = (
        <>
            <div style={S.cardHead}>
                <span style={S.cardName}>{line.name}</span>
                {isNew && <span style={S.newBadge}>★ NOUVELLE</span>}
            </div>
            <div style={S.statRow}>
                <span style={{ ...S.chip, background: TYPE_COLORS[line.effType], color: "#1a1400" }}>{TYPE_FR[line.effType]}</span>
                <span style={{ ...S.chip, background: cat.color }}>{cat.label}</span>
                {!line.isStatus && <span style={S.stat}>⚔ {line.power || "—"}</span>}
                <span style={S.stat}>🎯 {line.accuracy === 0 ? "∞" : `${line.accuracy}%`}</span>
                <span style={S.stat}>{line.pp} PP</span>
                {line.stab && <span style={S.stabTag}>STAB ×1.5</span>}
                {line.adaptive && <span style={S.adaptTag}>ADAPT.</span>}
            </div>
            {(line.tag || (!line.isStatus && line.power > 0)) && (
                <div style={S.noteRow}>
                    {!line.isStatus && line.power > 0 && (
                        line.aligned ? <span style={S.good}>✓ frappe sur ta meilleure stat</span> : <span style={S.warn}>✗ tape sur ta stat la plus faible</span>
                    )}
                    {line.tag && <span style={S.effect}>· {line.tag}</span>}
                </div>
            )}
        </>
    )
    return onClick
        ? <button style={{ ...S.card, ...S.cardBtn }} onClick={onClick}>{inner}</button>
        : <div style={{ ...S.card, ...(isNew ? S.cardNew : {}) }}>{inner}</div>
}

export default function MoveCompare({ mon, newMoveId, onForget, onGiveUp, onLater }: {
    mon: MonInstance
    newMoveId: string
    onForget: (slot: number) => void
    onGiveUp: () => void
    onLater?: () => void
}) {
    const sp = getSpecies(mon.speciesId)
    const [confirmSlot, setConfirmSlot] = useState<number | null>(null) // slot en attente de CONFIRMATION (anti-remplacement accidentel)
    if (!sp) return null
    const fs = fullStats(mon, sp)
    const types = sp.types
    const name = mon.nickname ?? sp.name
    const newLine = lineFor(newMoveId, types, fs.atk, fs.spc)
    const newMove = getMove(newMoveId)
    const oldMove = confirmSlot !== null ? getMove(mon.moves[confirmSlot]?.moveId) : null

    return (
        <div>
            <div style={S.title}>{name} veut apprendre <b style={{ color: "#f5d020" }}>{newMove?.name ?? newMoveId}</b> !</div>
            <div style={S.hint}>Ta meilleure stat offensive : <b>{fs.atk >= fs.spc ? `Attaque (${fs.atk})` : `Spécial (${fs.spc})`}</b> — privilégie les attaques de cette catégorie, et le STAB.</div>
            {newLine && <MoveCard line={newLine} isNew />}
            <div style={S.q}>Oublier quelle capacité ? <span style={{ opacity: 0.6, fontWeight: 400 }}>(touche pour choisir — confirmation demandée)</span></div>
            <div style={S.list}>
                {mon.moves.map((m, i) => {
                    const line = lineFor(m.moveId, types, fs.atk, fs.spc)
                    return line ? <MoveCard key={i} line={line} onClick={() => setConfirmSlot(i)} /> : null
                })}
            </div>
            <button style={S.giveUp} onClick={onGiveUp}>✋ Renoncer à {newMove?.name ?? "cette attaque"}</button>
            {onLater && <button style={S.later} onClick={onLater}>Plus tard ▶ (revoir dans la fiche)</button>}

            {/* CONFIRMATION de remplacement (anti-clic accidentel : rien ne change tant qu'on n'a pas confirmé). */}
            {confirmSlot !== null && (
                <div style={S.confirmOverlay} onClick={() => setConfirmSlot(null)}>
                    <div style={S.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <div style={S.confirmTxt}>Oublier <b style={{ color: "#f0a850" }}>{oldMove?.name ?? "cette attaque"}</b> pour apprendre <b style={{ color: "#7ce0a0" }}>{newMove?.name ?? "la nouvelle"}</b> ?</div>
                        <div style={S.confirmWarn}>⚠️ C&apos;est définitif — {oldMove?.name ?? "l'ancienne attaque"} sera perdue.</div>
                        <div style={S.confirmRow}>
                            <button style={S.confirmYes} onClick={() => { const s = confirmSlot; setConfirmSlot(null); onForget(s) }}>✓ Confirmer</button>
                            <button style={S.confirmNo} onClick={() => setConfirmSlot(null)}>✗ Annuler</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    title: { fontSize: 14, fontWeight: 800, lineHeight: 1.4, marginBottom: 4, textAlign: "center" },
    hint: { fontSize: 10.5, opacity: 0.8, lineHeight: 1.4, textAlign: "center", marginBottom: 8 },
    q: { fontSize: 12, fontWeight: 700, margin: "10px 0 6px" },
    list: { display: "flex", flexDirection: "column", gap: 6 },
    card: { width: "100%", textAlign: "left", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 8, padding: "7px 9px" },
    cardNew: { background: "rgba(245,208,32,0.12)", border: "2px solid #f5d020", marginBottom: 4 },
    cardBtn: { cursor: "pointer", fontFamily: "inherit", color: "inherit" },
    cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    cardName: { fontSize: 13, fontWeight: 800 },
    newBadge: { fontSize: 8.5, fontWeight: 800, color: "#1a1400", background: "#f5d020", borderRadius: 4, padding: "1px 5px" },
    statRow: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" },
    chip: { fontSize: 9, fontWeight: 800, color: "#fff", borderRadius: 4, padding: "2px 5px" },
    stat: { fontSize: 11, fontWeight: 700, opacity: 0.95 },
    stabTag: { fontSize: 8.5, fontWeight: 800, color: "#1a1400", background: "#7ce0a0", borderRadius: 4, padding: "2px 5px" },
    adaptTag: { fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#7a5cc0", borderRadius: 4, padding: "2px 5px" },
    noteRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, fontSize: 10 },
    good: { color: "#7ce0a0", fontWeight: 700 },
    warn: { color: "#f0a850", fontWeight: 700 },
    effect: { opacity: 0.75 },
    giveUp: { width: "100%", marginTop: 12, padding: "9px", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#1a1400", background: "#f5d020", border: "none", borderRadius: 8, cursor: "pointer" },
    later: { width: "100%", marginTop: 8, padding: "8px", fontFamily: "inherit", fontSize: 11, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" },
    confirmOverlay: { position: "fixed", inset: 0, zIndex: 9600, background: "rgba(6,4,12,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    confirmBox: { width: "min(340px, 92vw)", background: "rgba(24,18,44,0.98)", border: "3px solid #f5d020", borderRadius: 14, padding: "18px 16px", textAlign: "center" },
    confirmTxt: { fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 },
    confirmWarn: { fontSize: 10.5, opacity: 0.85, margin: "8px 0 14px", color: "#f0a850" },
    confirmRow: { display: "flex", gap: 10 },
    confirmYes: { flex: 1, padding: "11px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#1a1400", background: "#7ce0a0", border: "none", borderRadius: 8, cursor: "pointer" },
    confirmNo: { flex: 1, padding: "11px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer" },
}
