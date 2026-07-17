import { readFileSync, writeFileSync } from "node:fs"
const pool = JSON.parse(readFileSync("scripts/_pool-resolved.json", "utf8"))

// FIX légalité : gloutanoir ne peut pas apprendre spores_dodo (sommeil) → toxik (CT05 POISON, légale) : idéal pour un mur draineur/stall.
for (const t of pool) for (const m of t.mons) if (m.speciesId === "gloutanoir") m.moveIds = m.moveIds.map((x:string)=>x==="spores_dodo"?"toxik":x)

const q = (s:string)=>JSON.stringify(s)
const monLine = (m:any) => {
  const held = m.heldItemId ? `, heldItemId: ${q(m.heldItemId)}` : ""
  return `        { speciesId: ${q(m.speciesId)}, moveIds: [${m.moveIds.map(q).join(", ")}]${held} },`
}
const teamBlock = (t:any, i:number) => {
  return `    { // T${String(i+1).padStart(2,"0")}\n        archetype: ${q(t.archetype)},\n        identity: ${q(t.identity)},\n        mons: [\n${t.mons.map(monLine).join("\n")}\n        ],\n    },`
}

const header = `// src/lib/gamebook/yellow/frontier/danTeams.ts
//
// VOIE DU MAÎTRE — les 12 équipes DÉSIGNÉES des tournois de dan (post-Maître du Dôme). 72 Daemons finaux
// DISTINCTS, movesets 100 % LÉGAUX (learnset ou CT via canLearnCt), objets tenus inclus. Généré + audité, puis
// codifié depuis l'artefact validé (« c'est parfait ! »). PUR (data only) — le niveau, les points Saiyan, l'EV
// et le shiny sont appliqués EN AVAL par le GRADE du dan (cf. domeBudgets), ce fichier ne fixe QUE la composition.
// Chaque dan tire ses adversaires dans ce pool ; le grade (1er→4e) = curseur de difficulté (Saiyan/shiny croissants).

export interface DanTeamMon {
    speciesId: string
    moveIds: string[]
    heldItemId?: string
}
export interface DanTeam {
    archetype: string
    identity: string
    mons: DanTeamMon[]
}

/** Les 12 équipes désignées (T01→T12). Réservoir commun à TOUS les grades de dan. */
export const DAN_POOL: readonly DanTeam[] = [
${pool.map(teamBlock).join("\n")}
] as const
`
writeFileSync("src/lib/gamebook/yellow/frontier/danTeams.ts", header)
console.log("danTeams.ts écrit :", pool.length, "équipes,", pool.reduce((s:number,t:any)=>s+t.mons.length,0), "mons")
