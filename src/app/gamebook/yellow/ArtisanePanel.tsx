"use client"

// src/app/gamebook/yellow/ArtisanePanel.tsx
//
// L'ARTISANE (Grotte du Nexus 1F) — forge un OBJET TENU SIGNATURE lié à UN Daemon de l'équipe : un boost de stat
// (+10 à +40 %) dont la PRÉCISION (chance que le boost s'applique) dépend du potentiel génétique (Σ IV) du Daemon.
// Débit en Jetons de Combat côté serveur (postSpend) ; l'objet est créé côté client (addCraftedItem) à la confirmation.
// Gating : ≥1 Ligue remportée pour le 1er craft, puis une Ligue rebattue entre chaque craft ; plafond à vie 6 (→12
// après la Ligue de Fusion bronze). Cf. data/artisane.ts + store/playerStore.ts (canCraftSignature / addCraftedItem).

import { useState, useEffect } from "react"
import {
    usePlayer, addCraftedItem, canCraftSignature, getCraftsUsed, craftFusionBronzeBeaten, setCraftedItemEquipped,
} from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { fetchFrontierProfile, postSpend } from "@/lib/gamebook/yellow/frontier/frontierApi"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ivTotal } from "@/lib/gamebook/yellow/data/ivConfig"
import {
    CRAFT_STATS, CRAFT_STAT_LABEL, craftCost, craftPrecision, craftItemName, craftLifetimeCap,
    ARTISANE_LOCKED_LINE, ARTISANE_NEED_LEAGUE_LINE, ARTISANE_CAP_LINE, type CraftStat,
} from "@/lib/gamebook/yellow/data/artisane"

const INK = "#3a2410", CREAM = "#f4ecd4", DARK = "#c9a86a", ACCENT = "#b5732e"
const PCT_CHOICES = [10, 20, 30, 40]

/** Seed déterministe pour le nom d'objet (pas de RNG non-seedé) : hash simple de l'uid + stat + compteur. */
function nameSeed(uid: string, stat: CraftStat, n: number): number {
    let h = n * 131 + CRAFT_STATS.indexOf(stat) * 17
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
    return h
}

