"use client"

// src/app/gamebook/PlayerSprite.tsx
//
// Sprite générique d'un personnage (joueur principal ou fantôme).
// Pixel art en CSS, 4 directions, 2 frames d'animation des jambes.

import type { Direction } from "@/lib/gamebook/mapEngine"

export default function PlayerSprite({
    direction,
    animStep,
    color,
}: {
    direction: Direction
    animStep: number
    color: string
}) {
    const skin = "#f8d8b0"
    const hair = "#382818"

    return (
        <div style={{ position: "relative", width: "85%", height: "85%" }}>
            {/* Tête */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: "20%",
                    width: "60%",
                    height: "45%",
                    background: skin,
                    border: "1px solid #000",
                }}
            >
                {/* Cheveux */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: "-5%",
                        right: "-5%",
                        height: "35%",
                        background: hair,
                        borderBottom: "1px solid #000",
                    }}
                />
                {/* Yeux selon direction */}
                {direction === "down" && (
                    <>
                        <div style={{ position: "absolute", top: "50%", left: "15%", width: "20%", height: "15%", background: "#000" }} />
                        <div style={{ position: "absolute", top: "50%", right: "15%", width: "20%", height: "15%", background: "#000" }} />
                    </>
                )}
                {direction === "up" && (
                    <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "45%", background: hair }} />
                )}
                {direction === "left" && (
                    <div style={{ position: "absolute", top: "50%", left: "10%", width: "25%", height: "15%", background: "#000" }} />
                )}
                {direction === "right" && (
                    <div style={{ position: "absolute", top: "50%", right: "10%", width: "25%", height: "15%", background: "#000" }} />
                )}
            </div>
            {/* Corps */}
            <div
                style={{
                    position: "absolute",
                    top: "42%",
                    left: "15%",
                    width: "70%",
                    height: "38%",
                    background: color,
                    border: "1px solid #000",
                }}
            />
            {/* Jambes */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: "20%",
                    width: "22%",
                    height: "22%",
                    background: "#202020",
                    transform: animStep === 0 ? "translateY(0)" : "translateY(-10%)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    right: "20%",
                    width: "22%",
                    height: "22%",
                    background: "#202020",
                    transform: animStep === 1 ? "translateY(0)" : "translateY(-10%)",
                }}
            />
        </div>
    )
}
