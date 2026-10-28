"use client"
// src/app/gamebook/yellow/battle/ShinyAnnounce.tsx
//
// ANNONCE SHINY (Sartay, 28/10/2026 : « il existe une animation spéciale par type… il en faudrait une vraiment dingue pour
// annoncer un shiny ! », puis « davantage dorée, strass et paillettes plutôt qu'arc-en-ciel »). Remplace l'anim de type quand
// un Daemon SAUVAGE chromatique apparaît : la nuit dorée tombe, une étincelle grossit, flash et secousse, soleil d'or et rayons,
// la silhouette se révèle dans ses couleurs, gerbes d'étoiles d'or, pluie de paillettes, cadre de strass qui scintille,
// « SHINY ! » lettre par lettre avec un reflet qui passe, puis l'écran s'ouvre sur le combat. CSS seul, passable (B/Échap) ;
// prefers-reduced-motion → simple fondu, sans flash ni mouvement.

import { useMemo, type CSSProperties } from "react"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"
import { SHINY_ANNOUNCE_MS, SHINY_ANNOUNCE_REDUCED_MS } from "@/lib/gamebook/yellow/data/encounterTransitions"

const T = SHINY_ANNOUNCE_MS
const BOOM = 1050 // l'étincelle explose
const REVEAL = 1650 // la silhouette prend ses couleurs
const TITLE = "SHINY !"
// Ors, du plus clair au plus profond, et le blanc des éclats.
const GOLDS = ["#fff8d6", "#ffe48a", "#f7c948", "#e8aa1f", "#c98b0e"]
const SPARK_GLYPHS = ["✦", "✧", "✶", "◆", "✦", "✧"]

