"use client"

// Nexus Jaune Éclair — GUIDE du panneau devant le gym, EN CARROUSEL (1 page/section
// pour la lisibilité). Les joueurs n'ont AUCUNE stat en jeu : ce guide leur donne
// tout pour battre l'arène COURANTE. Il se met à jour avec le bâtiment (Plante avant
// le badge plante, Roche après). ◀ ▶ + swipe entre les sections.

import { useState, useRef, useEffect } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { currentArenaMapId } from "@/lib/gamebook/yellow/maps"

const CREAM = "#f4ecd4"
const INK = "#2a1c10"
const DARK = "#cdbb86"

type Page = { t: string; rows: [string, string][] }

function Row({ k, v }: { k: string; v: string }) {
    return <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK }}><b>{k} :</b> {v}</div>
}

// ====== ARÈNE PLANTE ======
const PLANTE_PAGES: Page[] = [
    { t: "⚔️ Frappe en FEU, GLACE ou INSECTE (×2)", rows: [
        ["🔥 Feu", "Flammèche — Braisille/Fennaise niv 7 (ou un Pyrenard). Flamme Ardente — Pyrenard."],
        ["❄️ Glace", "Coup d'Givre (10% de GELER !) — Auroruff niv 8, Gouttiny niv 18."],
        ["🐛 Insecte", "Dard-Nuée (frappe 2 à 5 fois) — Ruffiant niv 6. Morsure — Formiguer (Ruffiant évolue niv 15)."],
        ["🦅 Vol", "Picpic — Plumiot/Cornaissant/Draclet niv 5. Tornade — Plumiot niv 20."],
        ["☠️ Poison", "Dard-Venin (30% empoisonne) — Ruffiant niv 13, Cornaissant/Sporbéo niv 14."],
    ] },
    { t: "🗺️ Où capturer (Route Nord)", rows: [
        ["⛰️ Montagnes", "Fennaise 🔥, Lavapetit 🔥, Auroruff ❄️ (peu communs)."],
        ["🌲 Sapins", "Ruffiant 🐛 (commun), Sporbéo ☠️ (rare)."],
        ["🎁 Starter", "Braisille 🔥 — si tu l'as choisi au départ."],
        ["💡 Astuce", "Dépasse ton quota → plus de Daemons rares ET de meilleurs IV."],
    ] },
    { t: "📈 Quelle stat améliorer ?", rows: [
        ["Feu / Glace", "attaques SPÉCIALES → monte la SPÉ."],
        ["Insecte / Vol", "attaques PHYSIQUES → monte l'ATTAQUE."],
        ["Encaisser", "la Plante frappe en SPÉCIAL → la SPÉ sert aussi de défense. Et le Feu résiste à la Plante."],
    ] },
    { t: "🛒 À la boutique", rows: [
        ["💿 CT", "Focalisation (+Spé), Danse-Lames (+Atk) — un tour de set-up, puis tu balaies."],
        ["🧴 Objets X", "X-Spé / X-Attaque : +1 cran le temps du combat. Super Pasta (+1 niveau)."],
    ] },
    { t: "🚫 À éviter · 🗝️ L'arène", rows: [
        ["À éviter", "Pas d'Eau, Sol ni Roche (la Plante leur fait ×2). L'Élec est résisté (inutile)."],
        ["Ordre", "Bats les 4 gardes (ordre libre), puis le Doyen Sylvain."],
        ["Boss", "Gare à ses drains (Vampigraine, Méga-Sangsue) et à sa Florapanthe, vive et coriace."],
    ] },
]

