// CODEGEN — lit le scratch run3-bosses.json (5 équipes gelées curées) → écrit src/.../data/run3Bosses.ts.
import { readFileSync, writeFileSync } from "fs"
const IN = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/run3-bosses.json"
const OUT = "src/lib/gamebook/yellow/data/run3Bosses.ts"

const data = JSON.parse(readFileSync(IN, "utf8")) as Record<string, { nickname: string; team: unknown[] }>
const ORDER = ["plante", "roche", "feu", "elec", "eau"]
const ordered: Record<string, { nickname: string; team: unknown[] }> = {}
for (const k of ORDER) if (data[k]) ordered[k] = data[k]

const body = `// src/lib/gamebook/yellow/data/run3Bosses.ts
//
// Nexus Jaune Éclair — RUN 3 : CURATION FIGÉE des 5 boss d'arène. 5 vraies équipes de joueurs (une par arène,
// des potes différents), extraites une fois de la table ArenaChampion et GELÉES ici → IDENTIQUES POUR TOUS
// les concurrents (indispensable : le score = Σ des niveaux des Pokémon vaincus, donc tout le monde doit
// affronter exactement les mêmes boss). Format = ChampionMon (comme le Hall of Fame) → fielded pareil.
// GÉNÉRÉ par scripts/_gen-run3-bosses.ts — ne pas éditer à la main.
import type { ChampionMon } from "../storage/save"

export interface Run3Boss { nickname: string; team: ChampionMon[] }

/** Boss FIGÉ de chaque arène, par slot badge (plante=arène1 … eau=arène5). */
export const RUN3_BOSS_TEAMS: Record<string, Run3Boss> = ${JSON.stringify(ordered, null, 4)}

/** Boss figé d'une arène (par slot badge), ou null. */
export function run3BossFor(badge: string): Run3Boss | null {
    return RUN3_BOSS_TEAMS[badge] ?? null
}

/** Somme des niveaux de tous les Daemons d'un boss (contribution max au score si on le vainc en entier). */
export function run3BossLevelSum(badge: string): number {
    return (RUN3_BOSS_TEAMS[badge]?.team ?? []).reduce((a, m) => a + (m.level ?? 0), 0)
}
`
writeFileSync(OUT, body)
console.log(`✅ Écrit ${OUT}\n   ${Object.keys(ordered).map((k) => `${k}:${ordered[k].nickname}(${ordered[k].team.length})`).join("  ")}`)
