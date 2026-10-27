// src/lib/gamebook/yellow/data/run3Veteran.ts
//
// LE VÉTÉRAN — PNJ de la VILLE JAUNE réservé au RUN 3 (demande Sartay du 27/10/2026). Posté en (25,37), juste devant le
// bloc Sylvebarbe (cols 22-25 × rows 38-39) : bloqué lui aussi, il raconte la rumeur de la Daemonflûte — le Prof. CHEN ne
// la confie qu'aux meilleurs dresseurs, « deux fois la Ligue » au minimum, et même ça ne suffit pas → « va le plus loin
// possible dans l'aventure et espère qu'il te trouve digne ». (En jeu : Chen remet la flûte au CHAMPION de la run en cours,
// cf. labDialogues.chenRoute — le conseil est donc juste : finir la Ligue du concours.)
// Câblé via gameStore.activeNpcs : visible SEULEMENT en run 3 (effectiveRunWorld) et tant que Sylvebarbe dort. Pas de
// combat, pas de marqueur : simple PNJ de dialogue (dialoguesAfter). Planche Gen 3 fournie par Sartay (npc.gen3).

export const RUN3_VETERAN_NPC_ID = "y_run3_veteran"
export const RUN3_VETERAN_NAME = "VÉTÉRAN"
export const RUN3_VETERAN_MAP_ID = "yellow_entrance"
/** Case (25,37) : bande de sable du passage sud (cols 22-25), à droite → le couloir reste praticable sur 3 cases. */
export const RUN3_VETERAN_POS = { x: 25, y: 37 } as const
export const RUN3_VETERAN_SPRITE = "/yellow/sprites/npc_veteran_gen3.png"

export const RUN3_VETERAN_LINES: readonly string[] = [
    "*Un vétéran fait les cent pas devant le passage sud, l'air dépité.*",
    "« Bloqué ! Ce gros SYLVEBARBE dort en travers du chemin, et rien ne le réveille. »",
    "« Il paraît qu'il faut une FLÛTE… et que le Prof. CHEN ne la confie qu'aux MEILLEURS dresseurs. Le minimum ? Avoir battu DEUX FOIS la Ligue ! »",
    "« Et même ça, ça ne suffit pas, à ce qu'on dit. Alors un conseil : va le plus loin possible dans l'aventure… et espère qu'il te trouve digne de la flûte. »",
]
