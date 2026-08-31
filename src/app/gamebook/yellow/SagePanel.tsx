"use client"

// VIEUX SAGE SAIYAN — le PÈRE de la famille « maniaque » (frères : Daemomaniaque 👒 & l'Espion 🕵️). Il pop
// à un endroit aléatoire de Ville Jaune tant qu'il lui reste des points à redistribuer AUJOURD'HUI (budget 20/jour).
// RESPEC : sur un Daemon de l'ÉQUIPE, on retire des points Saiyan d'une stat pour les réinjecter dans une autre —
// à SOMME CONSTANTE (redistribution stricte). Coût triangulaire cumulé sur la journée (k-ième point du jour = k reps,
// même pool que l'énergie de combat). currentHp est ré-ajusté par respecSaiyan quand la stat PV bouge.

import { useEffect, useMemo, useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer, respecSaiyan, sageRespecCost, SAGE_SAIYAN_DAILY_CAP, getGameMode } from "@/lib/gamebook/yellow/store/playerStore"
import { loadYellowSave, persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import type { StatKey, MonInstance } from "@/lib/gamebook/yellow/battle/types"

const STATS: { k: StatKey; label: string; per: number }[] = [
    { k: "hp", label: "PV", per: 3 },
    { k: "atk", label: "ATQ", per: 1 },
    { k: "def", label: "DÉF", per: 1 },
    { k: "spe", label: "VIT", per: 1 },
    { k: "spc", label: "SPÉ", per: 1 },
]
type Alloc = Record<StatKey, number>
const emptyAlloc = (): Alloc => ({ hp: 0, atk: 0, def: 0, spe: 0, spc: 0 })
const allocOf = (m: MonInstance): Alloc => {
    const a = emptyAlloc()
    for (const s of STATS) a[s.k] = m.allocated?.[s.k] ?? 0
    return a
}
const totalAlloc = (m: MonInstance) => STATS.reduce((n, s) => n + (m.allocated?.[s.k] ?? 0), 0)

// Répliques savoureuses (ADN familial : obsession des chiffres, tutoiement, mercantile — version vieux maître Saiyan).
const INTRO = [
    "« Mes deux garçons t'ont sûrement parlé de moi : l'un piste les bêtes, l'autre espionne les fiches… Moi, gamin, je SCULPTE la puissance brute. »",
    "« Tu as gâché de la sueur en la mettant au mauvais endroit ? Ça arrive. Présente-moi un Daemon de ton équipe : on va rééquilibrer tout ça. »",
]
// MODE FUN : aucune rep encodée → on retire la « sueur » de l'intro (2ᵉ réplique), le reste est identique.
const INTRO_FUN = [
    INTRO[0],
    "« Des points mal répartis ? Ça arrive. Présente-moi un Daemon de ton équipe : on va rééquilibrer tout ça. »",
]
const RULES =
    "« Retire un point d'une stat, replace-le dans une autre — pas un de perdu, pas un de créé. Mais l'énergie ne se déplace pas gratis : 1 goutte de sueur pour le 1ᵉʳ point du jour, 2 pour le 2ᵉ… jusqu'à 20 points. Au-delà, reviens demain. »"
// MODE FUN : pas de sueur (aucune rep encodée) → le coût est en ⚡ (même barème triangulaire, même pool d'énergie).
const RULES_FUN =
    "« Retire un point d'une stat, replace-le dans une autre — pas un de perdu, pas un de créé. Mais l'énergie ne se déplace pas gratis : 1 ⚡ pour le 1ᵉʳ point du jour, 2 pour le 2ᵉ… jusqu'à 20 points. Au-delà, reviens demain. »"
const DONE = "« VOILÀ. Sens-tu cette harmonie ? Tes points sont enfin là où ils comptent. File t'entraîner. »"
const EXHAUSTED = "« Doucement, jeune bouillonnant : tu as déjà déplacé tes 20 points aujourd'hui. La salle de gravité t'attendra demain. »"
const NO_TEAM = "« Une équipe VIDE ? On ne sculpte pas le néant, gamin. Reviens avec un Daemon. »"

export default function SagePanel() {
    const open = useGameStore((s) => s.sageOpen)
    const close = useGameStore((s) => s.closeSage)
    const player = usePlayer()
    const [pickedUid, setPickedUid] = useState<string | null>(null)
    const [working, setWorking] = useState<Alloc>(emptyAlloc())
    const [err, setErr] = useState<string | null>(null)
    const [flash, setFlash] = useState<string | null>(null)

    useEffect(() => { if (open) { void loadYellowSave(); setPickedUid(null); setErr(null); setFlash(null) } }, [open])

    const usedToday = player.sageSaiyanPointsToday ?? 0
    const leftToday = Math.max(0, SAGE_SAIYAN_DAILY_CAP - usedToday)
    const mon = useMemo(() => player.team.find((m) => m.uid === pickedUid) ?? null, [player.team, pickedUid])
    const orig = useMemo(() => (mon ? allocOf(mon) : emptyAlloc()), [mon])

    if (!open) return null

    const pick = (m: MonInstance) => { setPickedUid(m.uid); setWorking(allocOf(m)); setErr(null); setFlash(null) }

    // Diffs nets (working - orig) → pool à replacer, points déplacés, coût.
    const delta = (k: StatKey) => working[k] - orig[k]
    const addedNet = STATS.reduce((n, s) => n + Math.max(0, delta(s.k)), 0)
    const removedNet = STATS.reduce((n, s) => n + Math.max(0, -delta(s.k)), 0)
    const pool = removedNet - addedNet            // points retirés pas encore replacés (>=0)
    const moved = addedNet                        // points effectivement déplacés (= removedNet quand équilibré)
    const balanced = pool === 0
    const cost = sageRespecCost(moved, usedToday)
    const canConfirm = balanced && moved >= 1 && usedToday + moved <= SAGE_SAIYAN_DAILY_CAP && player.reps >= cost

    const dec = (k: StatKey) => {
        setErr(null); setFlash(null)
        if (working[k] <= 0) return                                   // plancher absolu (allocation ≥ 0)
        const projRemoved = removedNet + (delta(k) <= 0 ? 1 : 0)       // ce − augmente-t-il le retrait net ?
        if (projRemoved > leftToday) { setErr(`Tu n'as plus que ${leftToday} point(s) déplaçable(s) aujourd'hui.`); return }
        setWorking((w) => ({ ...w, [k]: w[k] - 1 }))
    }
    const inc = (k: StatKey) => {
        setErr(null); setFlash(null)
        if (pool <= 0) { setErr("Retire d'abord un point d'une autre stat pour pouvoir le replacer ici."); return }
        setWorking((w) => ({ ...w, [k]: w[k] + 1 }))
    }

    const confirm = () => {
        if (!mon || !canConfirm) return
        const deltas: Partial<Record<StatKey, number>> = {}
        for (const s of STATS) { const d = working[s.k] - orig[s.k]; if (d !== 0) deltas[s.k] = d }
        const r = respecSaiyan(mon.uid, deltas)
        if (!r.ok) {
            setErr(r.reason === "reps" ? `Pas assez d'énergie (${cost}⚡ requis).`
                : r.reason === "budget" ? "Cela dépasse tes 20 points du jour."
                : r.reason === "unbalanced" ? "Il faut replacer TOUS les points retirés."
                : "Impossible pour ce Daemon.")
            return
        }
        void persistYellowSave()
        setFlash(`${DONE} (−${r.cost ?? cost}⚡)`)
        // Le respec est appliqué : on repart de la nouvelle allocation (budget & reps déjà mis à jour dans le store).
        setWorking(allocOf({ ...mon, allocated: { ...(mon.allocated ?? {}) } }))
        setPickedUid(null)
    }

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <img src="/yellow/sprites/npc96_sage_saiyan.png" alt="" style={S.portrait} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div style={{ flex: 1 }}>
                        <div style={S.title}>🧙 Le Vieux Sage Saiyan</div>
                        <div style={S.sub}>Respec Saiyan · {leftToday}/{SAGE_SAIYAN_DAILY_CAP} pts aujourd'hui · ⚡ {player.reps}</div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                {leftToday <= 0 ? (
                    <div style={{ ...S.scroll, textAlign: "center" }}>
                        <div style={{ ...S.line, fontStyle: "italic" }}>{EXHAUSTED}</div>
                    </div>
                ) : player.team.length === 0 ? (
                    <div style={{ ...S.scroll, textAlign: "center" }}>
                        <div style={{ ...S.line, fontStyle: "italic" }}>{NO_TEAM}</div>
                    </div>
                ) : !mon ? (
                    // ── Choix du Daemon de l'équipe ──
                    <div style={S.scroll}>
                        {flash && <div style={S.flash}>{flash}</div>}
                        {(getGameMode() === "fun" ? INTRO_FUN : INTRO).map((l, i) => <div key={i} style={{ ...S.line, fontStyle: "italic" }}>{l}</div>)}
                        <div style={S.section}>Quel Daemon veux-tu rééquilibrer ?</div>
                        <div style={S.grid}>
                            {player.team.map((m) => {
                                const sp = getSpecies(m.speciesId)
                                const tot = totalAlloc(m)
                                return (
                                    <button key={m.uid} style={S.card} onClick={() => pick(m)}>
                                        <img src={sp?.sprite} alt={sp?.name ?? m.speciesId} style={S.cardSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                        <div style={S.cardName}>{m.nickname || sp?.name || m.speciesId}</div>
                                        <div style={S.cardMeta}>N.{m.level} · {tot} pt{tot > 1 ? "s" : ""} Saiyan</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    // ── Éditeur de respec ──
                    <div style={S.scroll}>
                        <button style={S.back} onClick={() => { setPickedUid(null); setErr(null) }}>← Autre Daemon</button>
                        <div style={S.detailHead}>
                            <img src={getSpecies(mon.speciesId)?.sprite} alt="" style={S.detailSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                            <div>
                                <div style={S.detailName}>{mon.nickname || getSpecies(mon.speciesId)?.name || mon.speciesId}</div>
                                <div style={S.sub}>Niveau {mon.level} · total réparti conservé</div>
                            </div>
                        </div>

                        <div style={S.statList}>
                            {STATS.map((s) => {
                                const d = delta(s.k)
                                return (
                                    <div key={s.k} style={S.statRow}>
                                        <div style={S.statLabel}>{s.label}<span style={S.per}>+{s.per}/pt</span></div>
                                        <button style={{ ...S.step, ...(working[s.k] <= 0 ? S.stepOff : {}) }} onClick={() => dec(s.k)}>−</button>
                                        <div style={S.statVal}>
                                            <span style={S.valNum}>{working[s.k]}</span>
                                            {d !== 0 && <span style={{ ...S.valDelta, color: d > 0 ? "#7ee08a" : "#f2a1a1" }}>{d > 0 ? `+${d}` : d}</span>}
                                        </div>
                                        <button style={{ ...S.step, ...(pool <= 0 ? S.stepOff : {}) }} onClick={() => inc(s.k)}>+</button>
                                    </div>
                                )
                            })}
                        </div>

                        <div style={S.summary}>
                            <span>À replacer : <b style={{ color: pool > 0 ? "#ffd76a" : "#7ee08a" }}>{pool}</b></span>
                            <span>Déplacés : <b>{moved}</b></span>
                            <span>Coût : <b style={{ color: player.reps >= cost ? "#efe6ff" : "#f2a1a1" }}>{cost}⚡</b></span>
                        </div>

                        {err && <div style={S.err}>{err}</div>}
                        {!err && !balanced && <div style={S.hint}>Replace tes {pool} point(s) retiré(s) pour valider.</div>}

                        <button style={{ ...S.confirm, ...(canConfirm ? {} : S.confirmOff) }} disabled={!canConfirm} onClick={confirm}>
                            {moved >= 1 ? `Rééquilibrer (${moved} pt${moved > 1 ? "s" : ""} · ${cost}⚡)` : "Déplace au moins 1 point"}
                        </button>
                        <div style={{ ...S.line, fontStyle: "italic", marginTop: 10 }}>{getGameMode() === "fun" ? RULES_FUN : RULES}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, background: "rgba(6,9,16,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12, fontFamily: "system-ui,sans-serif" },
    panel: { width: "min(560px,97vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "radial-gradient(720px 340px at 50% -6%, #33261a 0%, #201725 55%, #14101c 100%)", border: "1px solid #e0a020", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#efe6ff" },
    header: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #4a3a2e" },
    portrait: { width: 46, height: 46, objectFit: "contain", imageRendering: "pixelated" },
    title: { fontSize: 17, fontWeight: 900, color: "#ffd76a" },
    sub: { fontSize: 12, color: "#cbb79a", marginTop: 2 },
    close: { background: "#2a2333", border: "1px solid #4a3a2e", color: "#c3cbdc", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontSize: 15 },
    scroll: { overflowY: "auto", padding: "12px 16px 16px" },
    section: { fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.7, margin: "14px 0 8px", textTransform: "uppercase" },
    line: { fontSize: 13, lineHeight: 1.5, marginBottom: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 11px" },
    flash: { fontSize: 13, lineHeight: 1.5, marginBottom: 10, background: "rgba(126,224,138,0.12)", border: "1px solid #7ee08a", color: "#d8ffdd", borderRadius: 8, padding: "9px 11px", fontStyle: "italic" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(104px,1fr))", gap: 8 },
    card: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.04)", border: "1px solid #4a3a2e", borderRadius: 10, padding: "8px 4px", cursor: "pointer", color: "#efe6ff" },
    cardSprite: { width: 54, height: 54, objectFit: "contain", imageRendering: "pixelated" },
    cardName: { fontSize: 11, fontWeight: 800, textAlign: "center", lineHeight: 1.15 },
    cardMeta: { fontSize: 10, color: "#cbb79a", textAlign: "center" },
    back: { background: "transparent", border: "1px solid #6a5a3a", borderRadius: 8, color: "#e0c88a", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer", marginBottom: 12 },
    detailHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
    detailSprite: { width: 72, height: 72, objectFit: "contain", imageRendering: "pixelated" },
    detailName: { fontSize: 19, fontWeight: 900, color: "#fff" },
    statList: { display: "flex", flexDirection: "column", gap: 7, margin: "4px 0 12px" },
    statRow: { display: "grid", gridTemplateColumns: "1fr 40px 76px 40px", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.035)", borderRadius: 10, padding: "6px 10px" },
    statLabel: { fontSize: 13, fontWeight: 800, display: "flex", flexDirection: "column" },
    per: { fontSize: 9.5, fontWeight: 600, color: "#9c8a70" },
    step: { width: 40, height: 36, borderRadius: 9, border: "1px solid #6a5a3a", background: "#2a2333", color: "#ffd76a", fontSize: 20, fontWeight: 900, cursor: "pointer", lineHeight: 1 },
    stepOff: { opacity: 0.3, cursor: "not-allowed" },
    statVal: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 },
    valNum: { fontSize: 19, fontWeight: 900, fontVariantNumeric: "tabular-nums" },
    valDelta: { fontSize: 12, fontWeight: 800 },
    summary: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, background: "rgba(0,0,0,0.25)", borderRadius: 9, padding: "9px 12px", marginBottom: 10 },
    err: { fontSize: 12.5, color: "#f3bcbc", background: "rgba(232,136,136,0.12)", border: "1px solid #e88", borderRadius: 8, padding: "8px 10px", marginBottom: 8 },
    hint: { fontSize: 12, color: "#e0c88a", marginBottom: 8 },
    confirm: { width: "100%", background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 11, color: "#241a06", fontSize: 15, fontWeight: 900, padding: "13px", cursor: "pointer" },
    confirmOff: { filter: "grayscale(0.7) brightness(0.7)", cursor: "not-allowed" },
}
