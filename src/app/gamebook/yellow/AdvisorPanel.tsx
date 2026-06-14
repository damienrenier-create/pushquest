"use client"

// Nexus Jaune Éclair — CONSEILLER (PNJ à côté du Centre Daemon).
// Le joueur pose une question librement → POST en base (AdvisorQuestion). Le créateur
// (Sartay) lit et répond en base (champ `answer`) ; la réponse réapparaît ici (GET).
// UI volontairement simple : portrait + champ libre + historique de mes questions/réponses.

import { useEffect, useRef, useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

interface QA { id: string; question: string; answer: string | null; createdAt: string; answeredAt: string | null }

function fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) } catch { return "" }
}

export default function AdvisorPanel() {
    const open = useGameStore((s) => s.advisorOpen)
    const close = useGameStore((s) => s.closeAdvisor)
    const [list, setList] = useState<QA[] | null>(null)
    const [text, setText] = useState("")
    const [sending, setSending] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)
    const [imgErr, setImgErr] = useState(false)
    const cancelRef = useRef(false)

    useEffect(() => {
        if (!open) { setList(null); setText(""); setMsg(null); return }
        cancelRef.current = false
        fetch("/api/gamebook/yellow/advisor")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
            .then((j) => { if (!cancelRef.current) setList(j.questions ?? []) })
            .catch(() => { if (!cancelRef.current) setList([]) })
        return () => { cancelRef.current = true }
    }, [open])

    if (!open) return null

    const send = async () => {
        const q = text.trim()
        if (q.length < 3 || sending) { setMsg(q.length < 3 ? "Ta question est trop courte." : null); return }
        setSending(true); setMsg(null)
        try {
            const r = await fetch("/api/gamebook/yellow/advisor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q }),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) { setMsg(j.error ?? "Échec de l'envoi. Réessaie."); return }
            setList((prev) => [j.question as QA, ...(prev ?? [])])
            setText("")
            setMsg("✅ Question envoyée ! Le créateur te répondra ici même.")
        } catch {
            setMsg("Réseau indisponible. Réessaie plus tard.")
        } finally {
            setSending(false)
        }
    }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🧙 LE CONSEILLER</div>

                <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        {!imgErr
                            ? <img src="/yellow/sprites/guide.png" alt="Conseiller" onError={() => setImgErr(true)} style={portrait} />
                            : <div style={{ ...portrait, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🧙</div>}
                        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: INK, margin: 0 }}>
                            Une question sur le Nexus, une astuce, un bug ? Pose-la-moi : je la transmets au créateur, qui te répondra ici même.
                        </p>
                    </div>

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Écris ta question…"
                        style={textarea}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: INK, opacity: 0.5 }}>{text.length}/500</span>
                        <span style={{ flex: 1 }} />
                        <button onClick={send} disabled={sending || text.trim().length < 3} style={{ ...sendBtn, ...(sending || text.trim().length < 3 ? sendBtnDim : {}) }}>
                            {sending ? "Envoi…" : "Envoyer"}
                        </button>
                    </div>
                    {msg && <div style={{ fontSize: 11, color: msg.startsWith("✅") ? "#1b7a1b" : "#b03020", marginTop: 6, fontWeight: 600 }}>{msg}</div>}

                    <div style={{ borderTop: `2px solid ${DARK}`, marginTop: 12, paddingTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 6 }}>Mes échanges</div>
                        {list === null && <div style={muted}>Chargement…</div>}
                        {list && list.length === 0 && <div style={muted}>Aucune question pour l'instant. Lance-toi !</div>}
                        {list && list.map((qa) => (
                            <div key={qa.id} style={qaCard}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>
                                    <span style={{ opacity: 0.5, fontWeight: 600, fontSize: 10 }}>{fmtDate(qa.createdAt)} · toi : </span>{qa.question}
                                </div>
                                {qa.answer
                                    ? <div style={answerLine}><span style={{ fontWeight: 800 }}>🧙 Conseiller : </span>{qa.answer}</div>
                                    : <div style={{ ...answerLine, opacity: 0.6, fontStyle: "italic" }}>En attente de réponse…</div>}
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const portrait: React.CSSProperties = { width: 64, height: 64, objectFit: "contain", imageRendering: "pixelated", flexShrink: 0, filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }
const textarea: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#fff", border: `2px solid ${DARK}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: INK, fontFamily: "inherit", outline: "none", resize: "vertical" }
const sendBtn: React.CSSProperties = { background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const sendBtnDim: React.CSSProperties = { background: "#b8b29a", color: "#efe9d6", cursor: "not-allowed" }
const muted: React.CSSProperties = { fontSize: 12, color: INK, opacity: 0.6, textAlign: "center", padding: 14 }
const qaCard: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: "7px 9px", marginBottom: 8 }
const answerLine: React.CSSProperties = { fontSize: 12, color: INK, marginTop: 4, lineHeight: 1.45 }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
