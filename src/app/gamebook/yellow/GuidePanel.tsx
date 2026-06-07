"use client"

// Nexus Jaune Éclair — GUIDE DU BOSQUET (pop-up du panneau devant le gym).
// Les joueurs n'ont accès à AUCUNE stat en jeu : ce panneau leur donne tout ce
// qu'il faut pour battre l'arène Plante. Volontairement limité aux infos ≤ niv 20.

import type { ReactNode } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

const CREAM = "#f4ecd4"
const INK = "#2a1c10"
const DARK = "#cdbb86"

function Section({ t, children }: { t: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: INK, borderBottom: `2px solid ${DARK}`, paddingBottom: 3, marginBottom: 6 }}>{t}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{children}</div>
        </div>
    )
}
function Row({ k, v }: { k: string; v: string }) {
    return <div style={{ fontSize: 12, lineHeight: 1.4, color: INK }}><b>{k} :</b> {v}</div>
}

export default function GuidePanel() {
    const open = useGameStore((s) => s.guideOpen)
    const close = useGameStore((s) => s.closeGuide)
    if (!open) return null
    return (
        <div
            onClick={close}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "88%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }}
            >
                <div style={{ padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }}>
                    📜 GUIDE DU BOSQUET <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>arène Plante · infos ≤ niv 20</span>
                </div>

                <div style={{ overflowY: "auto", padding: "10px 12px" }}>
                    <Section t="⚔️ Frappe en FEU, GLACE ou INSECTE (×2)">
                        <Row k="🔥 Feu" v="Flammèche — Braisille/Fennaise niv 7 (ou un Pyrenard). Flamme Ardente — Pyrenard." />
                        <Row k="❄️ Glace" v="Coup d'Givre (10% de GELER !) — Auroruff niv 8, Gouttiny niv 18." />
                        <Row k="🐛 Insecte" v="Dard-Nuée (frappe 2 à 5 fois) — Ruffiant niv 6. Morsure — Formiguer (Ruffiant évolue niv 15)." />
                        <Row k="🦅 Vol" v="Picpic — Plumiot/Cornaissant/Draclet niv 5. Tornade — Plumiot niv 20." />
                        <Row k="☠️ Poison" v="Dard-Venin (30% empoisonne — le poison grignote le boss) — Cornaissant/Sporbéo niv 14." />
                    </Section>

                    <Section t="🗺️ Où capturer (Route Nord)">
                        <Row k="⛰️ Montagnes" v="Fennaise 🔥, Lavapetit 🔥, Auroruff ❄️ (peu communs)." />
                        <Row k="🌲 Sapins" v="Ruffiant 🐛 (commun), Sporbéo ☠️ (rare)." />
                        <Row k="Communs" v="Plumiot 🦅, Cornaissant 🦅 (montagne & sapin)." />
                        <Row k="🎁 Starter" v="Braisille 🔥 — si tu l'as choisi au départ." />
                        <Row k="💡 Astuce" v="Dépasse ton quota du jour → plus de Daemons rares ET de meilleurs potentiels (IV)." />
                    </Section>

                    <Section t="📈 Quelle stat améliorer ?">
                        <Row k="Feu / Glace" v="attaques SPÉCIALES → monte la SPÉ." />
                        <Row k="Insecte / Vol" v="attaques PHYSIQUES → monte l'ATTAQUE." />
                        <Row k="Encaisser" v="la Plante frappe en SPÉCIAL → la SPÉ sert aussi de défense. Et le Feu résiste à la Plante (double avantage)." />
                        <Row k="Comment" v="niveaux (combats + Super Pasta), points Saiyan à répartir, objets X en combat." />
                    </Section>

                    <Section t="🛒 À la boutique">
                        <Row k="💿 CT" v="Focalisation (+Spé), Danse-Lames (+Atk) — un tour de set-up, puis tu balaies." />
                        <Row k="🧴 Objets X" v="X-Spé / X-Attaque : +1 cran le temps du combat." />
                        <Row k="🍝 / 💊" v="Super Pasta (+1 niveau). Anti-statut (Antidote, Réveil, Total Soin…)." />
                    </Section>

                    <Section t="🚫 À éviter">
                        <Row k="Types" v="N'amène pas d'Eau, Sol ni Roche (la Plante leur fait ×2). L'Élec est résisté (inutile)." />
                    </Section>

                    <Section t="🗝️ L'arène">
                        <Row k="Ordre" v="Bats les 4 gardes (dans l'ordre que tu veux), puis le Doyen." />
                        <Row k="Boss" v="Gare à ses drains (Vampigraine, Méga-Sangsue) et à sa Florapanthe — vive et coriace." />
                    </Section>
                </div>

                <button
                    onClick={close}
                    style={{ margin: 10, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                    FERMER
                </button>
            </div>
        </div>
    )
}
