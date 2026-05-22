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

    // === v3.8.1 : ARBRE FRUITIER (cueillette avec A) ===
    if (tile === "appleTree") {
        return (
            <div style={{ position: "relative", background: C.grass, overflow: "visible" }}>
                {/* Feuillage (similaire à tree mais plus arrondi et plus clair) */}
                <div style={{
                    position: "absolute", inset: "8% 5% 25% 5%",
                    background: `radial-gradient(circle at 50% 40%, ${C.treeLight} 0%, ${C.tree} 60%, ${C.treeDark} 100%)`,
                    borderRadius: "50% 50% 45% 45%",
                    boxShadow: `inset -2px -3px 0 ${C.treeDark}, inset 2px 2px 0 ${C.treeLight}`,
                }}>
                    {/* Fruits rouges (3 pommes visibles) */}
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

    return <div style={{ background: C.grass }} />
}
