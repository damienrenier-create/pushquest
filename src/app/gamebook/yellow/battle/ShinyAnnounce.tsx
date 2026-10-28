"use client"
// src/app/gamebook/yellow/battle/ShinyAnnounce.tsx
//
// ANNONCE SHINY (Sartay, 28/10/2026 : « il existe une animation spéciale par type… il en faudrait une vraiment dingue pour
// annoncer un shiny ! »). Remplace l'anim de type quand un Daemon SAUVAGE chromatique apparaît : la nuit tombe, une étincelle
// grossit, flash et secousse, explosion prismatique, la silhouette se révèle dans ses couleurs dorées, tempête d'étoiles,
// « SHINY ! » lettre par lettre, puis l'écran s'ouvre sur le combat. CSS seul, passable (B/Échap) ; prefers-reduced-motion →
// simple fondu, sans flash ni mouvement.

import { useMemo, type CSSProperties } from "react"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"
import { SHINY_ANNOUNCE_MS, SHINY_ANNOUNCE_REDUCED_MS } from "@/lib/gamebook/yellow/data/encounterTransitions"

const T = SHINY_ANNOUNCE_MS
const BOOM = 1050 // l'étincelle explose
const REVEAL = 1650 // la silhouette prend ses couleurs
const SPARK_EMOJIS = ["✨", "🌟", "💫", "⭐", "✨", "✦"]
const TITLE = "SHINY !"

