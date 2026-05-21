const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Mise à jour des liens (remaillage)
for (const nodeId in data.nodes) {
    const node = data.nodes[nodeId];
    if (node.choices) {
        node.choices.forEach(c => {
            if (c.nextNodeId === 's6_conflit_placeholder') {
                c.nextNodeId = 's6_conflit';
            }
        });
    }
}

// 2. Suppression de l'ancien placeholder
delete data.nodes['s6_conflit_placeholder'];

// 3. Ajout de la nouvelle Scène 6
const scene6 = {
    "s6_conflit": {
      "kind": "scene_porte",
      "axis": "T/F",
      "body": "Au matin, l'épuisement de la veille fait exploser les rancœurs. Penne hurle sur Linguini, l'accusant de l'avoir floué sur le calcul des rations et de sa prime. Linguini, glacial, sort le parchemin du contrat. Les autres marchands reculent. Ils vous demandent de juger.",
      "choices": [
        { "id": "A1", "text": "Analyser le contrat et donner raison à Linguini. Les faits sont les faits.", "tag": "clever", "nextNodeId": "t_s6_A1_confirm", "monsterComment": "La vérité clinique. Implacable.", "mbti": {"T": 2}, "temperaments": {} },
        { "id": "A2", "text": "Ignorer le passé et imposer votre propre calcul strict pour la suite.", "tag": "neutral", "nextNodeId": "t_s6_A2_confirm", "monsterComment": "La règle pure, sans émotion.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "B2", "text": "Écouter les deux, calmer leurs angoisses et chercher un compromis.", "tag": "safe", "nextNodeId": "t_s6_B2_confirm", "monsterComment": "La médiation émotionnelle. On est partis pour des heures.", "mbti": {"F": 1}, "temperaments": {"compassion": 0.5} },
        { "id": "B1", "text": "Prendre agressivement le parti de Penne, par loyauté pour votre ami.", "tag": "wrong", "nextNodeId": "t_s6_B1_confirm", "monsterComment": "La loyauté toxique. Tu viens de froisser le cerveau de la caravane.", "mbti": {"F": 2}, "temperaments": {"courage": 0.5, "malice": 0.5} }
      ]
    },
    "t_s6_A1_confirm": {
      "kind": "tampon",
      "body": "Penne est écrasé. Non seulement il a tort, mais son seul ami l'humilie publiquement au nom de la logique.\nLe Monstre apparaît : « Tu as le scalpel en main, {nickname}. On s'arrête là, ou on l'achève ? »",
      "choices": [
        { "id": "c1", "text": "Exiger que Penne s'excuse publiquement envers Linguini.", "tag": "clever", "nextNodeId": "t_s6_A1_extend", "monsterComment": "Magnifique. Une cruauté parfaitement procédurière.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "c2", "text": "Tapoter l'épaule de Penne pour le consoler.", "tag": "wrong", "nextNodeId": "t_s6_funnel", "monsterComment": "Tu tranches avec la loi et tu mets un pansement affectif ? Quelle inconstance. Bref, on avance.", "mbti": {"F": 1}, "temperaments": {} }
      ]
    },
    "t_s6_A1_extend": {
      "kind": "tampon",
      "body": "Penne s'exécute, la voix tremblante. La justice a triomphé de l'amitié. Alors que Linguini s'éloigne, victorieux, Penne vous demande à voix basse : « Tu penses vraiment que je suis un voleur, {nickname} ? Ou c'était juste pour l'exemple ? »",
      "choices": [
        { "id": "c1", "text": "« Les chiffres disent que tu as tort. C'est tout. »", "tag": "clever", "nextNodeId": "t_s6_A1_climax", "monsterComment": "Tranchant jusqu'à l'os. Tu n'as pas de cœur, tu as un boulier.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "c2", "text": "« C'était pour l'exemple. Ne le prends pas personnellement. »", "tag": "neutral", "nextNodeId": "t_s6_funnel", "monsterComment": "Un tout petit sursaut d'empathie à la dernière seconde ? C'est noté.", "mbti": {"F": 1}, "temperaments": {"compassion": 0.5} }
      ]
    },
    "t_s6_A1_climax": {
      "kind": "tampon",
      "body": "Penne s'éloigne, dévasté. Mais le soir venu, Linguini s'approche de vous. « C'est rare de croiser quelqu'un qui respecte le contrat avant les sentiments », lâche-t-il, l'air grave. Il vous glisse discrètement un Sceau de la Guilde en argent. « Ça vous ouvrira des portes à la foire de Risoletto. »",
      "choices": [ { "id": "c1", "text": "Ranger le Sceau", "tag": "neutral", "nextNodeId": "t_s6_funnel", "monsterComment": "L'intégrité clinique paie. Tu as gagné le respect du vieux loup et un passe-droit. Bon. Garde ça précieusement.", "mbti": {}, "temperaments": {} } ]
    },
    "t_s6_A2_confirm": {
      "kind": "tampon",
      "body": "Les deux hommes sont frustrés mais se plient à votre nouvelle réglementation martiale.\nLe Monstre observe : « C'est efficace. On maintient la discipline militaire ? »",
      "choices": [
        { "id": "c1", "text": "Confisquer toutes leurs réserves pour les centraliser.", "tag": "clever", "nextNodeId": "t_s6_A2_extend", "monsterComment": "L'intendant suprême. J'aime l'excès de zèle.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "c2", "text": "Faire une blague pour détendre l'atmosphère.", "tag": "wrong", "nextNodeId": "t_s6_funnel", "monsterComment": "Un législateur ne fait pas le clown, {nickname}. Pitoyable. On avance.", "mbti": {"F": 1}, "temperaments": {} }
      ]
    },
    "t_s6_A2_extend": {
      "kind": "tampon",
      "body": "Les poches sont vidées. La caravane devient un camp d'entraînement logistique. Vous vous retrouvez à devoir redistribuer vous-même les rations. Cannella se plaint immédiatement que sa part est indigne de son rang.",
      "choices": [
        { "id": "c1", "text": "« Tout le monde à part égale. Même vous. »", "tag": "clever", "nextNodeId": "t_s6_A2_climax", "monsterComment": "L'égalité mathématique absolue. Implacable.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "c2", "text": "Lui donner un peu plus pour qu'elle se taise.", "tag": "safe", "nextNodeId": "t_s6_funnel", "monsterComment": "La règle pure a ses petites exceptions de confort, apparemment.", "mbti": {"F": 1}, "temperaments": {} }
      ]
    },
    "t_s6_A2_climax": {
      "kind": "tampon",
      "body": "Votre égalité est absolue. Mais la nuit tombe, et Cannella, privée de ses rations spécifiques et de ses infusions, fait un violent malaise. Ses plaintes de douleur empêchent tout le monde de dormir. Au matin, la caravane est épuisée, et Linguini vous fusille du regard pour votre « règle aveugle ».",
      "choices": [ { "id": "c1", "text": "Assumer les conséquences", "tag": "neutral", "nextNodeId": "t_s6_funnel", "monsterComment": "Tu as géré cette caravane comme un tableur, {nickname}. Surprise : ce sont des humains. L'égalité pure vient de briser ton groupe. Bref.", "mbti": {}, "temperaments": {} } ]
    },
    "t_s6_B2_confirm": {
      "kind": "tampon",
      "body": "Il vous faut deux heures de discussions épuisantes pour apaiser les cœurs.\nLe Monstre s'ennuie : « Merveilleux. Une thérapie de groupe. On va plus loin dans les sentiments ? »",
      "choices": [
        { "id": "c1", "text": "Leur demander de se serrer la main.", "tag": "safe", "nextNodeId": "t_s6_B2_extend", "monsterComment": "C'est beau. On dirait presque du vrai cinéma.", "mbti": {"F": 1}, "temperaments": {} },
        { "id": "c2", "text": "Regarder votre montre et crier qu'on perd du temps.", "tag": "wrong", "nextNodeId": "t_s6_funnel", "monsterComment": "Tu passes deux heures sur leurs sentiments pour finir en pointeuse d'usine ? Ridicule. Bref.", "mbti": {"T": 1}, "temperaments": {} }
      ]
    },
    "t_s6_B2_extend": {
      "kind": "tampon",
      "body": "La poignée de main est extrêmement gênante, mais la tension redescend véritablement. Le silencieux Brodo vous tend deux bols de son meilleur bouillon, vous invitant d'un signe de tête à les forcer à manger ensemble pour sceller la paix.",
      "choices": [
        { "id": "c1", "text": "Les obliger à s'asseoir et à partager le bouillon.", "tag": "safe", "nextNodeId": "t_s6_funnel", "monsterComment": "Maman oiseau force ses petits à manger. On atteint des sommets d'assistanat.", "mbti": {"F": 1}, "temperaments": {"compassion": 0.5} },
        { "id": "c2", "text": "Boire le bouillon vous-même, ils ont eu leur dose.", "tag": "bold", "nextNodeId": "t_s6_funnel", "monsterComment": "Tu sais t'arrêter avant l'indigestion émotionnelle. Et tu as un bouillon gratuit.", "mbti": {"T": 1}, "temperaments": {"malice": 0.5} }
      ]
    },
    "t_s6_B1_confirm": {
      "kind": "tampon",
      "body": "Linguini, insulté par votre irrationalité absolue, refuse de continuer. Il plie bagage avec trois marchands qui ne jurent que par lui.\nLe Monstre est ravi : « Tu viens de briser le groupe. Tu assumes ta subjectivité ? »",
      "flags": { "linguini_left": true },
      "choices": [
        { "id": "c1", "text": "Aider Linguini à faire ses sacs pour lui montrer la porte.", "tag": "bold", "nextNodeId": "t_s6_B1_extend", "monsterComment": "Totalement toxique. Formidable. Bon débarras.", "mbti": {"F": 1}, "temperaments": {"malice": 0.5} },
        { "id": "c2", "text": "Tenter d'expliquer logiquement à Linguini que c'est pour la cohésion.", "tag": "wrong", "nextNodeId": "t_s6_funnel", "monsterComment": "Tu es en plein déni. Il crache sur ta fausse logique. Il part.", "mbti": {"T": 1}, "temperaments": {} }
      ]
    },
    "t_s6_B1_extend": {
      "kind": "tampon",
      "body": "Un départ théâtral et glacial. La caravane perd presque la moitié de ses effectifs. Avant de partir, Linguini vous tend la main : « Rends-moi ma carte, convoyeur. Vous n'avez qu'à vous guider aux sentiments. »",
      "choices": [
        { "id": "c1", "text": "Lui rendre la carte par principe.", "tag": "bold", "nextNodeId": "t_s6_funnel", "flags": { "map_lost": true }, "monsterComment": "Le panache avant la survie. Vous voilà perdus, mais intègres.", "mbti": {"F": 1}, "temperaments": {"courage": 0.5} },
        { "id": "c2", "text": "Refuser. C'est la carte de la caravane.", "tag": "wrong", "nextNodeId": "t_s6_funnel", "monsterComment": "Voleur et mauvais ami. Linguini crache par terre. J'adore ton pragmatisme de caniveau.", "mbti": {"T": 1}, "temperaments": {"malice": 0.5} }
      ]
    },
    "t_s6_funnel": {
      "kind": "tampon",
      "body": "Le conflit a laissé des traces indélébiles. La dynamique du groupe a changé pour toujours. Dans le silence, la caravane réduite s'ébranle. C'est le dernier jour complet de marche vers Risoletto.",
      "choices": [ { "id": "c1", "text": "Prendre la route", "tag": "neutral", "nextNodeId": "s7_cuisinier_placeholder", "monsterComment": "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte.", "mbti": {}, "temperaments": {} } ]
    },
    "s7_cuisinier_placeholder": {
      "kind": "scene_porte_placeholder",
      "body": "[PROCHAIN PATCH] Lors de l'ultime halte avant l'arrivée, Brodo le cuisinier accepte enfin de parler...",
      "choices": [ { "id": "c1", "text": "Attendre le prochain chapitre", "tag": "neutral", "nextNodeId": "s7_cuisinier_placeholder", "mbti": {}, "temperaments": {} } ]
    }
};

Object.assign(data.nodes, scene6);

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patch 5 applied!');
