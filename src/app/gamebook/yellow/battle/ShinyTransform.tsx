"use client"
// src/app/gamebook/yellow/battle/ShinyTransform.tsx
//
// TRANSFORMATION CHROMATIQUE (Sartay, 29/10/2026 : « avec l'introduction des Pâtes de Luxe et des Shiny Balls, certains
// Daemons vont devenir shiny. Je voudrais que tu crées une animation léchée pour la transformation ! »).
// Cinématique plein écran (≈ 6,6 s, passable avec B/Échap après 0,7 s), de la même famille que l'annonce shiny (or, strass) :
//   1. la nuit dorée tombe ; le Daemon, dans ses couleurs d'origine, se pose sur un halo ; la phrase d'ouverture s'écrit ;
//   2. CHARGE : des grains d'or tournent en spirale vers lui, des anneaux se resserrent, il clignote entre ses couleurs et
//      une silhouette blanche de plus en plus vite, l'écran se met à trembler ;
//   3. CHRYSALIDE : un cristal d'or se referme sur la silhouette ;
//   4. ÉCLOSION : le cristal éclate (flash, onde de choc, éclats), le Daemon réapparaît CHROMATIQUE (halo doré), soleil d'or,
//      gerbes d'étoiles, « SHINY ! » lettre par lettre, ce que ça change (IV, +10 % sur chaque stat).
// CSS seul ; prefers-reduced-motion → fondu de 1,8 s, sans flash ni tremblement.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"
import { SHINY_TRANSFORM_MS, SHINY_TRANSFORM_REDUCED_MS, SHINY_TRANSFORM_SKIP_AFTER_MS, shinyTransformCaption, type ShinyTransformSource } from "@/lib/gamebook/yellow/store/shinyTransform"

const T = SHINY_TRANSFORM_MS
const CHARGE = 700 // la charge commence
const COCOON = 2900 // le cristal se referme
const CRACK = 3500 // il éclate
const REVEAL = CRACK + 60
const OUT = T - 600
const TITLE = "SHINY !"
const GOLDS = ["#fff8d6", "#ffe48a", "#f7c948", "#e8aa1f", "#c98b0e"]
const GLYPHS = ["✦", "✧", "✶", "◆"]
const SILHOUETTE = "brightness(0) invert(1) drop-shadow(0 0 6px #fff6c8) drop-shadow(0 0 18px rgba(255,214,90,.9))"

