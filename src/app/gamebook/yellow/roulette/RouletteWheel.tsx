"use client"

// Nexus — Roue de roulette ANIMÉE (dopamine). La roue tourne LONGUEMENT et décélère PROGRESSIVEMENT
// (inspiré du timing de l'autre roulette : phases rapide → moyenne → lente, avec de l'aléatoire), pour
// finir TRÈS lentement. La bille se pose sur le numéro gagnant FOURNI PAR LE SERVEUR (jamais tiré ici).
// Le CENTRE affiche le numéro actuellement sous le pointeur : il défile vite au début puis « clique » de
// plus en plus lentement avec la roue, et atterrit sur le gagnant (qui CLIGNOTE). Tout est en
// requestAnimationFrame (transform piloté par ref → fluide, zéro re-render pendant la rotation).
//   props: winning = numéro serveur · spinKey = id de manche ("" = affichage statique, pas d'anim)

import { useEffect, useRef, useState } from "react"
import { WHEEL_ORDER, POCKET_COUNT, colorOf } from "@/lib/gamebook/yellow/roulette/wheel"

const POCKET = 360 / POCKET_COUNT // ~9.73° par case
const SIZE = 300
const R_LABEL = SIZE / 2 - 19
const COL = (c: string) => (c === "green" ? "#0e7a38" : c === "red" ? "#b02828" : "#161616")
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// Anneau coloré (37 secteurs), case 0 centrée en haut (sous le pointeur).
const RING = (() => {
    const stops: string[] = []
    for (let i = 0; i < POCKET_COUNT; i++) stops.push(`${COL(colorOf(WHEEL_ORDER[i]))} ${i * POCKET}deg ${(i + 1) * POCKET}deg`)
    return `conic-gradient(from ${-POCKET / 2}deg, ${stops.join(", ")})`
})()

/** Numéro actuellement sous le pointeur (haut) pour une rotation `rot` de la roue. */
function topNumber(rot: number): number {
    const norm = (((-rot) % 360) + 360) % 360
    const j = Math.round(norm / POCKET) % POCKET_COUNT
    return WHEEL_ORDER[(j + POCKET_COUNT) % POCKET_COUNT]
}

// Progression 0→1 inspirée d'une vraie roulette (cf. l'autre jeu) : une VITESSE DE CROISIÈRE constante
// pendant la 1re fraction `c1` du temps (la roue reste rapide → ne ralentit PAS trop tôt), PUIS une
// décélération progressive dont la queue rampe de plus en plus lentement (exposant `k` : plus haut = fin
// plus suspendue). Continue et normalisée (retourne 1 en t=1). `V` = vitesse de croisière normalisée.
function easeRoulette(t: number, c1: number, k: number, V: number): number {
    if (t <= c1) return V * t // CROISIÈRE (vitesse constante)
    const tp = (t - c1) / (1 - c1)
    return V * c1 + V * (1 - c1) * (1 - Math.pow(1 - tp, k + 1)) / (k + 1) // DÉCÉLÉRATION (v ∝ (1-tp)^k → 0)
}

