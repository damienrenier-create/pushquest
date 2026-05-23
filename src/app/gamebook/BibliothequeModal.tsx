"use client"

// src/app/gamebook/BibliothequeModal.tsx
//
// v3.18 — Modal hybride de la bibliothèque de Macaron'île.
// BIBLIO guide le joueur vers 3 sections : Casinos / Bestioles / Animaux & Défis.
// Animaux & Défis : fetch /api/gamebook/players (existing) puis dédupe par level → 1 entrée
// par animal unique parmi les joueurs actifs. Affiche mini-fiche + liste des 7 défis canoniques.

import { useEffect, useMemo, useState } from "react"
import { getLevelDetails } from "@/lib/xp"
import { CANONICAL_DEFIS, getDefiOrderForAnimalLevel, type TamagotchiView } from "@/lib/gamebook/tamagotchi"

interface PlayerInfo {
    id: string
    nickname: string
    level?: number
    animal?: string
    emoji?: string
}

interface Props {
    /** v3.21.1 — Tamagotchi du joueur courant (pour afficher ✅/⬜ sur son animal) */
    currentPlayerTamagotchi?: TamagotchiView | null
    onClose: () => void
}

export default function BibliothequeModal({ currentPlayerTamagotchi, onClose }: Props) {
    const [section, setSection] = useState<"menu" | "casinos" | "bestioles" | "animaux">("menu")
    const [players, setPlayers] = useState<PlayerInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [focusedAnimalLevel, setFocusedAnimalLevel] = useState<number | null>(null)

    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const res = await fetch("/api/gamebook/players", { cache: "no-store" })
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const json = await res.json()
                    if (!cancelled && Array.isArray(json.players)) {
                        setPlayers(json.players as PlayerInfo[])
                    }
                } catch (e) {
                    console.warn("[BibliothequeModal] failed to load players", e)
                } finally {
                    if (!cancelled) setLoading(false)
                }
            })()
        return () => {
            cancelled = true
        }
    }, [])

    // Dédupe les animaux : 1 entrée par level XP unique (l'animal du bestiaire)
    const uniqueAnimals = useMemo(() => {
        const byLevel = new Map<number, { level: number; nicknames: string[]; emoji: string; animal: string }>()
        for (const p of players) {
            if (typeof p.level !== "number") continue
            const details = getLevelDetails(p.level)
            const entry = byLevel.get(p.level) ?? {
                level: p.level,
                nicknames: [],
                emoji: details.emoji ?? p.emoji ?? "❓",
                animal: details.name ?? p.animal ?? "Animal",
            }
            entry.nicknames.push(p.nickname)
            byLevel.set(p.level, entry)
        }
        return Array.from(byLevel.values()).sort((a, b) => a.level - b.level)
    }, [players])

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                zIndex: 9000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a",
                    border: "3px solid #a07090",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 320,
                    maxWidth: 480,
                    width: "100%",
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold" }}>
                        📚 BIBLIOTHÈQUE
                        {section !== "menu" && (
                            <span style={{ marginLeft: 8, opacity: 0.6, fontWeight: "normal" }}>
                                / {section === "casinos" ? "Casinos" : section === "bestioles" ? "Bestioles" : "Animaux & Défis"}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={btnStyle({ outline: true })}
                    >
                        FERMER
                    </button>
                </div>

                {section === "menu" && (
                    <MenuView onPick={(s) => setSection(s)} />
                )}

                {section === "casinos" && (
                    <CasinosView onBack={() => setSection("menu")} />
                )}

                {section === "bestioles" && (
                    <BestiolesView onBack={() => setSection("menu")} />
                )}

                {section === "animaux" && (
                    <AnimauxView
                        loading={loading}
                        animals={uniqueAnimals}
                        focusedLevel={focusedAnimalLevel}
                        currentPlayerTamagotchi={currentPlayerTamagotchi}
                        onFocus={(level) => setFocusedAnimalLevel(level)}
                        onBack={() => {
                            if (focusedAnimalLevel !== null) setFocusedAnimalLevel(null)
                            else setSection("menu")
                        }}
                    />
                )}
            </div>
        </div>
    )
}

