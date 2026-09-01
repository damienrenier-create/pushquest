"use client"

// LE CALEPIN — carnet d'astuces reçu d'ACE (1re défaite). Liste les conseils DÉJÀ LUS (panneaux du parc), dans
//   l'ordre reçu (triable), avec des NOTES PERSO annotables. Contenu = mêmes fiches TOPICS que le Manuel.

import { Fragment, useState, type ReactNode } from "react"
import { TOPICS, topicCat } from "./ParkSignPanel"
import { getCalepin, setCalepinNote } from "@/lib/gamebook/yellow/store/calepinStore"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { VILLE_JAUNE_TIPS } from "@/lib/gamebook/yellow/data/villeJauneTips"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

// CATALOGUE UNIFIÉ des astuces consignables : panneaux du parc (TOPICS) + panneau d'astuces de la Ville Jaune.
//   Clé = titre exact (comme l'enregistrement dans le Calepin). Les conseils de la ville rendent un simple paragraphe.
const VJ_TOPICS: { t: string; body: ReactNode }[] = VILLE_JAUNE_TIPS.map((v) => ({
    t: v.title,
    body: <p style={{ fontSize: 12.5, lineHeight: 1.55, color: INK, margin: "0 0 9px" }}>{v.text}</p>,
}))
const CATALOG: { t: string; body: ReactNode }[] = [...TOPICS, ...VJ_TOPICS]
const VJ_TITLES = new Set(VILLE_JAUNE_TIPS.map((v) => v.title))
// Thème d'une astuce (regroupe les conseils de la ville sous leur propre rubrique).
const catOf = (title: string): string => (VJ_TITLES.has(title) ? "Astuces de la ville" : topicCat(title))

// Journal d'énergie : formatage court JJ/MM et HH:MM d'un timestamp.
const fmtDay = (ts: number) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` }
const fmtTime = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }

export default function CalepinPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [cal, setCal] = useState(() => getCalepin(userId))
    const player = usePlayer()                              // pour le JOURNAL D'ÉNERGIE (player.energyLog)
    const [tab, setTab] = useState<"astuces" | "energie">("astuces")
    const [sort, setSort] = useState<"recu" | "alpha" | "theme">("recu")
    const [open, setOpen] = useState<string | null>(null)   // tip (titre) déplié en détail
    const [draft, setDraft] = useState("")                  // brouillon de note du tip ouvert

    // Carnet VIERGE au départ : n'affiche QUE les astuces réellement CROISÉES en jeu (cal.tips), dans l'ordre reçu.
    const received = cal.tips.map((t) => CATALOG.find((x) => x.t === t)).filter((x): x is (typeof CATALOG)[number] => !!x)
    const list = sort === "alpha" ? [...received].sort((a, b) => a.t.localeCompare(b.t))
        : sort === "theme" ? [...received].sort((a, b) => catOf(a.t).localeCompare(catOf(b.t)) || a.t.localeCompare(b.t))
            : received
    const topic = open ? CATALOG.find((x) => x.t === open) : null

    const openTip = (t: string) => { setOpen(t); setDraft(getCalepin(userId).notes[t] ?? "") }
    const saveNote = () => { if (!open) return; setCalepinNote(userId, open, draft); setCal(getCalepin(userId)) }

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: CREAM, color: INK, border: `3px solid ${INK}`, borderRadius: 12, padding: 14, width: "min(440px, 96vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 30px #000a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>📓 CALEPIN</div>
                    <button onClick={onClose} style={{ background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {([["astuces", "📌 Mes astuces"], ["energie", "⚡ Journal d'énergie"]] as const).map(([k, lbl]) => (
                        <button key={k} onClick={() => { setTab(k); setOpen(null) }} style={{ flex: 1, background: tab === k ? INK : "transparent", color: tab === k ? CREAM : INK, border: `1px solid ${INK}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", fontWeight: 800, fontSize: 11.5 }}>{lbl}</button>
                    ))}
                </div>

                {tab === "astuces" && (topic ? (
                    <>
                        <button onClick={() => { saveNote(); setOpen(null) }} style={{ background: "transparent", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800, fontSize: 11, marginBottom: 10 }}>← Mes astuces</button>
                        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>{topic.t}</div>
                        <div>{topic.body}</div>
                        <div style={{ fontWeight: 800, fontSize: 12, margin: "10px 0 4px" }}>✍️ Ma note</div>
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={saveNote} maxLength={300} rows={3}
                            placeholder="Écris ta propre note sur cette astuce…"
                            style={{ width: "100%", boxSizing: "border-box", background: "#fff8e6", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, padding: "7px 9px", fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                    </>
                ) : list.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "26px 14px", fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                        📖 Ton calepin est encore <b>vierge</b>.<br />
                        Lis les <b>panneaux</b> du parc, écoute les <b>PNJ</b>… chaque astuce que tu croises viendra s'y inscrire, et tu pourras y ajouter tes notes.
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11 }}>
                            <span style={{ opacity: 0.7 }}>Trier :</span>
                            {([["recu", "Ordre reçu"], ["theme", "Thème"], ["alpha", "A → Z"]] as const).map(([k, lbl]) => (
                                <button key={k} onClick={() => setSort(k)} style={{ background: sort === k ? INK : "transparent", color: sort === k ? CREAM : INK, border: `1px solid ${INK}`, borderRadius: 7, padding: "3px 9px", cursor: "pointer", fontWeight: 800, fontSize: 11 }}>{lbl}</button>
                            ))}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>{list.length} astuce{list.length > 1 ? "s" : ""} croisée{list.length > 1 ? "s" : ""} · ✍️ = tu y as mis une note</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {list.map((t, i) => {
                                const hasNote = !!(cal.notes[t.t] ?? "").trim()
                                const showHeader = sort === "theme" && (i === 0 || catOf(list[i - 1].t) !== catOf(t.t))
                                return (
                                    <Fragment key={t.t}>
                                        {showHeader && <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.65, margin: "6px 0 1px" }}>{catOf(t.t)}</div>}
                                        <button onClick={() => openTip(t.t)} style={{ textAlign: "left", background: "#fff8e6", border: `1px solid ${DARK}`, borderRadius: 8, padding: "9px 11px", cursor: "pointer", color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>
                                            📌 {t.t}{hasNote && <span title="Note perso"> ✍️</span>}
                                        </button>
                                    </Fragment>
                                )
                            })}
                        </div>
                    </>
                ))}

                {tab === "energie" && <EnergyJournal log={player.energyLog ?? []} />}
            </div>
        </div>
    )
}

