"use client"

// ARC LAMPE & GÉNIE — modal de la « vieille lampe rouillée » (clic depuis le sac → Objets clés).
//  Étape 1 : FROTTER la lampe au doigt (accumulation du mouvement pointer/tactile) → le GÉNIE apparaît.
//  Étape 2 : formuler 3 VŒUX (zone de texte) → POST /api/gamebook/yellow/genie-wish → « je reviendrai vers toi ».
// Frotter pose le marker LAMP_RUBBED_MARKER (persisté) → l'onglet « 🧞 Vœux » du menu s'ouvre. La lampe n'est PAS
// consommée : re-cliquer rouvre ce modal (état à jour). Sprites lampe/génie fournis par Sartay → placeholders emoji.

import { useEffect, useRef, useState } from "react"
import { getPlayer, markTrainerDefeated } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { LAMP_RUBBED_MARKER } from "@/lib/gamebook/yellow/data/genieLamp"

const RUB_TARGET = 1400 // distance de frottement cumulée (px) avant l'apparition du génie

type Stage = "lamp" | "genie" | "sent"

// Sprite du génie (fourni par Sartay), avec repli emoji si l'asset est absent.
function GenieArt() {
    const [err, setErr] = useState(false)
    return err
        ? <div style={{ fontSize: 84, textAlign: "center", margin: "2px 0 6px", filter: "drop-shadow(0 0 18px #7ad0ff88)" }}>🧞</div>
        : <img src="/yellow/sprites/genie.png" alt="Génie" draggable={false} onError={() => setErr(true)} style={{ display: "block", width: 148, height: 148, objectFit: "contain", imageRendering: "pixelated", margin: "0 auto 6px", filter: "drop-shadow(0 0 16px #7ad0ff88)" }} />
}

