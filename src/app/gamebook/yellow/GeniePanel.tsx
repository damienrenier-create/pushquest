"use client"

// ARC LAMPE & GÉNIE — onglet « 🧞 Vœux » du menu (débloqué une fois la lampe frottée). Lecture des 3 vœux
// (GET /api/gamebook/yellow/genie-wish) + statut :
//   SUBMITTED → « le génie réfléchit » · PROPOSED → conditions du génie + ACCEPTER/REFUSER par vœu (POST respond)
//   · RESOLVED → verdict final (accepté ✅ / refusé ❌). Lecture seule sinon.

import { useEffect, useState } from "react"

interface Wish {
    status: string
    wish1: string; wish2: string; wish3: string
    condition1: string | null; condition2: string | null; condition3: string | null
    accepted1: boolean | null; accepted2: boolean | null; accepted3: boolean | null
}

export default function GeniePanel({ close }: { close: () => void }) {
    const [wish, setWish] = useState<Wish | null | undefined>(undefined) // undefined = chargement
    const [accept, setAccept] = useState<[boolean, boolean, boolean]>([true, true, true])
    const [busy, setBusy] = useState(false)
    const [resolvedLocal, setResolvedLocal] = useState(false)

    useEffect(() => {
        let cancel = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/genie-wish")
                const j = r.ok ? await r.json() : null
                if (!cancel) setWish((j?.wish ?? null) as Wish | null)
            } catch { if (!cancel) setWish(null) }
        })()
        return () => { cancel = true }
    }, [])

    const respond = async () => {
        setBusy(true)
        try {
            await fetch("/api/gamebook/yellow/genie-wish", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "respond", accepted: accept }),
            })
            setResolvedLocal(true)
        } catch { /* neutre */ } finally { setBusy(false) }
    }

    const rows = wish
        ? [
            { w: wish.wish1, c: wish.condition1, a: wish.accepted1 },
            { w: wish.wish2, c: wish.condition2, a: wish.accepted2 },
            { w: wish.wish3, c: wish.condition3, a: wish.accepted3 },
        ].map((x, i) => ({ ...x, i })).filter((x) => x.w && x.w.trim().length > 0)
        : []

    const isProposed = wish?.status === "PROPOSED" && !resolvedLocal
    const isResolved = wish?.status === "RESOLVED" || resolvedLocal

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <div style={S.title}>🧞 Les Vœux du Génie</div>
                        <div style={S.sub}>
                            {wish === undefined ? "Chargement…"
                                : !wish ? "Aucun vœu pour l'instant"
                                : isResolved ? "Verdict rendu"
                                : isProposed ? "Le génie a répondu !"
                                : "Le génie réfléchit…"}
                        </div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                <div style={S.scroll}>
                    {wish === undefined && <div style={S.muted}>Une fumée dorée tourbillonne…</div>}

                    {wish === null && (
                        <div style={S.muted}>
                            Tu n&apos;as pas encore formulé de vœux.<br />
                            🪔 Frotte la <b>lampe rouillée</b> (sac → Objets clés) pour invoquer le génie !
                        </div>
                    )}

                    {wish && wish.status === "SUBMITTED" && (
                        <div style={S.intro}>« J&apos;examine tes trois vœux avec soin, mortel… Reviens bientôt : je te livrerai mes conditions. »</div>
                    )}

                    {wish && isProposed && (
                        <div style={S.intro}>« Voici mon verdict. Chaque faveur a un <b>prix</b>. À toi de décider lesquelles tu acceptes… »</div>
                    )}

                    {rows.map((r) => (
                        <div key={r.i} style={S.card}>
                            <div style={S.wishTitle}>✦ Vœu {r.i + 1}</div>
                            <div style={S.wishText}>« {r.w} »</div>
                            {r.c && (
                                <div style={S.cond}>
                                    <span style={S.condLbl}>⚖️ Contrepartie du génie</span>
                                    <div>{r.c}</div>
                                </div>
                            )}
                            {isProposed && r.c && (
                                <div style={S.toggleRow}>
                                    <button
                                        style={{ ...S.toggle, ...(accept[r.i] ? S.toggleYes : {}) }}
                                        onClick={() => setAccept((a) => a.map((v, k) => (k === r.i ? true : v)) as [boolean, boolean, boolean])}
                                    >✅ J&apos;accepte</button>
                                    <button
                                        style={{ ...S.toggle, ...(!accept[r.i] ? S.toggleNo : {}) }}
                                        onClick={() => setAccept((a) => a.map((v, k) => (k === r.i ? false : v)) as [boolean, boolean, boolean])}
                                    >❌ Je refuse</button>
                                </div>
                            )}
                            {isProposed && !r.c && <div style={S.pending}>Le génie n&apos;a pas encore statué sur ce vœu.</div>}
                            {isResolved && (
                                <div style={{ ...S.verdict, color: r.a ? "#7ee0a0" : "#e88" }}>
                                    {r.a ? "✅ Accepté" : "❌ Refusé"}
                                </div>
                            )}
                        </div>
                    ))}

                    {isProposed && rows.some((r) => r.c) && (
                        <button style={{ ...S.confirm, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={respond}>
                            {busy ? "…" : "🧞 Valider mes réponses au génie"}
                        </button>
                    )}

                    {isResolved && (
                        <div style={S.foot}>Le génie exauce les vœux acceptés (le créateur applique les faveurs). Merci d&apos;avoir libéré le génie !</div>
                    )}
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, background: "rgba(6,9,16,.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 },
    panel: { width: "min(560px,96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "radial-gradient(700px 320px at 50% -6%, #2a2136 0%, #171226 60%, #12101c 100%)", border: "1px solid #c9a227", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#efe6ff", fontFamily: "system-ui,sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #3a3350" },
    title: { fontSize: 18, fontWeight: 900, color: "#ffd76a" },
    sub: { fontSize: 12.5, color: "#b7a9cf", marginTop: 3 },
    close: { background: "#20293e", border: "1px solid #3a3350", color: "#c3cbdc", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontSize: 15 },
    scroll: { overflowY: "auto", padding: "14px 18px 16px" },
    muted: { fontSize: 13, color: "#b7a9cf", textAlign: "center", padding: "26px 8px", lineHeight: 1.7 },
    intro: { fontSize: 13, fontStyle: "italic", color: "#efe6ff", lineHeight: 1.5, marginBottom: 12, background: "rgba(201,162,39,0.08)", border: "1px solid #c9a22740", borderRadius: 10, padding: "10px 12px" },
    card: { border: "1px solid #3a3350", borderRadius: 12, padding: "11px 13px", marginBottom: 10, background: "rgba(255,255,255,0.03)" },
    wishTitle: { fontSize: 12, fontWeight: 800, color: "#ffd76a" },
    wishText: { fontSize: 14, fontWeight: 600, marginTop: 3, lineHeight: 1.4 },
    cond: { marginTop: 8, background: "rgba(20,16,32,0.6)", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.45 },
    condLbl: { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: "#e0b84a", marginBottom: 3, textTransform: "uppercase" },
    toggleRow: { display: "flex", gap: 8, marginTop: 10 },
    toggle: { flex: 1, background: "rgba(30,22,48,0.7)", border: "1px solid #4a4468", borderRadius: 9, color: "#c9b8e8", fontSize: 12.5, fontWeight: 700, padding: "9px", cursor: "pointer" },
    toggleYes: { background: "rgba(126,224,160,0.15)", borderColor: "#7ee0a0", color: "#bff3d1" },
    toggleNo: { background: "rgba(232,136,136,0.15)", borderColor: "#e88", color: "#f3bcbc" },
    pending: { marginTop: 8, fontSize: 11.5, fontStyle: "italic", color: "#9a8fb5" },
    verdict: { marginTop: 8, fontSize: 13, fontWeight: 800 },
    confirm: { width: "100%", marginTop: 6, background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 13.5, fontWeight: 900, padding: "11px", cursor: "pointer" },
    foot: { fontSize: 11.5, color: "#9a8fb5", padding: "10px 2px 4px", lineHeight: 1.5, fontStyle: "italic" },
}
