"use client"

// DAEMOMANIAQUE — module « ⚖️ COMPARER » (onglet du panneau). Compare les STATS de deux Daemons côte à côte :
//   • deux Daemons de TON équipe = GRATUIT (ni spoiler ni facturable).
//   • un Daemon d'équipe VS une espèce du Pokédex = PAYANT : coût de base selon ce que tu connais de l'espèce
//     (capturé 20 / vu sauvage 50 / connu 100 / jamais vu 200) × 1,5 à chaque comparaison payante du jour (reset la nuit).
//   La comparaison équipe↔Pokédex se fait À NIVEAU ÉGAL : l'espèce est matérialisée au niveau de TON Daemon (IV 15),
//   pour un affrontement de stats juste et lisible sur une seule échelle. Une comparaison payée est re-consultable
//   gratuitement dans la session (Set `revealed`). Lecture seule — n'affecte ni l'équipe ni le Pokédex.

import { useMemo, useState } from "react"
import { usePlayer, comparisonConsultPrice, comparisonConsultsUsed, payComparison } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex, daemonCompareTier, type DexCompareTier } from "@/lib/gamebook/yellow/store/pokedexStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import type { MonInstance, StatKey, SpeciesData } from "@/lib/gamebook/yellow/battle/types"

const STAT_ROWS: [StatKey, string][] = [["hp", "PV"], ["atk", "Attaque"], ["def", "Défense"], ["spe", "Vitesse"], ["spc", "Spéciale"]]
const TIER_LABEL: Record<DexCompareTier, string> = { caught: "capturé", wild: "vu à l'état sauvage", known: "connu (jamais croisé sauvage)", unknown: "jamais vu" }

interface Col { name: string; sprite?: string; types: string[]; level: number; stats: Record<StatKey, number> }
function colFromInstance(m: MonInstance): Col | null {
    const sp = getSpecies(m.speciesId); if (!sp) return null
    return { name: m.nickname || sp.name, sprite: sp.sprite, types: sp.types, level: m.level, stats: fullStats(m, sp) }
}
function colFromSpeciesAtLevel(sp: SpeciesData, level: number): Col {
    return { name: sp.name, sprite: sp.sprite, types: sp.types, level, stats: fullStats(createMonInstance(sp.id, level, { owned: false }), sp) }
}
const bstOf = (c: Col) => STAT_ROWS.reduce((s, [k]) => s + c.stats[k], 0)

