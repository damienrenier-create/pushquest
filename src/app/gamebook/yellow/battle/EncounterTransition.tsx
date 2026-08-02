"use client"

// Nexus Jaune Éclair — TRANSITION DE RENCONTRE (cinématique pixel/retro).
// Détecte le DÉMARRAGE d'un combat (null → battle), choisit un profil selon le
// type/rareté/spécial de l'adversaire, et joue une anim CSS par-dessus l'écran de
// combat (qui se précharge derrière le rideau). Accessibilité : prefers-reduced-
// motion → simple fondu ; tap = skip. Zéro changement au moteur.

import { useEffect, useRef, useState } from "react"
import { useBattle, getSnapshot as getBattleSnapshot, isFusionLeagueTrainer } from "@/lib/gamebook/yellow/store/battleStore"
import { setEncounterFxActive } from "@/lib/gamebook/yellow/store/encounterFxStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { pickTransition, ETX_VARIANTS, type EtxProfile, type EtxVariant } from "@/lib/gamebook/yellow/data/encounterTransitions"

interface ActiveFx { profile: EtxProfile; variant: EtxVariant; danger: boolean; dur: number; count: number; bloom: boolean; shake: boolean; key: number }

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export default function EncounterTransition() {
    const battle = useBattle()
    const wasActive = useRef(false)
    const keyRef = useRef(0)
    const [fx, setFx] = useState<ActiveFx | null>(null)

    useEffect(() => {
        // Démarrage d'un combat = battle passe de null à non-null (une fois par session).
        if (battle && !wasActive.current) {
            const enemy = battle.enemy.team[battle.enemy.activeIndex] ?? battle.enemy.team[0]
            const player = battle.player.team[battle.player.activeIndex] ?? battle.player.team[0]
            const sp = enemy ? getSpecies(enemy.speciesId) : null
            // trainerId lu de façon synchrone (posé en même temps que `battle` par le même setStore) → intro
            //   SPÉCIALE + plus longue pour la Ligue de Fusion (y_fusion_*), qui sert aussi de marge de génération.
            const fusionLeague = isFusionLeagueTrainer(getBattleSnapshot().trainer?.trainerId)
            const { profile, variant, danger } = pickTransition({
                type: sp?.types[0],
                rarity: sp?.rarity,
                levelDiff: (enemy?.level ?? 0) - (player?.level ?? 0),
                isSpecial: !battle.isWild || (battle as { aiLevel?: string }).aiLevel === "ace",
                fusionLeague,
            })
            const v = ETX_VARIANTS[variant]
            keyRef.current += 1
            setFx({
                profile, variant, danger,
                dur: Math.round(profile.durationMs * v.durationScale) + 450, // +0,5 s : l'anim de rencontre un peu plus posée
                count: Math.round(profile.particle.count * v.particleScale),
                bloom: !!profile.bloom || v.bloom,
                shake: !!profile.shake || v.shake,
                key: keyRef.current,
            })
        }
        wasActive.current = !!battle
    }, [battle])

    // Signale à la coque Game Boy que l'écran de chargement est affiché → D-pad neutralisé.
    useEffect(() => {
        setEncounterFxActive(!!fx)
        return () => setEncounterFxActive(false)
    }, [fx])

    useEffect(() => {
        if (!fx) return
        const reduced = prefersReducedMotion()
        const t = setTimeout(() => setFx(null), reduced ? 220 : fx.dur)
        return () => clearTimeout(t)
    }, [fx])

    // SKIP uniquement sur B / Échap (jamais sur un tap/flèche accidentel).
    useEffect(() => {
        if (!fx) return
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase()
            if (k === "b" || k === "escape") setFx(null)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [fx])

    if (!fx) return null
    const reduced = prefersReducedMotion()
    const { profile, danger, count, bloom, shake } = fx
    const [c1, c2] = profile.palette
    const grad = `linear-gradient(135deg, ${c1}, ${c2})`
    const skip = () => setFx(null)

    // Mode accessible : simple fondu, aucun mouvement/particule/flash.
    if (reduced) {
        return <div style={{ ...S.overlay, background: grad, animation: "etx-fade 220ms ease forwards" }}><style>{KEYFRAMES}</style></div>
    }

    const kind = profile.kind
    const ease = profile.easing
    const coverAnim = (anim: string) => `${anim} ${fx.dur}ms ${ease} forwards`

    return (
        <div style={{ ...S.overlay, animation: shake ? `etx-shake ${Math.min(400, fx.dur)}ms ease-in-out` : undefined }}>
            <style>{KEYFRAMES}</style>

            {/* Couche RIDEAU (se retire selon la technique → révèle le combat) */}
            {kind === "fold" ? (
                <>
                    <div style={{ ...S.half, left: 0, background: grad, clipPath: "inset(0 50% 0 0)", animation: coverAnim("etx-foldL"), filter: bloom ? "blur(1px) brightness(1.1)" : undefined }} />
                    <div style={{ ...S.half, right: 0, background: grad, clipPath: "inset(0 0 0 50%)", animation: coverAnim("etx-foldR"), filter: bloom ? "blur(1px) brightness(1.1)" : undefined }} />
                </>
            ) : (
                <div style={{
                    ...S.cover, background: grad,
                    animation: coverAnim(`etx-${kind}`),
                    filter: bloom ? "saturate(1.2) brightness(1.12)" : undefined,
                    boxShadow: profile.vignette ? "inset 0 0 140px 40px rgba(255,255,255,0.5)" : undefined,
                }} />
            )}

            {/* Rayons (nemesis) */}
            {profile.rays && (
                <div style={{ ...S.rays, animation: `etx-zoom ${fx.dur}ms ${ease} forwards` }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} style={{ ...S.ray, transform: `rotate(${i * 30}deg)`, background: `linear-gradient(${c2}, transparent)` }} />
                    ))}
                </div>
            )}

            {/* Particules */}
            {Array.from({ length: count }).map((_, i) => {
                const left = Math.random() * 100
                const delay = Math.random() * fx.dur * 0.4
                const size = 14 + Math.random() * 14
                const dx = (Math.random() - 0.5) * 280
                const dy = (Math.random() - 0.5) * 280
                const motion = profile.particle.motion
                return (
                    <span key={i} style={{
                        position: "absolute", left: `${left}%`, top: motion === "rise" ? "100%" : motion === "fall" ? "-6%" : "50%",
                        fontSize: size, ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`,
                        animation: `etx-${motion} ${fx.dur}ms ${ease} ${delay}ms forwards`, pointerEvents: "none",
                    }}>{profile.particle.emoji}</span>
                )
            })}

            {/* Flash (court, désactivé en reduce-motion) */}
            {profile.flash && <div style={{ ...S.flash, animation: `etx-flash ${Math.min(350, fx.dur)}ms ease-out` }} />}

            {/* Teinte de DANGER (sauvage bien plus haut niveau) */}
            {danger && <div style={{ ...S.cover, background: "rgba(224,64,64,0.28)", animation: `etx-fade ${fx.dur}ms ease forwards`, pointerEvents: "none" }} />}

            <button onClick={skip} style={S.skipBtn}>⏩ Passer (B)</button>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "absolute", inset: 0, zIndex: 50, overflow: "hidden", pointerEvents: "auto" },
    cover: { position: "absolute", inset: 0 },
    half: { position: "absolute", top: 0, bottom: 0, width: "100%" },
    flash: { position: "absolute", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none" },
    rays: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 0.55 },
    ray: { position: "absolute", width: 6, height: "150%", transformOrigin: "center", opacity: 0.7 },
    skipBtn: { position: "absolute", bottom: 12, right: 12, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.55)", borderRadius: 20, cursor: "pointer", pointerEvents: "auto", fontFamily: "system-ui, sans-serif" },
}

const KEYFRAMES = `
@keyframes etx-fade { from { opacity: 1 } to { opacity: 0 } }
@keyframes etx-wipe { from { clip-path: inset(0 0 0 0) } to { clip-path: inset(0 100% 0 0) } }
@keyframes etx-wave { from { clip-path: inset(0 0 0 0) } to { clip-path: inset(100% 0 0 0) } }
@keyframes etx-circle { from { clip-path: circle(150% at 50% 50%) } to { clip-path: circle(0% at 50% 50%) } }
@keyframes etx-foldL { from { transform: translateX(0) } to { transform: translateX(-100%) } }
@keyframes etx-foldR { from { transform: translateX(0) } to { transform: translateX(100%) } }
@keyframes etx-glitch {
  0% { opacity: 1; transform: translate(0,0) }
  15% { transform: translate(-5px,3px) skewX(4deg) }
  30% { transform: translate(5px,-3px); opacity: .85 }
  45% { transform: translate(-3px,2px) skewX(-3deg); clip-path: inset(20% 0 30% 0) }
  60% { transform: translate(4px,-1px); opacity: .7 }
  80% { clip-path: inset(60% 0 0 0); opacity: .4 }
  100% { opacity: 0; transform: translate(0,0) }
}
@keyframes etx-shake { 0%,100% { transform: translate(0,0) } 20% { transform: translate(-6px,4px) } 40% { transform: translate(6px,-4px) } 60% { transform: translate(-4px,-3px) } 80% { transform: translate(4px,3px) } }
@keyframes etx-zoom { from { transform: scale(1.18) } to { transform: scale(1) } }
@keyframes etx-flash { 0% { opacity: 0 } 12% { opacity: .85 } 45% { opacity: 0 } }
@keyframes etx-fall { from { transform: translateY(-20px) rotate(0); opacity: 1 } to { transform: translateY(115vh) rotate(380deg); opacity: 0 } }
@keyframes etx-rise { from { transform: translateY(20px) scale(1); opacity: 1 } to { transform: translateY(-115vh) scale(.4); opacity: 0 } }
@keyframes etx-scatter { from { transform: translate(0,0) scale(1); opacity: 1 } to { transform: translate(var(--dx), var(--dy)) scale(.3); opacity: 0 } }
@keyframes etx-drift { 0% { transform: translate(0,0); opacity: 0 } 30% { opacity: .85 } 100% { transform: translate(var(--dx), -60px) scale(1.4); opacity: 0 } }
`