function MenuView({ onPick }: { onPick: (s: "casinos" | "bestioles" | "animaux") => void }) {
    return (
        <div>
            <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.5, marginBottom: 14, fontStyle: "italic" }}>
                BIBLIO ajuste ses lunettes. "Quel sujet t'intéresse ? Je te guide vers le bon rayon."
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => onPick("animaux")} style={btnStyle({ bg: "#48a868" })}>
                    🐾 ANIMAUX DES JOUEURS & DÉFIS D'ADOPTION
                </button>
                <button onClick={() => onPick("bestioles")} style={btnStyle({ bg: "#806040" })}>
                    🐛 BESTIOLES DES HAUTES HERBES
                </button>
                <button onClick={() => onPick("casinos")} style={btnStyle({ bg: "#c08040" })}>
                    🎰 CASINOS DE L'ARCHIPEL
                </button>
            </div>
        </div>
    )
}

function CasinosView({ onBack }: { onBack: () => void }) {
    return (
        <div>
            <p style={textP}>
                Deux casinos officiels dans l'archipel :
            </p>
            <ul style={ul}>
                <li>Casino de Bourg-Boulette</li>
                <li>Casino de Pépiteville</li>
            </ul>
            <p style={textP}>
                <strong>Rumeur 1 :</strong> Un client a perdu des pièces près d'une machine à sous de Bourg-Boulette. Personne ne les a encore retrouvées. (+50 reps si tu les vois.)
            </p>
            <p style={textP}>
                <strong>Rumeur 2 :</strong> Une roulette rouge/noir va bientôt ouvrir dans les deux casinos. Tu mises 10 reps, tu as 30 % de gagner (60 % si tu as parlé à LINGUINI dans la journée). Max 10 paris par jour.
            </p>
            <BackBtn onClick={onBack} />
        </div>
    )
}

function BestiolesView({ onBack }: { onBack: () => void }) {
    return (
        <div>
            <p style={textP}>
                Les <strong>bestioles</strong> peuplent les <strong>hautes herbes du sud</strong> entre Macaron'île et Muscuville.
            </p>
            <p style={textP}>
                Ce sont des créatures non identifiées. Elles n'attaquent que les voyageurs sans animal compagnon :
            </p>
            <ul style={ul}>
                <li>1ère rencontre : elles te mordent, tu recules en disant "Aïe" (pas de perte).</li>
                <li>Rencontres suivantes : -10 reps par passage (+ recul).</li>
            </ul>
            <p style={textP}>
                <strong>Comment passer ?</strong> Adopter un animal au vétérinaire V3T ET réussir ses 7 défis (cf. rayon "Animaux & Défis"). Une fois l'animal libéré, il t'accompagne et fait fuir les bestioles à vue.
            </p>
            <BackBtn onClick={onBack} />
        </div>
    )
}