export default function RustyLampModal({ onClose }: { onClose: () => void }) {
    const alreadyRubbed = getPlayer().defeatedTrainers.includes(LAMP_RUBBED_MARKER)
    const [stage, setStage] = useState<Stage>(alreadyRubbed ? "genie" : "lamp")
    const [rub, setRub] = useState(0)
    const [wishes, setWishes] = useState<string[]>(["", "", ""])
    const [existing, setExisting] = useState<{ status: string } | null | undefined>(undefined) // undefined = pas chargé
    const [busy, setBusy] = useState(false)
    const [lampErr, setLampErr] = useState(false)
    const rubRef = useRef(0)
    const last = useRef<{ x: number; y: number } | null>(null)
    const pressed = useRef(false)

    // Entrée dans l'étape génie : des vœux existent-ils déjà ? (relance de la lampe après coup)
    useEffect(() => {
        if (stage !== "genie") return
        let cancel = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/genie-wish")
                const j = r.ok ? await r.json() : null
                if (!cancel) setExisting(j?.wish ? { status: j.wish.status as string } : null)
            } catch { if (!cancel) setExisting(null) }
        })()
        return () => { cancel = true }
    }, [stage])

    const onDown = (x: number, y: number) => { pressed.current = true; last.current = { x, y } }
    const onUp = () => { pressed.current = false; last.current = null }
    const onMove = (x: number, y: number) => {
        if (stage !== "lamp" || !pressed.current) return
        if (last.current) {
            const nr = rubRef.current + Math.abs(x - last.current.x) + Math.abs(y - last.current.y)
            rubRef.current = nr
            setRub(nr)
            if (nr >= RUB_TARGET) {
                pressed.current = false
                if (!getPlayer().defeatedTrainers.includes(LAMP_RUBBED_MARKER)) { markTrainerDefeated(LAMP_RUBBED_MARKER); persistYellowSave() }
                setStage("genie")
            }
        }
        last.current = { x, y }
    }

    const canSubmit = wishes.some((w) => w.trim().length > 0) && !busy
    const submit = async () => {
        setBusy(true)
        try {
            await fetch("/api/gamebook/yellow/genie-wish", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "submit", wish1: wishes[0], wish2: wishes[1], wish3: wishes[2] }),
            })
        } catch { /* neutre */ } finally { setBusy(false); setStage("sent") }
    }

    const pct = Math.min(100, (rub / RUB_TARGET) * 100)

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                {stage === "lamp" && (
                    <>
                        <div style={S.title}>🪔 Lampe rouillée</div>
                        <div style={S.text}>Une vieille lampe sale et poussiéreuse. On dirait qu&apos;un bon frottage ne lui ferait pas de mal…</div>
                        <div
                            style={{ ...S.lampZone, transform: `scale(${1 + Math.min(0.14, (rub / RUB_TARGET) * 0.14)})` }}
                            onPointerDown={(e) => onDown(e.clientX, e.clientY)}
                            onPointerMove={(e) => onMove(e.clientX, e.clientY)}
                            onPointerUp={onUp}
                            onPointerLeave={onUp}
                        >
                            {lampErr
                                ? <span style={{ fontSize: 104, filter: `drop-shadow(0 0 ${pct / 5}px #ffd76a)` }}>🪔</span>
                                : <img src="/yellow/sprites/lampe_rouillee.png" alt="Lampe rouillée" draggable={false} onError={() => setLampErr(true)} style={{ width: 156, height: 156, objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none", filter: `drop-shadow(0 0 ${pct / 6}px #ffd76a)` }} />}
                        </div>
                        <div style={S.rubHint}>👆 Frotte la lampe avec ton doigt !</div>
                        <div style={S.track}><span style={{ ...S.fill, width: `${pct}%` }} /></div>
                        <button style={S.ghost} onClick={onClose}>Ranger la lampe</button>
                    </>
                )}

                {stage === "genie" && existing === undefined && <div style={{ ...S.text, textAlign: "center", padding: 24 }}>✨ *La lampe se met à vibrer…*</div>}

                {stage === "genie" && existing === null && (
                    <>
                        <GenieArt />
                        <div style={S.title}>Le Génie de la Lampe</div>
                        <div style={S.text}>« LIBRE ! Après tant de siècles enfermé… Pour ta peine, formule TROIS vœux, mortel. J&apos;examinerai chacun d&apos;eux — puis je reviendrai vers toi. »</div>
                        {[0, 1, 2].map((i) => (
                            <div key={i} style={{ marginTop: 8 }}>
                                <div style={S.wishLbl}>✦ Vœu {i + 1}</div>
                                <textarea
                                    style={S.input} rows={2} maxLength={280}
                                    placeholder={`Mon ${i + 1}ᵉ vœu…`}
                                    value={wishes[i]}
                                    onChange={(e) => setWishes((w) => w.map((v, k) => (k === i ? e.target.value : v)))}
                                />
                            </div>
                        ))}
                        <button style={{ ...S.primary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "default" }} disabled={!canSubmit} onClick={submit}>
                            {busy ? "…" : "🧞 Formuler mes vœux"}
                        </button>
                        <button style={S.ghost} onClick={onClose}>Plus tard</button>
                    </>
                )}

                {stage === "genie" && existing && existing.status === "SUBMITTED" && (
                    <>
                        <GenieArt />
                        <div style={S.text}>« Tes trois vœux sont entre mes mains, mortel. Je réfléchis encore… Je reviendrai bientôt te livrer mon verdict. »</div>
                        <button style={S.primary} onClick={onClose}>Fermer</button>
                    </>
                )}

                {stage === "genie" && existing && existing.status !== "SUBMITTED" && (
                    <>
                        <GenieArt />
                        <div style={S.text}>« J&apos;ai rendu mon verdict ! Ouvre le menu → <b>🧞 VŒUX</b> pour découvrir mes conditions et décider lesquelles tu acceptes. »</div>
                        <button style={S.primary} onClick={onClose}>Fermer</button>
                    </>
                )}

                {stage === "sent" && (
                    <>
                        <GenieArt />
                        <div style={S.text}>« Tes vœux sont formulés. Je vais y réfléchir longuement… et je reviendrai vers toi. »</div>
                        <div style={{ ...S.text, opacity: 0.7, fontSize: 12, marginTop: 6 }}>(Tu peux suivre tes vœux dans le menu → 🧞 Vœux.)</div>
                        <button style={S.primary} onClick={onClose}>Fermer</button>
                    </>
                )}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "16px 12px", fontFamily: "system-ui,sans-serif" },
    sheet: { width: "100%", maxWidth: 420, background: "radial-gradient(680px 340px at 50% -8%, #3a2c12 0%, #201a2e 55%, #141020 100%)", border: "2px solid #c9a227", borderRadius: 16, padding: "16px 18px 20px", color: "#f3ecff", boxShadow: "0 14px 46px rgba(0,0,0,0.55)" },
    title: { fontSize: 19, fontWeight: 900, textAlign: "center", color: "#ffd76a", textShadow: "0 0 14px #c9a22755", marginBottom: 6 },
    text: { fontSize: 13.5, lineHeight: 1.5, color: "#efe6ff" },
    lampZone: { height: 190, margin: "12px 0 4px", borderRadius: 16, border: "1px dashed #c9a22766", background: "radial-gradient(circle at 50% 55%, #2a2136, #14101f)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", touchAction: "none", userSelect: "none", transition: "transform 0.05s linear" },
    rubHint: { textAlign: "center", fontSize: 12.5, color: "#ffd76a", marginTop: 8, fontWeight: 700 },
    track: { height: 10, background: "#120f1c", borderRadius: 6, overflow: "hidden", margin: "8px 0 12px" },
    fill: { display: "block", height: "100%", background: "linear-gradient(90deg,#c9a227,#ffe08a)", borderRadius: 6, transition: "width 0.06s linear" },
    genie: { fontSize: 84, textAlign: "center", margin: "2px 0 6px", filter: "drop-shadow(0 0 18px #7ad0ff88)" },
    wishLbl: { fontSize: 12, fontWeight: 800, color: "#ffd76a", marginBottom: 3 },
    input: { width: "100%", boxSizing: "border-box", background: "rgba(20,16,32,0.8)", border: "1px solid #6a5a8a", borderRadius: 9, color: "#f3ecff", fontSize: 13, fontFamily: "system-ui,sans-serif", padding: "8px 10px", resize: "vertical" },
    primary: { width: "100%", marginTop: 14, background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 14, fontWeight: 900, padding: "11px", cursor: "pointer" },
    ghost: { width: "100%", marginTop: 8, background: "transparent", border: "1px solid #6a5a8a", borderRadius: 10, color: "#c9b8e8", fontSize: 12.5, fontWeight: 700, padding: "9px", cursor: "pointer" },
}
