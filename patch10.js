const fs = require('fs');

const file = './src/data/chapters/ch1_caravane.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Ajouter t_s3_nuit1
data.nodes["t_s3_nuit1"] = {
  "kind": "tampon",
  "body": "Le reste de la journée s'écoule dans un silence pesant, rythmé par le grincement des essieux. La caravane établit son premier campement sous un ciel sans lune. Au petit matin du deuxième jour, l'air est vif et le convoi se remet en marche.",
  "choices": [
    {
      "id": "c1",
      "text": "Reprendre la route",
      "tag": "neutral",
      "nextNodeId": "s4_traces",
      "mbti": {},
      "temperaments": {}
    }
  ],
  "id": "t_s3_nuit1"
};

// 2. Redirection des sorties de la Scène 3
const redirectToNuit = (nodeId) => {
    if(data.nodes[nodeId] && data.nodes[nodeId].choices) {
        data.nodes[nodeId].choices.forEach(c => {
            if (c.nextNodeId === "s4_traces") {
                c.nextNodeId = "t_s3_nuit1";
            }
        });
    }
}
redirectToNuit("t_s3_A2");
redirectToNuit("t_s3_B2");
redirectToNuit("t_s3_A1_inter1");
redirectToNuit("t_s3_B1_inter1");

// 3. Ajout flags Penne
data.nodes["t_s3_A1"] = {
  "kind": "tampon",
  "body": "Penne vous regarde, sidéré par la froideur de votre logique mathématique. Il s'éloigne sans un mot, les poings serrés.",
  "flags": {
    "penne_angry": true
  },
  "choices": [
    {
      "id": "c1",
      "text": "Continuer",
      "tag": "neutral",
      "nextNodeId": "t_s3_A1_inter1",
      "mbti": {},
      "temperaments": {}
    }
  ],
  "id": "t_s3_A1"
};

// 4. Disparition Risotto
data.nodes["t_s4_B2_inter3"] = {
  "kind": "tampon",
  "body": "Rien. Le silence de la forêt est revenu, lourd et poisseux. Risotto s'est volatilisé. Vous retrouvez seulement son dé en os.\nLe Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »",
  "flags": {
    "risotto_missing": true
  },
  "choices": [
    {
      "id": "c1",
      "text": "Fuir vers le sentier",
      "tag": "neutral",
      "nextNodeId": "s5_pont_effondre",
      "mbti": {},
      "temperaments": {}
    }
  ],
  "id": "t_s4_B2_inter3"
};

// 5. Ajout de la réaction à l'absence de Risotto dans t_s5_bivouac
// On ajoute un choix optionnel si risotto_missing est true
data.nodes["t_s5_bivouac_risotto"] = {
    "kind": "tampon",
    "body": "Linguini lève les yeux de son registre, le visage blême. « Il manque quelqu'un. Où est Risotto ? » Un frisson parcourt la caravane. Vous montrez le dé en os trouvé dans la forêt. Cannella étouffe un cri de terreur. Personne ne dormira vraiment cette nuit.",
    "choices": [
      {
        "id": "c1",
        "text": "Se taire et attendre l'aube",
        "tag": "neutral",
        "nextNodeId": "s6_conflit",
        "mbti": {},
        "temperaments": {}
      }
    ],
    "id": "t_s5_bivouac_risotto"
};

if (data.nodes["t_s5_bivouac"]) {
    // We make choice c1 require risotto_missing = false
    data.nodes["t_s5_bivouac"].choices[0].condition = { flag: "risotto_missing", expected: false };
    
    // We add a new choice for risotto_missing = true
    data.nodes["t_s5_bivouac"].choices.push({
        "id": "c2",
        "text": "Annoncer la disparition de Risotto",
        "tag": "neutral",
        "nextNodeId": "t_s5_bivouac_risotto",
        "condition": { flag: "risotto_missing", expected: true },
        "mbti": {},
        "temperaments": {}
    });
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patch Penne & Risotto applied successfully.');
