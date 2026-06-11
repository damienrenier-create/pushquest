"use client"

// Nexus Jaune Éclair — overlay d'AFFICHAGE D'UN POSTER mural (Centre Daemon, easter egg
// du DIEU DES PÂTES). Lit l'image courante dans le gameStore (posterImage). Fermable au
// clic / bouton / B (goBack). Repli sobre si le PNG n'est pas encore déposé.

import { useState, useEffect, type CSSProperties } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

export default function PosterPanel() {
    const img = useGameStore((s) => s.posterImage)
    const close = useGameStore((s) => s.closePoster)
    const [err, setErr] = useState(false)
    // Repli remis à zéro à chaque nouvelle image (sinon une image cassée masquerait la suivante).
    useEffect(() => setErr(false), [img])
    if (!img) return null
    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.frame} onClick={(e) => e.stopPropagation()}>
                {err
                    ? <div style={S.placeholder}>🖼️ Poster à venir<br /><span style={{ opacity: 0.6, fontSize: 11 }}>(dépose le PNG dans public/yellow/sprites/)</span></div>
                    : <img src={img} alt="Poster" style={S.img} onError={() => setErr(true)} />}
                <button style={S.close} onClick={close}>← Fermer (B)</button>
            </div>
        </div>
    )
}

const S: Record<string, CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Courier New', monospace" },
    frame: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: "94vw", maxHeight: "92vh" },
    img: { maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", border: "3px solid #1c1408", borderRadius: 8, background: "#f8f8e8", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" },
    placeholder: { padding: "40px 30px", background: "#f8f8e8", border: "3px dashed #1c1408", borderRadius: 8, textAlign: "center", fontSize: 16, fontWeight: 800, color: "#1c1408", lineHeight: 1.6 },
    close: { padding: "10px 18px", background: "#1c1408", color: "#f8f8e8", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
}
