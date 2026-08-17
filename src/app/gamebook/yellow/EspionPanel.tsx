"use client"

// USINE — L'ESPION : consulter (contre Jetons de Combat, coût croissant) la fiche COMPLÈTE des Daemons d'un autre
//   joueur. Lecture seule. Le roster renvoyé est BRUT (mons sérialisés) → on l'hydrate localement via fullStats.

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { ivTotal } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal } from "@/lib/gamebook/yellow/data/evConfig"
import { fetchEspionPlayers, postEspionReveal, type EspionPlayer } from "@/lib/gamebook/yellow/frontier/espionApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

const STAT_LABELS: [string, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

function MonSheet({ raw }: { raw: unknown }) {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m.speciesId)
    if (!sp) return null
    const st = fullStats(m, sp)
    const iv = m.ivs ? ivTotal(m.ivs) : 0
    const ev = m.ev ? evTotal(m.ev) : 0
    const saiyan = m.allocated ? Object.values(m.allocated).reduce((a, b) => a + (Number(b) || 0), 0) : 0
    const moves = (m.moves ?? []).map((slot) => getMove(slot.moveId)).filter(Boolean)
    return (
        <div style={{ background: "#20202c", border: "1px solid #3a3550", borderRadius: 8, padding: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{m.shiny ? "✨ " : ""}{m.nickname || sp.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>Niv {m.level}</span></div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{sp.types.join(" / ")}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginTop: 4, opacity: 0.9 }}>
                {STAT_LABELS.map(([k, lbl]) => (
                    <span key={k} style={{ fontVariantNumeric: "tabular-nums" }}>{lbl} <b>{(st as any)[k]}</b></span>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 9, marginTop: 4, color: "#ffd54a" }}>
                <span>IV {iv}/186</span><span>EV {ev}</span><span>Saiyan {saiyan}</span>
            </div>
            {moves.length > 0 && (
                <div style={{ fontSize: 9, opacity: 0.75, marginTop: 3 }}>⚔️ {moves.map((mv) => mv!.name).join(" · ")}</div>
            )}
        </div>
    )
}

export default function EspionPanel({ onClose, onCharged }: { onClose: () => void; onCharged?: (msg: string) => void }) {
    const [players, setPlayers] = useState<EspionPlayer[] | null>(null)
    const [busy, setBusy] = useState(false)
    const [reveal, setReveal] = useState<{ nickname: string; team: unknown[]; pc: unknown[] } | null>(null)
    const [note, setNote] = useState<string | null>(null)

    useEffect(() => { fetchEspionPlayers().then(setPlayers).catch(() => setPlayers([])) }, [])

    const spy = async (p: EspionPlayer) => {
        if (busy) return
        setBusy(true); setNote(null)
        const r = await postEspionReveal(p.userId)
        setBusy(false)
        if (!r.ok) {
            if (r.reason === "insufficient") setNote(`Pas assez de Jetons : il t'en faut ${r.cost} (tu as ${r.jc}).`)
            else setNote("Espionnage impossible pour l'instant.")
            return
        }
        setReveal({ nickname: r.nickname || p.nickname, team: r.team || [], pc: r.pc || [] })
        if (r.cost && r.cost > 0) onCharged?.(`🕵️ −${r.cost} JC · dossier de ${r.nickname || p.nickname} ouvert`)
    }

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#15151f", color: "#fff", border: "2px solid #8e7cc3", borderRadius: 14, padding: 14, width: "min(440px, 96vw)", maxHeight: "88vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🕵️ L&apos;ESPION</div>
                    <button onClick={onClose} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                {!reveal ? (
                    <>
                        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>Choisis un dresseur à espionner. Chaque dossier se paie en <b>Jetons de Combat</b> (coût croissant à chaque espionnage).</div>
                        {players == null ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Chargement…</div>
                        ) : players.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Aucun dresseur à espionner pour l&apos;instant.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {players.map((p) => (
                                    <button key={p.userId} disabled={busy} onClick={() => spy(p)} style={{ textAlign: "left", background: "#242433", border: "1px solid #3a3550", borderRadius: 8, padding: "8px 10px", cursor: busy ? "default" : "pointer", color: "#fff", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
                                        <b>{p.nickname}</b> <span style={{ fontSize: 10, opacity: 0.6 }}>· {p.teamSize} Daemon(s)</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8 }}>{note}</div>}
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#c9b8f5", marginBottom: 6 }}>Dossier de {reveal.nickname} — équipe</div>
                        {reveal.team.map((m, i) => <MonSheet key={i} raw={m} />)}
                        {reveal.pc.length > 0 && (
                            <>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "#c9b8f5", margin: "8px 0 6px" }}>Réserve (PC) — {reveal.pc.length}</div>
                                {reveal.pc.map((m, i) => <MonSheet key={i} raw={m} />)}
                            </>
                        )}
                        <button onClick={() => { setReveal(null) }} style={{ marginTop: 8, background: "#8e7cc3", color: "#15151f", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800 }}>← Autre dresseur</button>
                    </>
                )}
            </div>
        </div>
    )
}
