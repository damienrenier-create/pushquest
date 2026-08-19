"use client"

// src/app/gamebook/yellow/FashionPicker.tsx
//
// FASHION VICTIM — BOUTIQUE de tenues (paie en REPS ⚡ ; les Jetons de Combat n'existent qu'en post-run-3).
//   • TENUES DU JOUR : 5 planches tirées (déterministe/jour), prix par rang 50/100/200/300/400 reps.
//   • CATALOGUE COMPLET : n'importe quelle planche du pool pour 1000 reps.
//   • TEINTE : curseurs Teinte/Éclat/Lumière — GRATUIT (surcouche couleur sur la tenue actuelle).
// Au 1ER ACHAT du run : gag non-skippable + cadeau de la CANNE (géré côté store).

import { useEffect, useMemo, useState } from "react"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FASHION_AVATARS, avatarSheet, parseAvatarTint, rollAvatarTint, personalFashionOffer, fashionDayKey, FASHION_PRICES, FASHION_CATALOG_PRICE, fashionRevertCost, FASHION_REVERT_MARKER } from "@/lib/gamebook/yellow/data/avatars"
import { getCurrentNickname } from "@/lib/gamebook/yellow/store/gameStore"

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86", ACCENT = "#e050a0"

// Cellule Gen3 (19×4) — colonne 1 (pose neutre), ligne 0 (Sud). `filter` = teinte CSS (ou "").
function cellStyle(url: string, size: number, filter: string): React.CSSProperties {
    return { width: size, height: size, backgroundImage: `url(${url})`, backgroundSize: "1900% 400%", backgroundPosition: `${(1 / 18) * 100}% 0%`, backgroundRepeat: "no-repeat", imageRendering: "pixelated", filter }
}
const filterOf = (h: number, s: number, b: number) => `hue-rotate(${Math.round(h)}deg) saturate(${s}) brightness(${b})`

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void }) {
    return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: INK }}>
            <span style={{ width: 62, fontWeight: 700 }}>{label}</span>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ flex: 1, accentColor: ACCENT, cursor: "pointer" }} />
        </label>
    )
}

