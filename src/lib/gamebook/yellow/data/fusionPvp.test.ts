import { describe, it, expect } from "vitest"
import { buildFusion, disposeFusion } from "./fusionMon"
import { createMonInstance } from "../battle/factory"
import { getSpecies, registerCustomSpecies, unregisterCustomSpecies } from "./species"
import type { MonInstance, SpeciesData } from "../battle/types"

// PvP de FUSION — la fusion voyage COMPLÈTE dans le handshake `battle:hello` (frozenStats.spc=SpA + frozenSpd=SpD
// + types + moves + espèce éphémère). Le récepteur l'enregistre sous un espace de noms PRÉFIXÉ "opp:" car l'uid
// est un compteur LOCAL (donc l'id de fusion peut coïncider avec un des siens). Ces tests verrouillent les 3
// invariants dont dépend le déterminisme du combat en réseau.
describe("fusionPvp — round-trip réseau de l'équipe de fusion", () => {
    it("frozenStats.spc (SpA) ET frozenSpd (SpD) survivent au JSON du hello (pas de whitelist réseau)", () => {
        const a = createMonInstance("divinpate", 60) // rapide → SpA
        const b = createMonInstance("razmaree", 60)  // lent → SpD
        const { instance, speciesId } = buildFusion(a, b)

        // Le payload Pusher = JSON.stringify(instance) relayé tel quel (aucun filtre de sous-champs côté route).
        const wire = JSON.parse(JSON.stringify(instance)) as MonInstance
        expect(wire.frozenStats?.spc).toBe(instance.frozenStats?.spc) // offense (SpA) préservée
        expect(wire.frozenSpd).toBe(instance.frozenSpd)               // défense spé (SpD) préservée
        expect(wire.frozenSpd).toBeGreaterThan(0)

        disposeFusion(speciesId)
    })

    it("le préfixe 'opp:' rend l'espèce adverse résolvable ET conserve ses types (→ dégâts identiques des 2 côtés)", () => {
        // L'adversaire construit SA fusion sur SON client, puis me l'envoie (species + instance) → je reçois via JSON.
        const oppA = createMonInstance("divinpate", 60)
        const oppB = createMonInstance("razmaree", 60)
        const opp = buildFusion(oppA, oppB)
        const sentSpecies = JSON.parse(JSON.stringify([getSpecies(opp.speciesId)])) as SpeciesData[]
        const sentInst = JSON.parse(JSON.stringify(opp.instance)) as MonInstance
        const originalTypes = getSpecies(opp.speciesId)!.types
        disposeFusion(opp.speciesId) // en vrai l'espèce vit chez l'adversaire ; ici on nettoie le registre local du test

        // RÉCEPTION : je re-namespace ("opp:") avant d'enregistrer.
        const prefixed = sentSpecies.map((s) => ({ ...s, id: `opp:${s.id}` }))
        registerCustomSpecies(prefixed)
        const recv = { ...sentInst, speciesId: `opp:${sentInst.speciesId}` }

        expect(getSpecies(recv.speciesId)).not.toBeNull()                 // sinon speciesOf throw → crash de l'écran de combat
        expect(getSpecies(recv.speciesId)!.types).toEqual(originalTypes)  // types intacts → STAB/efficacité identiques → déterministe
        expect(recv.frozenSpd).toBe(opp.instance.frozenSpd)              // SpD intacte sur l'instance reçue

        unregisterCustomSpecies(prefixed.map((s) => s.id))
    })

    it("le préfixe 'opp:' EMPÊCHE la collision : l'espèce adverse (même id) n'écrase JAMAIS la mienne", () => {
        const mine = buildFusion(createMonInstance("divinpate", 60), createMonInstance("razmaree", 60))
        const mineTypes = getSpecies(mine.speciesId)!.types

        // Scénario réel : l'uid étant un compteur local, l'adversaire peut arriver avec le MÊME id de fusion mais des
        // TYPES différents (autres parents). Sans préfixe, registerCustomSpecies l'écraserait (Map.set) → mes types
        // deviendraient les siens → dégâts divergents → désync. Avec préfixe :
        const collided: SpeciesData = { ...getSpecies(mine.speciesId)!, id: mine.speciesId, types: ["FEU"] }
        const prefixed = { ...collided, id: `opp:${collided.id}` }
        registerCustomSpecies([prefixed])

        expect(getSpecies(mine.speciesId)!.types).toEqual(mineTypes)       // ma fusion est INTACTE
        expect(getSpecies(`opp:${mine.speciesId}`)!.types).toEqual(["FEU"]) // l'adverse vit sous un id disjoint

        unregisterCustomSpecies([prefixed.id])
        disposeFusion(mine.speciesId)
    })
})
