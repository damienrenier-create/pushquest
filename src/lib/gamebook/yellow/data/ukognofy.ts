// src/lib/gamebook/yellow/data/ukognofy.ts
//
// UKOGNOFY — rencontre LÉGENDAIRE (type Mewtwo). Fusion des 2 légendaires Goshendofy (Dragon) + Ukognos (Fée) =
// DRAGON/FÉE, niv 100. Pop à un SPOT FIXE (salle dédiée cachée au fond de la Grotte — map/sprite/chemin créés par
// Sartay). Le défi = le CAPTURER (Fusio-Ball, seuil ~10% PV + statut). Après 3 RENCONTRES SANS CAPTURE (KO/défaite/
// fuite), il DISPARAÎT à jamais (comme Goshendofy). Capturé → disparaît aussi.
//
// PRÊT (indépendant du lieu) : buildUkognofy() + le compteur d'échecs (markers). RESTE (quand la salle existe) :
// le trigger de rencontre au spot + le hook battleStore (fin de combat sans capture → recordUkognofyFail).

import { createMonInstance } from "../battle/factory"
import { buildFusion, type BuiltFusion } from "./fusionMon"
import { fusionSpritePath } from "./fusionSprite"

export const UKOGNOFY_LEVEL = 100
/** Map de la CHAMBRE du légendaire (décor salle_ukognofy.png). Atteinte via une échelle interne de la Grotte
 *  quand les 6 conditions sont réunies (cf. gameStore). Ukognofy y est affronté à l'arrivée. */
export const UKOGNOFY_CHAMBER_MAP = "yellow_ukognofy_chamber"

/** Condition NUIT : heure RÉELLE locale entre 21h et 3h du matin. */
export function isUkognofyNight(now = new Date()): boolean {
    const h = now.getHours()
    return h >= 21 || h < 3
}
/** Markers (defeatedTrainers) : capture + les 3 échecs. Boolean, bornés → pas de nouveau champ save. */
export const UKOGNOFY_CAUGHT_MARKER = "ukognofy_caught"
export const UKOGNOFY_FAIL_MARKERS = ["ukognofy_fail_1", "ukognofy_fail_2", "ukognofy_fail_3"] as const
export const UKOGNOFY_MAX_FAILS = 3

/** Ukognofy SAUVAGE (Goshendofy + Ukognos, niv 100, moveset d'ace). BuiltFusion éphémère → DÉTRUIRE après combat. */
export function buildUkognofy(): BuiltFusion {
    return buildFusion(
        createMonInstance("goshendofy", UKOGNOFY_LEVEL, { owned: false }),
        createMonInstance("ukognos", UKOGNOFY_LEVEL, { owned: false }),
        { name: "Ukognofy", moves: ["souffle_primordial", "cataclysme_lunaire", "fulgurance", "repos"], sprite: fusionSpritePath("Ukognofy") },
    )
}

/** Nombre d'échecs enregistrés (0..3). */
export function ukognofyFailCount(isDefeated: (m: string) => boolean): number {
    return UKOGNOFY_FAIL_MARKERS.filter((m) => isDefeated(m)).length
}
/** Ukognofy a-t-il DISPARU à jamais (capturé OU 3 rencontres sans capture) ? → ne repop plus. */
export function isUkognofyGone(isDefeated: (m: string) => boolean): boolean {
    return isDefeated(UKOGNOFY_CAUGHT_MARKER) || ukognofyFailCount(isDefeated) >= UKOGNOFY_MAX_FAILS
}
/** Le PROCHAIN marker d'échec à poser à la fin d'une rencontre sans capture (ou null si déjà 3). */
export function nextUkognofyFailMarker(isDefeated: (m: string) => boolean): string | null {
    return UKOGNOFY_FAIL_MARKERS.find((m) => !isDefeated(m)) ?? null
}
