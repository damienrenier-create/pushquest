"use client"

// src/app/gamebook/PastagoneBriefingModal.tsx
//
// v4.0 Phase 4.D — TAGLIA (briefing Pastagone) : récap'narratif + état d'avancement
// de l'arc Pastagone. Lecture seule, pas d'effet.

interface Props {
    onClose: () => void
    progress: {
        pastagoneArrested?: boolean
        pastagoneEscaped?: boolean
        pastagoneBossBeaten?: boolean
        pastagoneBolognionFound?: boolean
        pastagoneOrphanChosen?: string | null
    }
}

export default function PastagoneBriefingModal({ onClose, progress }: Props) {
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
