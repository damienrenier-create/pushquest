// LECTURE SEULE — résout NOM d'affichage → id réel + natMin/evoCap, pour toutes les espèces des arènes run 2.
//   npx tsx scripts/_resolve_ids.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const evoAt = (id: string) => (SPECIES as any)[id]?.evolution?.method?.level

const NAMES = [
    // Vol
    "Plumiot","Piouflot","Colibraise","Rembodo","Cornaissant","Corvenin","Draclet",
    // Psy
    "Nouillon","Vermisaint","Blaziper","Hibouh","Limaroche","Jerbiwat","Escargyle","Escaroche","Flamaspic",
    // Pyra
    "Glaceer","Carlembre","Faukon","Pyrenard","Marteloutan","Chouhanté","Ondulo","Fourmilierre","Sylvours","Frappard","Broubouc","Namizeus","Flamkure",
    // Volta
    "Formiguer","Revemante","Nécarabée","Brook","Lampignon","Bouh","Regnantaur","Gloutanoir","Glacirex","Ombrapanthe",
    // Ondine
    "Pyrokoss","Silviliane","Tortoracle","Tonytony","Thundah","Diamantine","Druidours","Cerfeuillu","Loupyre","Amadiam",
]
const all = Object.values(SPECIES) as any[]
for (const nm of NAMES) {
    const matches = all.filter((s) => (s.name || "").toLowerCase() === nm.toLowerCase())
    if (!matches.length) { console.log(`  ❌ ${nm.padEnd(14)} INTROUVABLE`); continue }
    for (const s of matches) {
        const cap = evoAt(s.id) ? evoAt(s.id)! - 1 : "∞"
        console.log(`  ${nm.padEnd(14)} → id="${s.id}"  ${(s.types||[]).join("/").padEnd(14)} natN${natMin(s.id)}-${cap}`)
    }
}
