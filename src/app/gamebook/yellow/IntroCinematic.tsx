"use client"

// Nexus Jaune Éclair — cinématique d'INTRO (1re entrée).
// Casting Pastafaith : les Servants accueillent, le Grand Prêtre explique, le
// Monstre en Spaghetti Volant (FSM) offre le choix du starter, Nymphe & Esprit
// bénissent. À la fin : onComplete(starterId).
// Texte PLACEHOLDER — édite librement SCRIPT / outro() / les répliques.

import { useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getGameMode } from "@/lib/gamebook/yellow/store/playerStore"

const npc = (id: string) => `/yellow/sprites/npc/${id}.png`

interface Line { speaker: string; sprite: string; fallback: string; text: string }

// Starters proposés (Plante / Eau / Feu).
const STARTERS = ["feuillichot", "gouttiny", "braisille"]

const SCRIPT: Line[] = [
    // — Invocation : le Monstre Spaghetti aspire le joueur depuis le monde réel (Chapitre 1 retiré) —
    { speaker: "???", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "✦ TOI, là-bas. Oui, toi qui transpires dans le monde réel. Tu M'as appelé sans le savoir. ✦" },
    { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "Chaque répétition que tu accomplis résonne jusqu'à Mon royaume… Tu es enfin PRÊT." },
    { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "Mon Appendice Nouilleux se referme sur toi et t'arrache à ton monde…" },
    { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "On commence les choses SÉRIEUSES. *SLOURP* ✦" },
    { speaker: "ACOLYTE", sprite: npc("acolyte"), fallback: "🙏", text: "Oh ! Il a survécu au transfert ! Bienvenue au NEXUS JAUNE ÉCLAIR, ami." },
    { speaker: "DIACRE", sprite: npc("deacon"), fallback: "📜", text: "Nous sommes les servants de la Pastafaith. Tu as été… touché par Son Appendice Nouilleux." },
    { speaker: "GRAND PRÊTRE", sprite: npc("high_priest"), fallback: "⛪", text: "Écoute bien. Ici vivent les DAEMONS — ils surgissent des hautes herbes." },
    { speaker: "GRAND PRÊTRE", sprite: npc("high_priest"), fallback: "⛪", text: "Et — nous le voyons d'ici — ta sueur du monde réel les attire. Plus tu forces, plus ils affluent." },
    { speaker: "GRAND PRÊTRE", sprite: npc("high_priest"), fallback: "⛪", text: "Mais nul n'avance seul. Le Dieu en personne va te confier un premier compagnon…" },
    { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "✦ R'amen, mortel. Je suis le Monstre en Spaghetti Volant. Choisis ton Daemon — avec sagesse, ou à l'instinct. ✦" },
]
const outro = (name: string): Line[] => [
    { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: `${name} ! Excellent. Qu'il te suive fidèlement.` },
    { speaker: "NYMPHE NOUILLE", sprite: npc("noodle_nymph"), fallback: "🧚", text: "Que tes nouilles ne collent jamais, Dresseur." },
    { speaker: "ESPRIT BOULETTE", sprite: npc("meatball_spirit"), fallback: "🟤", text: "Et que tes reps soient nombreuses. Va — l'aventure t'attend ! ✦" },
]

