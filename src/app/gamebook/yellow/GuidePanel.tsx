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
            <Section t="💥 Le principe (2e arène — plus dure !)">
                <Row k="Faiblesses" v="La Roche tombe sous EAU · PLANTE · COMBAT · SOL (×2)." />
                <Row k="Le ×4" v="La plupart des Roche d'ici sont Roche/SOL → Eau ET Plante font ×4 !" />
                <Row k="La clé" v="Énorme Défense mais SPÉ (déf spéciale) FAIBLE → tape en SPÉCIAL : Eau & Plante ignorent le mur et frappent le point faible. (Combat/Sol = physiques, ils butent sur la Déf.)" />
                <Row k="Niveau conseillé" v="Boss niv 25 + dresseurs ENTRAÎNÉS (stats boostées). Viens avec une équipe ÉVOLUÉE ~niv 22-26, soignée." />
            </Section>

            <Section t="💧 EAU — capture · attaques (jusqu'à niv 30)">
                <Row k="Gouttiny → Ondulo (16)" v="STARTER Eau. Pistolet à O niv 6 · Coup d'Givre niv 18→24 · HYDROCANON (110) niv 34." />
                <Row k="Loutrille → Ondaloutre (16)" v="Route Nord PRÈS DE L'EAU. Pistolet à O 6 · LAME D'EAU (65) niv 20 · Coup d'Givre 26." />
                <Row k="Piouflot → Hérondée (17)" v="Route Nord, eau (Vol/Eau). Pistolet à O 5 · Lame d'Eau niv 20." />
                <Row k="Têtardoc → Grenarc (18)" v="GROTTE près de la mare (Roche/Eau). Pistolet à O · Lame d'Eau niv 22." />
            </Section>

            <Section t="🌿 PLANTE — capture · attaques">
                <Row k="Feuillichot → Broubouc (16)" v="STARTER. Fouet Lianes 4 · MÉGA-SANGSUE (vole 50%) 16→20 · TEMPÊTE VERTE (90) niv 28 (gratuit par niveau !)." />
                <Row k="Pampousse → Féliane (16)" v="Route Nord, SAPINS. Fouet Lianes 4 · Tranche-Feuille (55) 18 · Méga-Sangsue 24." />
                <Row k="⚠️ Attention" v="le boss PUNIT le Plante (Feu + Glace) → garde un plan B Eau/Combat." />
            </Section>

            <Section t="💪 COMBAT (×2) — capture · attaques">
                <Row k="Couperin → Frappard (28)" v="Route Nord (commun). Double-Pied 7 · POING-KARATÉ (50) niv 18." />
                <Row k="Forgeotin → Marteloutan (18)" v="Route Nord. Double-Pied 7 · Balayage (60) 24 · CROCHET DU MAÎTRE (80) niv 30." />
                <Row k="Broussours → Sylvours (18)" v="Route Nord sapins (Combat/PLANTE !). Double-Pied 7 + Fouet Lianes 18 → DOUBLE contre · Poing-Karaté 30." />
                <Row k="Trolystrik → Brutetrik (17)" v="Route Nord montagnes (Combat/Élec). Double-Pied 7 · Poing-Karaté · Balayage 30." />
            </Section>

            <Section t="🌍 SOL (×2, ×4 sur la lave) — capture">
                <Row k="Quadroc / Octoroc" v="capturés en GROTTE (lignée diamant). TIR DE BOUE (Sol 55) d'emblée — un Roche qui tape la Roche." />
                <Row k="Cailloutchi → Roctaur (25)" v="Route Nord/Grotte. À niv 30, Roctaur apprend SÉISME (Sol 100) — gros coup." />
            </Section>

            <Section t="💿 LES CT (tu as le badge plante)">
                <Row k="⭐ Étreinte Sylvestre" v="TU L'AS DÉJÀ (cadeau du Druide) ! Plante 75 + VOLE 50% des dégâts → ×4 ET te soigne. Enseigne-la à un Daemon Plante." />
                <Row k="Tempête Verte" v="EN VENTE 700 reps (badge plante) : Plante 90. (Ou gratuit : Broubouc l'apprend niv 28.)" />
                <Row k="Vampigraine" v="EN VENTE 450 reps : graines qui drainent l'ennemi chaque tour." />
                <Row k="Set-up" v="Focalisation (450, +Spé) pour Eau/Plante · Danse-Lames (400, +Atk) pour Combat." />
                <Row k="Pas encore" v="Hydrocanon/Souffle Polaire = badge EAU · Séisme (CT) = Champion." />
            </Section>

            <Section t="🔥 Formule Saiyan + où mettre les points">
                <Row k="Combien" v="Par niveau : +2 si quota DÉPASSÉ chaque jour · +1 normal · +0 si quota raté." />
                <Row k="Où / quoi" v="Fiche du Daemon → ENTRAÎNEMENT SAIYAN. Pour la Roche, mets en SPÉ (attaque spé Eau/Plante + déf spé)." />
            </Section>

            <Section t="⚔️ Le boss : MAÎTRE GRANIT (5 Daemons FIXES)">
                <Row k="Ouvre sur" v="ROCTAUR niv 25 (Roche/Sol) + Faille Sismique — mur de Déf, mais SPÉ NULLE : un coup spécial Eau/Plante ×4 le brise." />
                <Row k="Anti-Plante" v="FISSURALAVE (Roche/Feu) + IOROURS (Roche/Glace) tapent le Plante ×2 → aie un Eau ou Combat." />
                <Row k="Le rapide" v="RÉTRORAPTOR (Roche/Vol, très rapide) te double → un Eau bulky l'encaisse et le calme." />
                <Row k="+ OCTOROC" v="(Roche/Sol, mur de Déf). Au total 5 Daemons → soigne-toi au Centre Daemon AVANT." />
            </Section>

            <Section t="🚫 Ce qui NE marche PAS sur la Roche">
                <Row k="Résistés ×0.5" v="Feu, Vol, Normal, Poison → la Roche les encaisse." />
                <Row k="Neutres ×1 (inutiles)" v="GLACE, DRAGON, Élec, Insecte, Psy, Spectre → AUCUN avantage. (La Glace et le Dragon ne servent à rien ici !)" />
                <Row k="Aussi" v="évite le tout-physique contre le mur de Déf — privilégie le SPÉCIAL." />
            </Section>

            <Section t="🗝️ L'arène">
                <Row k="Ordre" v="Bats les 4 gardes (ordre libre) → le Maître Granit." />
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
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{isRock ? "arène Roche · infos ≤ niv 30" : "arène Plante · infos ≤ niv 20"}</span>
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
