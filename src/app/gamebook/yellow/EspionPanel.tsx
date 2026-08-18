"use client"

// USINE — L'ESPION. Flux : liste des dresseurs (accès Zone de Combat) → PAYER l'accès (somme des niveaux de son
//   équipe) → VITRINE (sprites de son équipe) → cliquer un Daemon → PAYER (1 JC/niveau + frais de dossier 10×n),
//   confirmation → fiche COMPLÈTE (IV/EV/Saiyan réparti/objet/moveset). On n'espionne que l'équipe (jamais le PC).

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { fusionMaskedView, GROTTE_ENTERED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { ivTotal, ivTier, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, evTotalCap } from "@/lib/gamebook/yellow/data/evConfig"
import { fetchEspionPlayers, postEspionAccess, postEspionReveal, espionRevealCost, type EspionPlayer, type EspionVitrineMon } from "@/lib/gamebook/yellow/frontier/espionApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

const STAT_LABELS: [string, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

function MonSheet({ raw }: { raw: unknown }) {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m.speciesId)
    if (!sp) return null
    const st = fullStats(m, sp)
    const tier = m.ivs ? ivTier(m.ivs) : null
    const iv = m.ivs ? ivTotal(m.ivs) : 0
    const ev = m.ev ? evTotal(m.ev) : 0
    const evCap = evTotalCap(m)
    const alloc = m.allocated ?? {}
    const saiyan = Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0)
    const saiyanBreak = STAT_LABELS.filter(([k]) => (Number((alloc as any)[k]) || 0) > 0).map(([k, lbl]) => `${lbl}+${(alloc as any)[k]}`)
    const unspent = m.statPoints ?? 0
    const it1 = getHeldItem(m.heldItem), it2 = getHeldItem(m.heldItem2)
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
            {(saiyan > 0 || saiyanBreak.length > 0) && (
                <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2, color: "#c9b8f5" }}>↳ Saiyan réparti : {saiyanBreak.length ? saiyanBreak.join(" · ") : "aucun point posé"}</div>
            )}
            {(it1 || it2) && (
                <div style={{ fontSize: 9, opacity: 0.85, marginTop: 3 }}>🎒 {[it1, it2].filter(Boolean).map((it) => `${it!.emoji} ${it!.name}`).join(" · ")}</div>
            )}
            {moves.length > 0 && (
                <div style={{ fontSize: 9, opacity: 0.75, marginTop: 3 }}>⚔️ {moves.map((mv) => `${mv!.name} (${mv!.type})`).join(" · ")}</div>
            )}
        </div>
    )
}

