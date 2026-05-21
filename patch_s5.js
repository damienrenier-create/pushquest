const fs = require('fs');

const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Fix du "Loot Fantôme"
if (data.nodes["t_s5_A1"]) {
    data.nodes["t_s5_A1"].flags = data.nodes["t_s5_A1"].flags || {};
    data.nodes["t_s5_A1"].flags["corde_ingenieur"] = true;
}

if (data.nodes["t_s5_B1"]) {
    data.nodes["t_s5_B1"].flags = data.nodes["t_s5_B1"].flags || {};
    data.nodes["t_s5_B1"].flags["machette_grogno"] = true;
}

// 2. Fix de la Dissonance Narrative
if (data.nodes["t_s5_B1"] && data.nodes["t_s5_B1"].choices) {
    data.nodes["t_s5_B1"].choices.forEach(c => {
        if (c.nextNodeId === "t_s5_bivouac") {
            c.nextNodeId = "t_s5_bivouac_deuil";
        }
    });
}

// 3. Création du Nœud de Deuil
data.nodes["t_s5_bivouac_deuil"] = {
  "kind": "tampon",
  "body": "La nuit tombe enfin. Le campement se monte dans un silence de mort. Le corps de Grogno a été enveloppé à la hâte dans une vieille toile de tente. Autour du maigre feu, personne n'ose croiser votre regard. Vous avez forcé l'allure, et le prix a été payé en sang. Cannella, traumatisée, s'est enfermée dans sa charrette.",
  "choices": [
    {
      "id": "c1",
      "text": "Essayer de dormir malgré tout",
      "tag": "neutral",
      "nextNodeId": "s6_conflit",
      "monsterComment": "Un mort le deuxième jour. Ta gestion d'équipe est brutale, mais efficace. Repose-toi, boucher.",
      "mbti": {},
      "temperaments": {}
    }
  ],
  "id": "t_s5_bivouac_deuil"
};

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patch Scène 5 appliqué avec succès.');
