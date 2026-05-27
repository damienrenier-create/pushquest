"use client"

// src/app/gamebook/PastagoneBriefingModal.tsx
//
// v4.0 Phase 4.D + 8 — TAGLIA (briefing Pastagone) : récap, défi boss, choix orphelin.

import { useState } from "react"
import type { BattleState } from "@/lib/gamebook/battleState"

interface Props {
    onClose: () => void
    progress: {
        pastagoneArrested?: boolean
        pastagoneEscaped?: boolean
        pastagoneBossBeaten?: boolean
        pastagoneBolognionFound?: boolean
        pastagoneOrphanChosen?: string | null
    }
    /** v4.0 Phase 8 — Si défini, autorise le défi boss + le choix d'orphelin
     *  depuis le briefing. Le parent (MapClient) gère le démarrage du combat
     *  et le retour à Vegas. */
    onBossBattleStarted?: (state: BattleState) => void
    /** v4.0 — Le payload capolinoFlee est passé au parent pour jouer la cinématique
     *  CAPOLINO 4ᵉ rencontre (fuite + vol Daemon opposé). */
    onOrphanChosen?: (orphan: string, capolinoFlee?: { stolenType: string; lines: string[] }) => void
}

const ORPHANS = [
    { key: "anguillzap", emoji: "⚡", label: "ANGUILLZAP", desc: "Type Électrique. Anguille rapide et conductrice." },
    { key: "faucotron",  emoji: "🦅", label: "FAUCOTRON",  desc: "Type Vol. Faucon mécanique aux serres aiguës." },
    { key: "octopsy",    emoji: "🧠", label: "OCTOPSY",    desc: "Type Psy. Pieuvre télépathe au regard hypnotique." },
]

export default function PastagoneBriefingModal({ onClose, progress, onBossBattleStarted, onOrphanChosen }: Props) {
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const challengeBoss = async () => {
        if (busy) return
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/boss-battle", { method: "POST" })
            const j = await r.json()
            if (j.ok && j.state && onBossBattleStarted) {
                onBossBattleStarted(j.state as BattleState)
            } else {
                setMessage(j.reason ?? "Impossible.")
            }
        } catch { setMessage("Erreur réseau.") }
        finally { setBusy(false) }
    }

    const chooseOrphan = async (orphanKey: string) => {
        if (busy) return
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/orphan-choose", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orphan: orphanKey }),
            })
            const j = await r.json()
            setMessage(j.message ?? j.reason ?? "")
            if (j.ok && onOrphanChosen) onOrphanChosen(orphanKey, j.capolinoFlee)
        } catch { setMessage("Erreur réseau.") }
        finally { setBusy(false) }
    }
    const arrested = progress.pastagoneArrested === true
    const escaped = progress.pastagoneEscaped === true
    const bossBeaten = progress.pastagoneBossBeaten === true
    const bolognionFound = progress.pastagoneBolognionFound === true
    const orphanChosen = progress.pastagoneOrphanChosen ?? null

    const hint = !escaped
        ? "Sors d'abord de cellule. Le flic CARBONE détient la clé."
        : !bolognionFound && !bossBeaten
            ? "RIGATONI à la cuisine connaît une recette particulière. Si tu trouves les bons ingrédients dans l'ordre, peut-être qu'un fantôme spaghetti apparaîtra…"
            : !bossBeaten
                ? "Le Doberman Alpha t'attend dans la Tour de Garde après assez de combats. Affronte ses sbires d'abord."
                : !orphanChosen
                    ? "Le boss a laissé 3 orphelins. Choisis-en UN au briefing avant de partir."
                    : "Tout est fait. Sors par le nord."

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9100, padding: 16, fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #80a0d0", borderRadius: 6,
                    padding: 16, maxWidth: 420, width: "100%",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    📋 TAGLIA — BRIEFING
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                    « Voici l'état de la situation, dresseur. Pose pas trop de questions, lis. »
                </div>

                <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 10, fontSize: 11, lineHeight: 1.8 }}>
                    <div>{arrested ? "✅" : "⬜"} Arrêté à Vegas</div>
                    <div>{escaped ? "✅" : "⬜"} Évadé de la cellule (3 défis CARBONE)</div>
                    <div>{bolognionFound ? "✅" : "⬜"} Énigme BOLOGNION (cuisine) résolue</div>
                    <div>{bossBeaten ? "✅" : "⬜"} Doberman Alpha vaincu</div>
                    <div>{orphanChosen ? `✅ Orphelin adopté : ${orphanChosen}` : "⬜ Choix d'orphelin"}</div>
                </div>

                <div style={{
                    marginTop: 12, padding: 10,
                    background: "#202a3a", border: "1px solid #80a0d0",
                    fontSize: 10, lineHeight: 1.5,
                }}>
                    <strong style={{ color: "#80a0d0" }}>💡 PISTE</strong><br />
                    {hint}
                </div>

                {/* v4.0 Phase 8 — Bouton DÉFIER CHEF ASRIEL si évadé + pas encore battu */}
                {escaped && !bossBeaten && (
                    <button
                        onClick={challengeBoss}
                        disabled={busy}
                        style={{
                            marginTop: 12, width: "100%",
                            background: busy ? "#444" : "#c80030",
                            color: "#fff", border: "1px solid #fff",
                            padding: 10, fontSize: 12, fontWeight: "bold",
                            letterSpacing: 1, cursor: busy ? "wait" : "pointer",
                            fontFamily: "monospace",
                        }}
                    >
                        🐺 DÉFIER CHEF ASRIEL
                    </button>
                )}

                {/* v4.0 Phase 8 — Choix de l'orphelin si boss vaincu + pas encore choisi */}
                {bossBeaten && !orphanChosen && (
                    <div style={{ marginTop: 12, padding: 10, background: "#2a1a30", border: "1px solid #c060d0" }}>
                        <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, color: "#c060d0" }}>
                            🎁 CHOISIS L'ORPHELIN
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 8, lineHeight: 1.5 }}>
                            Le Doberman a laissé 3 animaux orphelins. Prends-en UN avec toi —
                            ce choix est définitif.
                        </div>
                        {ORPHANS.map((o) => (
                            <button
                                key={o.key}
                                onClick={() => chooseOrphan(o.key)}
                                disabled={busy}
                                style={{
                                    display: "block",
                                    width: "100%", textAlign: "left", marginBottom: 4,
                                    background: busy ? "#333" : "#3a2a4a",
                                    color: "#fff",
                                    border: "1px solid #c060d0",
                                    padding: "6px 8px", fontSize: 10,
                                    fontFamily: "monospace", cursor: busy ? "wait" : "pointer",
                                }}
                            >
                                <strong>{o.emoji} {o.label}</strong>
                                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{o.desc}</div>
                            </button>
                        ))}
                    </div>
                )}

                {message && (
                    <div style={{ marginTop: 10, padding: 8, background: "#222", border: "1px solid #555", fontSize: 10 }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    )
}
