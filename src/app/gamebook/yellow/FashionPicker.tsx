"use client"

// src/app/gamebook/yellow/FashionPicker.tsx
//
// FASHION VICTIM — atelier d'avatar SELF-SERVE (aucun passage par le dev).
//   • SILHOUETTE : 12 planches Gen3 de base.
//   • PERSONNALISER : 3 curseurs Teinte / Éclat / Lumière → rendu par un simple `filter` CSS (aucun canvas),
//     donc marche direct sur la carte ET via la présence (les autres te voient teinté).
//   • 🎲 ROLL : tire une teinte au hasard.
// L'avatar est encodé « base#h,s,b » puis stocké (chosenAvatar) et diffusé. Miniature = cellule IDLE-DOWN.

import { useState } from "react"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FASHION_AVATARS, avatarSheet, encodeAvatar, parseAvatarTint, rollAvatarTint } from "@/lib/gamebook/yellow/data/avatars"

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86", ACCENT = "#e050a0"

// Cellule Gen3 (19 col × 4 lignes) — colonne 1 (pose neutre), ligne 0 (face sud). `size` px, `filter` = teinte CSS.
function cellStyle(url: string, size: number, filter: string): React.CSSProperties {
    return {
        width: size, height: size,
        backgroundImage: `url(${url})`,
        backgroundSize: "1900% 400%",
        backgroundPosition: `${(1 / 18) * 100}% 0%`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        filter,
    }
}
const filterOf = (h: number, s: number, b: number) => `hue-rotate(${Math.round(h)}deg) saturate(${s}) brightness(${b})`

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void }) {
    return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: INK }}>
            <span style={{ width: 76, fontWeight: 700 }}>{label}</span>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: ACCENT, cursor: "pointer" }} />
        </label>
    )
}

export default function FashionPicker() {
    const player = usePlayer()
    const close = useGameStore((s) => s.closeFashion)
    // confirmFashionPick : pose le skin, offre la canne à pêche (1×) + réplique, puis ferme le sélecteur (cf. gameStore).
    const pick = useGameStore((s) => s.confirmFashionPick)

    const cur = player.chosenAvatar
    const [base, setBase] = useState<string>(cur ? avatarSheet(cur) : FASHION_AVATARS[0])
    const t0 = parseAvatarTint(cur)
    const [h, setH] = useState(t0.h)
    const [s, setS] = useState(t0.s)
    const [b, setB] = useState(t0.b)

    const neutral = Math.round(h) === 0 && Math.abs(s - 1) < 0.01 && Math.abs(b - 1) < 0.01
    const filter = filterOf(h, s, b)
    const adopt = () => pick(neutral ? base : encodeAvatar(base, h, s, b)) // teinte neutre → préréglage propre (sans fragment)
    const roll = () => { const t = rollAvatarTint(Math.random); setH(t.h); setS(t.s); setB(t.b) }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>👗 FASHION VICTIM — ATELIER</div>
                <div style={{ padding: 12, overflowY: "auto" }}>
                    {/* APERÇU (grande cellule teintée) + ROLL */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                        <div style={{ padding: 8, background: "#fff8e8", border: `2px solid ${ACCENT}`, borderRadius: 10 }}>
                            <div style={cellStyle(base, 72, filter)} />
                        </div>
                        <div style={{ flex: 1, fontSize: 11.5, color: INK, lineHeight: 1.4 }}>
                            « Compose ton look, chéri — <b>teinte-le</b> à ton goût… ou laisse le hasard décider ! »
                            <button onClick={roll} style={rollBtn}>🎲 ROLL une teinte</button>
                        </div>
                    </div>

                    {/* CURSEURS DE TEINTE */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        <Slider label="🎨 Teinte" min={0} max={360} step={1} value={h} onChange={setH} />
                        <Slider label="🌈 Éclat" min={0.4} max={2} step={0.05} value={s} onChange={setS} />
                        <Slider label="☀️ Lumière" min={0.7} max={1.4} step={0.05} value={b} onChange={setB} />
                        {!neutral && (
                            <button onClick={() => { setH(0); setS(1); setB(1) }} style={linkBtn}>× retirer la teinte (couleurs d'origine)</button>
                        )}
                    </div>

                    {/* SILHOUETTE (base) — chaque miniature porte la teinte courante pour l'aperçu */}
                    <div style={{ fontSize: 11, color: INK, fontWeight: 800, marginBottom: 6 }}>SILHOUETTE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {FASHION_AVATARS.map((url, i) => {
                            const on = base === url
                            return (
                                <button key={url} onClick={() => setBase(url)} title={`Silhouette n°${i + 1}`}
                                    style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 6, background: "#fff8e8", border: `2px solid ${on ? ACCENT : DARK}`, borderRadius: 8, cursor: "pointer", boxShadow: on ? `0 0 0 2px ${ACCENT}55` : "none" }}>
                                    <div style={cellStyle(url, 46, filter)} />
                                </button>
                            )
                        })}
                    </div>

                    <button onClick={adopt} style={adoptBtn}>✓ ADOPTER CE LOOK</button>
                    <button onClick={() => pick(undefined)} style={resetBtn}>↩︎ Revenir au look par défaut</button>
                </div>
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 360, maxHeight: "90%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const rollBtn: React.CSSProperties = { marginTop: 6, width: "100%", padding: "6px 0", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer" }
const linkBtn: React.CSSProperties = { alignSelf: "flex-start", background: "none", border: "none", color: "#a05", fontSize: 10.5, textDecoration: "underline", cursor: "pointer", padding: 0 }
const adoptBtn: React.CSSProperties = { marginTop: 14, width: "100%", padding: "9px 0", background: ACCENT, color: "#fff", border: `2px solid ${INK}`, borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }
const resetBtn: React.CSSProperties = { marginTop: 8, width: "100%", padding: "7px 0", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
