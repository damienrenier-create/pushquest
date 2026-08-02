"use client"

// ARC LAMPE & GÉNIE — onglet « 🧞 Vœux » (débloqué une fois la lampe frottée). JOURNAL en LECTURE SEULE :
// suit les vœux formulés UN PAR UN et leur issue. Toute l'INTERACTION (formuler / accepter le dilemme) se
// fait en frottant la LAMPE (sac → Objets clés) ; ce panneau ne fait que récapituler.

import { useEffect, useState } from "react"

interface Wish {
    wish1: string; wish2: string; wish3: string
    condition1: string | null; condition2: string | null; condition3: string | null
    accepted1: boolean | null; accepted2: boolean | null; accepted3: boolean | null
}

export default function GeniePanel({ close }: { close: () => void }) {
    const [wish, setWish] = useState<Wish | null | undefined>(undefined) // undefined = chargement

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

    const w = wish ? [wish.wish1, wish.wish2, wish.wish3] : []
    const c = wish ? [wish.condition1, wish.condition2, wish.condition3] : []
    const a = wish ? [wish.accepted1, wish.accepted2, wish.accepted3] : []
    // Étape courante = 1er vœu non tranché (pour n'afficher que ce qui est déjà connu du joueur).
    const submitted = w.map((x) => !!(x && x.trim()))
    const resolved = a.map((x) => x === true || x === false)
    const step = resolved.findIndex((r) => !r) // -1 = les 3 tranchés

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <div style={S.title}>🧞 Les Vœux du Génie</div>
                        <div style={S.sub}>
                            {wish === undefined ? "Chargement…" : !wish ? "Aucun vœu formulé" : step < 0 ? "Les trois vœux sont scellés" : "En cours…"}
                        </div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                <div style={S.scroll}>
                    {wish === undefined && <div style={S.muted}>Une fumée dorée tourbillonne…</div>}

                    {wish === null && (
                        <div style={S.muted}>
                            Tu n&apos;as pas encore parlé au génie.<br />
                            🪔 Frotte la <b>lampe rouillée</b> (sac → Objets clés) pour l&apos;invoquer.
                        </div>
                    )}

                    {wish && [0, 1, 2].map((i) => {
                        // N'afficher que les vœux DÉJÀ formulés (anti-spoiler : on ne dévoile pas les vœux à venir).
                        if (!submitted[i]) return null
                        const done = resolved[i]
                        return (
                            <div key={i} style={S.card}>
                                <div style={S.wishTitle}>✦ Vœu {i + 1}</div>
                                <div style={S.wishText}>« {w[i]} »</div>
                                {c[i] && (
                                    <div style={S.cond}>
                                        <span style={S.condLbl}>🧞 Le génie</span>
                                        <div>{c[i]}</div>
                                    </div>
                                )}
                                {!c[i] && <div style={S.pending}>Le génie médite sur ce vœu…</div>}
                                {c[i] && !done && <div style={S.pending}>À toi de trancher — frotte ta lampe. 🪔</div>}
                                {done && <div style={{ ...S.verdict, color: a[i] ? "#7ee0a0" : "#e88" }}>{a[i] ? "✅ Accepté" : "❌ Refusé"}</div>}
                            </div>
                        )
                    })}

                    {wish && step >= 0 && submitted.every((s, i) => !s || resolved[i]) && (step === 0 || resolved[step - 1]) && !submitted[step] && (
                        <div style={S.foot}>🪔 Frotte ta lampe pour formuler ton prochain vœu.</div>
                    )}
                    {wish && step < 0 && <div style={S.foot}>Le génie a rendu tous ses verdicts. Ton destin est scellé. 🔒</div>}
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
    card: { border: "1px solid #3a3350", borderRadius: 12, padding: "11px 13px", marginBottom: 10, background: "rgba(255,255,255,0.03)" },
    wishTitle: { fontSize: 12, fontWeight: 800, color: "#ffd76a" },
    wishText: { fontSize: 14, fontWeight: 600, marginTop: 3, lineHeight: 1.4 },
    cond: { marginTop: 8, background: "rgba(20,16,32,0.6)", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.45, fontStyle: "italic" },
    condLbl: { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: "#e0b84a", marginBottom: 3, textTransform: "uppercase" },
    pending: { marginTop: 8, fontSize: 11.5, fontStyle: "italic", color: "#9a8fb5" },
    verdict: { marginTop: 8, fontSize: 13, fontWeight: 800 },
    foot: { fontSize: 12, color: "#c9b8e8", padding: "6px 2px 4px", lineHeight: 1.5, fontStyle: "italic" },
}