function VitrineCard({ mon, price, revealed, onClick, disabled, viewerEnteredGrotte }: { mon: EspionVitrineMon; price: number; revealed: boolean; onClick: () => void; disabled: boolean; viewerEnteredGrotte: boolean }) {
    // ANTI-SPOILER : une fusion d'autrui reste MissingNo tant que le VIEWER n'a pas mis les pieds dans la Grotte Puzzle.
    const view = fusionMaskedView(mon.speciesId, viewerEnteredGrotte)
    const showShiny = !view.masked && mon.shiny
    return (
        <button onClick={onClick} disabled={disabled} title={revealed ? "Déjà dévoilé" : `Dévoiler pour ${price} JC`}
            style={{ position: "relative", width: 72, background: revealed ? "rgba(126,201,138,.12)" : "#242433", border: `1px solid ${revealed ? "#7ac98a" : "#3a3550"}`, borderRadius: 8, padding: 4, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
            <img src={view.sprite} alt="" width={52} height={52} style={{ imageRendering: "pixelated", display: "block", margin: "0 auto", filter: showShiny ? "drop-shadow(0 0 3px gold)" : "none" }} />
            <div style={{ fontSize: 9, textAlign: "center", opacity: 0.85 }}>{showShiny ? "✨" : ""}Niv {mon.level}</div>
            <div style={{ fontSize: 9, textAlign: "center", fontWeight: 800, color: revealed ? "#7ac98a" : "#ffd54a" }}>{revealed ? "✓ vu" : `💠 ${price}`}</div>
        </button>
    )
}

export default function EspionPanel({ onClose, onCharged }: { onClose: () => void; onCharged?: (msg: string) => void }) {
    const enteredGrotte = usePlayer().defeatedTrainers.includes(GROTTE_ENTERED_MARKER) // anti-spoiler fusions cross-joueur
    const [players, setPlayers] = useState<EspionPlayer[] | null>(null)
    const [target, setTarget] = useState<{ userId: string; nickname: string } | null>(null)
    const [vitrine, setVitrine] = useState<{ nickname: string; mons: EspionVitrineMon[] } | null>(null)
    const [vitrineCache, setVitrineCache] = useState<Record<string, { nickname: string; mons: EspionVitrineMon[] }>>({}) // accès déjà payés (session)
    const [spyCount, setSpyCount] = useState(0)
    const [revealed, setRevealed] = useState<Record<string, unknown>>({})
    const [detailUid, setDetailUid] = useState<string | null>(null)
    const [accessConfirm, setAccessConfirm] = useState<EspionPlayer | null>(null) // paiement d'accès en attente
    const [confirmMon, setConfirmMon] = useState<EspionVitrineMon | null>(null)    // paiement de révélation en attente
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState<string | null>(null)

    useEffect(() => { fetchEspionPlayers().then(setPlayers).catch(() => setPlayers([])) }, [])

    const openPlayer = (p: EspionPlayer) => {
        if (busy) return
        const cached = vitrineCache[p.userId]
        if (cached) { setTarget({ userId: p.userId, nickname: p.nickname }); setVitrine(cached); setDetailUid(null); setNote(null); return } // déjà payé
        setNote(null); setAccessConfirm(p)
    }

    const confirmAccess = async () => {
        const p = accessConfirm
        if (!p || busy) return
        setBusy(true); setNote(null)
        const r = await postEspionAccess(p.userId)
        setBusy(false)
        if (!r.ok) {
            if (r.reason === "insufficient") setNote(`Pas assez de Jetons : l'accès coûte ${r.cost} (tu as ${r.jc}).`)
            else setNote("Accès impossible pour l'instant.")
            setAccessConfirm(null)
            return
        }
        const vit = { nickname: r.nickname ?? p.nickname, mons: r.mons ?? [] }
        setVitrineCache((c) => ({ ...c, [p.userId]: vit }))
        setTarget({ userId: p.userId, nickname: p.nickname }); setVitrine(vit); setSpyCount(r.spyCount ?? 0)
        setAccessConfirm(null); setDetailUid(null)
        if (r.cost && r.cost > 0) onCharged?.(`🕵️ −${r.cost} JC · dossier de ${r.nickname ?? p.nickname} ouvert`)
    }

    const clickMon = (m: EspionVitrineMon) => {
        if (busy) return
        if (revealed[m.uid] !== undefined) { setDetailUid(m.uid); setConfirmMon(null); setNote(null); return }
        setNote(null); setConfirmMon(m)
    }

    const confirmReveal = async () => {
        const m = confirmMon
        if (!m || !target || busy) return
        setBusy(true); setNote(null)
        const r = await postEspionReveal(target.userId, m.uid)
        setBusy(false)
        if (!r.ok) {
            if (r.reason === "insufficient") setNote(`Pas assez de Jetons : il t'en faut ${r.cost} (tu as ${r.jc}).`)
            else if (r.reason === "gone") setNote("Ce Daemon n'est plus dans son équipe.")
            else setNote("Révélation impossible pour l'instant.")
            setConfirmMon(null)
            return
        }
        setRevealed((prev) => ({ ...prev, [m.uid]: r.mon }))
        if (typeof r.spyCount === "number") setSpyCount(r.spyCount)
        setDetailUid(m.uid); setConfirmMon(null)
        if (r.cost && r.cost > 0) onCharged?.(`🕵️ −${r.cost} JC · ${getSpecies(m.speciesId)?.name ?? "Daemon"} de ${target.nickname} dévoilé`)
    }

    const back = () => { setTarget(null); setVitrine(null); setDetailUid(null); setConfirmMon(null); setNote(null) }

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#15151f", color: "#fff", border: "2px solid #8e7cc3", borderRadius: 14, padding: 14, width: "min(460px, 96vw)", maxHeight: "88vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🕵️ L&apos;ESPION</div>
                    <button onClick={onClose} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                {!target ? (
                    <>
                        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>Choisis un dresseur (ceux qui ont accès à la Zone de Combat). <b>Ouvrir son dossier coûte la somme des niveaux de son équipe</b> ; ensuite chaque fiche dévoilée coûte 1 JC/niveau + des frais de dossier croissants.</div>
                        {players == null ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Chargement…</div>
                        ) : players.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Aucun dresseur à espionner pour l&apos;instant.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {players.map((p) => (
                                    <button key={p.userId} disabled={busy} onClick={() => openPlayer(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, textAlign: "left", background: "#242433", border: "1px solid #3a3550", borderRadius: 8, padding: "8px 10px", cursor: busy ? "default" : "pointer", color: "#fff", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
                                        <span><b>{p.nickname}</b> <span style={{ fontSize: 10, opacity: 0.6 }}>· {p.teamSize} Daemon(s)</span></span>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: vitrineCache[p.userId] ? "#7ac98a" : "#ffd54a" }}>{vitrineCache[p.userId] ? "ouvert ✓" : `💠 ${p.accessCost}`}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CONFIRMATION D'ACCÈS */}
                        {accessConfirm && (
                            <div style={{ marginTop: 10, padding: 10, background: "rgba(255,215,74,.1)", border: "1px solid #ffd54a", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 12 }}>Ouvrir le dossier de <b>{accessConfirm.nickname}</b> pour <b style={{ color: "#ffd54a" }}>💠 {accessConfirm.accessCost} JC</b> ?</div>
                                <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2 }}>= somme des niveaux de son équipe · dévoiler une fiche coûtera ensuite en plus</div>
                                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                                    <button disabled={busy} onClick={confirmAccess} style={{ background: "#7ac98a", color: "#15151f", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 800 }}>Payer l&apos;accès</button>
                                    <button disabled={busy} onClick={() => setAccessConfirm(null)} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 800 }}>Annuler</button>
                                </div>
                            </div>
                        )}
                        {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8 }}>{note}</div>}
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <button onClick={back} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "3px 9px", cursor: "pointer", fontWeight: 800, fontSize: 11 }}>←</button>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#c9b8f5" }}>Équipe de {target.nickname}</div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                            {(vitrine?.mons ?? []).map((m) => (
                                <VitrineCard key={m.uid} mon={m} price={espionRevealCost(m.level, spyCount)} revealed={revealed[m.uid] !== undefined} disabled={busy} onClick={() => clickMon(m)} viewerEnteredGrotte={enteredGrotte} />
                            ))}
                        </div>

                        {confirmMon && (
                            <div style={{ marginTop: 10, padding: 10, background: "rgba(255,215,74,.1)", border: "1px solid #ffd54a", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 12 }}>Dévoiler <b>{getSpecies(confirmMon.speciesId)?.name ?? "ce Daemon"}</b> (niv {confirmMon.level}) pour <b style={{ color: "#ffd54a" }}>💠 {espionRevealCost(confirmMon.level, spyCount)} JC</b> ?</div>
                                <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2 }}>1 JC/niveau + {10 * (spyCount + 1)} de frais de dossier</div>
                                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                                    <button disabled={busy} onClick={confirmReveal} style={{ background: "#7ac98a", color: "#15151f", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 800 }}>Payer</button>
                                    <button disabled={busy} onClick={() => setConfirmMon(null)} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 800 }}>Annuler</button>
                                </div>
                            </div>
                        )}
                        {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8, textAlign: "center" }}>{note}</div>}
                        {detailUid && revealed[detailUid] !== undefined && <MonSheet raw={revealed[detailUid]} />}
                    </>
                )}
            </div>
        </div>
    )
}