/** Pseudo-hasard déterministe (même graine → même pluie d'or). */
function rng(seed: number) {
    let s = (seed * 2654435761) >>> 0 || 1
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export default function ShinyTransform({ sprite, name, source, onDone, seed = 1 }: { sprite?: string; name: string; source: ShinyTransformSource; onDone: () => void; seed?: number }) {
    const [reduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    const [canSkip, setCanSkip] = useState(false)
    const total = reduced ? SHINY_TRANSFORM_REDUCED_MS : T
    // Le parent se re-rend souvent (un onDone neuf à chaque rendu) : les minuteurs ne dépendent que du montage, et la fin
    //   n'est signalée qu'UNE fois (fin naturelle ou « Passer »).
    const onDoneRef = useRef(onDone); onDoneRef.current = onDone
    const doneRef = useRef(false)
    const finish = useCallback(() => { if (doneRef.current) return; doneRef.current = true; onDoneRef.current() }, [])

    useEffect(() => {
        const done = setTimeout(finish, total)
        const skip = setTimeout(() => setCanSkip(true), SHINY_TRANSFORM_SKIP_AFTER_MS)
        return () => { clearTimeout(done); clearTimeout(skip) }
    }, [finish, total])
    useEffect(() => {
        if (!canSkip) return
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase()
            if (k === "escape" || k === "b" || k === "f" || k === "enter" || k === " " || k === "a") { e.preventDefault(); finish() }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [canSkip, finish])

    const { motes, sparks, glitter, shards } = useMemo(() => {
        const r = rng(seed)
        const motes = Array.from({ length: 34 }, (_, i) => ({
            a: Math.round(r() * 360), rad: 30 + Math.round(r() * 22), size: 10 + Math.round(r() * 10),
            glyph: GLYPHS[i % GLYPHS.length], color: i % 5 === 0 ? "#ffffff" : GOLDS[i % 4],
            dur: 900 + Math.round(r() * 500), delay: CHARGE + Math.round((i / 34) * (COCOON - CHARGE - 500)),
        }))
        const sparks = Array.from({ length: 38 }, (_, i) => {
            const angle = (i / 38) * Math.PI * 2 + r() * 0.4, dist = 22 + r() * 26
            return {
                glyph: GLYPHS[i % GLYPHS.length], color: i % 6 === 0 ? "#ffffff" : GOLDS[i % 4], size: 12 + Math.round(r() * 16),
                tx: `${(Math.cos(angle) * dist).toFixed(1)}vmin`, ty: `${(Math.sin(angle) * dist).toFixed(1)}vmin`,
                rot: Math.round(180 + r() * 360) * (i % 2 ? 1 : -1), delay: REVEAL + 30 + (i % 10) * 40 + Math.round(r() * 120),
            }
        })
        const glitter = Array.from({ length: 56 }, (_, i) => ({
            left: Math.round(r() * 1000) / 10, top: Math.round(r() * 1000) / 10, size: 2 + Math.round(r() * 4),
            color: i % 7 === 0 ? "#ffffff" : GOLDS[Math.floor(r() * GOLDS.length)], dur: 1100 + Math.round(r() * 800),
            delay: i < 18 ? CHARGE + Math.round(r() * (CRACK - CHARGE)) : REVEAL + Math.round(r() * 1100),
        }))
        const shards = Array.from({ length: 10 }, (_, i) => {
            const angle = (i / 10) * Math.PI * 2 + 0.3
            return { tx: `${(Math.cos(angle) * 34).toFixed(1)}vmin`, ty: `${(Math.sin(angle) * 34).toFixed(1)}vmin`, rot: (i % 2 ? 1 : -1) * (200 + i * 37), size: 10 + (i % 3) * 5 }
        })
        return { motes, sparks, glitter, shards }
    }, [seed])

    const caption = shinyTransformCaption(source, name)
    const perks = source === "casino" ? "+10 % sur chaque stat" : "IV au maximum · +10 % sur chaque stat"
    const skipBtn = canSkip ? <button onClick={finish} style={S.skipBtn}>⏩ Passer (B)</button> : null

    if (reduced) {
        return (
            <div style={S.overlay} role="status" aria-live="polite" aria-label={`${name} est devenu chromatique`}>
                <style>{KEYFRAMES}</style>
                <div style={{ ...S.fill, background: S.night.background as string }} />
                <div style={S.caption}>{caption}</div>
                {sprite && <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, animation: `stf-fade-out 700ms ease 500ms both` }} />}
                {sprite && <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: SHINY_FILTER, animation: `stf-fade-in 700ms ease 500ms both` }} />}
                <div style={S.title}><span style={S.goldStatic}>✦ SHINY ! ✦</span></div>
                <div style={S.subtitle}><span style={S.pill}>{name} est devenu chromatique</span><div style={S.perks}><span style={S.perksPill}>{perks}</span></div></div>
                {skipBtn}
            </div>
        )
    }

    return (
        <div style={{ ...S.overlay, animation: `stf-tremble 1100ms ease-in-out 1800ms, stf-shake 520ms ease-in-out ${CRACK}ms, stf-out 600ms ease-in ${OUT}ms forwards` }} role="status" aria-live="polite" aria-label={`${name} est devenu chromatique`}>
            <style>{KEYFRAMES}</style>
            <div style={{ ...S.fill, ...S.night, animation: "stf-in 600ms ease-out both" }} />
            {/* Colonne de lumière derrière le Daemon : elle monte pendant la charge, éclate à l'éclosion */}
            <div style={{ ...S.pillar, animation: `stf-pillar ${CRACK + 500 - CHARGE}ms ease-in ${CHARGE}ms both` }} />
            {/* Soleil d'or et rayons, à l'éclosion */}
            <div style={{ ...S.disk, background: "repeating-conic-gradient(rgba(255,240,180,.55) 0deg 3deg, transparent 3deg 13deg)", animation: `stf-rays ${T - REVEAL}ms linear ${REVEAL}ms both` }} />
            <div style={{ ...S.disk, background: "conic-gradient(from 0deg, #fff3b0, #f5c542 12%, #9c6a08 25%, #ffe48a 37%, #d99a1e 50%, #fff8d6 62%, #f5c542 75%, #9c6a08 87%, #fff3b0)", mixBlendMode: "screen", animation: `stf-burst 2300ms cubic-bezier(.16,.84,.3,1) ${REVEAL}ms both` }} />
            {/* Paillettes */}
            {glitter.map((g, i) => (
                <span key={`g${i}`} style={{ position: "absolute", left: `${g.left}%`, top: `${g.top}%`, width: g.size, height: g.size, borderRadius: i % 3 ? 1 : "50%", pointerEvents: "none", background: `radial-gradient(circle at 35% 30%, #ffffff, ${g.color} 55%, #9c6a08)`, boxShadow: `0 0 ${g.size + 2}px ${g.color}`, animation: `stf-glitter ${g.dur}ms ease-in-out ${g.delay}ms infinite both` }} />
            ))}
            {/* Halo sous le Daemon */}
            <div style={{ ...S.center, ...S.halo, animation: "stf-in 700ms ease-out 150ms both" }} />
            {/* Anneaux qui se resserrent pendant la charge */}
            {[900, 1450, 1950, 2400].map((at, i) => (
                <div key={`r${i}`} style={{ ...S.center, ...S.ring, animation: `stf-ring-in 700ms ease-in ${at}ms both` }} />
            ))}
            {/* Grains d'or en spirale vers le Daemon */}
            {motes.map((m, i) => (
                <span key={`m${i}`} style={{
                    position: "absolute", left: "50%", top: "46%", fontSize: m.size, lineHeight: 1, color: m.color, pointerEvents: "none",
                    textShadow: "0 0 6px #ffd75a, 0 0 14px #e8aa1f",
                    ["--a" as string]: `${m.a}deg`, ["--r" as string]: `${m.rad}vmin`,
                    animation: `stf-spiral ${m.dur}ms cubic-bezier(.55,.06,.68,.19) ${m.delay}ms both`,
                } as CSSProperties}>{m.glyph}</span>
            ))}
            {/* Le Daemon dans ses couleurs, puis la silhouette blanche qui clignote de plus en plus vite et finit par rester */}
            {sprite
                ? <>
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, animation: `stf-arrive 700ms cubic-bezier(.2,.9,.3,1.2) 100ms both, stf-pulse 600ms ease-in-out ${CHARGE}ms 4, stf-hide 1ms linear ${COCOON}ms forwards` }} />
                    <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: SILHOUETTE, animation: `stf-flicker ${COCOON - CHARGE}ms linear ${CHARGE}ms both, stf-hide 1ms linear ${CRACK}ms forwards` }} />
                </>
                : <div style={{ ...S.center, ...S.glyph }}>{name.charAt(0)}</div>}
            {/* La chrysalide de cristal : elle se referme, palpite, puis éclate */}
            <div style={{ ...S.center, ...S.crystal, animation: `stf-cocoon ${CRACK - COCOON}ms cubic-bezier(.3,1.4,.5,1) ${COCOON}ms both` }} />
            <div style={{ ...S.center, ...S.crystalInner, animation: `stf-cocoon ${CRACK - COCOON}ms cubic-bezier(.3,1.4,.5,1) ${COCOON + 80}ms both` }} />
            {shards.map((s, i) => (
                <span key={`s${i}`} style={{
                    ...S.center, width: 0, height: 0, borderLeft: `${s.size / 2}px solid transparent`, borderRight: `${s.size / 2}px solid transparent`, borderBottom: `${s.size * 1.6}px solid #ffe48a`,
                    filter: "drop-shadow(0 0 4px #fff6c8)", ["--tx" as string]: s.tx, ["--ty" as string]: s.ty, ["--rot" as string]: `${s.rot}deg`,
                    animation: `stf-shard 900ms cubic-bezier(.12,.8,.3,1) ${CRACK}ms both`,
                } as CSSProperties} />
            ))}
            {/* Onde de choc */}
            <div style={{ ...S.center, ...S.shock, animation: `stf-shock 800ms ease-out ${CRACK}ms both` }} />
            {/* Révélé : chromatique, sur un halo sombre (un Daemon doré ressort sur l'or), étoiles en orbite */}
            {sprite && <>
                <div style={{ ...S.center, ...S.spot, animation: `stf-fade-in 400ms ease-out ${REVEAL - 60}ms both` }} />
                <img src={sprite} alt="" style={{ ...S.center, ...S.sprite, filter: SHINY_FILTER, animation: `stf-reveal 760ms cubic-bezier(.34,1.56,.64,1) ${REVEAL}ms both, stf-bob 1300ms ease-in-out ${REVEAL + 760}ms infinite alternate` }} />
            </>}
            <div style={{ ...S.center, width: 0, height: 0, animation: `stf-fade-in 400ms ease-out ${REVEAL + 100}ms both, stf-spin 2600ms linear ${REVEAL}ms infinite` }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} style={{ position: "absolute", left: 0, top: 0, fontSize: i % 2 ? 13 : 18, color: i % 4 === 0 ? "#ffffff" : "#ffe48a", textShadow: "0 0 6px #ffd75a, 0 0 12px #e8aa1f", transform: `rotate(${i * 45}deg) translateY(-24vmin) rotate(${-i * 45}deg)` }}>✦</span>
                ))}
            </div>
            {sparks.map((p, i) => (
                <span key={`p${i}`} style={{ ...S.center, fontSize: p.size, lineHeight: 1, pointerEvents: "none", color: p.color, textShadow: "0 0 6px #ffd75a, 0 0 14px #e8aa1f", ["--tx" as string]: p.tx, ["--ty" as string]: p.ty, ["--rot" as string]: `${p.rot}deg`, animation: `stf-spark 1600ms cubic-bezier(.12,.8,.3,1) ${p.delay}ms both` } as CSSProperties}>{p.glyph}</span>
            ))}
            {/* Textes */}
            <div style={{ ...S.caption, animation: `stf-caption 600ms ease-out 250ms both, stf-fade-out 400ms ease-in ${CRACK - 300}ms forwards` }}>{caption}</div>
            <div style={S.title}>
                {Array.from(TITLE).map((ch, i) => (
                    <span key={i} style={{ display: "inline-block", whiteSpace: "pre", animation: `stf-letter 620ms cubic-bezier(.34,1.56,.64,1) ${REVEAL + 300 + i * 85}ms both, stf-wave 900ms ease-in-out ${REVEAL + 1050 + i * 85}ms infinite alternate` }}>
                        <span style={{ ...S.gold, animation: `stf-sheen 1600ms linear ${REVEAL + 600 + i * 110}ms infinite` }}>{ch}</span>
                    </span>
                ))}
            </div>
            <div style={{ ...S.subtitle, animation: `stf-caption 500ms ease-out ${REVEAL + 900}ms both` }}>
                <span style={S.pill}>✦ {name} est devenu chromatique ✦</span>
                <div style={S.perks}><span style={S.perksPill}>{perks}</span></div>
            </div>
            {/* Flashs : la chrysalide qui se referme, puis le grand éclat */}
            <div style={{ ...S.fill, background: "#fff8e1", opacity: 0, pointerEvents: "none", animation: `stf-flash 380ms ease-out ${COCOON}ms both` }} />
            <div style={{ ...S.fill, background: "#ffffff", opacity: 0, pointerEvents: "none", animation: `stf-flash 700ms ease-out ${CRACK}ms both` }} />
            {skipBtn}
        </div>
    )
}

