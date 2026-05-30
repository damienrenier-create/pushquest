// Nexus II "jaune éclair" — registre des PNJ de la suite narrative.
//
// Convention : tous les ids commencent par `y_` pour éviter toute collision
// avec les PNJ v3 (gym_guy, tb_videur, pere_pesto, etc.).
//
// Phase scaffolding : un seul PNJ "ARCHITECTE" qui annonce que la suite est en
// construction. Il prouve uniquement que le rendu de PNJ fonctionne dans la map
// yellow_entrance.

import type { NpcDefinition } from "@/lib/gamebook/npcs"
import { YELLOW_ENTRANCE_MAP_ID } from "./featureFlag"

export const YELLOW_NPCS: NpcDefinition[] = [
    {
        id: "y_architecte",
        name: "ARCHITECTE",
        mapId: YELLOW_ENTRANCE_MAP_ID,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "👷", color: "#f0c020" },
        initialX: 4,
        initialY: 3,
        dialoguesAfter: [
            "*L'Architecte te regarde, sourire en coin.*",
            "Tu as battu Il Capo. Bravo.",
            "Mais ce que tu croyais être la fin n'était qu'une porte.",
            "🚧 NEXUS II — JAUNE ÉCLAIR : en construction.",
            "Reviens bientôt. Le foudre gronde déjà au loin.",
        ],
    },
]
