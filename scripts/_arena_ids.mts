// LECTURE SEULE — IDs exacts des 5 arènes (leader + gardes) pour la map NGPLUS_ARENA_TEAMS.
//   npx tsx scripts/_arena_ids.mts
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const T = TRAINERS as any[]
for (const badge of ["plante", "roche", "feu", "elec", "eau"]) {
    const leader = T.find((t) => t.badge === badge)
    if (!leader) { console.log(`(pas de leader ${badge})`); continue }
    console.log(`\n=== ${badge.toUpperCase()} ===`)
    console.log(`  LEADER  ${leader.id.padEnd(22)} ${leader.name}  (giftCt actuel=${leader.giftCt ?? "-"})`)
    for (const gid of (leader.requiresTrainers ?? []) as string[]) {
        const g = T.find((t) => t.id === gid)
        console.log(`  garde   ${gid.padEnd(22)} ${g?.name ?? "??"}  (${(g?.team ?? []).length} mons)`)
    }
}