export default function RouletteWheel({ winning, spinKey, onDone }: {
    winning: number | null
    spinKey: string
    onDone?: (n: number) => void
}) {
    const [centerNum, setCenterNum] = useState<number | null>(winning)
    const [phase, setPhase] = useState<"idle" | "spin" | "win">(winning != null ? "win" : "idle")
    const wheelEl = useRef<HTMLDivElement>(null)
    const ballEl = useRef<HTMLDivElement>(null)
    const centerEl = useRef<HTMLDivElement>(null)
    const wheelRotRef = useRef(0)
    const ballRotRef = useRef(0)
    const rafRef = useRef<number | null>(null)
    const onDoneRef = useRef(onDone)
    onDoneRef.current = onDone

    useEffect(() => {
        if (winning == null) return
        const idx = WHEEL_ORDER.indexOf(winning)
        if (idx < 0) return
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)

        const applyWheel = (r: number) => { if (wheelEl.current) wheelEl.current.style.transform = `rotate(${r}deg)` }
        const applyBall = (r: number) => { if (ballEl.current) ballEl.current.style.transform = `rotate(${r}deg)` }

        // spinKey vide = affichage STATIQUE (1er chargement : on montre le dernier résultat, sans anim).
        if (!spinKey) {
            const r = -idx * POCKET
            wheelRotRef.current = r; ballRotRef.current = 0
            applyWheel(r); applyBall(0)
            if (centerEl.current) centerEl.current.textContent = String(winning)
            setCenterNum(winning); setPhase("win")
            return
        }

        setPhase("spin")

        // Cible : case `idx` alignée sous le pointeur. R ≡ -idx*POCKET (mod 360), ≥ rotation courante + N tours.
        // ALÉATOIRE à chaque manche → la roue ne tourne jamais pareil : nb de tours, durée, durée de la
        // CROISIÈRE (c1) et douceur de la QUEUE (decelK). Croisière longue = reste rapide ; queue haute = fin lente.
        const spins = 7 + Math.floor(rnd(0, 4))   // 7 à 10 tours complets
        const DUR = rnd(8200, 11000)              // 8,2 à 11 s
        const c1 = rnd(0.28, 0.42)                // part du temps à vitesse de croisière (constante)
        const decelK = rnd(1.1, 1.7)              // douceur de la décélération (plus haut = fin plus lente ; >1.8 ≈ figé)
        const V = (decelK + 1) / (c1 * decelK + 1) // vitesse de croisière normalisée (eased(1)=1)
        const startRot = wheelRotRef.current
        const targetMod = (((-idx * POCKET) % 360) + 360) % 360
        const base = startRot + spins * 360
        const endRot = base + ((((targetMod - (base % 360)) % 360) + 360) % 360)

        // Bille : orbite à CONTRESENS et se gare en haut (multiple de 360), décélère avec la roue.
        const ballStart = ballRotRef.current
        const ballEnd = ballStart - (8 + Math.floor(rnd(0, 4))) * 360 - ((((ballStart % 360) + 360) % 360))

        let start = -1
        let lastNum = -1
        const frame = (now: number) => {
            if (start < 0) start = now
            const t = Math.min(1, (now - start) / DUR)
            const eased = easeRoulette(t, c1, decelK, V) // croisière rapide → décélération progressive → crawl
            const rot = startRot + (endRot - startRot) * eased
            applyWheel(rot)
            applyBall(ballStart + (ballEnd - ballStart) * eased)
            // Le centre affiche le numéro sous le pointeur → défile vite puis « clique » de plus en plus lent.
            const n = topNumber(rot)
            if (n !== lastNum) { lastNum = n; if (centerEl.current) centerEl.current.textContent = String(n) }
            if (t < 1) { rafRef.current = requestAnimationFrame(frame); return }
            // ARRÊT : on fige EXACTEMENT sur le gagnant + clignotement.
            wheelRotRef.current = endRot; ballRotRef.current = ballEnd
            applyWheel(endRot); applyBall(ballEnd)
            if (centerEl.current) centerEl.current.textContent = String(winning)
            setCenterNum(winning); setPhase("win")
            onDoneRef.current?.(winning)
        }
        rafRef.current = requestAnimationFrame(frame)

        return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- relance UNIQUEMENT à la manche (spinKey)
    }, [spinKey])

    const winCol = phase === "win" && centerNum != null ? colorOf(centerNum) : null

    return (
        <div style={S.wrap}>
            <style>{KEYFRAMES}</style>
            <div style={{ ...S.stage, ...(phase === "win" ? S.stageWin : {}) }}>
                {/* Pointeur fixe (haut) */}
                <div style={S.pointer} />
                {/* Roue (anneau coloré + numéros radiaux) — transform piloté par ref (rAF) */}
                <div ref={wheelEl} style={{ ...S.wheel, background: RING }}>
                    {WHEEL_ORDER.map((n, i) => (
                        <div key={n} style={{ ...S.label, transform: `rotate(${i * POCKET}deg) translateY(-${R_LABEL}px)` }}>{n}</div>
                    ))}
                </div>
                {/* Bille orbitale (brille) — transform piloté par ref (rAF) */}
                <div ref={ballEl} style={S.ballOrbit}>
                    <div style={S.ball} />
                </div>
                {/* Moyeu central : DÉFILÉ des chiffres (ref) / NUMÉRO GAGNANT clignotant */}
                <div style={{ ...S.hub, ...(winCol ? { background: `radial-gradient(circle at 42% 35%, ${COL(winCol)}, #0a0a0a)`, borderColor: "#ffd54a", boxShadow: `0 0 26px ${COL(winCol)}` } : {}) }}>
                    <div ref={centerEl} key={phase === "win" ? "win" : "spin"} style={{ ...S.centerNum, ...(phase === "win" ? S.centerWin : phase === "spin" ? S.centerSpin : {}) }}>
                        {phase === "spin" ? null : centerNum != null ? centerNum : "—"}
                    </div>
                </div>
            </div>
            {/* Légende sous la roue */}
            <div style={{ ...S.caption, opacity: phase === "win" && centerNum != null ? 1 : 0.35 }}>
                {phase === "spin" ? "🎡 La bille tourne…" : centerNum != null ? `${winCol === "red" ? "🔴 Rouge" : winCol === "black" ? "⚫ Noir" : "🟢 Vert"} · ${centerNum}` : "—"}
            </div>
        </div>
    )
}

