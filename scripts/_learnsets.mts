// LECTURE SEULE — learnset (ids de moves) des AS + Glacirex, pour composer leurs movesets run 2.
//   npx tsx scripts/_learnsets.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
for (const id of ["draclet","vermisaint","frappard","regnantaur","amadiam","glacirex"]) {
    const s = (SPECIES as any)[id]
    if (!s) { console.log(`${id}: introuvable`); continue }
    const moves = (s.learnset || []).map((l: any) => `${l.moveId}@${l.level}`)
    console.log(`${id} (${(s.types||[]).join("/")}) :\n   ${moves.join(" · ")}`)
}