// ====== ARÈNE ROCHE (≤ niv 30) ======
const ROCHE_PAGES: Page[] = [
    { t: "💥 Le principe (2e arène — plus dure !)", rows: [
        ["Faiblesses", "La Roche tombe sous EAU · PLANTE · COMBAT · SOL (×2)."],
        ["Le ×4", "La plupart sont Roche/SOL → Eau ET Plante font ×4 !"],
        ["La clé", "Énorme Défense mais SPÉ (déf spéciale) FAIBLE → tape en SPÉCIAL : Eau & Plante ignorent le mur. (Combat/Sol = physiques, ils butent sur la Déf.)"],
        ["Niveau conseillé", "Boss niv 25 + dresseurs ENTRAÎNÉS (boostés). Viens avec une équipe ÉVOLUÉE ~niv 22-26, soignée."],
    ] },
    { t: "💧 EAU — capture · attaques", rows: [
        ["Gouttiny → Ondulo (16)", "STARTER Eau. Pistolet à O niv 6 · Coup d'Givre 18→24 · HYDROCANON (110) niv 34."],
        ["Loutrille → Ondaloutre (16)", "Route Nord PRÈS DE L'EAU. Pistolet à O 6 · LAME D'EAU (65) niv 20 · Coup d'Givre 26."],
        ["Piouflot → Hérondée (17)", "Route Nord, eau (Vol/Eau). Pistolet à O 5 · Lame d'Eau niv 20."],
        ["Têtardoc → Grenarc (18)", "GROTTE près de la mare (Roche/Eau). Pistolet à O · Lame d'Eau niv 22."],
    ] },
    { t: "🌿 PLANTE — capture · attaques", rows: [
        ["Feuillichot → Broubouc (16)", "STARTER. Fouet Lianes 4 · MÉGA-SANGSUE (vole 50%) 16→20 · TEMPÊTE VERTE (90) niv 28 (gratuit !)."],
        ["Pampousse → Féliane (16)", "Route Nord, SAPINS. Fouet Lianes 4 · Tranche-Feuille (55) 18 · Méga-Sangsue 24."],
        ["Broussours (Combat/Plante)", "Route Nord, sapins. Double-Pied 7 + Fouet Lianes 18 → double contre."],
        ["⚠️ Attention", "le boss PUNIT le Plante (Feu + Glace) → garde un plan B Eau/Combat."],
    ] },
    { t: "💪 COMBAT (×2) — capture · attaques", rows: [
        ["Couperin → Frappard (28)", "Route Nord (commun). Double-Pied 7 · POING-KARATÉ (50) niv 18."],
        ["Forgeotin → Marteloutan (18)", "Route Nord. Double-Pied 7 · Balayage (60) 24 · CROCHET DU MAÎTRE (80) niv 30."],
        ["Trolystrik → Brutetrik (17)", "Route Nord montagnes (Combat/Élec). Double-Pied 7 · Poing-Karaté · Balayage 30."],
    ] },
    { t: "🌍 SOL (×2, ×4 sur la lave) — capture", rows: [
        ["Quadroc / Octoroc", "capturés en GROTTE (lignée diamant). TIR DE BOUE (Sol 55) d'emblée — un Roche qui tape la Roche."],
        ["Cailloutchi → Roctaur (25)", "Route Nord/Grotte. À niv 30, Roctaur apprend SÉISME (Sol 100) — gros coup."],
    ] },
    { t: "💿 LES CT (tu as le badge plante)", rows: [
        ["⭐ Étreinte Sylvestre", "TU L'AS DÉJÀ (cadeau du Druide) ! Plante 75 + VOLE 50% → ×4 ET te soigne. Enseigne-la à un Daemon Plante."],
        ["Tempête Verte", "EN VENTE 700 reps (badge plante) : Plante 90. (Ou gratuit : Broubouc l'apprend niv 28.)"],
        ["Vampigraine", "EN VENTE 450 reps : graines qui drainent l'ennemi chaque tour."],
        ["Set-up", "Focalisation (450, +Spé) pour Eau/Plante · Danse-Lames (400, +Atk) pour Combat."],
        ["Pas encore", "Hydrocanon/Souffle Polaire = badge EAU · Séisme (CT) = Champion."],
    ] },
    { t: "🔥 Formule Saiyan + où mettre les points", rows: [
        ["Combien", "Par niveau : +2 si quota DÉPASSÉ chaque jour · +1 normal · +0 si quota raté."],
        ["Où / quoi", "Fiche du Daemon → ENTRAÎNEMENT SAIYAN. Pour la Roche, mets en SPÉ (attaque spé Eau/Plante + déf spé)."],
    ] },
    { t: "⚔️ Le boss : MAÎTRE GRANIT (5 Daemons fixes)", rows: [
        ["Ouvre sur", "ROCTAUR niv 25 (Roche/Sol) + Faille Sismique — mur de Déf, mais SPÉ NULLE : un coup spécial Eau/Plante ×4 le brise."],
        ["Anti-Plante", "FISSURALAVE (Roche/Feu) + IOROURS (Roche/Glace) tapent le Plante ×2 → aie un Eau ou Combat."],
        ["Le rapide", "RÉTRORAPTOR (Roche/Vol, très rapide) te double → un Eau bulky l'encaisse et le calme."],
        ["+ OCTOROC", "(Roche/Sol, mur de Déf). 5 Daemons au total → soigne-toi au Centre Daemon AVANT."],
    ] },
    { t: "🚫 Ce qui NE marche PAS · 🗝️ L'arène", rows: [
        ["Résistés ×0.5", "Feu, Vol, Normal, Poison → la Roche les encaisse."],
        ["Neutres ×1 (inutiles)", "GLACE, DRAGON, Élec, Insecte, Psy, Spectre → AUCUN avantage (la Glace et le Dragon ne servent à RIEN ici !)."],
        ["Ordre", "Bats les 4 gardes (ordre libre) → le Maître Granit."],
        ["Butin", "Badge Roche + la CT signature FAILLE SISMIQUE (offerte, introuvable ailleurs)."],
    ] },
]