const S: Record<string, CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9400, overflow: "hidden", background: "#050301", color: "#fff2a8", fontFamily: "'Courier New', monospace", touchAction: "none", userSelect: "none" },
    fill: { position: "absolute", inset: 0 },
    night: { background: "radial-gradient(circle at 50% 46%, #3d2a07 0%, #1a1104 52%, #050301 100%)" },
    center: { position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)" },
    sprite: { width: "min(36vmin, 260px)", height: "min(36vmin, 260px)", objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none" },
    glyph: { fontSize: "min(24vmin, 160px)", fontWeight: 900, color: "#fff6c8" },
    halo: { width: "min(56vmin, 400px)", height: "min(56vmin, 400px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,90,.34) 0%, rgba(232,170,31,.14) 45%, transparent 70%)", pointerEvents: "none" },
    spot: { width: "min(60vmin, 420px)", height: "min(60vmin, 420px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(36,22,2,.7) 0%, rgba(36,22,2,.38) 45%, transparent 70%)", pointerEvents: "none" },
    pillar: { position: "absolute", left: "50%", top: 0, bottom: 0, width: "min(30vmin, 220px)", transform: "translateX(-50%)", background: "linear-gradient(90deg, transparent, rgba(255,230,150,.55) 35%, rgba(255,250,225,.85) 50%, rgba(255,230,150,.55) 65%, transparent)", filter: "blur(6px)", pointerEvents: "none" },
    disk: { position: "absolute", left: "50%", top: "46%", width: "260vmax", height: "260vmax", borderRadius: "50%", transform: "translate(-50%,-50%) scale(0)", pointerEvents: "none" },
    ring: { width: "min(48vmin, 340px)", height: "min(48vmin, 340px)", borderRadius: "50%", border: "3px solid #ffe48a", boxShadow: "0 0 14px rgba(255,214,90,.9), inset 0 0 12px rgba(255,214,90,.6)", pointerEvents: "none" },
    crystal: { width: "min(40vmin, 290px)", height: "min(40vmin, 290px)", border: "3px solid #fff3b0", background: "linear-gradient(135deg, rgba(255,255,255,.55), rgba(255,228,138,.25) 40%, rgba(232,170,31,.35) 70%, rgba(255,248,214,.5))", boxShadow: "0 0 24px #ffe48a, inset 0 0 30px rgba(255,255,255,.75)", pointerEvents: "none" },
    crystalInner: { width: "min(26vmin, 190px)", height: "min(26vmin, 190px)", border: "2px solid rgba(255,255,255,.9)", boxShadow: "0 0 16px #fff6c8", pointerEvents: "none" },
    shock: { width: "min(30vmin, 220px)", height: "min(30vmin, 220px)", borderRadius: "50%", border: "6px solid #fff8d6", boxShadow: "0 0 30px #ffe48a, inset 0 0 20px #ffe48a", pointerEvents: "none" },
    caption: { position: "absolute", left: 16, right: 16, top: "9%", textAlign: "center", fontSize: "clamp(14px, 3.6vmin, 22px)", fontWeight: 800, color: "#fff2a8", textShadow: "0 0 10px rgba(255,200,80,.8)", textWrap: "balance", pointerEvents: "none" },
    title: { position: "absolute", left: 0, right: 0, top: "68%", textAlign: "center", fontSize: "clamp(42px, 12vmin, 92px)", fontWeight: 900, letterSpacing: 2, pointerEvents: "none" },
    gold: { background: "linear-gradient(110deg, #b8860b 0%, #ffe48a 22%, #fffbe6 30%, #ffd75a 38%, #d99a1e 58%, #fff3b0 74%, #b8860b 100%)", backgroundSize: "260% 100%", backgroundPosition: "100% 0", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextStroke: "1px rgba(92,56,0,.9)", filter: "drop-shadow(0 3px 0 rgba(66,38,0,.9)) drop-shadow(0 0 6px rgba(255,214,90,.95)) drop-shadow(0 0 16px rgba(232,170,31,.55))" },
    goldStatic: { background: "linear-gradient(180deg, #fffbe0 0%, #ffe066 38%, #f5a300 62%, #fff2a8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" },
    subtitle: { position: "absolute", left: 16, right: 16, top: "83%", textAlign: "center", fontSize: "clamp(13px, 3.2vmin, 19px)", fontWeight: 800, color: "#fff2a8", textShadow: "0 0 8px rgba(255,200,80,.9)", pointerEvents: "none" },
    pill: { display: "inline-block", padding: "5px 16px", borderRadius: 999, background: "rgba(30,18,2,.62)", border: "1px solid rgba(255,226,140,.55)" },
    perks: { marginTop: 8, fontSize: "clamp(11px, 2.6vmin, 15px)", fontWeight: 700, color: "#ffe9a8" },
    perksPill: { display: "inline-block", padding: "3px 12px", borderRadius: 999, background: "rgba(30,18,2,.6)", textShadow: "none" },
    skipBtn: { position: "absolute", bottom: "max(18px, env(safe-area-inset-bottom, 0px))", right: 18, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,236,170,0.6)", borderRadius: 20, cursor: "pointer", zIndex: 2 },
}