// MODE FUN : pas de reps/sueur → l'appel se fait par les DÉFIS, et les sauvages tournent selon l'heure/le jour.
// On insère aussi un DISCOURS D'OBJECTIF clair (le but de la run 1 fun) juste avant le don du starter (index 8).
const SCRIPT_FUN: Line[] = (() => {
    const mapped = SCRIPT.map((l, k) =>
        k === 0 ? { ...l, text: "✦ TOI, là-bas. Oui, toi qui rêves d'aventure dans le monde réel. Tu M'as appelé sans le savoir. ✦" }
        : k === 1 ? { ...l, text: "Chaque DÉFI que tu relèves résonne jusqu'à Mon royaume… Tu es enfin PRÊT." }
        : k === 7 ? { ...l, text: "Et — nous le voyons d'ici — les Daemons changent d'humeur au fil des HEURES et des JOURS. Observe le ciel avant de chasser…" }
        : l)
    const objectif: Line[] = [
        { speaker: "GRAND PRÊTRE", sprite: npc("high_priest"), fallback: "⛪", text: "Ta quête ici ? EXPLORER le Nexus, CAPTURER un maximum de Daemons et accomplir de grands HAUTS FAITS — chacun te rapporte un badge et des points." },
        { speaker: "MONSTRE SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "✦ Et tes amis vivent la MÊME aventure ! Le plus RAPIDE à décrocher un haut fait rafle l'OR. Ton score se fige à la fin du voyage — un classement vous départagera tous. Mais surtout : AMUSE-TOI, mortel. ✦" },
    ]
    return [...mapped.slice(0, 8), ...objectif, ...mapped.slice(8)]
})()
const outroFun = (name: string): Line[] => outro(name).map((l, k) =>
    k === 2 ? { ...l, text: "Et que tes défis soient glorieux. Va — l'aventure t'attend ! ✦" } : l)

function Portrait({ src, fallback }: { src: string; fallback: string }) {
    const [err, setErr] = useState(false)
    if (err) return <div style={S.portraitGlyph}>{fallback}</div>
    return <img src={src} alt="" onError={() => setErr(true)} style={S.portraitImg} />
}

export default function IntroCinematic({ onComplete }: { onComplete: (starterId: string) => void }) {
    const [phase, setPhase] = useState<"intro" | "choose" | "outro">("intro")
    const [i, setI] = useState(0)
    const [chosen, setChosen] = useState<string | null>(null)

    const fun = getGameMode() === "fun"
    const script = fun ? SCRIPT_FUN : SCRIPT
    const outroLines = fun ? outroFun : outro

    const advanceIntro = () => { if (i + 1 < script.length) setI(i + 1); else setPhase("choose") }
    const pick = (id: string) => { setChosen(id); setI(0); setPhase("outro") }
    const advanceOutro = () => {
        const lines = outroLines(getSpecies(chosen!)?.name ?? "Ton Daemon")
        if (i + 1 < lines.length) setI(i + 1); else onComplete(chosen!)
    }

    const line: Line | null = phase === "intro" ? script[i]
        : phase === "outro" ? outroLines(getSpecies(chosen!)?.name ?? "Ton Daemon")[i]
            : null

    return (
        <div style={S.overlay}>
            {phase === "choose" ? (
                <div style={S.chooseBox}>
                    <p style={S.chooseTitle}>Choisis ton premier Daemon</p>
                    <div style={S.cards}>
                        {STARTERS.map((id) => {
                            const sp = getSpecies(id)
                            return (
                                <button key={id} style={S.card} onClick={() => pick(id)}>
                                    <Portrait src={`/yellow/sprites/dex/${id}.png`} fallback={sp?.name[0] ?? "?"} />
                                    <span style={S.cardName}>{sp?.name ?? id}</span>
                                    <span style={S.cardType}>{sp?.types.join(" / ")}</span>
                                </button>
                            )
                        })}
                    </div>
                    <p style={S.hint}>Touche une carte pour choisir ▶</p>
                </div>
            ) : line ? (
                <div style={S.scene} onClick={phase === "intro" ? advanceIntro : advanceOutro}>
                    <Portrait src={line.sprite} fallback={line.fallback} />
                    <div style={S.box}>
                        <div style={S.speaker}>{line.speaker}</div>
                        <p style={S.text}>{line.text}</p>
                        <span style={S.next}>Toucher ▶</span>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9300, background: "radial-gradient(circle at 50% 35%, #2a1a40 0%, #0a0a14 70%)", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    scene: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, cursor: "pointer" },
    portraitImg: { width: 150, height: 150, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 0 16px #f5d02077)" },
    portraitGlyph: { width: 110, height: 110, borderRadius: "50%", background: "#1c1408", border: "3px solid #f5d020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 },
    box: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: 16, width: "100%", minHeight: 110, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center" },
    speaker: { fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#a06030", marginBottom: 6 },
    text: { fontSize: 14, lineHeight: 1.55, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 11, opacity: 0.55 },
    chooseBox: { width: "100%", maxWidth: 460, textAlign: "center" },
    chooseTitle: { fontSize: 15, fontWeight: 900, letterSpacing: 1, marginBottom: 14 },
    cards: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    card: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "inherit" },
    cardName: { fontSize: 12, fontWeight: 900 },
    cardType: { fontSize: 9, fontWeight: 700, color: "#8868c0" },
    hint: { fontSize: 11, opacity: 0.6, marginTop: 14 },
}
