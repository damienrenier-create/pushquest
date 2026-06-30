"use client"

// Nexus — Roue de roulette ANIMÉE (dopamine). Purement cosmétique : la roue tourne LONGUEMENT, décélère
// et la bille vient se poser sur le numéro gagnant FOURNI PAR LE SERVEUR (jamais tirée ici). Parfois une
// « ultime case » (petit saut final). Le CENTRE fait le show : pendant que ça tourne, les chiffres
// DÉFILENT en ralentissant ; à l'arrêt, le NUMÉRO GAGNANT s'affiche en grand, dans sa couleur, et
// CLIGNOTE. La bille brille. Plus c'est long et lent, plus c'est lisible et addictif.
//   props: winning = numéro serveur · spinKey = id de manche ("" = affichage statique, pas d'anim)

import { useEffect, useRef, useState } from "react"
import { WHEEL_ORDER, POCKET_COUNT, colorOf } from "@/lib/gamebook/yellow/roulette/wheel"

const POCKET = 360 / POCKET_COUNT // ~9.73° par case
const SIZE = 300
const R_LABEL = SIZE / 2 - 19
const SPINS = 8        // tours complets avant de se poser
const DUR = 6.6        // durée de la rotation principale (s) — longue → lisible
const HOP_DELAY = 380  // "ultime case" : délai avant le saut final (ms)
const HOP_DUR = 0.75   // durée du saut final (s)

const COL = (c: string) => (c === "green" ? "#0e7a38" : c === "red" ? "#b02828" : "#161616")

// Anneau coloré (37 secteurs), case 0 centrée en haut (sous le pointeur).
const RING = (() => {
    const stops: string[] = []
    for (let i = 0; i < POCKET_COUNT; i++) stops.push(`${COL(colorOf(WHEEL_ORDER[i]))} ${i * POCKET}deg ${(i + 1) * POCKET}deg`)
    return `conic-gradient(from ${-POCKET / 2}deg, ${stops.join(", ")})`
})()

export default function RouletteWheel({ winning, spinKey, onDone }: {
    winning: number | null
    spinKey: string
    onDone?: (n: number) => void
}) {
    const [wheelRot, setWheelRot] = useState(0)
    const [ballRot, setBallRot] = useState(0)
    const [wheelDur, setWheelDur] = useState(0)
    const [ballDur, setBallDur] = useState(0)
    const [centerNum, setCenterNum] = useState<number | null>(winning)
    const [phase, setPhase] = useState<"idle" | "spin" | "win">(winning != null ? "win" : "idle")
    const wheelRotRef = useRef(0)
    const ballRotRef = useRef(0)
    const onDoneRef = useRef(onDone)
    onDoneRef.current = onDone
    const timers = useRef<ReturnType<typeof setTimeout>[]>([])

    useEffect(() => {
        if (winning == null) return
        const idx = WHEEL_ORDER.indexOf(winning)
        if (idx < 0) return
        timers.current.forEach(clearTimeout)
        timers.current = []

        // spinKey vide = affichage statique (1er chargement : on montre juste le dernier résultat, sans anim).
        if (!spinKey) { setCenterNum(winning); setPhase("win"); return }

        setPhase("spin")

        // Rotation finale : case `idx` alignée sous le pointeur du haut. R ≡ -idx*POCKET (mod 360),
        // ≥ rotation courante + N tours (toujours vers l'avant, jamais de reset).
        const targetMod = (((-idx * POCKET) % 360) + 360) % 360
        const base = wheelRotRef.current + SPINS * 360
        const baseMod = ((base % 360) + 360) % 360
        const rFinal = base + ((((targetMod - baseMod) % 360) + 360) % 360)

        // « ultime case » : on vise d'abord la case suivante (rFinal - 1 case) puis on avance d'un cran.
        const nearMiss = Math.random() < 0.45
        const rMain = nearMiss ? rFinal - POCKET : rFinal

        // Bille : orbite à contresens et se gare en haut (multiple de 360).
        const BALL_SPINS = 11
        const ballBase = ballRotRef.current - BALL_SPINS * 360
        const ballTarget = ballBase - ((((ballBase % 360) + 360) % 360))

        setWheelDur(DUR); setBallDur(DUR)
        setWheelRot(rMain); setBallRot(ballTarget)
        wheelRotRef.current = rMain; ballRotRef.current = ballTarget

        let settleMs = DUR * 1000 + 120
        if (nearMiss) {
            timers.current.push(setTimeout(() => { setWheelDur(HOP_DUR); setWheelRot(rFinal); wheelRotRef.current = rFinal }, DUR * 1000 + HOP_DELAY))
            settleMs = DUR * 1000 + HOP_DELAY + HOP_DUR * 1000 + 100
        }

        // DÉFILÉ des chiffres au centre : décélère (délais croissants) jusqu'à ~150 ms avant l'arrêt.
        const FRAMES = 58
        let acc = 0
        for (let i = 0; i < FRAMES; i++) {
            const frac = i / (FRAMES - 1)
            acc += 40 + frac * frac * 300 // ease-out : le défilé ralentit
            if (acc > settleMs - 150) break
            const n = WHEEL_ORDER[(i * 11 + 5) % POCKET_COUNT]
            timers.current.push(setTimeout(() => setCenterNum(n), acc))
        }

        // ARRÊT : la bille est posée → numéro gagnant au centre + clignotement (autorité finale).
        timers.current.push(setTimeout(() => { setCenterNum(winning); setPhase("win"); onDoneRef.current?.(winning) }, settleMs))

        return () => { timers.current.forEach(clearTimeout); timers.current = [] }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- relance UNIQUEMENT à la manche (spinKey)
    }, [spinKey])

    const winCol = phase === "win" && centerNum != null ? colorOf(centerNum) : null

    return (
        <div style={S.wrap}>
            <style>{KEYFRAMES}</style>
            <div style={{ ...S.stage, ...(phase === "win" ? S.stageWin : {}) }}>
                {/* Pointeur fixe (haut) */}
                <div style={S.pointer} />
                {/* Roue (anneau coloré + numéros radiaux) */}
                <div style={{ ...S.wheel, background: RING, transform: `rotate(${wheelRot}deg)`, transition: wheelDur ? `transform ${wheelDur}s cubic-bezier(0.16,0.72,0.10,1)` : "none" }}>
                    {WHEEL_ORDER.map((n, i) => (
                        <div key={n} style={{ ...S.label, transform: `rotate(${i * POCKET}deg) translateY(-${R_LABEL}px)` }}>{n}</div>
                    ))}
                </div>
                {/* Bille orbitale (brille) */}
                <div style={{ ...S.ballOrbit, transform: `rotate(${ballRot}deg)`, transition: ballDur ? `transform ${ballDur}s cubic-bezier(0.14,0.66,0.08,1)` : "none" }}>
                    <div style={S.ball} />
                </div>
                {/* Moyeu central : DÉFILÉ des chiffres / NUMÉRO GAGNANT clignotant */}
                <div style={{ ...S.hub, ...(winCol ? { background: `radial-gradient(circle at 42% 35%, ${COL(winCol)}, #0a0a0a)`, borderColor: "#ffd54a", boxShadow: `0 0 26px ${COL(winCol)}` } : {}) }}>
                    <div key={phase === "win" ? "win" : "spin"} style={{ ...S.centerNum, ...(phase === "win" ? S.centerWin : phase === "spin" ? S.centerSpin : {}) }}>
                        {centerNum != null ? centerNum : "—"}
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
