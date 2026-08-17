"use client"

// USINE — L'ESPION : on choisit un dresseur (ceux ayant accès à la Zone de Combat), on voit ses Daemons EN VITRINE
//   (sprites seulement, gratuit) et on PAIE (Jetons de Combat, coût croissant) pour dévoiler la fiche COMPLÈTE d'UN
//   Daemon précis en cliquant dessus. Le roster révélé est BRUT → hydraté localement via fullStats.

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { ivTotal, ivTier, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, evTotalCap } from "@/lib/gamebook/yellow/data/evConfig"
import { fetchEspionPlayers, fetchEspionVitrine, postEspionReveal, type EspionPlayer, type EspionVitrineMon } from "@/lib/gamebook/yellow/frontier/espionApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

const STAT_LABELS: [string, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

function MonSheet({ raw }: { raw: unknown }) {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m.speciesId)
    if (!sp) return null
    const st = fullStats(m, sp)
    const tier = m.ivs ? ivTier(m.ivs) : null
    const iv = m.ivs ? ivTotal(m.ivs) : 0                       // total sur 5 stats Gen 1 (DV 0..15) → max 75
    const ev = m.ev ? evTotal(m.ev) : 0
    const evCap = evTotalCap(m)                                  // plafond individuel (510 → 561 shiny/late-bloomer/evCapBoost)
    const saiyan = m.allocated ? Object.values(m.allocated).reduce((a, b) => a + (Number(b) || 0), 0) : 0 // points DÉPENSÉS
    const unspent = m.statPoints ?? 0                            // points Saiyan gagnés NON encore répartis
    const it1 = getHeldItem(m.heldItem), it2 = getHeldItem(m.heldItem2) // heldItem2 = 2e objet des fusionnés
    const moves = (m.moves ?? []).map((slot) => getMove(slot.moveId)).filter(Boolean)
    const statused = !!m.status && m.status !== "NONE"
    const badges = statused || m.disobedient || (m.traded && m.originalTrainerName)
    return (
        <div style={{ background: "#20202c", border: "1px solid #8e7cc3", borderRadius: 8, padding: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{m.shiny ? "✨ " : ""}{m.nickname || sp.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>Niv {m.level}</span></div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{sp.types.join(" / ")}</div>
            </div>
            {badges && (
                <div style={{ display: "flex", gap: 8, fontSize: 9, marginTop: 2, flexWrap: "wrap" }}>
                    {statused && <span style={{ color: "#ff9e6b" }}>⚠️ {m.status}</span>}
                    {m.disobedient && <span style={{ color: "#d17be0" }}>😈 maudit (désobéit)</span>}
                    {m.traded && m.originalTrainerName && <span style={{ opacity: 0.55 }}>OT : {m.originalTrainerName}</span>}
                </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, marginTop: 4, opacity: 0.9 }}>
                {STAT_LABELS.map(([k, lbl]) => (
                    <span key={k} style={{ fontVariantNumeric: "tabular-nums" }}>{lbl} <b>{(st as any)[k]}</b></span>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 9, marginTop: 4, color: "#ffd54a", flexWrap: "wrap" }}>
                <span style={{ color: tier ? ivTierColor(tier) : "#ffd54a" }}>IV {iv}/75{tier ? ` · ${tier}` : ""}</span>
                <span>EV {ev}/{evCap}</span>
                <span>Saiyan {saiyan}{unspent ? ` (+${unspent} à répartir)` : ""}</span>
            </div>
            {(it1 || it2) && (
                <div style={{ fontSize: 9, opacity: 0.85, marginTop: 3 }}>🎒 {[it1, it2].filter(Boolean).map((it) => `${it!.emoji} ${it!.name}`).join(" · ")}</div>
            )}
            {moves.length > 0 && (
                <div style={{ fontSize: 9, opacity: 0.75, marginTop: 3 }}>⚔️ {moves.map((mv) => `${mv!.name} (${mv!.type})`).join(" · ")}</div>
            )}
        </div>
    )
}

/** Carte de VITRINE : le sprite du Daemon (gratuit). Cliquer paie pour dévoiler la fiche. */
function VitrineCard({ mon, revealed, onClick, disabled }: { mon: EspionVitrineMon; revealed: boolean; onClick: () => void; disabled: boolean }) {
    const sp = getSpecies(mon.speciesId)
    return (
        <button onClick={onClick} disabled={disabled} title={revealed ? "Déjà dévoilé" : "Cliquer pour dévoiler (payant)"}
            style={{ position: "relative", width: 68, background: revealed ? "rgba(126,201,138,.12)" : "#242433", border: `1px solid ${revealed ? "#7ac98a" : "#3a3550"}`, borderRadius: 8, padding: 4, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
            {sp?.sprite
                ? <img src={sp.sprite} alt="" width={52} height={52} style={{ imageRendering: "pixelated", display: "block", margin: "0 auto", filter: mon.shiny ? "drop-shadow(0 0 3px gold)" : "none" }} />
                : <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>❓</div>}
            <div style={{ fontSize: 9, textAlign: "center", opacity: 0.85 }}>{mon.shiny ? "✨" : ""}Niv {mon.level}</div>
            {revealed && <div style={{ position: "absolute", top: 2, right: 4, fontSize: 9, color: "#7ac98a" }}>✓</div>}
            {!revealed && <div style={{ position: "absolute", top: 2, right: 3, fontSize: 10 }}>🔒</div>}
        </button>
    )
}

export default function EspionPanel({ onClose, onCharged }: { onClose: () => void; onCharged?: (msg: string) => void }) {
    const [players, setPlayers] = useState<EspionPlayer[] | null>(null)
    const [target, setTarget] = useState<{ userId: string; nickname: string } | null>(null)
    const [vitrine, setVitrine] = useState<{ nickname: string; mons: EspionVitrineMon[] } | null>(null)
    const [revealed, setRevealed] = useState<Record<string, unknown>>({}) // uid -> mon brut (payé, mis en cache pour cette session)
    const [detailUid, setDetailUid] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState<string | null>(null)

    useEffect(() => { fetchEspionPlayers().then(setPlayers).catch(() => setPlayers([])) }, [])

    const openPlayer = async (p: EspionPlayer) => {
        if (busy) return
        setBusy(true); setNote(null); setDetailUid(null)
        const v = await fetchEspionVitrine(p.userId)
        setBusy(false)
        if (!v) { setNote("Vitrine indisponible pour l'instant."); return }
        setTarget({ userId: p.userId, nickname: p.nickname }); setVitrine(v)
    }

    const clickMon = async (m: EspionVitrineMon) => {
        if (busy || !target) return
        if (revealed[m.uid] !== undefined) { setDetailUid(m.uid); setNote(null); return } // déjà dévoilé cette session → gratuit
        setBusy(true); setNote(null)
        const r = await postEspionReveal(target.userId, m.uid)
        setBusy(false)
        if (!r.ok) {
            if (r.reason === "insufficient") setNote(`Pas assez de Jetons : il t'en faut ${r.cost} (tu as ${r.jc}).`)
            else if (r.reason === "gone") setNote("Ce Daemon n'est plus dans son équipe.")
            else setNote("Révélation impossible pour l'instant.")
            return
        }
        setRevealed((prev) => ({ ...prev, [m.uid]: r.mon }))
        setDetailUid(m.uid)
        if (r.cost && r.cost > 0) onCharged?.(`🕵️ −${r.cost} JC · ${getSpecies(m.speciesId)?.name ?? "Daemon"} de ${target.nickname} dévoilé`)
    }

    const back = () => { setTarget(null); setVitrine(null); setDetailUid(null); setNote(null) }

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#15151f", color: "#fff", border: "2px solid #8e7cc3", borderRadius: 14, padding: 14, width: "min(460px, 96vw)", maxHeight: "88vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🕵️ L&apos;ESPION</div>
                    <button onClick={onClose} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                {!target ? (
                    <>
                        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>Choisis un dresseur (ceux qui ont accès à la Zone de Combat). Tu verras ses Daemons en vitrine — cliquer sur l&apos;un d&apos;eux dévoile sa fiche complète contre des <b>Jetons de Combat</b> (coût croissant).</div>
                        {players == null ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Chargement…</div>
                        ) : players.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Aucun dresseur à espionner pour l&apos;instant.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {players.map((p) => (
                                    <button key={p.userId} disabled={busy} onClick={() => openPlayer(p)} style={{ textAlign: "left", background: "#242433", border: "1px solid #3a3550", borderRadius: 8, padding: "8px 10px", cursor: busy ? "default" : "pointer", color: "#fff", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
                                        <b>{p.nickname}</b> <span style={{ fontSize: 10, opacity: 0.6 }}>· {p.teamSize} Daemon(s)</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8 }}>{note}</div>}
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <button onClick={back} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "3px 9px", cursor: "pointer", fontWeight: 800, fontSize: 11 }}>←</button>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#c9b8f5" }}>Vitrine de {target.nickname}</div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                            {(vitrine?.mons ?? []).map((m) => (
                                <VitrineCard key={m.uid} mon={m} revealed={revealed[m.uid] !== undefined} disabled={busy} onClick={() => clickMon(m)} />
                            ))}
                        </div>
                        {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8, textAlign: "center" }}>{note}</div>}
                        {detailUid && revealed[detailUid] !== undefined && <MonSheet raw={revealed[detailUid]} />}
                    </>
                )}
            </div>
        </div>
    )
}
