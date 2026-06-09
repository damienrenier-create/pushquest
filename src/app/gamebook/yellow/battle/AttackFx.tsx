"use client"

// Nexus Jaune Éclair — FX d'attaque : se joue sur la cible (ou le lanceur pour
// boost/heal) quand un Daemon attaque. Particules + flash + teinte selon la
// catégorie mécanique. Respecte prefers-reduced-motion (rien). Pur visuel.

import { useEffect } from "react"
import type { AttackFxSpec } from "@/lib/gamebook/yellow/data/attackAnims"

type Side = "player" | "enemy"

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
const COUNT: Record<string, number> = { burst: 7, sweep: 9, dash: 3, float: 7, rise: 7, rays: 6, pulse: 4 }

export default function AttackFx({ spec, attackerSide, onDone }: { spec: AttackFxSpec; attackerSide: Side; onDone: () => void }) {
    const { profile, palette, emoji } = spec
    const target: Side = profile.onCaster ? attackerSide : attackerSide === "player" ? "enemy" : "player"
    const dur = profile.durationMs

    useEffect(() => {
        const t = setTimeout(onDone, (reduced() ? 80 : dur) + 60)
        return () => clearTimeout(t)
    }, [dur, onDone])

    if (reduced()) return null

    // L'ennemi est en HAUT de la scène, le joueur en BAS.
    const band: React.CSSProperties = target === "enemy" ? { top: "0%", height: "52%" } : { top: "48%", height: "52%" }
    const motion = profile.motion
    const anim = motion === "rays" ? "rays" : motion === "float" || motion === "rise" ? "rise" : motion === "pulse" ? "pulse" : "scatter"
    const n = COUNT[motion] ?? 7
    const [c1, c2] = palette

    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30, overflow: "hidden" }}>
            <style>{KEYFRAMES}</style>

            {/* Teinte plein écran (recul/debuff) */}
            {profile.tint && <div style={{ position: "absolute", inset: 0, background: profile.tint, animation: `afx-fade ${dur}ms ease forwards` }} />}

            {/* Flash bref */}
            {profile.flash && <div style={{ position: "absolute", ...band, left: 0, right: 0, background: c1, opacity: 0, animation: `afx-flash ${Math.min(280, dur)}ms ease-out` }} />}

            {/* Rayons (boost) centrés sur la bande du lanceur */}
            {motion === "rays" && (
                <div style={{ position: "absolute", ...band, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: `afx-zoom ${dur}ms ease-out forwards` }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} style={{ position: "absolute", width: 5, height: "120%", background: `linear-gradient(${c2}, transparent)`, transform: `rotate(${i * 36}deg)`, transformOrigin: "center", opacity: 0.6 }} />
                    ))}
                </div>
            )}

            {/* Particules */}
            <div style={{ position: "absolute", ...band, left: 0, right: 0, filter: profile.bloom ? "brightness(1.15) saturate(1.2)" : undefined }}>
                {Array.from({ length: n }).map((_, i) => {
                    const left = 10 + Math.random() * 80
                    const delay = Math.random() * dur * 0.3
                    const size = 16 + Math.random() * 16
                    const dx = (Math.random() - 0.5) * 220
                    const dy = (Math.random() - 0.5) * 160
                    return (
                        <span key={i} style={{
                            position: "absolute", left: `${left}%`, top: anim === "rise" ? "80%" : "40%", fontSize: size,
                            ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`,
                            textShadow: `0 0 6px ${c2}`,
                            animation: `afx-${anim} ${dur}ms ${profile.easing} ${delay}ms forwards`,
                        }}>{emoji}</span>
                    )
                })}
            </div>
        </div>
    )
}

const KEYFRAMES = `
@keyframes afx-fade { from { opacity: 1 } to { opacity: 0 } }
@keyframes afx-flash { 0% { opacity: 0 } 14% { opacity: .8 } 50% { opacity: 0 } }
@keyframes afx-zoom { from { transform: scale(1.25); opacity: .8 } to { transform: scale(.9); opacity: 0 } }
@keyframes afx-scatter { 0% { transform: translate(0,0) scale(.6); opacity: 0 } 25% { opacity: 1; transform: scale(1.1) } 100% { transform: translate(var(--dx), var(--dy)) scale(.4); opacity: 0 } }
@keyframes afx-rise { 0% { transform: translateY(20px) scale(1); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(-90px) scale(.5); opacity: 0 } }
@keyframes afx-pulse { 0% { transform: scale(.5); opacity: 0 } 40% { transform: scale(1.4); opacity: .9 } 100% { transform: scale(1.8); opacity: 0 } }
`