/** Pseudo-hasard déterministe (même graine → même tempête) : rendu identique client/aperçu. */
function rng(seed: number) {
    let s = (seed * 2654435761) >>> 0 || 1
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export default function ShinyAnnounce({ sprite, name, reduced, onSkip, seed = 1 }: { sprite?: string; name?: string; reduced: boolean; onSkip: () => void; seed?: number }) {
    const sparks = useMemo(() => {
        const r = rng(seed)
        return Array.from({ length: 36 }, (_, i) => {
            const angle = (i / 36) * Math.PI * 2 + r() * 0.35
            const dist = 110 + r() * 150
            return {
                emoji: SPARK_EMOJIS[i % SPARK_EMOJIS.length],
                tx: Math.round(Math.cos(angle) * dist), ty: Math.round(Math.sin(angle) * dist),
                rot: Math.round(180 + r() * 360) * (i % 2 ? 1 : -1),
                size: Math.round(14 + r() * 16),
                delay: BOOM + 40 + (i % 12) * 45 + Math.round(r() * 120),
            }
        })
    }, [seed])
    const label = name ? `${name} chromatique` : "Un Daemon chromatique"

    if (reduced) {
        return (
            <div style={{ ...S.overlay, background: "#07040f", animation: `shx-reduced ${SHINY_ANNOUNCE_REDUCED_MS}ms ease forwards` }} role="status" aria-live="polite">
                <style>{KEYFRAMES}</style>
                <div style={S.reducedTitle}>✨ SHINY ! ✨</div>
                <div style={S.subtitleStatic}>{label}</div>
            </div>
        )
    }

    return (
        <div style={{ ...S.overlay, animation: `shx-shake 420ms ease-in-out ${BOOM}ms, shx-out 650ms ease-in ${T - 650}ms forwards` }} role="status" aria-live="polite" aria-label={`SHINY ! ${label}`}>
            <style>{KEYFRAMES}</style>
            {/* Nuit */}
            <div style={{ ...S.fill, background: "radial-gradient(circle at 50% 46%, #1b1035 0%, #07040f 70%)" }} />
            {/* Explosion prismatique + rayons qui tournent en sens inverse */}
            <div style={{ ...S.disk, background: "conic-gradient(from 0deg, #ff4d6d, #ffb84d, #fff27a, #6dff9a, #4dd2ff, #9b6dff, #ff4dd8, #ff4d6d)", mixBlendMode: "screen", animation: `shx-prism 2300ms cubic-bezier(.16,.84,.3,1) ${BOOM}ms both` }} />
            <div style={{ ...S.disk, background: "repeating-conic-gradient(rgba(255,255,255,.55) 0deg 4deg, transparent 4deg 15deg)", animation: `shx-rays 3000ms linear ${BOOM - 50}ms both` }} />
            {/* L'étincelle qui grossit avant l'explosion */}
            <div style={{ ...S.center, ...S.star, animation: `shx-star ${BOOM - 150}ms cubic-bezier(.55,0,.9,.4) 150ms both` }}>✦</div>
            {/* Le Daemon : silhouette noire, puis ses couleurs chromatiques */}
            {sprite && (
                <>
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: "brightness(0) drop-shadow(0 0 6px rgba(255,255,255,.85))", animation: `shx-sil ${REVEAL + 250 - BOOM}ms ease-out ${BOOM + 80}ms both` }} />
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: SHINY_FILTER, animation: `shx-reveal 700ms cubic-bezier(.34,1.56,.64,1) ${REVEAL}ms both, shx-bob 1200ms ease-in-out ${REVEAL + 700}ms infinite alternate` }} />
                    {/* Étoiles en orbite autour du Daemon */}
                    <div style={{ ...S.center, ...S.orbit, animation: `shx-orbit-in 400ms ease-out ${REVEAL}ms both, shx-spin 2400ms linear ${REVEAL}ms infinite` }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <span key={i} style={{ position: "absolute", left: "50%", top: "50%", fontSize: 15, transform: `rotate(${i * 45}deg) translateY(-78px) rotate(${-i * 45}deg)`, transformOrigin: "0 0" }}>✨</span>
                        ))}
                    </div>
                </>
            )}
            {/* Tempête d'étoiles en spirale */}
            {sparks.map((p, i) => (
                <span key={i} style={{
                    ...S.center, fontSize: p.size, lineHeight: 1, pointerEvents: "none",
                    ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, ["--rot" as string]: `${p.rot}deg`,
                    animation: `shx-spark 1700ms cubic-bezier(.12,.8,.3,1) ${p.delay}ms both`,
                } as CSSProperties}>{p.emoji}</span>
            ))}
            {/* SHINY ! lettre par lettre, en or */}
            <div style={S.title}>
                {Array.from(TITLE).map((ch, i) => (
                    <span key={i} style={{ display: "inline-block", whiteSpace: "pre", animation: `shx-letter 620ms cubic-bezier(.34,1.56,.64,1) ${1350 + i * 85}ms both, shx-wave 900ms ease-in-out ${2100 + i * 85}ms infinite alternate` }}>
                        <span style={S.gold}>{ch}</span>
                    </span>
                ))}
            </div>
            <div style={{ ...S.subtitle, animation: `shx-sub 500ms ease-out 1900ms both` }}>✦ {label} ✦</div>
            {/* Flashs */}
            <div style={{ ...S.fill, background: "#fff", opacity: 0, pointerEvents: "none", animation: `shx-flash 480ms ease-out ${BOOM}ms both` }} />
            <div style={{ ...S.fill, background: "#fff6c8", opacity: 0, pointerEvents: "none", animation: `shx-flash-soft 420ms ease-out ${REVEAL}ms both` }} />
            <button onClick={onSkip} style={S.skipBtn}>⏩ Passer (B)</button>
        </div>
    )
}

