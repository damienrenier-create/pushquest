"use client"

// Nexus — Roue de roulette ANIMÉE (dopamine). Purement cosmétique : la roue tourne, décélère et la bille
// vient se poser sur le numéro gagnant FOURNI PAR LE SERVEUR (jamais tirée ici). Parfois une « ultime
// case » : la bille semble se poser sur le voisin puis fait un dernier petit saut jusqu'au vrai gagnant.
//   props: winning = numéro serveur · spinKey = id de manche ("" = affichage statique, pas d'anim)

import { useEffect, useRef, useState } from "react"
import { WHEEL_ORDER, POCKET_COUNT, colorOf } from "@/lib/gamebook/yellow/roulette/wheel"

const POCKET = 360 / POCKET_COUNT // ~9.73° par case
const SIZE = 230
const R_LABEL = SIZE / 2 - 15

// Anneau coloré (37 secteurs), case 0 centrée en haut (sous le pointeur).
const RING = (() => {
    const stops: string[] = []
    for (let i = 0; i < POCKET_COUNT; i++) {
        const c = colorOf(WHEEL_ORDER[i])
        const col = c === "green" ? "#0e7a38" : c === "red" ? "#a52424" : "#161616"
        stops.push(`${col} ${i * POCKET}deg ${(i + 1) * POCKET}deg`)
    }
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
    const [settled, setSettled] = useState<number | null>(winning)
    const [spinning, setSpinning] = useState(false)
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

        // spinKey vide = affichage statique (1er chargement, on montre juste le dernier résultat).
        if (!spinKey) { setSettled(winning); return }

        setSettled(null)
        setSpinning(true)

        // Rotation finale : case `idx` alignée sous le pointeur du haut. R ≡ -idx*POCKET (mod 360),
        // ≥ rotation courante + N tours (toujours vers l'avant, jamais de reset).
        const SPINS = 5
        const targetMod = (((-idx * POCKET) % 360) + 360) % 360
        const base = wheelRotRef.current + SPINS * 360
        const baseMod = ((base % 360) + 360) % 360
        const rFinal = base + ((((targetMod - baseMod) % 360) + 360) % 360)

        // « ultime case » : on vise d'abord la case suivante (rFinal - 1 case) puis on avance d'un cran.
        const nearMiss = Math.random() < 0.4
        const rMain = nearMiss ? rFinal - POCKET : rFinal

        // Bille : orbite à contresens et se gare en haut (multiple de 360).
        const BALL_SPINS = 8
        const ballBase = ballRotRef.current - BALL_SPINS * 360
        const ballTarget = ballBase - ((((ballBase % 360) + 360) % 360))

        const DUR = 4.4
        setWheelDur(DUR); setBallDur(DUR)
        setWheelRot(rMain); setBallRot(ballTarget)
        wheelRotRef.current = rMain; ballRotRef.current = ballTarget

        let totalMs = DUR * 1000 + 150
        if (nearMiss) {
            const HOP_DELAY = 360, HOP_DUR = 0.7
            timers.current.push(setTimeout(() => { setWheelDur(HOP_DUR); setWheelRot(rFinal); wheelRotRef.current = rFinal }, DUR * 1000 + HOP_DELAY))
            totalMs = DUR * 1000 + HOP_DELAY + HOP_DUR * 1000 + 120
        }
        timers.current.push(setTimeout(() => { setSettled(winning); setSpinning(false); onDoneRef.current?.(winning) }, totalMs))

        return () => { timers.current.forEach(clearTimeout); timers.current = [] }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- relance UNIQUEMENT à la manche (spinKey)
    }, [spinKey])

    const settledCol = settled != null ? colorOf(settled) : null

    return (
        <div style={S.wrap}>
            <div style={S.stage}>
                {/* Pointeur fixe (haut) */}
                <div style={S.pointer} />
                {/* Roue (anneau coloré + numéros radiaux) */}
                <div style={{ ...S.wheel, background: RING, transform: `rotate(${wheelRot}deg)`, transition: wheelDur ? `transform ${wheelDur}s cubic-bezier(0.12,0.67,0.13,1)` : "none" }}>
                    {WHEEL_ORDER.map((n, i) => (
                        <div key={n} style={{ ...S.label, transform: `rotate(${i * POCKET}deg) translateY(-${R_LABEL}px)` }}>{n}</div>
                    ))}
                </div>
                {/* Moyeu + bille orbitale */}
                <div style={{ ...S.ballOrbit, transform: `rotate(${ballRot}deg)`, transition: ballDur ? `transform ${ballDur}s cubic-bezier(0.1,0.6,0.1,1)` : "none" }}>
                    <div style={S.ball} />
                </div>
                <div style={S.hub} />
            </div>
            {/* Affichage du numéro posé (après l'arrêt) */}
            <div style={{ ...S.result, opacity: settled != null && !spinning ? 1 : 0.25, background: settledCol === "red" ? "#7a1414" : settledCol === "black" ? "#1a1a1a" : settledCol === "green" ? "#0e5a2a" : "#222" }}>
                {spinning ? "🎡 La bille tourne…" : settled != null ? `🎯 ${settled} · ${settledCol === "red" ? "Rouge" : settledCol === "black" ? "Noir" : "Vert"}` : "—"}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    wrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 8 },
    stage: { position: "relative", width: SIZE, height: SIZE, maxWidth: "82vw", maxHeight: "82vw" },
    pointer: { position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "16px solid #ffd54a", zIndex: 5, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" },
    wheel: { position: "absolute", inset: 0, borderRadius: "50%", border: "5px solid #7a5a1a", boxShadow: "inset 0 0 18px rgba(0,0,0,.6), 0 0 14px rgba(0,0,0,.5)", willChange: "transform" },
    label: { position: "absolute", left: "50%", top: "50%", width: 14, height: 14, marginLeft: -7, marginTop: -7, color: "#fff", fontSize: 8.5, fontWeight: 800, fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", textShadow: "0 1px 1px #000" },
    ballOrbit: { position: "absolute", inset: 0, borderRadius: "50%", zIndex: 4, pointerEvents: "none", willChange: "transform" },
    ball: { position: "absolute", left: "50%", top: 8, width: 11, height: 11, marginLeft: -5.5, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #c8c8c8 70%, #888)", boxShadow: "0 0 5px rgba(255,255,255,.8)" },
    hub: { position: "absolute", left: "50%", top: "50%", width: SIZE * 0.42, height: SIZE * 0.42, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #3a2f1a, #14100a)", border: "3px solid #7a5a1a", zIndex: 3 },
    result: { minWidth: 150, textAlign: "center", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800, color: "#fff", transition: "opacity .4s" },
}