const KEYFRAMES = `
@keyframes pqWinBlink { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.35; transform:scale(1.14) } }
@keyframes pqSpinPulse { 0%,100% { opacity:.85 } 50% { opacity:.5 } }
@keyframes pqStageGlow { 0%,100% { box-shadow:0 0 18px rgba(255,213,74,.25) } 50% { box-shadow:0 0 40px rgba(255,213,74,.6) } }
`

const S: Record<string, React.CSSProperties> = {
    wrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 10 },
    stage: { position: "relative", width: SIZE, height: SIZE, maxWidth: "88vw", maxHeight: "88vw", borderRadius: "50%" },
    stageWin: { animation: "pqStageGlow 0.9s ease-in-out 3" },
    pointer: { position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: "20px solid #ffd54a", zIndex: 6, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.7))" },
    wheel: { position: "absolute", inset: 0, borderRadius: "50%", border: "6px solid #7a5a1a", boxShadow: "inset 0 0 24px rgba(0,0,0,.65), 0 0 16px rgba(0,0,0,.55)", willChange: "transform" },
    label: { position: "absolute", left: "50%", top: "50%", width: 16, height: 16, marginLeft: -8, marginTop: -8, color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", textShadow: "0 1px 2px #000" },
    ballOrbit: { position: "absolute", inset: 0, borderRadius: "50%", zIndex: 4, pointerEvents: "none", willChange: "transform" },
    ball: { position: "absolute", left: "50%", top: 9, width: 15, height: 15, marginLeft: -7.5, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #d0d0d0 65%, #888)", boxShadow: "0 0 9px rgba(255,255,255,.95), 0 0 3px #fff" },
    hub: { position: "absolute", left: "50%", top: "50%", width: SIZE * 0.46, height: SIZE * 0.46, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle at 42% 35%, #2a2212, #0a0a0a)", border: "4px solid #7a5a1a", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    centerNum: { fontFamily: "'Courier New', monospace", fontWeight: 800, lineHeight: 1, color: "#fff", textShadow: "0 2px 4px #000" },
    centerSpin: { fontSize: SIZE * 0.16, opacity: 0.85, animation: "pqSpinPulse 0.5s ease-in-out infinite" },
    centerWin: { fontSize: SIZE * 0.24, animation: "pqWinBlink 0.55s ease-in-out 5" },
    caption: { minWidth: 150, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#fff", transition: "opacity .4s" },
}
