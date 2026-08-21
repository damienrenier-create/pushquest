"use client"

// Nexus Jaune Éclair — POPUP DE NOUVELLE ENTRÉE POKÉDEX (première capture d'une espèce).
// Jouée APRÈS le combat (comme la cinématique d'évolution). Montre : sprite + nom + n° de
// Dex, la description d'espèce, une punchline humoristique, puis propose un SURNOM.
// Lecture seule du store (renomme via renameDaemon, persiste, puis onDone).

import { useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getPunchline } from "@/lib/gamebook/yellow/data/dexPunchlines"
import { dexLore } from "@/lib/gamebook/yellow/data/dexLore"
import { renameDaemon } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86", GOLD = "#f5c518"

export default function DexEntryScreen({ entry, onDone }: { entry: { speciesId: string; uid: string; level: number; shiny?: boolean }; onDone: () => void }) {
    const sp = getSpecies(entry.speciesId)
    const [name, setName] = useState("")
    const [imgErr, setImgErr] = useState(false)
    const [done, setDone] = useState(false) // anti double-clic

    if (!sp) { onDone(); return null }
    const punch = getPunchline(entry.speciesId)

    const finish = (withName: boolean) => {
        if (done) return
        setDone(true)
        const trimmed = name.trim()
        if (withName && trimmed) {
            renameDaemon(entry.uid, trimmed)
            persistYellowSave()
        }
        onDone()
    }

    return (
        <div style={overlay}>
            <div style={box}>
                <div style={banner}>✨ NOUVEAU DAEMON AU POKÉDEX ! ✨</div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 16px 4px" }}>
                    {sp.sprite && !imgErr
                        ? <img src={sp.sprite} alt={sp.name} onError={() => setImgErr(true)} style={entry.shiny ? { ...sprite, filter: SHINY_FILTER } : sprite} />
                        : <div style={{ ...sprite, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 900, color: INK }}>{sp.name[0]}</div>}
                    {entry.shiny && <div style={{ fontSize: 11, fontWeight: 900, color: "#8a5a1c", letterSpacing: 0.6, marginBottom: 2 }}>✨ CHROMATIQUE ✨</div>}
                    <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: 0.5 }}>{sp.name}{entry.shiny ? " ✨" : ""}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, opacity: 0.6 }}>
                        N°{String(sp.dexNo).padStart(3, "0")} · {sp.types.join(" / ")} · capturé N.{entry.level}
                    </div>
                </div>

                <div style={{ padding: "6px 16px 0" }}>
                    <p style={descTxt}>{dexLore(sp.id)?.ecology ?? sp.description}</p>
                    {punch && <p style={punchTxt}>« {punch} »</p>}
                </div>

                <div style={{ borderTop: `2px solid ${DARK}`, margin: "12px 14px 0", paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 6 }}>Lui donner un surnom ?</div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={12}
                        placeholder={sp.name}
                        onKeyDown={(e) => { if (e.key === "Enter") finish(true) }}
                        style={input}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => finish(false)} style={skipBtn}>Garder « {sp.name} »</button>
                        <button onClick={() => finish(true)} disabled={!name.trim()} style={{ ...okBtn, ...(name.trim() ? {} : okBtnDim) }}>✓ Surnommer</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9400, padding: 14 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 12, width: "100%", maxWidth: 360, boxShadow: "0 8px 28px rgba(0,0,0,0.55)", fontFamily: "system-ui, sans-serif", paddingBottom: 14, maxHeight: "92dvh", overflowY: "auto" }
const banner: React.CSSProperties = { background: INK, color: GOLD, fontWeight: 800, fontSize: 12, letterSpacing: 0.6, textAlign: "center", padding: "8px 10px", borderRadius: "9px 9px 0 0" }
const sprite: React.CSSProperties = { width: 112, height: 112, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.3))", marginBottom: 4 }
const descTxt: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.5, color: INK, margin: "0 0 6px", textAlign: "center" }
const punchTxt: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.5, color: "#8a5a1c", fontStyle: "italic", fontWeight: 600, margin: 0, textAlign: "center" }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#fff", border: `2px solid ${DARK}`, borderRadius: 8, padding: "9px 11px", fontSize: 14, color: INK, fontFamily: "inherit", outline: "none" }
const skipBtn: React.CSSProperties = { flex: 1, background: "#e0e0d0", color: "#555", border: "2px solid #888", borderRadius: 8, padding: "9px 6px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const okBtn: React.CSSProperties = { flex: 1, background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "9px 6px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const okBtnDim: React.CSSProperties = { background: "#b8b29a", color: "#efe9d6", cursor: "not-allowed" }
