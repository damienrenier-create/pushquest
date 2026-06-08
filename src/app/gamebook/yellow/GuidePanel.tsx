"use client"

// Nexus Jaune Éclair — GUIDE du panneau devant le gym. Les joueurs n'ont AUCUNE
// stat en jeu : ce panneau leur donne tout pour battre l'arène COURANTE. Il se met
// à jour avec le bâtiment (Plante avant le badge plante, Roche après). Infos ≤ niv 20.

import type { ReactNode } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { currentArenaMapId } from "@/lib/gamebook/yellow/maps"

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

function PlanteGuide() {
    return (
        <>
            <Section t="⚔️ Frappe en FEU, GLACE ou INSECTE (×2)">
                <Row k="🔥 Feu" v="Flammèche — Braisille/Fennaise niv 7 (ou un Pyrenard). Flamme Ardente — Pyrenard." />
                <Row k="❄️ Glace" v="Coup d'Givre (10% de GELER !) — Auroruff niv 8, Gouttiny niv 18." />
                <Row k="🐛 Insecte" v="Dard-Nuée (frappe 2 à 5 fois) — Ruffiant niv 6. Morsure — Formiguer (Ruffiant évolue niv 15)." />
                <Row k="🦅 Vol" v="Picpic — Plumiot/Cornaissant/Draclet niv 5. Tornade — Plumiot niv 20." />
                <Row k="☠️ Poison" v="Dard-Venin (30% empoisonne) — Ruffiant niv 13, Cornaissant/Sporbéo niv 14." />
            </Section>
            <Section t="🗺️ Où capturer (Route Nord)">
                <Row k="⛰️ Montagnes" v="Fennaise 🔥, Lavapetit 🔥, Auroruff ❄️ (peu communs)." />
                <Row k="🌲 Sapins" v="Ruffiant 🐛 (commun), Sporbéo ☠️ (rare)." />
                <Row k="🎁 Starter" v="Braisille 🔥 — si tu l'as choisi au départ." />
                <Row k="💡 Astuce" v="Dépasse ton quota → plus de Daemons rares ET de meilleurs IV." />
            </Section>
            <Section t="📈 Quelle stat améliorer ?">
                <Row k="Feu / Glace" v="attaques SPÉCIALES → monte la SPÉ." />
                <Row k="Insecte / Vol" v="attaques PHYSIQUES → monte l'ATTAQUE." />
                <Row k="Encaisser" v="la Plante frappe en SPÉCIAL → la SPÉ sert aussi de défense. Et le Feu résiste à la Plante." />
            </Section>
            <Section t="🛒 À la boutique">
                <Row k="💿 CT" v="Focalisation (+Spé), Danse-Lames (+Atk) — un tour de set-up, puis tu balaies." />
                <Row k="🧴 Objets X" v="X-Spé / X-Attaque : +1 cran le temps du combat. Super Pasta (+1 niveau)." />
            </Section>
            <Section t="🚫 À éviter">
                <Row k="Types" v="Pas d'Eau, Sol ni Roche (la Plante leur fait ×2). L'Élec est résisté (inutile)." />
            </Section>
            <Section t="🗝️ L'arène">
                <Row k="Ordre" v="Bats les 4 gardes (ordre libre), puis le Doyen Sylvain." />
                <Row k="Boss" v="Gare à ses drains (Vampigraine, Méga-Sangsue) et à sa Florapanthe, vive et coriace." />
            </Section>
        </>
    )
}

