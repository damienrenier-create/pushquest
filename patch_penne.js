const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Mise à jour de t_s4_A2_inter1 (Remplacement de c3 par c3_friend et c3_angry)
if (data.nodes["t_s4_A2_inter1"]) {
    let choices = data.nodes["t_s4_A2_inter1"].choices;
    // Supprimer l'ancien choix c3
    choices = choices.filter(c => c.id !== "c3" && c.id !== "c3_friend" && c.id !== "c3_angry" && !c.text.includes("Parier 5 pièces avec Penne"));
    
    // Ajouter les deux nouveaux choix conditionnels
    choices.push({
      "id": "c3_friend",
      "text": "[Penne est loyal] Parier 5 pièces avec Penne qu'il n'osera pas y mettre la tête.",
      "tag": "neutral",
      "nextNodeId": "s5_pont_effondre",
      "monsterComment": "L'intimidation amicale. J'aime bien. On y va.",
      "mbti": {},
      "temperaments": {},
      "condition": {
        "flag": "penne_angry",
        "expected": false
      }
    });
    
    choices.push({
      "id": "c3_angry",
      "text": "[Penne est rancunier] Te tourner vers Penne. Il détourne le regard, glacial, et refuse de te parler.",
      "tag": "safe",
      "nextNodeId": "s5_pont_effondre",
      "monsterComment": "Le silence pesant d'une amitié brisée devant un trou béant. C'est poétique. Allez, avance.",
      "mbti": {},
      "temperaments": {},
      "condition": {
        "flag": "penne_angry",
        "expected": true
      }
    });
    
    data.nodes["t_s4_A2_inter1"].choices = choices;
}

// 2. Mise à jour de t_s4_A2_inter3 pour rendre neutre le réveil
if (data.nodes["t_s4_A2_inter3"]) {
    data.nodes["t_s4_A2_inter3"].body = "La sensation de chute disparaît. Quelqu'un secoue votre épaule. C'est Penne, ou peut-être un autre marchand. Vous étiez simplement hypnotisé par l'obscurité du gouffre, titubant sur le bord. Vous reculez en trébuchant.";
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patch Penne Scène 4 appliqué avec succès.');