const S: Record<string, CSSProperties> = {
    overlay: { position: "absolute", inset: 0, zIndex: 50, overflow: "hidden", pointerEvents: "auto", background: "#07040f" },
    fill: { position: "absolute", inset: 0 },
    center: { position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-50%)" },
    disk: { position: "absolute", left: "50%", top: "44%", width: "260%", aspectRatio: "1 / 1", borderRadius: "50%", transform: "translate(-50%,-50%) scale(0)", pointerEvents: "none" },
    star: { fontSize: 44, color: "#fff", textShadow: "0 0 10px #fff, 0 0 24px #ffe066, 0 0 48px #ff9de2" },
    sprite: { width: 116, height: 116, objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none" },
    orbit: { width: 0, height: 0 },
    title: { position: "absolute", left: 0, right: 0, top: "64%", textAlign: "center", fontSize: "clamp(40px, 13vw, 68px)", fontWeight: 900, letterSpacing: 2, fontFamily: "'Courier New', monospace", pointerEvents: "none" },
    gold: { background: "linear-gradient(180deg, #fffbe0 0%, #ffe066 38%, #f5a300 62%, #fff2a8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 0 6px rgba(255,214,90,.95)) drop-shadow(0 0 16px rgba(255,120,210,.55))" },
    subtitle: { position: "absolute", left: 0, right: 0, top: "79%", textAlign: "center", fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#fff2a8", textShadow: "0 0 8px rgba(255,200,80,.9)", fontFamily: "'Courier New', monospace", pointerEvents: "none" },
    subtitleStatic: { marginTop: 10, textAlign: "center", fontSize: 14, fontWeight: 800, color: "#fff2a8", fontFamily: "'Courier New', monospace" },
    reducedTitle: { marginTop: "38%", textAlign: "center", fontSize: 40, fontWeight: 900, color: "#ffe066", fontFamily: "'Courier New', monospace" },
    skipBtn: { position: "absolute", bottom: 12, right: 12, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.55)", borderRadius: 20, cursor: "pointer", zIndex: 2 },
}

const KEYFRAMES = `
@keyframes shx-star { 0% { transform: translate(-50%,-50%) scale(0) rotate(0); opacity: 0 } 20% { opacity: 1 } 92% { transform: translate(-50%,-50%) scale(2.8) rotate(220deg); opacity: 1 } 100% { transform: translate(-50%,-50%) scale(3.4) rotate(250deg); opacity: 0 } }
@keyframes shx-prism { 0% { transform: translate(-50%,-50%) scale(0) rotate(0); opacity: 0 } 12% { opacity: .95 } 100% { transform: translate(-50%,-50%) scale(1) rotate(300deg); opacity: .5 } }
@keyframes shx-rays { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 15% { opacity: .75 } 80% { opacity: .5 } 100% { transform: translate(-50%,-50%) scale(1) rotate(-220deg); opacity: .2 } }
@keyframes shx-sil { 0% { transform: translate(-50%,-50%) scale(.2); opacity: 0 } 35% { transform: translate(-50%,-50%) scale(1.1); opacity: 1 } 80% { transform: translate(-50%,-50%) scale(1); opacity: 1 } 100% { transform: translate(-50%,-50%) scale(1.05); opacity: 0 } }
@keyframes shx-reveal { 0% { transform: translate(-50%,-50%) scale(1.35); opacity: 0 } 40% { opacity: 1 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
@keyframes shx-bob { from { transform: translate(-50%,-50%) translateY(0) } to { transform: translate(-50%,-50%) translateY(-6px) } }
@keyframes shx-orbit-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes shx-spin { from { transform: translate(-50%,-50%) rotate(0) } to { transform: translate(-50%,-50%) rotate(360deg) } }
@keyframes shx-spark { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 12% { opacity: 1 } 100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.15) rotate(var(--rot)); opacity: 0 } }
@keyframes shx-letter { 0% { transform: translateY(-70px) scale(0) rotate(-25deg); opacity: 0 } 60% { transform: translateY(6px) scale(1.35) rotate(6deg); opacity: 1 } 100% { transform: translateY(0) scale(1) rotate(0); opacity: 1 } }
@keyframes shx-wave { from { transform: translateY(0) } to { transform: translateY(-7px) } }
@keyframes shx-sub { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes shx-flash { 0% { opacity: 0 } 14% { opacity: .95 } 100% { opacity: 0 } }
@keyframes shx-flash-soft { 0% { opacity: 0 } 20% { opacity: .55 } 100% { opacity: 0 } }
@keyframes shx-shake { 0%,100% { transform: translate(0,0) } 20% { transform: translate(-7px,5px) } 40% { transform: translate(7px,-5px) } 60% { transform: translate(-5px,-4px) } 80% { transform: translate(5px,4px) } }
@keyframes shx-out { from { opacity: 1; transform: scale(1); filter: blur(0) } to { opacity: 0; transform: scale(1.12); filter: blur(5px) } }
@keyframes shx-reduced { 0% { opacity: 0 } 15% { opacity: 1 } 80% { opacity: 1 } 100% { opacity: 0 } }
`