/** Pseudo-hasard déterministe (même graine → même pluie d'or) : rendu identique client/aperçu. */
function rng(seed: number) {
    let s = (seed * 2654435761) >>> 0 || 1
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/** Strass sertis tout autour de l'écran (positions en % le long des bords). */
function studPositions(): { left: number; top: number }[] {
    const out: { left: number; top: number }[] = []
    for (let i = 0; i < 7; i++) { const x = 6 + (i * 88) / 6; out.push({ left: x, top: 1.6 }); out.push({ left: x, top: 98.4 }) }
    for (let i = 1; i < 11; i++) { const y = 1.6 + (i * 96.8) / 11; out.push({ left: 2.8, top: y }); out.push({ left: 97.2, top: y }) }
    return out
}
const STUDS = studPositions()

export default function ShinyAnnounce({ sprite, name, reduced, onSkip, seed = 1 }: { sprite?: string; name?: string; reduced: boolean; onSkip: () => void; seed?: number }) {
    const { sparks, glitter } = useMemo(() => {
        const r = rng(seed)
        const sparks = Array.from({ length: 36 }, (_, i) => {
            const angle = (i / 36) * Math.PI * 2 + r() * 0.35
            const dist = 110 + r() * 150
            return {
                glyph: SPARK_GLYPHS[i % SPARK_GLYPHS.length],
                color: i % 6 === 0 ? "#ffffff" : GOLDS[i % 4],
                tx: Math.round(Math.cos(angle) * dist), ty: Math.round(Math.sin(angle) * dist),
                rot: Math.round(180 + r() * 360) * (i % 2 ? 1 : -1),
                size: Math.round(13 + r() * 15),
                delay: BOOM + 40 + (i % 12) * 45 + Math.round(r() * 120),
            }
        })
        const glitter = Array.from({ length: 72 }, (_, i) => ({
            left: Math.round(r() * 1000) / 10, top: Math.round(r() * 1000) / 10,
            size: 3 + Math.round(r() * 4), diamond: i % 3 !== 0,
            color: i % 7 === 0 ? "#ffffff" : GOLDS[Math.floor(r() * GOLDS.length)],
            dur: 1100 + Math.round(r() * 800), delay: BOOM + Math.round(r() * 900),
        }))
        return { sparks, glitter }
    }, [seed])
    const label = name ? `${name} chromatique` : "Un Daemon chromatique"

    if (reduced) {
        return (
            <div style={{ ...S.overlay, animation: `shx-reduced ${SHINY_ANNOUNCE_REDUCED_MS}ms ease forwards` }} role="status" aria-live="polite">
                <style>{KEYFRAMES}</style>
                <div style={S.reducedTitle}><span style={S.goldStatic}>✦ SHINY ! ✦</span></div>
                <div style={S.subtitleStatic}>{label}</div>
            </div>
        )
    }

    return (
        <div style={{ ...S.overlay, animation: `shx-shake 420ms ease-in-out ${BOOM}ms, shx-out 650ms ease-in ${T - 650}ms forwards` }} role="status" aria-live="polite" aria-label={`SHINY ! ${label}`}>
            <style>{KEYFRAMES}</style>
            {/* Nuit dorée */}
            <div style={{ ...S.fill, background: "radial-gradient(circle at 50% 44%, #3d2a07 0%, #1a1104 55%, #070402 100%)" }} />
            {/* Soleil d'or (reflets métalliques) + rayons or pâle qui tournent en sens inverse */}
            <div style={{ ...S.disk, background: "conic-gradient(from 0deg, #fff3b0, #f5c542 12%, #9c6a08 25%, #ffe48a 37%, #d99a1e 50%, #fff8d6 62%, #f5c542 75%, #9c6a08 87%, #fff3b0)", mixBlendMode: "screen", animation: `shx-burst 2300ms cubic-bezier(.16,.84,.3,1) ${BOOM}ms both` }} />
            <div style={{ ...S.disk, background: "repeating-conic-gradient(rgba(255,240,180,.62) 0deg 3deg, transparent 3deg 12deg)", animation: `shx-rays 3000ms linear ${BOOM - 50}ms both` }} />
            {/* Pluie de paillettes sur tout l'écran */}
            {glitter.map((g, i) => (
                <span key={`g${i}`} style={{
                    position: "absolute", left: `${g.left}%`, top: `${g.top}%`, width: g.size, height: g.size, pointerEvents: "none",
                    borderRadius: g.diamond ? 1 : "50%", background: `radial-gradient(circle at 35% 30%, #ffffff, ${g.color} 55%, #9c6a08)`,
                    boxShadow: `0 0 ${g.size + 2}px ${g.color}`,
                    animation: `shx-glitter ${g.dur}ms ease-in-out ${g.delay}ms infinite both`,
                }} />
            ))}
            {/* L'étincelle qui grossit avant l'explosion */}
            <div style={{ ...S.center, ...S.star, animation: `shx-star ${BOOM - 150}ms cubic-bezier(.55,0,.9,.4) 150ms both` }}>✦</div>
            {/* Le Daemon : silhouette noire, puis ses couleurs chromatiques (sur un halo sombre : un Daemon doré ressort sur l'or) */}
            {sprite && (
                <>
                    <div style={{ ...S.center, ...S.spot, animation: `shx-orbit-in 500ms ease-out ${REVEAL - 200}ms both` }} />
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: "brightness(0) drop-shadow(0 0 6px rgba(255,236,170,.95))", animation: `shx-sil ${REVEAL + 250 - BOOM}ms ease-out ${BOOM + 80}ms both` }} />
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: SHINY_FILTER, animation: `shx-reveal 700ms cubic-bezier(.34,1.56,.64,1) ${REVEAL}ms both, shx-bob 1200ms ease-in-out ${REVEAL + 700}ms infinite alternate` }} />
                    {/* Étoiles d'or en orbite autour du Daemon */}
                    <div style={{ ...S.center, ...S.orbit, animation: `shx-orbit-in 400ms ease-out ${REVEAL}ms both, shx-spin 2400ms linear ${REVEAL}ms infinite` }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <span key={i} style={{ position: "absolute", left: "50%", top: "50%", fontSize: i % 2 ? 13 : 17, color: i % 4 === 0 ? "#ffffff" : "#ffe48a", textShadow: "0 0 6px #ffd75a, 0 0 12px #e8aa1f", transform: `rotate(${i * 45}deg) translateY(-78px) rotate(${-i * 45}deg)`, transformOrigin: "0 0" }}>✦</span>
                        ))}
                    </div>
                </>
            )}
            {/* Gerbes d'étoiles d'or en spirale */}
            {sparks.map((p, i) => (
                <span key={i} style={{
                    ...S.center, fontSize: p.size, lineHeight: 1, pointerEvents: "none", color: p.color, textShadow: "0 0 6px #ffd75a, 0 0 14px #e8aa1f",
                    ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, ["--rot" as string]: `${p.rot}deg`,
                    animation: `shx-spark 1700ms cubic-bezier(.12,.8,.3,1) ${p.delay}ms both`,
                } as CSSProperties}>{p.glyph}</span>
            ))}
            {/* Cadre de strass : chaque pierre s'allume tour à tour (chenillard) */}
            {STUDS.map((s, i) => (
                <span key={`s${i}`} style={{
                    position: "absolute", left: `${s.left}%`, top: `${s.top}%`, width: 9, height: 9, transform: "translate(-50%,-50%) rotate(45deg)",
                    background: "linear-gradient(135deg, #ffffff 0%, #fff3b0 35%, #d9a520 70%, #fff8d6 100%)", boxShadow: "0 0 6px rgba(255,236,170,.95)",
                    borderRadius: 1, pointerEvents: "none",
                    animation: `shx-stud-in 300ms ease-out ${BOOM + (i % 6) * 40}ms both, shx-twinkle 900ms ease-in-out ${BOOM + 300 + (i * 70) % 900}ms infinite`,
                }} />
            ))}
            {/* SHINY ! lettre par lettre, en or, avec un reflet qui passe */}
            <div style={S.title}>
                {Array.from(TITLE).map((ch, i) => (
                    <span key={i} style={{ display: "inline-block", whiteSpace: "pre", animation: `shx-letter 620ms cubic-bezier(.34,1.56,.64,1) ${1350 + i * 85}ms both, shx-wave 900ms ease-in-out ${2100 + i * 85}ms infinite alternate` }}>
                        <span style={{ ...S.gold, animation: `shx-sheen 1600ms linear ${1900 + i * 110}ms infinite` }}>{ch}</span>
                    </span>
                ))}
            </div>
            <div style={{ ...S.subtitle, animation: `shx-sub 500ms ease-out 1900ms both` }}><span style={S.pill}>✦ {label} ✦</span></div>
            {/* Flashs (blanc chaud, puis or) */}
            <div style={{ ...S.fill, background: "#fff8e1", opacity: 0, pointerEvents: "none", animation: `shx-flash 480ms ease-out ${BOOM}ms both` }} />
            <div style={{ ...S.fill, background: "#ffe9a0", opacity: 0, pointerEvents: "none", animation: `shx-flash-soft 420ms ease-out ${REVEAL}ms both` }} />
            <button onClick={onSkip} style={S.skipBtn}>⏩ Passer (B)</button>
        </div>
    )
}

