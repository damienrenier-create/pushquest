// LECTURE SEULE — par TYPE : espèces jamais sauvages (ou seulement en zone tardive), formes de base,
// candidates aux nouveaux "peu communs" de Route Nord run 2.
//   npx tsx scripts/_route_nord_candidates.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { speciesZones } from "../src/lib/gamebook/yellow/data/encounters"

const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const evoAt = (id: string) => (SPECIES as any)[id]?.evolution?.method?.level
const cap = (id: string) => (evoAt(id) ? evoAt(id)! - 1 : Infinity)
// mini-niveau "d'entrée" des zones (pour juger "pop trop tard")
const ZONE_MIN: Record<string, number> = { yellow_route_nord: 2, yellow_grotte: 5, yellow_cendreville: 16, yellow_centrale: 12, yellow_maison_hantee: 14, yellow_hautes_herbes: 3 }

const TYPES = ["NORMAL","FEU","EAU","PLANTE","ELEC","GLACE","COMBAT","POISON","SOL","VOL","PSY","INSECTE","ROCHE","SPECTRE","DRAGON"]
for (const ty of TYPES) {
    const rows: string[] = []
    for (const s of Object.values(SPECIES) as any[]) {
        if (!(s.types ?? []).includes(ty)) continue
        const nm = natMin(s.id)
        if (nm > 12) continue // Route Nord early : on veut des BASES catchables (≤12)
        const zones = speciesZones(s.id)
        const earliest = zones.length ? Math.min(...zones.map((z) => ZONE_MIN[z] ?? 99)) : Infinity
        // jamais sauvage OU seulement en zone à minLevel>12 (= trop tard pour tôt)
        const neverEarly = zones.length === 0 || earliest > 12
        if (!neverEarly) continue
        const tag = zones.length === 0 ? "JAMAIS sauvage" : `tard: ${zones.map((z) => z.replace("yellow_", "")).join(",")}`
        rows.push(`${s.name}(${s.types.join("/")}, N${nm}-${cap(s.id) === Infinity ? "∞" : cap(s.id)}) [${tag}]`)
    }
    if (rows.length) console.log(`■ ${ty} :\n   ${rows.join(" · ")}`)
    else console.log(`■ ${ty} : (aucune base ≤12 non-early absente)`)
}