export default function FashionPicker() {
    const player = usePlayer()
    const close = useGameStore((s) => s.closeFashion)
    const buy = useGameStore((s) => s.buyFashionOutfit)
    const setTint = useGameStore((s) => s.setFashionTint)
    const resetAvatar = useGameStore((s) => s.resetFashionAvatar)

    const cur = player.chosenAvatar
    const curBase = cur ? avatarSheet(cur) : null
    const t0 = parseAvatarTint(cur)
    const [h, setH] = useState(t0.h)
    const [s, setS] = useState(t0.s)
    const [b, setB] = useState(t0.b)
    const [msg, setMsg] = useState<string | null>(null)
    const [showCatalog, setShowCatalog] = useState(false)

    // Resync la teinte locale quand la BASE change (un achat pose une base « propre », teinte neutre).
    useEffect(() => { const t = parseAvatarTint(cur); setH(t.h); setS(t.s); setB(t.b) }, [curBase]) // eslint-disable-line react-hooks/exhaustive-deps

    const offer = useMemo(() => personalFashionOffer(fashionDayKey(Date.now()), getCurrentNickname()), [])
    const filter = filterOf(h, s, b)
    const previewBase = curBase ?? offer[0]

    const doBuy = (base: string, price: number) => {
        const r = buy(base, price)
        setMsg(r.ok ? null : (r.reason ?? "Impossible."))
    }
    const revertsDone = player.defeatedTrainers.filter((t) => t.startsWith(FASHION_REVERT_MARKER)).length
    const revertCost = fashionRevertCost(revertsDone)
    const doReset = () => { const r = resetAvatar(); if (!r.ok) setMsg(r.reason ?? "Impossible.") }
    const rollTint = () => { const t = rollAvatarTint(Math.random); setH(t.h); setS(t.s); setB(t.b) }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}><span>👗 FASHION VICTIM</span><span style={{ fontSize: 12, fontWeight: 700, color: "#a05" }}>⚡ {player.reps}</span></div>
                <div style={{ padding: 12, overflowY: "auto" }}>
                    {/* APERÇU (ta tenue + ta teinte) */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                        <div style={{ padding: 8, background: "#fff8e8", border: `2px solid ${ACCENT}`, borderRadius: 10 }}>
                            <div style={cellStyle(previewBase, 72, filter)} />
                        </div>
                        <div style={{ flex: 1, fontSize: 11.5, color: INK, lineHeight: 1.4 }}>
                            {curBase ? "« Voilà TON look, chéri. Ajuste la teinte gratis, ou claque des reps pour une nouvelle tenue ! »" : "« Tu te balades sans style ?! Choisis vite une tenue ci-dessous, chéri. »"}
                        </div>
                    </div>
                    {msg && <div style={errStyle}>{msg}</div>}

                    {/* TEINTE — gratuit */}
                    <div style={{ fontSize: 11, color: INK, fontWeight: 800, marginBottom: 6 }}>🎨 TEINTE <span style={{ fontWeight: 600, opacity: 0.65 }}>· gratuit</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: curBase ? 1 : 0.4, pointerEvents: curBase ? "auto" : "none" }}>
                        <Slider label="Teinte" min={0} max={360} step={1} value={h} onChange={setH} />
                        <Slider label="Éclat" min={0.4} max={2} step={0.05} value={s} onChange={setS} />
                        <Slider label="Lumière" min={0.7} max={1.4} step={0.05} value={b} onChange={setB} />
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={rollTint} style={miniBtn}>🎲 teinte</button>
                            <button onClick={() => setTint(h, s, b)} style={{ ...miniBtn, background: ACCENT, color: "#fff", borderColor: INK }}>✓ Appliquer la teinte</button>
                        </div>
                    </div>

                    {/* TENUES DU JOUR — 5 tirées, prix par rang */}
                    <div style={{ fontSize: 11, color: INK, fontWeight: 800, margin: "14px 0 6px" }}>👗 TENUES DU JOUR <span style={{ fontWeight: 600, opacity: 0.65 }}>· en ⚡ reps</span></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                        {offer.map((url, i) => {
                            const price = FASHION_PRICES[i], owned = curBase === url, afford = player.reps >= price
                            return (
                                <button key={url} onClick={() => doBuy(url, price)} disabled={!afford && !owned} title={`${price} reps`}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 5, background: "#fff8e8", border: `2px solid ${owned ? ACCENT : DARK}`, borderRadius: 8, cursor: afford || owned ? "pointer" : "not-allowed", opacity: afford || owned ? 1 : 0.5 }}>
                                    <div style={cellStyle(url, 42, "")} />
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: owned ? ACCENT : afford ? INK : "#a33" }}>{owned ? "✓ à toi" : `${price}⚡`}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* CATALOGUE COMPLET — 1000 reps la tenue */}
                    <button onClick={() => setShowCatalog((v) => !v)} style={{ ...linkBtn, marginTop: 12 }}>
                        {showCatalog ? "▲ masquer le catalogue" : `🌈 Catalogue complet — ${FASHION_CATALOG_PRICE} reps la tenue ▾`}
                    </button>
                    {showCatalog && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginTop: 8 }}>
                            {FASHION_AVATARS.map((url) => {
                                const owned = curBase === url, afford = player.reps >= FASHION_CATALOG_PRICE
                                return (
                                    <button key={url} onClick={() => doBuy(url, FASHION_CATALOG_PRICE)} disabled={!afford && !owned} title={`${FASHION_CATALOG_PRICE} reps`}
                                        style={{ padding: 3, background: "#fff8e8", border: `2px solid ${owned ? ACCENT : DARK}`, borderRadius: 6, cursor: afford || owned ? "pointer" : "not-allowed", opacity: afford || owned ? 1 : 0.55 }}>
                                        <div style={cellStyle(url, 34, "")} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    <button onClick={doReset} style={resetBtn}>↩︎ Revenir au look par défaut ({revertCost} reps)</button>
                </div>
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 380, maxHeight: "90%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }
const miniBtn: React.CSSProperties = { flex: 1, padding: "6px 0", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }
const linkBtn: React.CSSProperties = { width: "100%", padding: "7px 0", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }
const errStyle: React.CSSProperties = { fontSize: 11.5, color: "#8a1c1c", background: "#f6d9d9", border: "1px solid #d88", borderRadius: 8, padding: "6px 9px", marginBottom: 8, fontWeight: 700 }
const resetBtn: React.CSSProperties = { marginTop: 12, width: "100%", padding: "7px 0", background: "transparent", color: "#a05", border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