const KEYFRAMES = `
@keyframes stf-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes stf-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes stf-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes stf-caption { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
@keyframes stf-arrive { 0% { opacity: 0; transform: translate(-50%,-50%) translateY(16px) scale(.86) } 100% { opacity: 1; transform: translate(-50%,-50%) translateY(0) scale(1) } }
@keyframes stf-pulse { 0%, 100% { transform: translate(-50%,-50%) scale(1); filter: brightness(1) } 50% { transform: translate(-50%,-50%) scale(1.05); filter: brightness(1.35) } }
@keyframes stf-hide { from { opacity: 0 } to { opacity: 0 } }
@keyframes stf-flicker { 0% { opacity: 0 } 14% { opacity: 0 } 15% { opacity: 1 } 22% { opacity: 1 } 23% { opacity: 0 } 33% { opacity: 0 } 34% { opacity: 1 } 40% { opacity: 1 } 41% { opacity: 0 } 49% { opacity: 0 } 50% { opacity: 1 } 55% { opacity: 1 } 56% { opacity: 0 } 62% { opacity: 0 } 63% { opacity: 1 } 67% { opacity: 1 } 68% { opacity: 0 } 72% { opacity: 0 } 73% { opacity: 1 } 76% { opacity: 1 } 77% { opacity: 0 } 80% { opacity: 0 } 81% { opacity: 1 } 83% { opacity: 1 } 84% { opacity: 0 } 86% { opacity: 0 } 87% { opacity: 1 } 88.5% { opacity: 1 } 89.5% { opacity: 0 } 91% { opacity: 0 } 92% { opacity: 1 } 93% { opacity: 1 } 94% { opacity: 0 } 95% { opacity: 0 } 96% { opacity: 1 } 100% { opacity: 1 } }
@keyframes stf-ring-in { 0% { opacity: 0; transform: translate(-50%,-50%) scale(2.3) } 25% { opacity: .9 } 100% { opacity: 0; transform: translate(-50%,-50%) scale(.35) } }
@keyframes stf-spiral { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(var(--r)) rotate(calc(-1 * var(--a))) scale(.6) } 15% { opacity: 1 } 85% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%,-50%) rotate(calc(var(--a) + 170deg)) translateX(0vmin) rotate(calc(-1 * var(--a) - 170deg)) scale(1.2) } }
@keyframes stf-pillar { 0% { opacity: 0; transform: translateX(-50%) scaleX(.2) } 70% { opacity: .55; transform: translateX(-50%) scaleX(.7) } 86% { opacity: 1; transform: translateX(-50%) scaleX(1.25) } 100% { opacity: 0; transform: translateX(-50%) scaleX(2.4) } }
@keyframes stf-cocoon { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(45deg) scale(2.2) } 40% { opacity: 1; transform: translate(-50%,-50%) rotate(225deg) scale(.92) } 55% { transform: translate(-50%,-50%) rotate(225deg) scale(1) } 70% { transform: translate(-50%,-50%) rotate(225deg) scale(.95) } 85% { transform: translate(-50%,-50%) rotate(225deg) scale(1.04) } 99% { opacity: 1; transform: translate(-50%,-50%) rotate(225deg) scale(1) } 100% { opacity: 0; transform: translate(-50%,-50%) rotate(225deg) scale(1.3) } }
@keyframes stf-shard { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(0) } 6% { opacity: 1 } 100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) } }
@keyframes stf-shock { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.2) } 8% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%,-50%) scale(4.2) } }
@keyframes stf-reveal { 0% { opacity: 0; transform: translate(-50%,-50%) scale(1.45) } 40% { opacity: 1 } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
@keyframes stf-bob { from { transform: translate(-50%,-50%) translateY(0) } to { transform: translate(-50%,-50%) translateY(-1.6vmin) } }
@keyframes stf-spin { from { transform: translate(-50%,-50%) rotate(0) } to { transform: translate(-50%,-50%) rotate(360deg) } }
@keyframes stf-burst { 0% { transform: translate(-50%,-50%) scale(0) rotate(0); opacity: 0 } 12% { opacity: .95 } 100% { transform: translate(-50%,-50%) scale(1) rotate(300deg); opacity: .45 } }
@keyframes stf-rays { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 10% { opacity: .85 } 100% { transform: translate(-50%,-50%) scale(1) rotate(-200deg); opacity: .3 } }
@keyframes stf-spark { 0% { transform: translate(-50%,-50%) scale(.2) rotate(0); opacity: 0 } 12% { opacity: 1 } 100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.15) rotate(var(--rot)); opacity: 0 } }
@keyframes stf-glitter { 0% { opacity: 0; transform: translateY(0) rotate(45deg) scale(.3) } 45% { opacity: 1; transform: translateY(12px) rotate(135deg) scale(1.25) } 100% { opacity: 0; transform: translateY(26px) rotate(225deg) scale(.4) } }
@keyframes stf-letter { 0% { transform: translateY(-70px) scale(0) rotate(-25deg); opacity: 0 } 60% { transform: translateY(6px) scale(1.35) rotate(6deg); opacity: 1 } 100% { transform: translateY(0) scale(1) rotate(0); opacity: 1 } }
@keyframes stf-wave { from { transform: translateY(0) } to { transform: translateY(-7px) } }
@keyframes stf-sheen { from { background-position: 100% 0 } to { background-position: -160% 0 } }
@keyframes stf-flash { 0% { opacity: 0 } 14% { opacity: .95 } 100% { opacity: 0 } }
@keyframes stf-tremble { 0%,100% { transform: translate(0,0) } 10% { transform: translate(-1px,1px) } 20% { transform: translate(1px,-1px) } 30% { transform: translate(-2px,0) } 40% { transform: translate(2px,1px) } 50% { transform: translate(-2px,-1px) } 60% { transform: translate(3px,1px) } 70% { transform: translate(-3px,-2px) } 80% { transform: translate(3px,2px) } 90% { transform: translate(-3px,1px) } }
@keyframes stf-shake { 0%,100% { transform: translate(0,0) } 20% { transform: translate(-9px,6px) } 40% { transform: translate(9px,-6px) } 60% { transform: translate(-6px,-5px) } 80% { transform: translate(6px,5px) } }
@keyframes stf-out { from { opacity: 1; filter: blur(0) } to { opacity: 0; filter: blur(5px) } }
`