export default function GuidePanel() {
    const open = useGameStore((s) => s.guideOpen)
    const close = useGameStore((s) => s.closeGuide)
    const badges = usePlayer().badges
    const [page, setPage] = useState(0)
    const touchX = useRef<number | null>(null)
    const isRock = currentArenaMapId(badges) === "yellow_arena_roche"
    const pages = isRock ? ROCHE_PAGES : PLANTE_PAGES
    // Remet à la 1re page à l'ouverture (et si on change d'arène).
    useEffect(() => { setPage(0) }, [open, isRock])

    if (!open) return null
    const idx = Math.min(page, pages.length - 1)
    const cur = pages[idx]
    const go = (d: number) => setPage((p) => (Math.min(pages.length - 1, Math.max(0, p)) + d + pages.length) % pages.length)

    return (
        <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }}>
            <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
                onTouchEnd={(e) => { const sx = touchX.current; touchX.current = null; if (sx == null) return; const dx = (e.changedTouches[0]?.clientX ?? sx) - sx; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1) }}
                style={{ background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "78%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }}
            >
                <div style={{ padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }}>
                    {isRock ? "📜 GUIDE DE LA CAVERNE" : "📜 GUIDE DU BOSQUET"}{" "}
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{isRock ? "arène Roche · ≤ niv 30" : "arène Plante · ≤ niv 20"}</span>
                </div>

                {/* Page courante */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 10 }}>{cur.t}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cur.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
                    </div>
                </div>

                {/* Carrousel : ◀  points  ▶ */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderTop: `2px solid ${DARK}` }}>
                    <button onClick={() => go(-1)} style={navBtn}>◀</button>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                        {pages.map((_, i) => (
                            <span key={i} onClick={() => setPage(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === idx ? INK : DARK, cursor: "pointer" }} />
                        ))}
                        <span style={{ fontSize: 11, color: INK, opacity: 0.7, marginLeft: 6 }}>{idx + 1}/{pages.length}</span>
                    </div>
                    <button onClick={() => go(1)} style={navBtn}>▶</button>
                </div>

                <button onClick={close} style={{ margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    FERMER
                </button>
            </div>
        </div>
    )
}

const navBtn: React.CSSProperties = {
    background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "8px 14px",
    fontSize: 16, fontWeight: 900, cursor: "pointer", lineHeight: 1, flexShrink: 0,
}