export default function ArtisanePanel({ onClose }: { onClose: () => void }) {
    const player = usePlayer()
    const [jc, setJc] = useState<number | null>(null)
    const [uid, setUid] = useState<string | null>(player.team[0]?.uid ?? null)
    const [stat, setStat] = useState<CraftStat>("atk")
    const [pct, setPct] = useState(20)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    useEffect(() => { fetchFrontierProfile().then((p) => setJc(p.jc)) }, [])

    const gate = canCraftSignature()
    const cap = craftLifetimeCap(craftFusionBronzeBeaten())
    const used = getCraftsUsed()
    const mon = player.team.find((m) => m.uid === uid) ?? null
    const sp = mon ? getSpecies(mon.speciesId) : null
    const iv = mon ? ivTotal(mon.ivs) : 0
    const cost = mon ? craftCost(mon.level, pct) : 0
    const precision = mon ? craftPrecision(stat, iv, mon.shiny === true) : 0

    const craft = async () => {
        if (busy || !mon || !gate.ok) return
        if (jc === null) { setMsg("Chargement du solde…"); return }
        if (jc < cost) { setMsg(`Pas assez de Jetons (${cost} requis, ${jc} dispo).`); return }
        setBusy(true); setMsg(null)
        const r = await postSpend(cost)
        setBusy(false)
        if (!r.ok) { setMsg("Forge refusée (solde serveur insuffisant)."); if (typeof r.jc === "number") setJc(r.jc); return }
        setJc(r.jc)
        const name = craftItemName(stat, nameSeed(mon.uid, stat, used))
        const item = addCraftedItem({
            stat, pct, precision, boundUid: mon.uid, boundName: mon.nickname || (sp?.name ?? "Daemon"),
            boundSpeciesId: mon.speciesId, name,
        })
        if (!item) { setMsg("Plafond de forge atteint."); return }
        persistYellowSave()
        setMsg(`🔨 « ${name} » forgé pour ${item.boundName} ! (${CRAFT_STAT_LABEL[stat]} +${pct} %, précision ${precision} %)`)
    }

    // Objets déjà forgés pour des Daemons de l'ÉQUIPE ACTUELLE (les autres — liés à d'anciens uid — restent au compteur).
    const teamUids = new Set(player.team.map((m) => m.uid))
    const bag = (player.craftedItems ?? []).filter((c) => teamUids.has(c.boundUid))

    return (
        <div onClick={onClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🔨 L'ARTISANE <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>Objet signature sur mesure</span></div>
                <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                    <div style={bar}>💠 Jetons : <b>{jc ?? "…"}</b> &nbsp;·&nbsp; Forgés à vie : <b>{used}/{cap}</b></div>

                    {!gate.ok ? (
                        <div style={lockBox}>
                            {gate.reason === "locked" && ARTISANE_LOCKED_LINE}
                            {gate.reason === "needLeague" && ARTISANE_NEED_LEAGUE_LINE}
                            {gate.reason === "cap" && ARTISANE_CAP_LINE}
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: 11, color: INK, opacity: 0.8, lineHeight: 1.4, marginBottom: 10 }}>
                                « Choisis l'un des tiens, dis-moi ce que tu veux renforcer. Ma pièce ne servira qu'à LUI — et sa
                                fiabilité dépend du potentiel génétique de la bête (les PV, eux, ne ratent jamais). »
                            </div>

                            <Label>1 · Le Daemon</Label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                                {player.team.map((m) => {
                                    const s = getSpecies(m.speciesId)
                                    const on = m.uid === uid
                                    return (
                                        <button key={m.uid} onClick={() => setUid(m.uid)} style={{ ...chip, ...(on ? chipOn : {}) }}>
                                            {s?.sprite && <img src={s.sprite} alt="" style={{ width: 22, height: 22, imageRendering: "pixelated", verticalAlign: "middle" }} />}
                                            <span style={{ marginLeft: 4 }}>{m.nickname || s?.name} <span style={{ opacity: 0.6 }}>N{m.level}</span></span>
                                        </button>
                                    )
                                })}
                            </div>

                            <Label>2 · La stat à renforcer</Label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                                {CRAFT_STATS.map((s) => (
                                    <button key={s} onClick={() => setStat(s)} style={{ ...chip, ...(s === stat ? chipOn : {}) }}>{CRAFT_STAT_LABEL[s]}</button>
                                ))}
                            </div>

                            <Label>3 · L'amélioration</Label>
                            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                {PCT_CHOICES.map((p) => (
                                    <button key={p} onClick={() => setPct(p)} style={{ ...chip, flex: 1, textAlign: "center", ...(p === pct ? chipOn : {}) }}>+{p} %</button>
                                ))}
                            </div>

                            {mon && (
                                <div style={quote}>
                                    <div><b>{CRAFT_STAT_LABEL[stat]} +{pct} %</b> pour <b>{mon.nickname || sp?.name}</b></div>
                                    <div style={{ marginTop: 3 }}>Précision : <b style={{ color: ACCENT }}>{precision} %</b>
                                        <span style={{ opacity: 0.65 }}> — {stat === "hp" ? "PV toujours actifs, +PV à l'entrée en jeu" : `chance d'activation à CHAQUE tour (Σ IV ${iv}/75${mon.shiny ? ", shiny → 100 %" : ""})`}</span>
                                    </div>
                                    <div style={{ marginTop: 3 }}>Coût : <b>{cost} 💠</b> <span style={{ opacity: 0.65 }}>(niveau {mon.level} × {pct} %)</span></div>
                                </div>
                            )}

                            <button onClick={craft} disabled={busy || !mon || (jc ?? 0) < cost} style={{ ...forgeBtn, ...(busy || !mon || (jc ?? 0) < cost ? forgeOff : {}) }}>
                                🔨 Forger ({cost} 💠)
                            </button>
                        </>
                    )}

                    {bag.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <Label>Objets signature de l'équipe</Label>
                            {bag.map((c) => (
                                <div key={c.id} style={row}>
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                        <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{c.name}</div>
                                        <div style={{ fontSize: 10, color: INK, opacity: 0.65, lineHeight: 1.3 }}>
                                            {c.boundName} · {CRAFT_STAT_LABEL[c.stat]} +{c.pct} % · précision {c.precision} %
                                        </div>
                                    </div>
                                    <button onClick={() => { setCraftedItemEquipped(c.id, !c.equipped); persistYellowSave() }}
                                        style={{ ...tag, ...(c.equipped ? tagOn : {}) }}>{c.equipped ? "Équipé ✓" : "Équiper"}</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {msg && <div style={msgBox}>{msg}</div>}
                </div>
                <button onClick={onClose} style={closeBtn}>QUITTER</button>
            </div>
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const bar: React.CSSProperties = { fontSize: 12, color: INK, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "6px 8px", marginBottom: 10, fontWeight: 700 }
const lockBox: React.CSSProperties = { fontSize: 12, color: INK, fontStyle: "italic", background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "10px 10px", lineHeight: 1.4 }
const quote: React.CSSProperties = { fontSize: 12, color: INK, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "8px 10px", marginBottom: 10, lineHeight: 1.4 }
const chip: React.CSSProperties = { background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "5px 9px", cursor: "pointer" }
const chipOn: React.CSSProperties = { background: INK, color: CREAM, borderColor: INK }
const forgeBtn: React.CSSProperties = { width: "100%", background: ACCENT, color: "#fff", border: `2px solid ${INK}`, borderRadius: 8, fontWeight: 800, fontSize: 14, padding: "9px 0", cursor: "pointer", marginTop: 2 }
const forgeOff: React.CSSProperties = { background: DARK, cursor: "not-allowed" }
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "6px 8px", marginBottom: 6 }
const tag: React.CSSProperties = { background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 6, fontWeight: 700, fontSize: 11, padding: "5px 9px", cursor: "pointer" }
const tagOn: React.CSSProperties = { background: ACCENT, color: "#fff", borderColor: INK }
const msgBox: React.CSSProperties = { marginTop: 10, padding: 8, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, fontSize: 12, color: INK, lineHeight: 1.4 }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
