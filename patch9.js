const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.nodes["s10_foire_placeholder"] = {
  "id": "s10_foire_placeholder",
  "kind": "scene_porte_placeholder",
  "body": "Les portes de Risoletto se referment derrière vous. Les festivités battent leur plein, l'air est chargé de musique et d'épices. Vous prenez une grande inspiration, la caravane est en sécurité.\n\n(Fin temporaire du Chapitre 1. Le grand final arrivera dans le prochain déploiement !)",
  "choices": [ { "id": "c1", "text": "Recommencer l'aventure", "tag": "neutral", "nextNodeId": "g1_eveil", "action": "reset", "mbti": {}, "temperaments": {} } ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patch 9 applied!');