// JOURNAL D'ÉNERGIE — répond à « d'où vient l'énergie dont je dispose ». Deux volets : (1) une RÉPARTITION par source
//   (barres, du plus gros au plus petit) = la vue d'ensemble ; (2) le DÉTAIL chronologique récent (le plus récent en
//   haut). N'affiche QUE les ENTRÉES (crédits) ; les dépenses ne sont pas tracées. Vierge tant qu'aucune entrée.
function EnergyJournal({ log }: { log: { ts: number; source: string; amount: number }[] }) {
    if (log.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "26px 14px", fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                ⚡ Aucune <b>entrée d&apos;énergie</b> enregistrée pour l&apos;instant.<br />
                Fais du sport, gagne des combats, ouvre des cadeaux… chaque gain d&apos;énergie viendra s&apos;inscrire ici.
            </div>
        )
    }
    const total = log.reduce((a, e) => a + e.amount, 0)
    const bySource = new Map<string, number>()
    for (const e of log) bySource.set(e.source, (bySource.get(e.source) ?? 0) + e.amount)
    const breakdown = [...bySource.entries()].sort((a, b) => b[1] - a[1])
    const max = breakdown[0]?.[1] || 1
    const recent = [...log].reverse() // le plus récent en haut
    return (
        <>
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 8 }}>
                D&apos;où vient ton énergie — <b>{breakdown.length} source{breakdown.length > 1 ? "s" : ""}</b> · total tracé <b>+{total} ⚡</b>
                <span style={{ opacity: 0.6 }}> (les {log.length} dernières entrées)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {breakdown.map(([src, amt]) => (
                    <div key={src}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                            <span>{src}</span><span>+{amt} ⚡ <span style={{ opacity: 0.55, fontWeight: 500 }}>({Math.round((amt / total) * 100)}%)</span></span>
                        </div>
                        <div style={{ height: 8, background: "#e7dcbb", borderRadius: 5, overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(3, (amt / max) * 100)}%`, height: "100%", background: INK, borderRadius: 5 }} />
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.6, marginBottom: 5 }}>Détail récent</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recent.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff8e6", border: `1px solid ${DARK}`, borderRadius: 8, padding: "7px 10px", fontSize: 12.5 }}>
                        <span style={{ opacity: 0.55, fontSize: 10, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 66 }}>{fmtDay(e.ts)} · {fmtTime(e.ts)}</span>
                        <span style={{ flex: 1, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.source}</span>
                        <span style={{ fontWeight: 800, color: "#2a7a3a", flexShrink: 0 }}>+{e.amount} ⚡</span>
                    </div>
                ))}
            </div>
        </>
    )
}