export default function DaemomaniaqueCompare({ rows, tc }: { rows: SpeciesData[]; tc: (t: string) => string }) {
    const player = usePlayer()
    const dex = usePokedex()
    const team = useMemo(() => player.team.filter((m) => !!getSpecies(m.speciesId)), [player.team])

    const [aUid, setAUid] = useState<string | null>(() => team[0]?.uid ?? null)
    const [side, setSide] = useState<"team" | "dex">("team") // source du slot B
    const [bUid, setBUid] = useState<string | null>(null)     // équipe (gratuit)
    const [bSpeciesId, setBSpeciesId] = useState<string | null>(null) // Pokédex (payant)
    const [revealed, setRevealed] = useState<Set<string>>(new Set())
    const [err, setErr] = useState<string | null>(null)
    const [q, setQ] = useState("")

    const a = team.find((m) => m.uid === aUid) ?? null
    const colA = a ? colFromInstance(a) : null

    const dexList = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return rows.filter((sp) => !needle || sp.name.toLowerCase().includes(needle))
    }, [rows, q])

    // Slot B résolu + coût (0 si équipe). key = A.uid + B → gratuit à la RE-consultation dans la session.
    const bTeam = side === "team" ? team.find((m) => m.uid === bUid && m.uid !== aUid) ?? null : null
    const bSp = side === "dex" && bSpeciesId ? getSpecies(bSpeciesId) : null
    const tier = bSp ? daemonCompareTier(bSp.id) : null
    const price = tier ? comparisonConsultPrice(tier.base) : 0
    const key = a && side === "dex" && bSp ? `${a.uid}:${bSp.id}` : ""
    const paidOrFree = side === "team" ? !!bTeam : !!(bSp && (price === 0 || revealed.has(key)))
    const colB: Col | null = side === "team"
        ? (bTeam ? colFromInstance(bTeam) : null)
        : (bSp && a ? colFromSpeciesAtLevel(bSp, a.level) : null)

    const doPay = () => {
        if (!a || !bSp || !tier) return
        setErr(null)
        const r = payComparison(tier.base)
        if (!r.ok) { setErr(`Pas assez d'énergie (${price}⚡ requis).`); return }
        setRevealed((s) => new Set(s).add(`${a.uid}:${bSp.id}`))
    }

    const winColor = (mine: number, other: number) => (mine > other ? "#7ee0a0" : mine < other ? "#e08a8a" : "#c9b8e8")

    return (
        <div style={S.scroll}>
            {team.length < 1 ? (
                <div style={S.muted}>Tu n&apos;as aucun Daemon dans ton équipe à comparer.</div>
            ) : (<>
                {/* SLOT A — un Daemon de l'équipe */}
                <div style={S.lbl}>① Ton Daemon</div>
                <div style={S.pickRow}>
                    {team.map((m) => {
                        const sp = getSpecies(m.speciesId)!
                        return (
                            <button key={m.uid} onClick={() => { setAUid(m.uid); if (m.uid === bUid) setBUid(null) }} style={{ ...S.pick, ...(aUid === m.uid ? S.pickOn : {}) }}>
                                <img src={sp.sprite} alt="" style={S.pickSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                <span style={S.pickName}>{m.nickname || sp.name}</span><span style={S.pickLvl}>N.{m.level}</span>
                            </button>
                        )
                    })}
                </div>

                {/* SLOT B — équipe (gratuit) ou Pokédex (payant) */}
                <div style={{ ...S.lbl, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>② Comparer à</span>
                    <button onClick={() => setSide("team")} style={{ ...S.tabMini, ...(side === "team" ? S.tabMiniOn : {}) }}>🛡️ Mon équipe · gratuit</button>
                    <button onClick={() => setSide("dex")} style={{ ...S.tabMini, ...(side === "dex" ? S.tabMiniOn : {}) }}>📖 Pokédex · payant</button>
                </div>

                {side === "team" ? (
                    <div style={S.pickRow}>
                        {team.filter((m) => m.uid !== aUid).map((m) => {
                            const sp = getSpecies(m.speciesId)!
                            return (
                                <button key={m.uid} onClick={() => setBUid(m.uid)} style={{ ...S.pick, ...(bUid === m.uid ? S.pickOn : {}) }}>
                                    <img src={sp.sprite} alt="" style={S.pickSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                    <span style={S.pickName}>{m.nickname || sp.name}</span><span style={S.pickLvl}>N.{m.level}</span>
                                </button>
                            )
                        })}
                        {team.filter((m) => m.uid !== aUid).length === 0 && <div style={S.muted}>Il te faut un 2ᵉ Daemon dans l&apos;équipe.</div>}
                    </div>
                ) : (
                    <>
                        <input style={S.search} placeholder="🔎 Chercher une espèce…" value={q} onChange={(e) => setQ(e.target.value)} />
                        <div style={S.priceHint}>Coût : capturé <b>20</b> · vu sauvage <b>50</b> · connu <b>100</b> · jamais vu <b>200</b> ⚡ — <b>×1,5</b> à chaque compa payante du jour{comparisonConsultsUsed() > 0 ? ` (déjà ${comparisonConsultsUsed()} aujourd'hui)` : ""}.</div>
                        <div style={S.dexGrid}>
                            {dexList.map((sp) => {
                                const t = daemonCompareTier(sp.id)
                                const p = comparisonConsultPrice(t.base)
                                const owned = revealed.has(a ? `${a.uid}:${sp.id}` : "")
                                return (
                                    <button key={sp.id} onClick={() => { setBSpeciesId(sp.id); setErr(null) }} style={{ ...S.dexCard, ...(bSpeciesId === sp.id ? S.dexCardOn : {}) }}>
                                        <img src={sp.sprite} alt="" style={S.dexSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                        <span style={S.dexName}>{sp.name}</span>
                                        <span style={S.dexCost}>{owned ? "✓ vu" : `${p} ⚡`}</span>
                                    </button>
                                )
                            })}
                            {dexList.length === 0 && <div style={S.muted}>Aucune espèce.</div>}
                        </div>
                    </>
                )}

                {err && <div style={S.err}>{err}</div>}

                {/* GATE PAYANT (Pokédex non encore révélé) */}
                {side === "dex" && bSp && a && !paidOrFree && tier && (
                    <div style={S.payBox}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>Comparer <b>{colA?.name}</b> à <b>{bSp.name}</b> <span style={{ opacity: 0.7 }}>({TIER_LABEL[tier.tier]})</span>, à niveau égal (N.{a.level}).</div>
                        <button style={S.payBtn} onClick={doPay}>⚖️ Comparer — {price} ⚡</button>
                    </div>
                )}

                {/* TABLEAU COMPARATIF */}
                {colA && colB && paidOrFree && (() => {
                    const bstA = bstOf(colA), bstB = bstOf(colB)
                    return (
                        <div style={S.compareWrap}>
                            <div style={S.headsRow}>
                                {[colA, colB].map((c, i) => (
                                    <div key={i} style={S.headCard}>
                                        <img src={c.sprite} alt="" style={S.headSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                        <div style={S.headName}>{c.name}</div>
                                        <div style={S.headTypes}>{c.types.map((t) => <span key={t} style={{ ...S.headChip, background: tc(t) }}>{t}</span>)}</div>
                                        <div style={S.headLvl}>N.{c.level}</div>
                                    </div>
                                ))}
                            </div>
                            <table style={S.table}>
                                <tbody>
                                    {STAT_ROWS.map(([k, lbl]) => {
                                        const va = colA.stats[k], vb = colB.stats[k]
                                        return (
                                            <tr key={k}>
                                                <td style={{ ...S.tdVal, color: winColor(va, vb), fontWeight: va >= vb ? 800 : 600 }}>{va}</td>
                                                <td style={S.tdStat}>{lbl}</td>
                                                <td style={{ ...S.tdVal, color: winColor(vb, va), fontWeight: vb >= va ? 800 : 600 }}>{vb}</td>
                                            </tr>
                                        )
                                    })}
                                    <tr style={S.bstRow}>
                                        <td style={{ ...S.tdVal, color: winColor(bstA, bstB), fontWeight: 900 }}>{bstA}</td>
                                        <td style={S.tdStat}>BST</td>
                                        <td style={{ ...S.tdVal, color: winColor(bstB, bstA), fontWeight: 900 }}>{bstB}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {side === "dex" && <div style={S.legend}>Espèce du Pokédex matérialisée à niveau égal (N.{colA.level}, IV moyens) pour une comparaison juste.</div>}
                        </div>
                    )
                })()}
            </>)}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    scroll: { overflowY: "auto", padding: "12px 16px 16px" },
    lbl: { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#c9b8e8", marginBottom: 7 },
    pickRow: { display: "flex", flexWrap: "wrap", gap: 6 },
    pick: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: 74, background: "rgba(255,255,255,0.04)", border: "1px solid #3a3350", borderRadius: 10, padding: "6px 3px", cursor: "pointer", color: "#efe6ff" },
    pickOn: { borderColor: "#ffd76a", background: "rgba(224,160,32,0.16)" },
    pickSprite: { width: 40, height: 40, objectFit: "contain", imageRendering: "pixelated" },
    pickName: { fontSize: 9.5, fontWeight: 700, textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    pickLvl: { fontSize: 8.5, opacity: 0.7 },
    tabMini: { background: "rgba(30,22,48,0.6)", border: "1px solid #4a4468", borderRadius: 999, color: "#c9b8e8", fontSize: 10, fontWeight: 800, padding: "3px 9px", cursor: "pointer" },
    tabMiniOn: { background: "#e0a020", color: "#161018", borderColor: "#ffd76a" },
    search: { width: "100%", boxSizing: "border-box", background: "rgba(20,16,32,0.8)", border: "1px solid #6a5a8a", borderRadius: 9, color: "#f3ecff", fontSize: 14, padding: "8px 11px", margin: "8px 0 6px" },
    priceHint: { fontSize: 10.5, color: "#b7a9cf", lineHeight: 1.5, marginBottom: 8 },
    dexGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(84px,1fr))", gap: 6 },
    dexCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.04)", border: "1px solid #3a3350", borderRadius: 9, padding: "6px 3px", cursor: "pointer", color: "#efe6ff" },
    dexCardOn: { borderColor: "#ffd76a", background: "rgba(224,160,32,0.16)" },
    dexSprite: { width: 42, height: 42, objectFit: "contain", imageRendering: "pixelated" },
    dexName: { fontSize: 9.5, fontWeight: 700, textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    dexCost: { fontSize: 9.5, fontWeight: 800, color: "#ffd76a" },
    payBox: { display: "flex", flexDirection: "column", gap: 8, background: "rgba(224,160,32,0.1)", border: "1px solid #e0a020", borderRadius: 10, padding: "10px 12px", marginTop: 12 },
    payBtn: { background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 14, fontWeight: 900, padding: "10px", cursor: "pointer" },
    compareWrap: { marginTop: 14 },
    headsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    headCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(36,29,56,0.7)", border: "1px solid #4a3a6a", borderRadius: 12, padding: "10px 6px" },
    headSprite: { width: 64, height: 64, objectFit: "contain", imageRendering: "pixelated" },
    headName: { fontSize: 12.5, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.15 },
    headTypes: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" },
    headChip: { fontSize: 8.5, fontWeight: 800, color: "#161018", padding: "1px 7px", borderRadius: 999 },
    headLvl: { fontSize: 10.5, opacity: 0.85 },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 13.5, fontVariantNumeric: "tabular-nums" },
    tdVal: { textAlign: "center", padding: "6px 4px", width: "40%" },
    tdStat: { textAlign: "center", padding: "6px 4px", fontSize: 10.5, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 },
    bstRow: { borderTop: "2px solid #3a2e56" },
    legend: { fontSize: 10, opacity: 0.65, marginTop: 8, textAlign: "center", lineHeight: 1.4 },
    muted: { fontSize: 12.5, color: "#b7a9cf", padding: "18px 8px", textAlign: "center", lineHeight: 1.5 },
    err: { fontSize: 12.5, color: "#f3bcbc", background: "rgba(232,136,136,0.12)", border: "1px solid #e88", borderRadius: 8, padding: "8px 10px", marginTop: 10 },
}