const S: Record<string, CSSProperties> = {
    overlay: { position: "absolute", inset: 0, zIndex: 50, overflow: "hidden", pointerEvents: "auto", background: "#070402" },
    fill: { position: "absolute", inset: 0 },
    center: { position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-50%)" },
    disk: { position: "absolute", left: "50%", top: "44%", width: "260%", aspectRatio: "1 / 1", borderRadius: "50%", transform: "translate(-50%,-50%) scale(0)", pointerEvents: "none" },
    star: { fontSize: 44, color: "#fffbe6", textShadow: "0 0 10px #fff, 0 0 24px #ffe066, 0 0 48px #e8aa1f" },
    sprite: { width: 116, height: 116, objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none" },
    orbit: { width: 0, height: 0 },
    spot: { width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(36,22,2,.66) 0%, rgba(36,22,2,.38) 45%, transparent 70%)", pointerEvents: "none" },
    pill: { display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "rgba(30,18,2,.62)", border: "1px solid rgba(255,226,140,.55)" },
    title: { position: "absolute", left: 0, right: 0, top: "64%", textAlign: "center", fontSize: "clamp(40px, 13vw, 68px)", fontWeight: 900, letterSpacing: 2, fontFamily: "'Courier New', monospace", pointerEvents: "none" },
    gold: { background: "linear-gradient(110deg, #b8860b 0%, #ffe48a 22%, #fffbe6 30%, #ffd75a 38%, #d99a1e 58%, #fff3b0 74%, #b8860b 100%)", backgroundSize: "260% 100%", backgroundPosition: "100% 0", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextStroke: "1px rgba(92,56,0,.9)", filter: "drop-shadow(0 3px 0 rgba(66,38,0,.9)) drop-shadow(0 0 6px rgba(255,214,90,.95)) drop-shadow(0 0 16px rgba(232,170,31,.55))" },
    goldStatic: { background: "linear-gradient(180deg, #fffbe0 0%, #ffe066 38%, #f5a300 62%, #fff2a8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" },
    subtitle: { position: "absolute", left: 0, right: 0, top: "79%", textAlign: "center", fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#fff2a8", textShadow: "0 0 8px rgba(255,200,80,.9)", fontFamily: "'Courier New', monospace", pointerEvents: "none" },
    subtitleStatic: { marginTop: 10, textAlign: "center", fontSize: 14, fontWeight: 800, color: "#fff2a8", fontFamily: "'Courier New', monospace" },
    reducedTitle: { marginTop: "38%", textAlign: "center", fontSize: 40, fontWeight: 900, fontFamily: "'Courier New', monospace" },
    skipBtn: { position: "absolute", bottom: 18, right: 18, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,236,170,0.6)", borderRadius: 20, cursor: "pointer", zIndex: 2 },
}

const KEYFRAMES = `
@keyframes shx-star { 0% { transform: translate(-50%,-50%) scale(0) rotate(0); opacity: 0 } 20% { opacity: 1 } 92% { transform: translate(-50%,-50%) scale(2.8) rotate(220deg); opacity: 1 } 100% { transform: translate(-50%,-50%) scale(3.4) rotate(250deg); opacity: 0 } }
@keyframes shx-burst { 0% { transform: translate(-50%,-50%) scale(0) rotate(0); opacity: 0 } 12% { opacity: .95 } 100% { transform: translate(-50%,-50%) scale(1) rotate(300deg); opacity: .45 } }
@keyframes shx-rays { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 15% { opacity: .8 } 80% { opacity: .5 } 100% { transform: translate(-50%,-50%) scale(1) rotate(-220deg); opacity: .25 } }
@keyframes shx-glitter { 0% { opacity: 0; transform: translateY(0) rotate(45deg) scale(.3) } 45% { opacity: 1; transform: translateY(12px) rotate(135deg) scale(1.25) } 100% { opacity: 0; transform: translateY(26px) rotate(225deg) scale(.4) } }
@keyframes shx-stud-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes shx-twinkle { 0%, 100% { filter: brightness(1); box-shadow: 0 0 5px rgba(255,236,170,.8) } 50% { filter: brightness(1.9); box-shadow: 0 0 12px #fff, 0 0 20px rgba(255,214,90,.95) } }
@keyframes shx-sil { 0% { transform: translate(-50%,-50%) scale(.2); opacity: 0 } 35% { transform: translate(-50%,-50%) scale(1.1); opacity: 1 } 80% { transform: translate(-50%,-50%) scale(1); opacity: 1 } 100% { transform: translate(-50%,-50%) scale(1.05); opacity: 0 } }
@keyframes shx-reveal { 0% { transform: translate(-50%,-50%) scale(1.35); opacity: 0 } 40% { opacity: 1 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
@keyframes shx-bob { from { transform: translate(-50%,-50%) translateY(0) } to { transform: translate(-50%,-50%) translateY(-6px) } }
@keyframes shx-orbit-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes shx-spin { from { transform: translate(-50%,-50%) rotate(0) } to { transform: translate(-50%,-50%) rotate(360deg) } }
@keyframes shx-spark { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 12% { opacity: 1 } 100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.15) rotate(var(--rot)); opacity: 0 } }
@keyframes shx-letter { 0% { transform: translateY(-70px) scale(0) rotate(-25deg); opacity: 0 } 60% { transform: translateY(6px) scale(1.35) rotate(6deg); opacity: 1 } 100% { transform: translateY(0) scale(1) rotate(0); opacity: 1 } }
@keyframes shx-wave { from { transform: translateY(0) } to { transform: translateY(-7px) } }
@keyframes shx-sheen { from { background-position: 100% 0 } to { background-position: -160% 0 } }
@keyframes shx-sub { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes shx-flash { 0% { opacity: 0 } 14% { opacity: .95 } 100% { opacity: 0 } }
@keyframes shx-flash-soft { 0% { opacity: 0 } 20% { opacity: .55 } 100% { opacity: 0 } }
@keyframes shx-shake { 0%,100% { transform: translate(0,0) } 20% { transform: translate(-7px,5px) } 40% { transform: translate(7px,-5px) } 60% { transform: translate(-5px,-4px) } 80% { transform: translate(5px,4px) } }
@keyframes shx-out { from { opacity: 1; transform: scale(1); filter: blur(0) } to { opacity: 0; transform: scale(1.12); filter: blur(5px) } }
@keyframes shx-reduced { 0% { opacity: 0 } 15% { opacity: 1 } 80% { opacity: 1 } 100% { opacity: 0 } }
`
