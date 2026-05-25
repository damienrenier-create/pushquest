"use client"

// src/app/gamebook/TileCell.tsx
//
// Rendu visuel d'une tuile de la carte. Pixel art en CSS pur.

import { TileType } from "@/lib/gamebook/mapEngine"

const C = {
    grass: "#7bb858",
    grassDark: "#5a9438",
    grassLight: "#a5d27a",
    path: "#e8d098",
    pathBorder: "#b08850",
    tree: "#3a7028",
    treeDark: "#1f4818",
    treeLight: "#6ba84b",
    water: "#5090d8",
    waterDark: "#306090",
    flower: "#e85858",
    flowerYellow: "#f8d048",
    door: "#603018",
    floorWood: "#e8c878",
    floorWoodDark: "#b09040",
    floorTile: "#f0e8c8",
    floorTileDark: "#a89858",
    rugRed: "#d84030",
    rugRedDark: "#883020",
    wall: "#f8e8b8",
    wallShade: "#c8a868",
    caveStone: "#787068",
    caveStoneDark: "#383028",
    caveFloor: "#a89888",
    caveFloorDark: "#605040",
    machine: "#5878d8",
    machineDark: "#283868",
    bench: "#603018",
    benchLight: "#a07040",
    table: "#8b6028",
    tableLight: "#c89858",
    chairBlue: "#4080d8",
    chairRed: "#d84050",
    bookshelf: "#603018",
    bookRed: "#d84040",
    bookBlue: "#3060c0",
    bookGreen: "#48a830",
    monsterSauce: "#d84030",
}

