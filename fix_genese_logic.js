const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Ajouter les tampons pour l'éveil
data.nodes["t_g1_avance"] = {
  "kind": "tampon",
  "body": "Tu te lèves docilement et tu te mets en marche vers la source de lumière. L'odeur de sauce devient plus forte à chaque pas.",
  "choices": [
    {
      "id": "c1",
      "text": "Continuer",
      "tag": "neutral",
      "nextNodeId": "g2_rencontre"
    }
  ],
  "id": "t_g1_avance"
};

data.nodes["t_g1_reste"] = {
  "kind": "tampon",
  "body": "Tu décides que la meilleure chose à faire est de rester assis dans le noir.\n\nLa voix lâche un soupir si théâtral qu'il fait trembler les stalactites. Soudain, une force invisible te saisit par le col de ta chemise et te traîne de force le long du boyau.",
  "choices": [
    {
      "id": "c1",
      "text": "Se laisser traîner",
      "tag": "neutral",
      "nextNodeId": "g2_rencontre"
    }
  ],
  "id": "t_g1_reste"
};

// Mettre à jour g1_eveil pour pointer vers les tampons
if (data.nodes["g1_eveil"] && data.nodes["g1_eveil"].choices) {
    let c_avance = data.nodes["g1_eveil"].choices.find(c => c.id === "c_g1_avance");
    if (c_avance) {
        c_avance.nextNodeId = "t_g1_avance";
        c_avance.text = "Tu te lèves et tu avances vers la lumière.";
    }

    let c_reste = data.nodes["g1_eveil"].choices.find(c => c.id === "c_g1_reste");
    if (c_reste) {
        c_reste.nextNodeId = "t_g1_reste";
        c_reste.text = "Tu restes assis dans le noir en espérant que ça passe.";
        c_reste.monsterComment = null; // Enlevé car ça gâche la blague du tampon
    }
}

// 2. Mettre à jour g2_rencontre pour qu'il s'emboîte après les tampons
if (data.nodes["g2_rencontre"]) {
    // Remplacer "Tu marches une minute. La lueur s'agrandit. Tu débouches dans une cavité plus large"
    // par "Tu finis par déboucher dans une cavité plus large"
    data.nodes["g2_rencontre"].body = data.nodes["g2_rencontre"].body.replace(
        "Tu marches une minute. La lueur s'agrandit. Tu débouches dans une cavité plus large",
        "Tu finis par déboucher dans une cavité plus large"
    );
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Correction Genèse appliquée avec succès.');
