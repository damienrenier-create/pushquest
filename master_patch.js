const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 4B. Le cas de la carte perdue (Nœud s8_course)
if (data.nodes["s8_course"]) {
    let choices = data.nodes["s8_course"].choices;
    
    // Modifier B2_std
    let b2_std = choices.find(c => c.id === "B2_std");
    if (b2_std) {
        // Ajouter la condition à la condition existante si boussole_ternie=false était là
        // Le prompt dit : "Au choix B2_std existant, ajoute la condition : 'condition': { 'flag': 'map_lost', 'expected': false }"
        // Mais il avait déjà "boussole_ternie"=false.
        // Puisque le système ne gère qu'une seule condition simple pour l'instant (interface Condition { flag: string, expected: boolean }),
        // on remplace la condition par map_lost=false (la carte perdue prévaut).
        b2_std.condition = { flag: "map_lost", expected: false };
    }
    
    // Ajouter B2_lost si pas déjà là
    if (!choices.find(c => c.id === "B2_lost")) {
        choices.push({
          "id": "B2_lost",
          "text": "[Carte Perdue] Avancer à l'aveugle. Sans Linguini et sans carte, c'est le seul choix.",
          "tag": "wrong",
          "nextNodeId": "t_s8_B1_std", // Attention t_s8_B1_std doit exister (c'est le noeud de B1_std)
          "monsterComment": "Pas de carte. Pas de guide. Le brouillard. C'est ce qu'on appelle la sélection naturelle.",
          "mbti": {},
          "temperaments": {},
          "condition": {
            "flag": "map_lost",
            "expected": true
          }
        });
    }
}

// 4C. La Dissonance de Penne (Nœud s8_philosophie)
if (data.nodes["s8_philosophie"]) {
    if (data.nodes["s8_philosophie"].body) {
        data.nodes["s8_philosophie"].body = data.nodes["s8_philosophie"].body.replace(
            "Penne vous regarde, buvant vos paroles.", 
            "Le vieux Brodo suspend son geste, écoutant attentivement votre réponse."
        );
    }
}

// 5A. Équilibrage Statistique MBTI
if (data.nodes["s8_philosophie"]) {
    let choices = data.nodes["s8_philosophie"].choices;
    let cA1 = choices.find(c => c.id === "A1");
    if (cA1) cA1.mbti = { "T": 1 };
    
    let cA2 = choices.find(c => c.id === "A2");
    if (cA2) cA2.mbti = { "I": 1 };
    
    let cB2 = choices.find(c => c.id === "B2");
    if (cB2) cB2.mbti = { "F": 1 };
    
    let cB1 = choices.find(c => c.id === "B1");
    if (cB1) cB1.mbti = { "P": 1 };
}

// 5B. Correction du Double-Dipping MBTI (Nœuds tampons Scène 6)
const s6Tampons = [
    "t_s6_A1_confirm", "t_s6_A1_extend", 
    "t_s6_A2_confirm", "t_s6_A2_extend", 
    "t_s6_B2_confirm", "t_s6_B2_extend", 
    "t_s6_B1_confirm", "t_s6_B1_extend"
];

s6Tampons.forEach(id => {
    if (data.nodes[id] && data.nodes[id].choices) {
        data.nodes[id].choices.forEach(c => {
            c.mbti = {};
        });
    }
});

// 6. Rythme et Typographie
// s9_veuve
if (data.nodes["s9_veuve"]) {
    if (data.nodes["s9_veuve"].body) {
        data.nodes["s9_veuve"].body = data.nodes["s9_veuve"].body.replace(
            /Une pièce par marchand[\s\S]*ou une âme\./i, // Remplacement plus large au cas où
            "Une pièce par marchand — ou une âme."
        );
        // Si ça n'a pas marché avec la regex, on fait un replace simple (le texte exact de la v1 était "Une pièce par marchand... ou une âme.")
        data.nodes["s9_veuve"].body = data.nodes["s9_veuve"].body.replace(
            "Une pièce par marchand... ou une âme.",
            "Une pièce par marchand — ou une âme."
        );
    }
}

// Commentaires Monstres t_s7
const addMonsterComment = (nodeId, comment) => {
    // Les monsterComments s'ajoutent généralement sur les choix menant AU noeud. 
    // Le prompt dit "Nœud t_s7_A1_std : ajoute monsterComment...". 
    // Wait ! Les MonsterComments doivent se trouver sur les choix des scènes précédentes menant vers ces tampons !
    // Si le prompt demande de les ajouter au "Nœud t_s7_A1_std", il s'est peut-être trompé et voulait les mettre dans la scène s7_cuisinier ?
    // Ou bien on les ajoute au tampon pour que le client l'affiche s'il repart sur Continuer ?
    // Dans notre architecture, le monsterComment est sur le CHOICE.
    // Pour "t_s7_A1_std", le choix est "A1_std" dans "s7_cuisinier".
    // Allons chercher le choix dans s7_cuisinier qui pointe vers ces tampons.
    if (data.nodes["s7_cuisinier"]) {
        data.nodes["s7_cuisinier"].choices.forEach(c => {
            if (c.nextNodeId === nodeId) {
                c.monsterComment = comment;
            }
        });
    }
}

addMonsterComment("t_s7_A1_std", "Il vient de te donner la clé de la ville. Pense à le remercier un jour.");
addMonsterComment("t_s7_A2_std", "L'administration gagne toujours à la fin.");
addMonsterComment("t_s7_B2_std", "La paranoïa est une excellente compagne de voyage.");

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Master Patch de Refonte appliqué avec succès.');