function RockGuide() {
    return (
        <>
            <Section t="⚔️ Frappe en EAU ou PLANTE (×2 — souvent ×4 !)">
                <Row k="💥 Pourquoi ×4" v="La plupart sont Roche/Sol : Eau ET Plante font DOUBLEMENT mouche." />
                <Row k="💧 Eau" v="Pistolet à O — Piouflot niv 5, Gouttiny/Loutrille niv 6, Têtardoc dès le départ. Lame d'Eau (65) — Loutrille/Hérondée niv 20." />
                <Row k="🌿 Plante" v="Fouet Lianes — Feuillichot/Pampousse niv 4, Tamanpousse niv 5. Méga-Sangsue (vole des PV) — Feuillichot niv 16." />
                <Row k="💪 Combat (×2)" v="Double-Pied — Couperin/Forgeotin/Trolystrik niv 7. Poing-Karaté — Couperin niv 18." />
                <Row k="🌍 Sol (×2, ×4 sur la lave)" v="Tir de Boue — un Quadroc/Octoroc capturé en grotte." />
            </Section>
            <Section t="🧠 LE secret : tape en SPÉCIAL">
                <Row k="Le mur" v="La Roche a une ÉNORME Défense mais une SPÉ (déf spéciale) FAIBLE." />
                <Row k="La clé" v="Eau & Plante sont des attaques SPÉCIALES → elles ignorent le mur de Déf et frappent le point faible. (Combat/Sol sont physiques → ils se cognent au mur.)" />
            </Section>
            <Section t="🔥 La formule Saiyan (où mettre tes points)">
                <Row k="Combien" v="À chaque niveau : +2 pts si tu as DÉPASSÉ ton quota chaque jour · +1 normalement · +0 si quota raté." />
                <Row k="Où" v="Dans la FICHE du Daemon (section ENTRAÎNEMENT SAIYAN) — boutons +PV/+ATQ/+DÉF/+VIT/+SPÉ." />
                <Row k="Pour la Roche" v="mets-les en SPÉ (booste ton attaque spéciale Eau/Plante ET ta défense spéciale)." />
            </Section>
            <Section t="🛒 La CT qui change tout">
                <Row k="💿 Tempête Verte" v="Plante, puiss 90 — EN VENTE (tu as le badge plante) → ×4 sur la plupart des Roche. Ton plus gros coup." />
                <Row k="Aussi" v="Focalisation (+Spé, set-up), X-Spé en combat, Super Pasta (+1 niveau)." />
            </Section>
            <Section t="🗺️ Où capturer tes contres">
                <Row k="💧 Eau" v="Gouttiny (starter), Piouflot/Loutrille/Têtardoc (Route Nord & Grotte, près de l'eau)." />
                <Row k="🌿 Plante" v="Feuillichot (starter), Pampousse/Tamanpousse (Route Nord)." />
                <Row k="💡 Astuce" v="Dépasse ton quota → plus de rares ET de meilleurs IV." />
            </Section>
            <Section t="⚠️ Le piège du Maître Granit">
                <Row k="Anti-Plante" v="Il a Iorours (GLACE) ET Fissuralave (FEU) qui punissent le Plante → ne mise pas QUE dessus, garde un EAU ou COMBAT en secours." />
                <Row k="Son ace" v="Roctaur, un mur de Défense qui ouvre sur Faille Sismique — mais sa SPÉ est nulle : un coup spécial Eau/Plante ×4 le brise." />
            </Section>
            <Section t="🚫 À éviter">
                <Row k="Types" v="Pas de Feu, Vol, Insecte ni Poison (résistés ou faibles face à la Roche). Évite le tout-physique contre le mur de Déf." />
            </Section>
            <Section t="🗝️ L'arène">
                <Row k="Ordre" v="Bats les 4 gardes (ordre libre), puis le Maître Granit." />
                <Row k="Butin" v="Badge Roche + la CT signature FAILLE SISMIQUE (offerte, introuvable ailleurs)." />
            </Section>
        </>
    )
}

export default function GuidePanel() {
    const open = useGameStore((s) => s.guideOpen)
    const close = useGameStore((s) => s.closeGuide)
    const badges = usePlayer().badges
    if (!open) return null
    const isRock = currentArenaMapId(badges) === "yellow_arena_roche"
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
                    {isRock ? "📜 GUIDE DE LA CAVERNE" : "📜 GUIDE DU BOSQUET"}{" "}
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{isRock ? "arène Roche" : "arène Plante"} · infos ≤ niv 20</span>
                </div>

                <div style={{ overflowY: "auto", padding: "10px 12px" }}>
                    {isRock ? <RockGuide /> : <PlanteGuide />}
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
