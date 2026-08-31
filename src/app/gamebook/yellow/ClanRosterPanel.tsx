"use client"

// PANTHÉON DU CLAN — s'ouvre en visitant son chef (Chapelle de Nouillon). Liste les membres du clan (cross-joueur,
// persistant cross-run) + le niveau de leur Daemon-clan confié. Un clic sur un membre → fiche du Daemon (types,
// stats de base, learnset). Lecture seule, données serveur (route clan-hall-of-fame).

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { CLANS, type ClanKey } from "@/lib/gamebook/yellow/data/clans"
import type { ClanHallMember } from "@/lib/gamebook/yellow/store/clanHof"
import type { SpeciesData, StatKey } from "@/lib/gamebook/yellow/battle/types"

const STAT_ROWS: [StatKey, string][] = [["hp", "PV"], ["atk", "ATQ"], ["def", "DÉF"], ["spe", "VIT"], ["spc", "SPÉ"]]

export default function ClanRosterPanel({ clan, close }: { clan: ClanKey; close: () => void }) {
    const meta = CLANS[clan]
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [members, setMembers] = useState<ClanHallMember[]>([])
    const [openSp, setOpenSp] = useState<{ sp: SpeciesData; level: number; nickname: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/clan-hall-of-fame")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                const all = (j?.members ?? []) as ClanHallMember[]
                setMembers(all.filter((m) => m.clan === clan)) // déjà trié par niveau (serveur)
                setState("ok")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [clan])

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={title}>{meta.emoji} PANTHÉON — {meta.name.toUpperCase()}</div>
                <div style={sub}>Les membres du clan et le niveau de leur Daemon-clan confié. Touche un nom pour voir sa fiche.</div>
                {state === "loading" && <div style={muted}>Chargement du Panthéon…</div>}
                {state === "error" && <div style={muted}>Panthéon indisponible (hors-ligne ?).</div>}
                {state === "ok" && members.length === 0 && <div style={muted}>Aucun membre gravé pour l&apos;instant — sois le premier à faire grandir ton disciple !</div>}
                <div style={scroll}>
                    {members.map((m, i) => {
                        const sp = getSpecies(m.speciesId)
                        return (
                            <button key={i} style={row} disabled={!sp} onClick={() => sp && setOpenSp({ sp, level: m.level, nickname: m.nickname })} title={sp ? "Voir la fiche du Daemon" : undefined}>
                                <span style={rank}>{i + 1}</span>
                                {sp?.sprite ? <img src={sp.sprite} alt={sp.name} style={rowImg} /> : <span style={{ fontSize: 18 }}>{meta.emoji}</span>}
                                <span style={rowMember}>{m.transcended ? "🌟 " : ""}{m.nickname}</span>
                                <span style={rowDaemon}>{sp?.name ?? m.speciesId}</span>
                                <span style={rowLvl}>N.{m.level}</span>
                            </button>
                        )
                    })}
                </div>
                <div style={{ ...muted, fontSize: 10.5, padding: "4px 2px 0" }}>🌟 = Transcendance atteinte (niv 80). Fiches = stats de base d&apos;espèce.</div>
                <button style={closeBtn} onClick={close}>← FERMER</button>
            </div>

            {/* Fiche du Daemon-clan d'un membre (espèce : types, stats de base, learnset). */}
            {openSp && (() => {
                const { sp, level, nickname } = openSp
                const bst = STAT_ROWS.reduce((a, [k]) => a + sp.baseStats[k], 0)
                return (
                    <div style={detailOverlay} onClick={(e) => { e.stopPropagation(); setOpenSp(null) }}>
                        <div style={detailBox} onClick={(e) => e.stopPropagation()}>
                            <div style={detailHead}>
                                {sp.sprite ? <img src={sp.sprite} alt={sp.name} style={detailImg} /> : <div style={{ fontSize: 44 }}>{meta.emoji}</div>}
                                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                    <div style={detailName}>{nickname}</div>
                                    <div style={detailSpecies}>{sp.name} · N.{level}</div>
                                    <div style={detailTypes}>{sp.types.join(" · ")}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                                {STAT_ROWS.map(([k, l]) => (
                                    <div key={k} style={statRow}>
                                        <span style={statLbl}>{l}</span>
                                        <span style={statVal}>{sp.baseStats[k]}</span>
                                        <span style={statBarBg}><span style={{ ...statBarFill, width: `${Math.min(100, (sp.baseStats[k] / 180) * 100)}%` }} /></span>
                                    </div>
                                ))}
                                <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right" }}>BST {bst}</div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, marginBottom: 5 }}>🎓 Attaques apprises</div>
                            <div style={learnWrap}>
                                {[...sp.learnset].sort((a, b) => a.level - b.level).map((ls, i) => (
                                    <span key={i} style={learnChip}>N.{ls.level} · {getMove(ls.moveId)?.name ?? ls.moveId}</span>
                                ))}
                            </div>
                            <button style={closeBtn} onClick={() => setOpenSp(null)}>← Retour</button>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.82)", fontFamily: "inherit" }
const box: React.CSSProperties = { width: "min(440px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#171430", border: "2px solid #7be0a0", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(123,224,160,.22)" }
const title: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: "#7be0a0", textAlign: "center", letterSpacing: 0.5, marginBottom: 4 }
const sub: React.CSSProperties = { fontSize: 11, opacity: 0.7, textAlign: "center", marginBottom: 10, lineHeight: 1.4 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.7, textAlign: "center", padding: "12px 4px", lineHeight: 1.6 }
const scroll: React.CSSProperties = { overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: "#fff", fontFamily: "inherit", textAlign: "left", width: "100%" }
const rank: React.CSSProperties = { fontSize: 11, fontWeight: 800, width: 16, textAlign: "center", opacity: 0.55 }
const rowImg: React.CSSProperties = { width: 30, height: 30, objectFit: "contain", imageRendering: "pixelated" }
const rowMember: React.CSSProperties = { flex: 1, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const rowDaemon: React.CSSProperties = { fontSize: 10.5, opacity: 0.75, whiteSpace: "nowrap", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }
const rowLvl: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#7be0a0", minWidth: 34, textAlign: "right" }
const closeBtn: React.CSSProperties = { marginTop: 12, padding: "10px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
const detailOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9350, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.7)" }
const detailBox: React.CSSProperties = { width: "min(360px, 92vw)", maxHeight: "88vh", overflowY: "auto", background: "#1b1838", border: "1px solid rgba(123,224,160,0.4)", borderRadius: 12, padding: 14, color: "#fff" }
const detailHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }
const detailImg: React.CSSProperties = { width: 80, height: 80, objectFit: "contain", imageRendering: "pixelated" }
const detailName: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#7be0a0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const detailSpecies: React.CSSProperties = { fontSize: 11.5, opacity: 0.8, marginTop: 2 }
const detailTypes: React.CSSProperties = { fontSize: 11, opacity: 0.8, marginTop: 2 }
const statRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 }
const statLbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, width: 28, textAlign: "left", opacity: 0.8 }
const statVal: React.CSSProperties = { fontSize: 11, fontWeight: 700, width: 30, textAlign: "right" }
const statBarBg: React.CSSProperties = { flex: 1, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }
const statBarFill: React.CSSProperties = { display: "block", height: "100%", borderRadius: 4, background: "#7be0a0" }
const learnWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 5 }
const learnChip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "3px 7px", background: "rgba(123,224,160,0.12)", border: "1px solid rgba(123,224,160,0.3)", borderRadius: 999 }
