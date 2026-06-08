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
            <Section t="💥 Le principe">
                <Row k="Faiblesses" v="La Roche tombe sous EAU · PLANTE · COMBAT · SOL (×2)." />
                <Row k="Le ×4" v="La plupart des Roche d'ici sont Roche/SOL → Eau ET Plante font ×4 (doublement super-efficace) !" />
                <Row k="La clé" v="La Roche a une ÉNORME Défense mais une SPÉ (déf spéciale) FAIBLE. Eau & Plante sont des attaques SPÉCIALES → elles ignorent le mur et frappent le point faible. (Combat/Sol sont physiques → ils butent sur la Déf.)" />
            </Section>

            <Section t="💧 EAU — qui, capturé où, quelles attaques">
                <Row k="Gouttiny" v="STARTER Eau. Pistolet à O niv 6 → évolue Ondulo niv 16 (Hydrocanon niv 34 plus tard)." />
                <Row k="Loutrille" v="Route Nord, PRÈS DE L'EAU (peu commun). Pistolet à O niv 6, LAME D'EAU (65) niv 20 → Ondaloutre niv 16." />
                <Row k="Piouflot" v="Route Nord, près de l'eau (Vol/Eau). Pistolet à O niv 5 → Hérondée niv 17 (Lame d'Eau niv 20)." />
                <Row k="Têtardoc" v="GROTTE, près de la mare (Roche/Eau). Pistolet à O d'emblée → Grenarc niv 18 (Lame d'Eau niv 22)." />
            </Section>

            <Section t="🌿 PLANTE — qui, capturé où, quelles attaques">
                <Row k="Feuillichot" v="STARTER Plante. Fouet Lianes niv 4, MÉGA-SANGSUE (vole 50% des dégâts) niv 16 → Broubouc niv 16 (Tempête Verte niv 28)." />
                <Row k="Pampousse" v="Route Nord, SAPINS (peu commun). Fouet Lianes niv 4, Tranche-Feuille (55) niv 18 → Féliane niv 16." />
                <Row k="⚠️ Attention" v="le boss PUNIT le Plante (Glace + Feu) → garde un plan B Eau/Combat." />
            </Section>

            <Section t="💪 COMBAT (×2) — qui, capturé où, quelles attaques">
                <Row k="Couperin" v="Route Nord (commun). Double-Pied niv 7, POING-KARATÉ (50) niv 18 → Frappard niv 28." />
                <Row k="Forgeotin" v="Route Nord (peu commun). Double-Pied niv 7, BALAYAGE (60) niv 24 → Marteloutan niv 18." />
                <Row k="Broussours" v="Route Nord, sapins (Combat/Plante !). Double-Pied niv 7 + Fouet Lianes niv 18 → DOUBLE contre." />
                <Row k="Trolystrik" v="Route Nord, montagnes (Combat/Élec). Double-Pied niv 7 → Brutetrik niv 17." />
            </Section>

            <Section t="🌍 SOL (×2, ×4 sur la lave) — qui, où">
                <Row k="Quadroc / Octoroc" v="capturés en GROTTE (lignée diamant, Roche/Sol). TIR DE BOUE (Sol 55) d'emblée — un Roche qui tape la Roche." />
                <Row k="Plus tard" v="Séisme (100) via Roctaur niv 30, ou la CT Champion." />
            </Section>

            <Section t="💿 LES CT (tu as le badge plante)">
                <Row k="⭐ Étreinte Sylvestre" v="TU L'AS DÉJÀ (cadeau du Druide) ! Plante 75 + VOLE 50% des dégâts → tape ×4 ET te soigne. Enseigne-la à un Daemon Plante." />
                <Row k="Tempête Verte" v="EN VENTE 700 reps (débloquée par ton badge plante) : Plante 90, ton plus gros nuke." />
                <Row k="Vampigraine" v="EN VENTE 450 reps : pose des graines qui drainent l'ennemi chaque tour." />
                <Row k="Set-up" v="Focalisation (450, +Spé) pour les Eau/Plante ; Danse-Lames (400, +Atk) pour les Combat." />
                <Row k="Hydrocanon/Séisme" v="Hydrocanon (Eau 110) et Souffle Polaire = badge EAU (pas encore). Séisme (Sol 100) = CT Champion." />
            </Section>

            <Section t="🔥 La formule Saiyan + où mettre les points">
                <Row k="Combien" v="À chaque niveau : +2 pts si tu as DÉPASSÉ ton quota CHAQUE jour · +1 normalement · +0 si quota raté." />
                <Row k="Où" v="Dans la FICHE du Daemon, section ENTRAÎNEMENT SAIYAN (+PV/+ATQ/+DÉF/+VIT/+SPÉ)." />
                <Row k="Pour la Roche" v="mets en SPÉ → booste ton attaque spéciale Eau/Plante ET ta défense spéciale." />
            </Section>

            <Section t="⚠️ Le piège du Maître Granit (boss)">
                <Row k="Anti-Plante" v="Il a Iorours (GLACE) ET Fissuralave (FEU) qui frappent le Plante ×2 → ne mise pas QUE sur le Plante." />
                <Row k="Son ace" v="Roctaur ouvre sur Faille Sismique — c'est un mur de Défense MAIS sa SPÉ est nulle : un coup spécial Eau/Plante ×4 le brise." />
                <Row k="Rappel" v="Il a 3 panthères minimum + le contre de TON dernier Daemon → soigne-toi avant (Centre Daemon)." />
            </Section>

            <Section t="🚫 À éviter / 🗝️ L'arène">
                <Row k="À éviter" v="Feu, Vol, Insecte, Poison (résistés ou faibles face Roche). Et le tout-physique contre le mur de Déf." />
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