export default function TileCell({ tile, x, y }: { tile: TileType; x: number; y: number }) {
    // === EXTÉRIEUR ===
    if (tile === "grass") {
        const pattern = (x + y) % 3
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0, opacity: 0.5,
                    backgroundImage:
                        pattern === 0 ? `radial-gradient(circle at 50% 60%, ${C.grassDark} 1px, transparent 1.5px)`
                            : pattern === 1 ? `radial-gradient(circle at 30% 70%, ${C.grassLight} 1px, transparent 1.5px)`
                                : "none",
                    backgroundSize: "8px 8px",
                }} />
            </div>
        )
    }
    if (tile === "grassTall") {
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: `repeating-linear-gradient(45deg, ${C.grassDark} 0, ${C.grassDark} 2px, ${C.grass} 2px, ${C.grass} 5px)`,
                }} />
                <div style={{
                    position: "absolute", top: "10%", left: "20%", right: "20%", bottom: "30%",
                    background: C.grassDark,
                    clipPath: "polygon(0% 100%, 50% 0%, 100% 100%)",
                    opacity: 0.7,
                }} />
            </div>
        )
    }
    if (tile === "path") {
        return (
            <div style={{ position: "relative", background: C.path, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `radial-gradient(circle at 30% 30%, ${C.pathBorder} 0.5px, transparent 1px)`,
                    backgroundSize: "6px 6px", opacity: 0.4,
                }} />
            </div>
        )
    }
    if (tile === "water") {
        return (
            <div style={{ position: "relative", background: C.water, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: `repeating-linear-gradient(90deg, ${C.water} 0, ${C.water} 3px, ${C.waterDark} 3px, ${C.waterDark} 5px)`,
                }} />
            </div>
        )
    }
    if (tile === "tree") {
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0, background: C.tree,
                    borderRadius: "30% 30% 25% 25%",
                    boxShadow: `inset -2px -3px 0 ${C.treeDark}, inset 2px 2px 0 ${C.treeLight}`,
                }} />
            </div>
        )
    }
    if (tile === "fence") {
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", left: "10%", right: "10%", top: "30%", bottom: "30%",
                    background: C.path, border: `1px solid ${C.pathBorder}`,
                }} />
            </div>
        )
    }
    if (tile === "flowerR" || tile === "flowerY") {
        const color = tile === "flowerR" ? C.flower : C.flowerYellow
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: "20%",
                    background: color, borderRadius: "50%",
                    animation: "flowerSway 4s infinite ease-in-out",
                }}>
                    <div style={{ position: "absolute", top: "30%", left: "30%", width: "40%", height: "40%", background: "#fff", borderRadius: "50%" }} />
                </div>
            </div>
        )
    }

    // === ARBRE OBSTACLE (gros tronc tombé avec branches stylisées) ===
    if (tile === "treeObstacle") {
        return (
            <div style={{ position: "relative", background: C.path, overflow: "visible" }}>
                {/* Tronc principal horizontal (épais) */}
                <div style={{
                    position: "absolute", left: "-5%", right: "-5%", top: "22%", bottom: "22%",
                    background: "linear-gradient(180deg, #7a4220 0%, #5a2e10 50%, #3a1808 100%)",
                    border: "2px solid #1f0a04",
                    borderRadius: "4px",
                    boxShadow: "inset -2px -3px 0 #1f0a04, inset 2px 3px 0 #b88056, 0 2px 4px rgba(0,0,0,0.4)",
                }}>
                    {/* Anneaux de croissance (cernes du bois) */}
                    <div style={{ position: "absolute", top: "12%", bottom: "12%", left: "6%", width: "14%", border: "2px solid #2a1408", borderRadius: "50%", background: "#3a1f10" }} />
                    <div style={{ position: "absolute", top: "20%", bottom: "20%", left: "9%", width: "8%", border: "1px solid #1f0a04", borderRadius: "50%" }} />
                    {/* Anneaux côté droit */}
                    <div style={{ position: "absolute", top: "12%", bottom: "12%", right: "6%", width: "14%", border: "2px solid #2a1408", borderRadius: "50%", background: "#3a1f10" }} />
                    <div style={{ position: "absolute", top: "20%", bottom: "20%", right: "9%", width: "8%", border: "1px solid #1f0a04", borderRadius: "50%" }} />
                    {/* Texture écorce (lignes verticales) */}
                    <div style={{ position: "absolute", top: "10%", bottom: "10%", left: "30%", width: "2px", background: "#2a1408", opacity: 0.7 }} />
                    <div style={{ position: "absolute", top: "10%", bottom: "10%", left: "40%", width: "1px", background: "#2a1408", opacity: 0.5 }} />
                    <div style={{ position: "absolute", top: "10%", bottom: "10%", left: "55%", width: "2px", background: "#2a1408", opacity: 0.7 }} />
                    <div style={{ position: "absolute", top: "10%", bottom: "10%", left: "67%", width: "1px", background: "#2a1408", opacity: 0.5 }} />
                </div>
                {/* Petite branche feuillue qui dépasse en haut à droite */}
                <div style={{
                    position: "absolute", right: "8%", top: "5%",
                    width: "18%", height: "22%",
                    background: "radial-gradient(circle at 30% 30%, #5cb030, #2a7012)",
                    borderRadius: "60% 40% 70% 30%",
                    border: "1.5px solid #1a4008",
                    boxShadow: "inset -1px -2px 0 #1a4008",
                    transform: "rotate(-15deg)",
                }} />
                {/* Petite branche feuillue en bas à gauche */}
                <div style={{
                    position: "absolute", left: "6%", bottom: "5%",
                    width: "16%", height: "20%",
                    background: "radial-gradient(circle at 50% 30%, #6cc040, #2a7012)",
                    borderRadius: "40% 60% 30% 70%",
                    border: "1.5px solid #1a4008",
                    boxShadow: "inset 1px -2px 0 #1a4008",
                    transform: "rotate(10deg)",
                }} />
            </div>
        )
    }

    // === PLANCHES DU PONT ===
    if (tile === "bridgePlank") {
        return (
            <div style={{ position: "relative", background: "#8b6028", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 5px, #603018 5px, #603018 6px)",
                }} />
                {/* Bords du pont */}
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "10%", background: "#2a1408" }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "10%", background: "#2a1408" }} />
            </div>
        )
    }

    // === RAVIN (sous le pont) ===
    if (tile === "ravine") {
        return (
            <div style={{ position: "relative", background: "#202028", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `radial-gradient(circle at 30% 40%, #383848 1px, transparent 2px), radial-gradient(circle at 70% 70%, #383848 1px, transparent 2px)`,
                    backgroundSize: "6px 6px, 8px 8px",
                }} />
            </div>
        )
    }

    // === INTÉRIEUR — SOL ===
    if (tile === "floorWood") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `repeating-linear-gradient(0deg, transparent 0, transparent 8px, ${C.floorWoodDark} 8px, ${C.floorWoodDark} 9px)`,
                    opacity: 0.5,
                }} />
            </div>
        )
    }
    if (tile === "floorTile") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `linear-gradient(0deg, transparent 49%, ${C.floorTileDark} 49%, ${C.floorTileDark} 51%, transparent 51%), linear-gradient(90deg, transparent 49%, ${C.floorTileDark} 49%, ${C.floorTileDark} 51%, transparent 51%)`,
                    opacity: 0.6,
                }} />
            </div>
        )
    }
    if (tile === "rug") {
        return <div style={{ background: C.rugRed, border: `1px solid ${C.rugRedDark}` }} />
    }
    if (tile === "wallH" || tile === "wallV" || tile === "wallCorner") {
        return (
            <div style={{ position: "relative", background: C.wallShade, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `repeating-linear-gradient(0deg, ${C.wall} 0, ${C.wall} 4px, ${C.wallShade} 4px, ${C.wallShade} 5px)`,
                }} />
            </div>
        )
    }
    if (tile === "doorMat") {
        return (
            <div style={{
                position: "relative", background: C.door, border: "1px solid #000",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ fontSize: "8px", color: "#fff", fontWeight: "bold", animation: "gbBlink 1s infinite" }}>↓</div>
            </div>
        )
    }

    // === MACHINES MUSCU ===
    if (tile === "machineSquat") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: C.machine, border: `1px solid ${C.machineDark}` }}>
                    <div style={{ position: "absolute", top: "20%", left: "20%", right: "20%", height: "15%", background: C.machineDark }} />
                    <div style={{ position: "absolute", bottom: "20%", left: "20%", right: "20%", height: "15%", background: C.machineDark }} />
                    <div style={{ position: "absolute", top: "55%", left: "10%", right: "10%", textAlign: "center", color: "#fff", fontSize: "5px", fontWeight: "bold" }}>SQUAT</div>
                </div>
            </div>
        )
    }
    if (tile === "machinePushup") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "15%", background: C.bench, border: `1px solid ${C.machineDark}`, borderRadius: "4px" }}>
                    <div style={{ position: "absolute", top: "30%", left: "10%", right: "10%", height: "40%", background: C.benchLight }} />
                    <div style={{ position: "absolute", top: "75%", left: "5%", right: "5%", textAlign: "center", color: "#fff", fontSize: "5px", fontWeight: "bold" }}>POMPE</div>
                </div>
            </div>
        )
    }
    if (tile === "machinePullup") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "10%", height: "10%", background: C.machineDark }} />
                <div style={{ position: "absolute", left: "20%", top: "10%", bottom: "10%", width: "10%", background: C.machineDark }} />
                <div style={{ position: "absolute", right: "20%", top: "10%", bottom: "10%", width: "10%", background: C.machineDark }} />
                <div style={{ position: "absolute", bottom: "5%", left: "5%", right: "5%", textAlign: "center", color: C.machineDark, fontSize: "5px", fontWeight: "bold" }}>TRACT.</div>
            </div>
        )
    }
    if (tile === "machineCardio") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: "#333", border: "1px solid #000", borderRadius: "3px" }}>
                    <div style={{ position: "absolute", top: "10%", left: "10%", right: "10%", height: "25%", background: C.machine }} />
                    <div style={{ position: "absolute", top: "40%", left: "10%", right: "10%", bottom: "30%", background: "#222" }} />
                    <div style={{ position: "absolute", bottom: "10%", left: "5%", right: "5%", textAlign: "center", color: "#fff", fontSize: "5px", fontWeight: "bold" }}>CARDIO</div>
                </div>
            </div>
        )
    }
    if (tile === "machineGainage") {
        return (
            <div style={{ position: "relative", background: C.floorWood, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "10%", right: "10%", top: "30%", bottom: "30%", background: C.benchLight, border: `1px solid ${C.bench}`, borderRadius: "8px" }}>
                    <div style={{ position: "absolute", top: "30%", left: "5%", right: "5%", textAlign: "center", color: C.bench, fontSize: "5px", fontWeight: "bold" }}>GAIN.</div>
                </div>
            </div>
        )
    }

    // === CASINO ===
    if (tile === "table") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: C.table, border: "1px solid #000", borderRadius: "2px" }}>
                    <div style={{ position: "absolute", inset: "20%", background: C.tableLight }} />
                </div>
            </div>
        )
    }
    if (tile === "chairBlueUp" || tile === "chairBlueDown" || tile === "chairRedUp" || tile === "chairRedDown") {
        const isBlue = tile.includes("Blue")
        const isUp = tile.includes("Up")
        const color = isBlue ? C.chairBlue : C.chairRed
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", left: "25%", right: "25%",
                    top: isUp ? "10%" : "30%", bottom: isUp ? "30%" : "10%",
                    background: color, border: "1px solid #000", borderRadius: "3px",
                }} />
            </div>
        )
    }
    if (tile === "slotMachine") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: "#c83838", border: "1px solid #000", borderRadius: "3px" }}>
                    <div style={{ position: "absolute", top: "15%", left: "15%", right: "15%", height: "30%", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: "100%", fontSize: "6px" }}>
                            <span>7</span><span>7</span><span>7</span>
                        </div>
                    </div>
                    <div style={{ position: "absolute", bottom: "20%", left: "30%", right: "30%", height: "15%", background: "#fc0" }} />
                </div>
            </div>
        )
    }
    if (tile === "rouletteWheel") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: "#000", borderRadius: "50%" }}>
                    <div style={{ position: "absolute", inset: "15%", background: "#c83838", borderRadius: "50%" }}>
                        <div style={{ position: "absolute", inset: "30%", background: "#000", borderRadius: "50%" }} />
                    </div>
                </div>
            </div>
        )
    }

    // === GROTTE ===
    if (tile === "caveWall") {
        return (
            <div style={{ position: "relative", background: C.caveStoneDark, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `radial-gradient(circle at 30% 40%, ${C.caveStone} 2px, transparent 3px), radial-gradient(circle at 70% 70%, ${C.caveStone} 2px, transparent 3px)`,
                    backgroundSize: "8px 8px, 12px 12px",
                }} />
            </div>
        )
    }
    if (tile === "caveFloor") {
        return (
            <div style={{ position: "relative", background: C.caveFloor, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `radial-gradient(circle at 50% 50%, ${C.caveFloorDark} 0.5px, transparent 1px)`,
                    backgroundSize: "6px 6px", opacity: 0.4,
                }} />
            </div>
        )
    }
    if (tile === "bookshelf") {
        return (
            <div style={{ position: "relative", background: C.caveFloor, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: C.bookshelf, border: "1px solid #000" }}>
                    <div style={{ display: "flex", height: "100%", padding: "10%", gap: "1px" }}>
                        <div style={{ flex: 1, background: C.bookRed }} />
                        <div style={{ flex: 1, background: C.bookBlue }} />
                        <div style={{ flex: 1, background: C.bookGreen }} />
                    </div>
                </div>
            </div>
        )
    }
    // v3.18 — Statue décorative (Bibliothèque)
    if (tile === "statue") {
        return (
            <div style={{ position: "relative", background: "#d8c8a0", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "20%", right: "20%", bottom: "5%", height: "20%", background: "#a89060", border: "1px solid #604020" }} />
                <div style={{ position: "absolute", left: "30%", right: "30%", top: "30%", bottom: "25%", background: "#c8b890", border: "1px solid #604020" }} />
                <div style={{ position: "absolute", left: "35%", right: "35%", top: "12%", height: "22%", background: "#d8c8a0", border: "1px solid #604020", borderRadius: "40% 40% 30% 30%" }} />
            </div>
        )
    }
    // v3.17c — Tableau accroché au mur (Tour des Pâtes Aiguës)
    if (tile === "painting") {
        return (
            <div style={{ position: "relative", background: "#5a5a6a", overflow: "hidden" }}>
                {/* Cadre doré */}
                <div style={{ position: "absolute", inset: "12%", background: "#c8a050", border: "1px solid #604020", boxShadow: "0 2px 0 #4a2818" }}>
                    {/* Toile sépia */}
                    <div style={{ position: "absolute", inset: "10%", background: "#f0d8a8", border: "1px solid #604020" }}>
                        {/* Silhouette générique (tête + buste) */}
                        <div style={{ position: "absolute", left: "35%", right: "35%", top: "15%", height: "25%", background: "#7a5028", borderRadius: "40% 40% 30% 30%" }} />
                        <div style={{ position: "absolute", left: "25%", right: "25%", top: "40%", bottom: "20%", background: "#7a5028" }} />
                    </div>
                </div>
            </div>
        )
    }
    // v3.21.1 — Plante en pot (Vétérinaire)
    if (tile === "plant") {
        return (
            <div style={{ position: "relative", background: "#f0e0c0", overflow: "hidden" }}>
                {/* Pot */}
                <div style={{ position: "absolute", left: "28%", right: "28%", bottom: "10%", height: "30%", background: "#a05028", border: "1px solid #604018", borderRadius: "4px 4px 8px 8px" }} />
                {/* Feuillage */}
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "10%", height: "55%", background: "#3a8038", border: "1px solid #1a4818", borderRadius: "50% 50% 30% 30%" }} />
                <div style={{ position: "absolute", left: "32%", right: "32%", top: "6%", height: "30%", background: "#5aa838", border: "1px solid #1a4818", borderRadius: "50%" }} />
            </div>
        )
    }
    // v3.21.1 — Sac de croquettes (Vétérinaire)
    if (tile === "foodBag") {
        return (
            <div style={{ position: "relative", background: "#f0e0c0", overflow: "hidden" }}>
                {/* Sac brun */}
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "20%", bottom: "10%", background: "#8a5028", border: "1px solid #4a2818", borderRadius: "10% 10% 4px 4px" }}>
                    {/* Bande étiquette */}
                    <div style={{ position: "absolute", left: "5%", right: "5%", top: "30%", height: "20%", background: "#c8a050", border: "1px solid #604020" }} />
                    {/* Petits emojis croquettes */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "5%", fontSize: "55%", color: "#000" }}>
                        🥩
                    </div>
                </div>
            </div>
        )
    }
    // v3.21.1 — Cage d'animal (Vétérinaire)
    if (tile === "animalCage") {
        return (
            <div style={{ position: "relative", background: "#e8d8b8", overflow: "hidden", border: "1px solid #604020" }}>
                {/* Cage métallique : barres verticales */}
                <div style={{ position: "absolute", inset: "8%", background: "#404048", borderRadius: 2 }}>
                    {/* Fond intérieur */}
                    <div style={{ position: "absolute", inset: "10%", background: "#806848", borderRadius: 1 }} />
                    {/* Barres */}
                    <div style={{ position: "absolute", inset: "10%", display: "flex", justifyContent: "space-around" }}>
                        <div style={{ width: "8%", background: "#606870", borderRadius: 1 }} />
                        <div style={{ width: "8%", background: "#606870", borderRadius: 1 }} />
                        <div style={{ width: "8%", background: "#606870", borderRadius: 1 }} />
                        <div style={{ width: "8%", background: "#606870", borderRadius: 1 }} />
                    </div>
                    {/* Petit emoji animal centré */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "60%", lineHeight: 1, pointerEvents: "none" }}>
                        🐾
                    </div>
                </div>
            </div>
        )
    }
    // v3.18 — Pupitre de lecture (Bibliothèque)
    if (tile === "lectern") {
        return (
            <div style={{ position: "relative", background: "#f0e0c0", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "45%", right: "45%", top: "30%", bottom: "5%", background: "#8a5028", border: "1px solid #4a2818" }} />
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "20%", height: "20%", background: "#a86838", border: "1px solid #4a2818" }} />
                <div style={{ position: "absolute", left: "28%", right: "28%", top: "23%", height: "12%", background: "#f8f0d8", border: "1px solid #8a5028" }} />
            </div>
        )
    }
    if (tile === "potion") {
        return (
            <div style={{ position: "relative", background: C.caveFloor, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "25%", background: "#4080d8", borderRadius: "20% 20% 50% 50%", border: "1px solid #000" }}>
                    <div style={{ position: "absolute", top: "-15%", left: "30%", right: "30%", height: "20%", background: "#603018", border: "1px solid #000" }} />
                </div>
            </div>
        )
    }
    if (tile === "monsterDesk") {
        return (
            <div style={{ position: "relative", background: C.caveFloor, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "10%", background: C.table, border: "1px solid #000" }}>
                    <div style={{ position: "absolute", top: "20%", left: "20%", width: "25%", height: "25%", background: "#fff" }} />
                    <div style={{ position: "absolute", top: "55%", left: "55%", width: "20%", height: "20%", background: C.monsterSauce, borderRadius: "50%" }} />
                </div>
            </div>
        )
    }

    // === v3.8 : SHOP DE PÉPITEVILLE ===
    if (tile === "shopShelf") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "5% 5% 20% 5%", background: C.bookshelf, border: "1px solid #000" }}>
                    <div style={{ display: "flex", height: "100%", padding: "8%", gap: "1px" }}>
                        <div style={{ flex: 1, background: "#d04040" }} />
                        <div style={{ flex: 1, background: "#48a830" }} />
                        <div style={{ flex: 1, background: "#3060c0" }} />
                        <div style={{ flex: 1, background: "#f8d048" }} />
                    </div>
                </div>
            </div>
        )
    }
    if (tile === "shopCounter") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", left: 0, right: 0, top: "20%", bottom: "20%",
                    background: C.table, border: "1px solid #000",
                }}>
                    <div style={{
                        position: "absolute", inset: "15%",
                        background: C.tableLight,
                        backgroundImage: "linear-gradient(0deg, transparent 49%, #604020 49%, #604020 51%, transparent 51%)",
                    }} />
                </div>
            </div>
        )
    }
    if (tile === "floorChecker") {
        return (
            <div style={{ position: "relative", background: C.floorTile, overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `linear-gradient(45deg, ${C.floorTileDark} 25%, transparent 25%, transparent 75%, ${C.floorTileDark} 75%), linear-gradient(45deg, ${C.floorTileDark} 25%, transparent 25%, transparent 75%, ${C.floorTileDark} 75%)`,
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 8px 8px",
                    opacity: 0.4,
                }} />
            </div>
        )
    }

    // === v3.8.2 : TOUR DES PÂTES AIGUËS ===
    if (tile === "towerWall") {
        return (
            <div style={{ position: "relative", background: "#5a5a6a", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage:
                        `linear-gradient(0deg, transparent 49%, #3a3a48 49%, #3a3a48 51%, transparent 51%), ` +
                        `linear-gradient(90deg, transparent 49%, #3a3a48 49%, #3a3a48 51%, transparent 51%)`,
                    backgroundSize: "12px 8px",
                    opacity: 0.7,
                }} />
                {/* Léger highlight haut-gauche */}
                <div style={{
                    position: "absolute", left: 0, top: 0, width: "30%", height: "30%",
                    background: "rgba(255,255,255,0.08)",
                }} />
            </div>
        )
    }
    if (tile === "towerFloor") {
        return (
            <div style={{ position: "relative", background: "#9a9088", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage:
                        `linear-gradient(0deg, transparent 48%, #786a60 48%, #786a60 52%, transparent 52%), ` +
                        `linear-gradient(90deg, transparent 48%, #786a60 48%, #786a60 52%, transparent 52%)`,
                    backgroundSize: "16px 16px",
                    opacity: 0.4,
                }} />
            </div>
        )
    }
    if (tile === "towerWindow") {
        return (
            <div style={{ position: "relative", background: "#5a5a6a", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: "20% 25% 40% 25%",
                    background: "linear-gradient(180deg, #88c8f0 0%, #5090d8 100%)",
                    border: "2px solid #3a3a48",
                    borderRadius: "50% 50% 0 0",
                }}>
                    {/* Croix de la fenêtre */}
                    <div style={{ position: "absolute", top: "0", bottom: "0", left: "48%", right: "48%", background: "#3a3a48" }} />
                    <div style={{ position: "absolute", left: "10%", right: "10%", top: "48%", bottom: "48%", background: "#3a3a48" }} />
                </div>
            </div>
        )
    }
    if (tile === "stairsUp") {
        return (
            <div style={{ position: "relative", background: "#9a9088", overflow: "hidden" }}>
                {/* Marches qui montent (perspective Pokémon) */}
                <div style={{ position: "absolute", left: "10%", right: "10%", top: "60%", bottom: "5%", background: "#786a60", border: "1px solid #483a30" }} />
                <div style={{ position: "absolute", left: "15%", right: "15%", top: "40%", height: "20%", background: "#8a7a70", border: "1px solid #483a30" }} />
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "20%", height: "20%", background: "#9a8a80", border: "1px solid #483a30" }} />
                {/* Flèche montante */}
                <div style={{
                    position: "absolute", top: "5%", left: 0, right: 0,
                    textAlign: "center", color: "#fff", fontSize: "10px", fontWeight: "bold",
                    textShadow: "0 0 2px #000",
                    animation: "gbBlink 1s infinite",
                }}>↑</div>
            </div>
        )
    }
    if (tile === "stairsDown") {
        return (
            <div style={{ position: "relative", background: "#9a9088", overflow: "hidden" }}>
                {/* Marches qui descendent (inversées) */}
                <div style={{ position: "absolute", left: "10%", right: "10%", top: "5%", bottom: "60%", background: "#5a4a40", border: "1px solid #2a1810" }} />
                <div style={{ position: "absolute", left: "15%", right: "15%", top: "40%", height: "20%", background: "#6a5a50", border: "1px solid #2a1810" }} />
                <div style={{ position: "absolute", left: "20%", right: "20%", top: "60%", height: "20%", background: "#7a6a60", border: "1px solid #2a1810" }} />
                {/* Flèche descendante */}
                <div style={{
                    position: "absolute", bottom: "5%", left: 0, right: 0,
                    textAlign: "center", color: "#fff", fontSize: "10px", fontWeight: "bold",
                    textShadow: "0 0 2px #000",
                    animation: "gbBlink 1s infinite",
                }}>↓</div>
            </div>
        )
    }

    // === v3.12 : WATERSHALLOW (canal traversable, bleu clair avec vaguelettes) ===
    if (tile === "waterShallow") {
        return (
            <div style={{ position: "relative", background: "#7cc0e8", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage:
                        `repeating-linear-gradient(90deg, #7cc0e8 0, #7cc0e8 3px, #a8d8f0 3px, #a8d8f0 5px)`,
                    opacity: 0.85,
                }} />
                {/* Petites vagues qui ondulent */}
                <div style={{
                    position: "absolute", top: "30%", left: "20%",
                    width: "20%", height: "4px",
                    background: "rgba(255,255,255,0.5)",
                    borderRadius: "50%",
                }} />
                <div style={{
                    position: "absolute", top: "65%", left: "55%",
                    width: "18%", height: "3px",
                    background: "rgba(255,255,255,0.4)",
                    borderRadius: "50%",
                }} />
            </div>
        )
    }

    // === v3.12 : SAND (plage de Macaron'île) ===
    if (tile === "sand") {
        return (
            <div style={{ position: "relative", background: "#f0d8a0", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage:
                        `radial-gradient(circle at 30% 30%, #d8b878 0.5px, transparent 1px), ` +
                        `radial-gradient(circle at 70% 70%, #b89858 0.5px, transparent 1px)`,
                    backgroundSize: "6px 6px, 8px 8px",
                    opacity: 0.5,
                }} />
            </div>
        )
    }

    // === v3.8.1 : ARBRE FRUITIER (cueillette avec A) ===
    if (tile === "appleTree" || tile === "appleTreeEmpty") {
        const harvested = tile === "appleTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                {/* Feuillage (plus pâle si déjà cueilli) */}
                <div style={{
                    position: "absolute", inset: "8% 5% 25% 5%",
                    background: harvested
                        ? `radial-gradient(circle at 50% 40%, ${C.treeDark} 0%, ${C.tree} 60%, ${C.treeDark} 100%)`
                        : `radial-gradient(circle at 50% 40%, ${C.treeLight} 0%, ${C.tree} 60%, ${C.treeDark} 100%)`,
                    borderRadius: "50% 50% 45% 45%",
                    boxShadow: `inset -2px -3px 0 ${C.treeDark}, inset 2px 2px 0 ${C.treeLight}`,
                    opacity: harvested ? 0.7 : 1,
                }}>
                    {/* Fruits rouges affichés uniquement si l'arbre n'est pas cueilli */}
                    {!harvested && (
                        <>
                            <div style={{
                                position: "absolute", top: "30%", left: "20%", width: "16%", height: "16%",
                                background: "#d83030", borderRadius: "50%",
                                boxShadow: "inset -1px -1px 0 #802020, inset 1px 1px 0 #f06868",
                            }} />
                            <div style={{
                                position: "absolute", top: "20%", left: "55%", width: "16%", height: "16%",
                                background: "#d83030", borderRadius: "50%",
                                boxShadow: "inset -1px -1px 0 #802020, inset 1px 1px 0 #f06868",
                            }} />
                            <div style={{
                                position: "absolute", top: "55%", left: "40%", width: "16%", height: "16%",
                                background: "#d83030", borderRadius: "50%",
                                boxShadow: "inset -1px -1px 0 #802020, inset 1px 1px 0 #f06868",
                            }} />
                        </>
                    )}
                </div>
                {/* Tronc */}
                <div style={{
                    position: "absolute", left: "42%", right: "42%", top: "65%", bottom: "5%",
                    background: "linear-gradient(180deg, #7a4220 0%, #5a2e10 100%)",
                    border: "1px solid #1f0a04",
                }} />
            </div>
        )
    }

    // === v3.23d : CERISIER 🍒 — feuillage rose pâle + cerises rouge-vif en paires ===
    if (tile === "cherryTree" || tile === "cherryTreeEmpty") {
        const harvested = tile === "cherryTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                <div style={{
                    position: "absolute", inset: "10% 8% 25% 8%",
                    background: harvested
                        ? `radial-gradient(circle at 50% 40%, #6a8848 0%, #486828 60%, #2a4818 100%)`
                        : `radial-gradient(circle at 50% 40%, #b8e088 0%, #88c058 60%, #486828 100%)`,
                    borderRadius: "50% 50% 50% 50%",
                    boxShadow: "inset -2px -3px 0 #2a4818, inset 2px 2px 0 #c8f098",
                    opacity: harvested ? 0.65 : 1,
                }}>
                    {!harvested && (
                        <>
                            {/* Paire de cerises 1 */}
                            <div style={{ position: "absolute", top: "35%", left: "22%", width: "12%", height: "12%", background: "#d8203c", borderRadius: "50%", boxShadow: "inset -1px -1px 0 #801020" }} />
                            <div style={{ position: "absolute", top: "42%", left: "31%", width: "12%", height: "12%", background: "#d8203c", borderRadius: "50%", boxShadow: "inset -1px -1px 0 #801020" }} />
                            {/* Paire de cerises 2 */}
                            <div style={{ position: "absolute", top: "30%", left: "58%", width: "12%", height: "12%", background: "#d8203c", borderRadius: "50%", boxShadow: "inset -1px -1px 0 #801020" }} />
                            <div style={{ position: "absolute", top: "37%", left: "67%", width: "12%", height: "12%", background: "#d8203c", borderRadius: "50%", boxShadow: "inset -1px -1px 0 #801020" }} />
                        </>
                    )}
                </div>
                <div style={{ position: "absolute", left: "44%", right: "44%", top: "65%", bottom: "5%", background: "linear-gradient(180deg, #8a5230 0%, #5a3818 100%)", border: "1px solid #1f0a04" }} />
            </div>
        )
    }

    // === v3.23d : POIRIER 🍐 — feuillage vert moyen + poires jaune-vert allongées ===
    if (tile === "pearTree" || tile === "pearTreeEmpty") {
        const harvested = tile === "pearTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                <div style={{
                    position: "absolute", inset: "8% 5% 25% 5%",
                    background: harvested
                        ? `radial-gradient(circle at 50% 40%, #486828 0%, #305020 60%, #1a3010 100%)`
                        : `radial-gradient(circle at 50% 40%, #88b048 0%, #587828 60%, #305020 100%)`,
                    borderRadius: "50% 50% 45% 45%",
                    boxShadow: "inset -2px -3px 0 #1a3010, inset 2px 2px 0 #98c058",
                    opacity: harvested ? 0.7 : 1,
                }}>
                    {!harvested && (
                        <>
                            {/* Poire 1 (ovale, jaune-vert) */}
                            <div style={{ position: "absolute", top: "30%", left: "25%", width: "13%", height: "20%", background: "#d8c848", borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%", boxShadow: "inset -1px -1px 0 #807820" }} />
                            {/* Poire 2 */}
                            <div style={{ position: "absolute", top: "25%", left: "55%", width: "13%", height: "20%", background: "#d8c848", borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%", boxShadow: "inset -1px -1px 0 #807820" }} />
                            {/* Poire 3 */}
                            <div style={{ position: "absolute", top: "50%", left: "42%", width: "13%", height: "20%", background: "#d8c848", borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%", boxShadow: "inset -1px -1px 0 #807820" }} />
                        </>
                    )}
                </div>
                <div style={{ position: "absolute", left: "42%", right: "42%", top: "65%", bottom: "5%", background: "linear-gradient(180deg, #7a4220 0%, #5a2e10 100%)", border: "1px solid #1f0a04" }} />
            </div>
        )
    }

    // === v3.23d : PÊCHER 🍑 — feuillage vert tendre + pêches roses-orangées ===
    if (tile === "peachTree" || tile === "peachTreeEmpty") {
        const harvested = tile === "peachTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                <div style={{
                    position: "absolute", inset: "8% 5% 25% 5%",
                    background: harvested
                        ? `radial-gradient(circle at 50% 40%, #587838 0%, #406028 60%, #284018 100%)`
                        : `radial-gradient(circle at 50% 40%, #a8d878 0%, #78a838 60%, #406028 100%)`,
                    borderRadius: "50% 50% 50% 45%",
                    boxShadow: "inset -2px -3px 0 #284018, inset 2px 2px 0 #b8e898",
                    opacity: harvested ? 0.7 : 1,
                }}>
                    {!harvested && (
                        <>
                            {/* Pêche 1 (gros fruit rose-orange) */}
                            <div style={{ position: "absolute", top: "28%", left: "20%", width: "18%", height: "18%", background: "radial-gradient(circle at 35% 35%, #f8a868 30%, #d86848 100%)", borderRadius: "50%", boxShadow: "inset -2px -2px 0 #983020" }} />
                            {/* Pêche 2 */}
                            <div style={{ position: "absolute", top: "20%", left: "55%", width: "18%", height: "18%", background: "radial-gradient(circle at 35% 35%, #f8a868 30%, #d86848 100%)", borderRadius: "50%", boxShadow: "inset -2px -2px 0 #983020" }} />
                            {/* Pêche 3 */}
                            <div style={{ position: "absolute", top: "52%", left: "38%", width: "18%", height: "18%", background: "radial-gradient(circle at 35% 35%, #f8a868 30%, #d86848 100%)", borderRadius: "50%", boxShadow: "inset -2px -2px 0 #983020" }} />
                        </>
                    )}
                </div>
                <div style={{ position: "absolute", left: "42%", right: "42%", top: "65%", bottom: "5%", background: "linear-gradient(180deg, #7a4220 0%, #5a2e10 100%)", border: "1px solid #1f0a04" }} />
            </div>
        )
    }

    // === v3.23d : MALÉFICA 💀 — feuillage violet/noir tordu + fruits violets fluo (PIÈGE -30 reps) ===
    if (tile === "poisonTree" || tile === "poisonTreeEmpty") {
        const harvested = tile === "poisonTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                {/* Feuillage anguleux violet sombre (forme irrégulière, pas ronde) */}
                <div style={{
                    position: "absolute", inset: "5% 8% 28% 8%",
                    background: harvested
                        ? `radial-gradient(circle at 50% 40%, #382048 0%, #1e1030 60%, #0a0418 100%)`
                        : `radial-gradient(circle at 50% 40%, #682898 0%, #3a1058 60%, #1e0830 100%)`,
                    borderRadius: "20% 60% 30% 50% / 40% 30% 60% 50%",
                    boxShadow: "inset -2px -3px 0 #0a0418, inset 2px 2px 0 #8838b8, 0 0 6px rgba(120, 40, 180, 0.5)",
                    opacity: harvested ? 0.6 : 1,
                    filter: harvested ? "saturate(0.4)" : "saturate(1.2)",
                }}>
                    {!harvested && (
                        <>
                            {/* 3 fruits violet fluo avec halo glow toxique */}
                            <div style={{
                                position: "absolute", top: "30%", left: "22%", width: "18%", height: "18%",
                                background: "radial-gradient(circle at 35% 35%, #d868f8 30%, #6a18a8 100%)",
                                borderRadius: "50%",
                                boxShadow: "0 0 6px rgba(216, 104, 248, 0.9), inset -1px -1px 0 #3a0858",
                            }} />
                            <div style={{
                                position: "absolute", top: "22%", left: "55%", width: "18%", height: "18%",
                                background: "radial-gradient(circle at 35% 35%, #d868f8 30%, #6a18a8 100%)",
                                borderRadius: "50%",
                                boxShadow: "0 0 6px rgba(216, 104, 248, 0.9), inset -1px -1px 0 #3a0858",
                            }} />
                            <div style={{
                                position: "absolute", top: "50%", left: "40%", width: "18%", height: "18%",
                                background: "radial-gradient(circle at 35% 35%, #d868f8 30%, #6a18a8 100%)",
                                borderRadius: "50%",
                                boxShadow: "0 0 6px rgba(216, 104, 248, 0.9), inset -1px -1px 0 #3a0858",
                            }} />
                        </>
                    )}
                </div>
                {/* Tronc tordu noir avec veines violettes */}
                <div style={{
                    position: "absolute", left: "42%", right: "42%", top: "65%", bottom: "5%",
                    background: "linear-gradient(180deg, #2a1838 0%, #0a0418 100%)",
                    border: "1px solid #6818a8",
                    boxShadow: "inset -1px 0 0 #4a1868",
                }} />
            </div>
        )
    }

    // === v3.23d : COCOTIER 🥥 — tronc long + palmes en éventail + noix de coco ===
    if (tile === "coconutTree" || tile === "coconutTreeEmpty") {
        const harvested = tile === "coconutTreeEmpty"
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                {/* Palmes (4 feuilles arquées) */}
                <div style={{ position: "absolute", top: "5%", left: "0%", width: "55%", height: "30%", background: harvested ? "#3a5818" : "#588038", borderRadius: "100% 0 0 0", transform: "rotate(-15deg)", opacity: harvested ? 0.6 : 1, boxShadow: "inset -2px -1px 0 #2a3810" }} />
                <div style={{ position: "absolute", top: "5%", right: "0%", width: "55%", height: "30%", background: harvested ? "#3a5818" : "#588038", borderRadius: "0 100% 0 0", transform: "rotate(15deg)", opacity: harvested ? 0.6 : 1, boxShadow: "inset 2px -1px 0 #2a3810" }} />
                <div style={{ position: "absolute", top: "10%", left: "5%", width: "55%", height: "25%", background: harvested ? "#4a6828" : "#689048", borderRadius: "100% 0 0 100%", transform: "rotate(-30deg)", opacity: harvested ? 0.6 : 1 }} />
                <div style={{ position: "absolute", top: "10%", right: "5%", width: "55%", height: "25%", background: harvested ? "#4a6828" : "#689048", borderRadius: "0 100% 100% 0", transform: "rotate(30deg)", opacity: harvested ? 0.6 : 1 }} />
                {/* Cluster de noix de coco au centre */}
                {!harvested && (
                    <>
                        <div style={{ position: "absolute", top: "30%", left: "38%", width: "14%", height: "14%", background: "#8a5028", borderRadius: "50%", boxShadow: "inset -1px -2px 0 #4a2810, inset 2px 2px 0 #b87038" }} />
                        <div style={{ position: "absolute", top: "32%", left: "50%", width: "14%", height: "14%", background: "#8a5028", borderRadius: "50%", boxShadow: "inset -1px -2px 0 #4a2810, inset 2px 2px 0 #b87038" }} />
                    </>
                )}
                {/* Tronc long incliné */}
                <div style={{ position: "absolute", left: "44%", right: "44%", top: "32%", bottom: "0%", background: "linear-gradient(180deg, #a87440 0%, #6a4020 100%)", border: "1px solid #2a1808", borderRadius: "0 0 30% 30%" }} />
            </div>
        )
    }

    return <div style={{ background: C.grass }} />
}
