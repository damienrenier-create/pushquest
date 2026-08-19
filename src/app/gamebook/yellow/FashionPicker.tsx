"use client"

// src/app/gamebook/yellow/FashionPicker.tsx
//
// FASHION VICTIM — sélecteur d'avatar. Le joueur choisit une des 8 planches ; l'avatar est stocké (chosenAvatar)
// puis diffusé via la présence → les autres joueurs le voient. Miniature = cellule IDLE-DOWN de la planche Gen3.

import { usePlayer, setChosenAvatar } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FASHION_AVATARS } from "@/lib/gamebook/yellow/data/avatars"

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86", ACCENT = "#e050a0"

// Planche Gen3 : 19 colonnes × 4 lignes (cellule 40×40). Miniature = colonne 1 (pose neutre), ligne 0 (face sud).
function thumbStyle(url: string): React.CSSProperties {
    return {
        width: 54, height: 54,
        backgroundImage: `url(${url})`,
        backgroundSize: "1900% 400%",
        backgroundPosition: `${(1 / 18) * 100}% 0%`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
    }
}

export default function FashionPicker() {
    const player = usePlayer()
    const close = useGameStore((s) => s.closeFashion)
    const pick = (path?: string) => { setChosenAvatar(path); persistYellowSave(); close() }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>👗 FASHION VICTIM</div>
                <div style={{ padding: 12, overflowY: "auto" }}>
                    <div style={{ fontSize: 12, color: INK, lineHeight: 1.4, marginBottom: 10 }}>
                        « Choisis ton nouveau look, chéri — et crois-moi, <b>tout le monde te verra</b> avec ! »
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {FASHION_AVATARS.map((url, i) => {
                            const cur = player.chosenAvatar === url
                            return (
                                <button key={url} onClick={() => pick(url)} title={`Look n°${i + 1}`}
                                    style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 6, background: "#fff8e8", border: `2px solid ${cur ? ACCENT : DARK}`, borderRadius: 8, cursor: "pointer", boxShadow: cur ? `0 0 0 2px ${ACCENT}55` : "none" }}>
                                    <div style={thumbStyle(url)} />
                                </button>
                            )
                        })}
                    </div>
                    <button onClick={() => pick(undefined)} style={resetBtn}>↩︎ Revenir au look par défaut</button>
                </div>
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 360, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const resetBtn: React.CSSProperties = { marginTop: 12, width: "100%", padding: "7px 0", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
