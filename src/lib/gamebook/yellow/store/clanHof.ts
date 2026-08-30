// src/lib/gamebook/yellow/store/clanHof.ts
//
// PANTHÉON DES CLANS — helpers client (fetch best-effort) vers /api/gamebook/yellow/clan-hall-of-fame.
// Le POST grave/actualise le PIC du Daemon-clan du joueur (persistant cross-run) ; no-op hors navigateur (tests).

import type { ClanKey } from "../data/clans"

export interface ClanHallMember { nickname: string; clan: string; level: number; speciesId: string; transcended: boolean; wonAt: string }

/** Signale le Daemon-clan courant au Panthéon (upsert-au-pic côté serveur). Fire-and-forget, silencieux hors-ligne. */
export function postClanHallEntry(entry: { clan: ClanKey; level: number; speciesId: string; transcended: boolean }): void {
    if (typeof window === "undefined") return
    void fetch("/api/gamebook/yellow/clan-hall-of-fame", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    }).catch(() => { /* hors-ligne : silencieux */ })
}
