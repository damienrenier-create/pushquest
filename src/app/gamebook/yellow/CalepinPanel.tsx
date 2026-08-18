"use client"

// LE CALEPIN — carnet d'astuces reçu d'ACE (1re défaite). Liste les conseils DÉJÀ LUS (panneaux du parc), dans
//   l'ordre reçu (triable), avec des NOTES PERSO annotables. Contenu = mêmes fiches TOPICS que le Manuel.

import { Fragment, useState } from "react"
import { TOPICS, topicCat } from "./ParkSignPanel"
import { getCalepin, setCalepinNote } from "@/lib/gamebook/yellow/store/calepinStore"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

export default function CalepinPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [cal, setCal] = useState(() => getCalepin(userId))
    const [sort, setSort] = useState<"recu" | "alpha" | "theme">("recu")
    const [open, setOpen] = useState<string | null>(null)   // tip (titre) déplié en détail
    const [draft, setDraft] = useState("")                  // brouillon de note du tip ouvert

    // Carnet VIERGE au départ : n'affiche QUE les astuces réellement CROISÉES en jeu (cal.tips), dans l'ordre reçu.
    const received = cal.tips.map((t) => TOPICS.find((x) => x.t === t)).filter((x): x is (typeof TOPICS)[number] => !!x)
    const list = sort === "alpha" ? [...received].sort((a, b) => a.t.localeCompare(b.t))
        : sort === "theme" ? [...received].sort((a, b) => topicCat(a.t).localeCompare(topicCat(b.t)) || a.t.localeCompare(b.t))
            : received
    const topic = open ? TOPICS.find((x) => x.t === open) : null

    const openTip = (t: string) => { setOpen(t); setDraft(getCalepin(userId).notes[t] ?? "") }
    const saveNote = () => { if (!open) return; setCalepinNote(userId, open, draft); setCal(getCalepin(userId)) }

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: CREAM, color: INK, border: `3px solid ${INK}`, borderRadius: 12, padding: 14, width: "min(440px, 96vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 30px #000a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>📓 CALEPIN</div>
                    <button onClick={onClose} style={{ background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                {topic ? (
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
                                const showHeader = sort === "theme" && (i === 0 || topicCat(list[i - 1].t) !== topicCat(t.t))
                                return (
                                    <Fragment key={t.t}>
                                        {showHeader && <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.65, margin: "6px 0 1px" }}>{topicCat(t.t)}</div>}
                                        <button onClick={() => openTip(t.t)} style={{ textAlign: "left", background: "#fff8e6", border: `1px solid ${DARK}`, borderRadius: 8, padding: "9px 11px", cursor: "pointer", color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>
                                            📌 {t.t}{hasNote && <span title="Note perso"> ✍️</span>}
                                        </button>
                                    </Fragment>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