function AnimauxView({
    loading, animals, focusedLevel, currentPlayerTamagotchi, onFocus, onBack,
}: {
    loading: boolean
    animals: Array<{ level: number; nicknames: string[]; emoji: string; animal: string }>
    focusedLevel: number | null
    currentPlayerTamagotchi?: TamagotchiView | null
    onFocus: (level: number | null) => void
    onBack: () => void
}) {
    if (loading) {
        return (
            <div>
                <p style={textP}>Chargement des fiches...</p>
            </div>
        )
    }
    if (focusedLevel !== null) {
        const animal = animals.find((a) => a.level === focusedLevel)
        if (!animal) {
            return (
                <div>
                    <p style={textP}>Aucune fiche disponible.</p>
                    <BackBtn onClick={onBack} />
                </div>
            )
        }
        const details = getLevelDetails(animal.level)
        // v3.21.1 — Ordre spécifique des 7 défis pour CET animal (permutation Mulberry32 seedée par level)
        const defiOrder = getDefiOrderForAnimalLevel(animal.level)
        // Si c'est l'animal du joueur courant, on affiche son statut ✅/⬜
        const isPlayerAnimal = currentPlayerTamagotchi
            && (currentPlayerTamagotchi.displayLevel ?? currentPlayerTamagotchi.currentLevel) === animal.level
        const recovered = currentPlayerTamagotchi?.recovered === true
        return (
            <div>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 48 }}>{animal.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginTop: 4 }}>
                        {animal.animal.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                        Niveau {animal.level} — {details.belt}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>
                        Joueurs : {animal.nicknames.join(", ")}
                    </div>
                    {isPlayerAnimal && (
                        <div style={{ fontSize: 10, color: "#48a868", marginTop: 6, fontWeight: "bold" }}>
                            ⭐ C'est ton animal totem !
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 10, opacity: 0.9, lineHeight: 1.5, marginBottom: 10 }}>
                    <strong>7 défis dans l'ordre spécifique à cet animal</strong> :
                </div>
                <ol style={{ fontSize: 10, lineHeight: 1.8, paddingLeft: 22 }}>
                    {defiOrder.map((defiIdx) => {
                        const defi = CANONICAL_DEFIS[defiIdx]
                        const done = isPlayerAnimal && currentPlayerTamagotchi?.defiProgress?.[String(defiIdx)] === true
                        return (
                            <li
                                key={defiIdx}
                                style={{
                                    opacity: done ? 0.55 : 1,
                                    textDecoration: done ? "line-through" : "none",
                                }}
                            >
                                {isPlayerAnimal ? (done ? "✅ " : "⬜ ") : ""}{defi.title}
                                <div style={{ fontSize: 8.5, opacity: 0.65, marginTop: 2 }}>
                                    {defi.description}
                                </div>
                            </li>
                        )
                    })}
                </ol>
                {isPlayerAnimal && recovered && (
                    <div style={{ fontSize: 10, color: "#48a868", marginTop: 8, fontStyle: "italic" }}>
                        Tu as déjà libéré ton animal. Il te suit partout maintenant.
                    </div>
                )}
                <div style={{ fontSize: 9, opacity: 0.5, marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
                    Les seuils en reps sont ajustés au ratio onboarding. Les défis "après gainage/pompes" demandent l'ordre temporel strict (gainage → pompes → squats dans la journée).
                </div>
                <BackBtn onClick={onBack} label="← RETOUR À LA LISTE" />
            </div>
        )
    }
    return (
        <div>
            <p style={textP}>
                Chaque animal du bestiaire correspond au niveau XP d'au moins un joueur. Click pour ouvrir sa fiche.
            </p>
            {animals.length === 0 && (
                <p style={{ ...textP, opacity: 0.6 }}>
                    Aucun joueur actif détecté. Reviens quand la communauté grandit.
                </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {animals.map((a) => (
                    <button
                        key={a.level}
                        onClick={() => onFocus(a.level)}
                        style={{
                            ...btnStyle({}),
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                            justifyContent: "flex-start",
                        }}
                    >
                        <span style={{ fontSize: 18 }}>{a.emoji}</span>
                        <span style={{ flex: 1 }}>
                            {a.animal} <span style={{ opacity: 0.6 }}>· lv {a.level}</span>
                        </span>
                        <span style={{ fontSize: 8, opacity: 0.5 }}>{a.nicknames.length} joueur{a.nicknames.length > 1 ? "s" : ""}</span>
                    </button>
                ))}
            </div>
            <BackBtn onClick={onBack} />
        </div>
    )
}

function BackBtn({ onClick, label = "← MENU" }: { onClick: () => void; label?: string }) {
    return (
        <button
            onClick={onClick}
            style={{ ...btnStyle({ outline: true }), marginTop: 14 }}
        >
            {label}
        </button>
    )
}

const textP = { fontSize: 11, lineHeight: 1.6, marginBottom: 10 }
const ul = { fontSize: 10, lineHeight: 1.8, paddingLeft: 18, marginBottom: 10 }

function btnStyle({ bg, outline }: { bg?: string; outline?: boolean } = {}): React.CSSProperties {
    if (outline) {
        return {
            background: "transparent",
            border: "1px solid #fff",
            color: "#fff",
            fontFamily: "monospace",
            padding: "4px 10px",
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 2,
        }
    }
    return {
        background: bg ?? "#4060a0",
        color: "#fff",
        border: "1px solid #fff",
        padding: "8px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 2,
        cursor: "pointer",
        textAlign: "center",
    }
}
