const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// ======== SCENE 7 (Patch 6) ========
// Retro-fix des Flags de la Scène 5
data.nodes['t_s5_A2'].flags = { "boussole_ternie": true };
const c4 = data.nodes['t_s5_B2_trouvaille'].choices.find(c => c.id === 'c4');
if (c4) c4.nextNodeId = 't_s5_B2_silex_get';

data.nodes['t_s5_B2_silex_get'] = { 
  "kind": "tampon", 
  "flags": { "silex_trappeur": true }, 
  "body": "Vous glissez la précieuse pierre dans votre besace.", 
  "choices": [ { "id": "c1", "text": "Rejoindre le camp", "tag": "neutral", "nextNodeId": "t_s5_bivouac", "mbti": {}, "temperaments": {} } ] 
};

// Remaillage Scène 7
data.nodes['t_s6_funnel'].choices.forEach(c => {
  if (c.nextNodeId === 's7_cuisinier_placeholder') c.nextNodeId = 's7_cuisinier';
});
delete data.nodes['s7_cuisinier_placeholder'];

// Injection Scène 7
const scene7 = {
"s7_cuisinier": {
  "kind": "scene_porte",
  "axis": "S/N",
  "body": "Dernier bivouac avant l'arrivée. Le silence est lourd autour du feu. Le vieux Brodo, qui n'a presque pas parlé du voyage, vous sert un bol et raconte l'histoire d'une ancienne caravane qui a péri parce qu'elle transportait, sans le savoir, une marchandise illégale et maudite. Il vous fixe : « Et toi, convoyeur, quelle erreur fatale ont-ils commise ? »",
  "choices": [
    { "id": "A1_std", "text": "« Ils ont été négligents. Ils n'ont pas fouillé physiquement leurs propres charrettes. »", "tag": "clever", "nextNodeId": "t_s7_A1_std", "monsterComment": "Un pragmatisme pur et dur. L'œil de l'inspecteur.", "mbti": {"S": 2}, "temperaments": {}, "condition": { "flag": "boussole_ternie", "expected": false } },
    { "id": "A1_hid", "text": "[Boussole Ternie] « Ils n'ont pas fouillé le matériel. D'ailleurs, ma boussole réagit bizarrement depuis hier... »", "tag": "clever", "nextNodeId": "t_s7_A1_hid", "monsterComment": "Oh. La mémoire des détails paie enfin.", "mbti": {"S": 2}, "temperaments": {}, "condition": { "flag": "boussole_ternie", "expected": true } },
    
    { "id": "A2_std", "text": "« Une erreur de registre. Ils n'ont pas vérifié leur manifeste de cargaison. »", "tag": "neutral", "nextNodeId": "t_s7_A2_std", "monsterComment": "La bureaucratie avant tout. Tu aurais fait un bon greffier.", "mbti": {"S": 1}, "temperaments": {}, "condition": { "flag": "linguini_left", "expected": false } },
    { "id": "A2_hid", "text": "[Contrat de Linguini] « Puisque Linguini est parti, j'ai vérifié notre registre. Il y a une erreur. »", "tag": "neutral", "nextNodeId": "t_s7_A2_hid", "monsterComment": "L'opportunisme absolu. Tu assumes parfaitement ton nouveau rôle.", "mbti": {"S": 1}, "temperaments": {}, "condition": { "flag": "linguini_left", "expected": true } },
    
    { "id": "B2_std", "text": "« Ils ont fait confiance à la mauvaise personne. Le danger vient toujours de l'intérieur. »", "tag": "safe", "nextNodeId": "t_s7_B2_std", "monsterComment": "L'intuition relationnelle. Tu lis les gens, pas les cartes.", "mbti": {"N": 1}, "temperaments": {}, "condition": { "flag": "silex_trappeur", "expected": false } },
    { "id": "B2_hid", "text": "[Silex de Trappeur] « Ils étaient aveugles. Comme ce silex que tu m'as donné, Brodo : le feu révèle ce qui est caché. »", "tag": "safe", "nextNodeId": "t_s7_B2_hid", "monsterComment": "Utiliser un cadeau comme métaphore. Une flatterie psychologique brillante.", "mbti": {"N": 1}, "temperaments": {"compassion": 0.5}, "condition": { "flag": "silex_trappeur", "expected": true } },
    
    { "id": "B1_std", "text": "« La cupidité attire la mort. C'est le destin qui punit l'avidité des hommes. »", "tag": "wrong", "nextNodeId": "t_s7_B1_std", "monsterComment": "Une fable abstraite. Les concepts avant la réalité.", "mbti": {"N": 2}, "temperaments": {}, "condition": { "flag": "grogno_dead", "expected": true } },
    { "id": "B1_hid", "text": "« L'or est un poison. C'est l'avidité des marchands qui a scellé leur destin. » (Fixer Grogno)", "tag": "wrong", "nextNodeId": "t_s7_B1_hid", "monsterComment": "La provocation philosophique. Osé, {nickname}.", "mbti": {"N": 2}, "temperaments": {"malice": 0.5}, "condition": { "flag": "grogno_dead", "expected": false } }
  ]
},
"t_s7_A1_std": {
  "kind": "tampon",
  "body": "Brodo hoche lentement la tête. Touché par votre esprit concret, il s'approche et vous murmure l'emplacement d'une cachette sûre sous un tonneau, une fois arrivé à Risoletto.",
  "choices": [ { "id": "c1", "text": "En prendre note", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_A1_hid": {
  "kind": "tampon",
  "body": "Vous sortez la boussole ternie. Autour du feu, l'aiguille se met à tourner follement dès que vous la pointez vers la charrette de Cannella. Quelque chose de lourdement magnétique (ou pire) y est dissimulé.\nLe Monstre apparaît : « Tiens. Ton déchet rocailleux sert finalement à quelque chose. L'intrigue s'épaissit, {nickname}. Garde cette information pour demain. »",
  "choices": [ { "id": "c1", "text": "Ranger la boussole discrètement", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_A2_std": {
  "kind": "tampon",
  "body": "« Les papiers ne mentent pas », acquiesce Brodo avec un soupir lourd.",
  "choices": [ { "id": "c1", "text": "Continuer", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_A2_hid": {
  "kind": "tampon",
  "body": "Vous sortez le registre de l'exilé Linguini à la lueur des flammes. Vous pointez une anomalie : 100 kilos de « soieries » non justifiées sont déclarés dans le chariot de Penne. Brodo fronce les sourcils.\nLe Monstre flotte dans l'ombre : « Tu as chassé le comptable pour devenir le comptable. Et tu as trouvé une belle anomalie dans leur mascarade. Bravo. »",
  "choices": [ { "id": "c1", "text": "Fermer le registre en silence", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_B2_std": {
  "kind": "tampon",
  "body": "Un silence paranoïaque s'installe autour du feu. Les marchands se regardent les uns les autres du coin de l'œil, soudain méfiants.",
  "choices": [ { "id": "c1", "text": "Se taire", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_B2_hid": {
  "kind": "tampon",
  "body": "Flatté que vous utilisiez son cadeau, Brodo brise son habituel mutisme. Il s'approche et vous glisse à l'oreille : « Ne bois pas le vin que Cannella t'offrira demain. Elle a menti sur la région dont elle vient. »\nLe Monstre sourit : « La paranoïa s'installe doucement. J'aime beaucoup la tournure de cette pièce. »",
  "choices": [ { "id": "c1", "text": "Hocher la tête", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_B1_std": {
  "kind": "tampon",
  "body": "Les marchands épuisés soupirent face à cette leçon morale.\nLe Monstre pouffe : « Une fable poétique à des gens qui dorment dans la boue ? Tu as perdu ton auditoire, poète. »",
  "choices": [ { "id": "c1", "text": "Aller dormir", "tag": "neutral", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_B1_hid": {
  "kind": "tampon",
  "body": "Votre tirade morale exaspère Grogno. « Des conneries de poète ! » crache-t-il. « Je vais vérifier ma propre came, au moins l'or ne ment pas. » Il s'éloigne dans l'obscurité pour fouiller sa charrette. Soudain, un bruit de rupture sèche retentit. Les lourds rondins mal arrimés de son chariot s'effondrent sur lui. Il meurt écrasé.\nLe Monstre apparaît, estomaqué : « Voilà. Tu as littéralement tué un homme avec de la mauvaise philosophie, {nickname}. Je n'aurais pas osé. Rideau pour Grogno. »",
  "flags": { "grogno_dead": true },
  "choices": [ { "id": "c1", "text": "Assumer le chaos", "tag": "bold", "nextNodeId": "t_s7_funnel", "mbti": {}, "temperaments": {} } ]
},
"t_s7_funnel": {
  "kind": "tampon",
  "body": "La nuit s'achève sur d'étranges révélations. Le lendemain, la caravane repart pour l'ultime ligne droite vers Risoletto. L'histoire de Brodo a laissé une trace indélébile de suspicion dans les esprits.",
  "choices": [ { "id": "c1", "text": "Prendre la route", "tag": "neutral", "nextNodeId": "s8_philosophie", "monsterComment": "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance.", "mbti": {}, "temperaments": {} } ]
}
};
Object.assign(data.nodes, scene7);

// ======== SCENE 8 (Patch 7) ========
delete data.nodes['s8_concurrente_placeholder'];

const scene8 = {
"s8_philosophie": {
      "kind": "scene_porte",
      "body": "Une caravane majestueuse vous rattrape. Ses bêtes sont disciplinées, ses roues silencieuses. Son chef, l'illustre Vittorio, fait stopper son convoi à votre niveau. Il descend, observe votre groupe boueux, et vous tend une outre d'eau fraîche avec un sourire respectueux. « Une question, confrère... » dit-il. « Tirez-vous ces charrettes pour l'amour et la maîtrise de la route, ou simplement pour l'or qui vous attend à l'arrivée ? » Penne vous regarde, buvant vos paroles.",
      "choices": [
        { "id": "A1", "text": "« Pour l'or. La route n'est qu'un outil, seul le résultat compte. »", "tag": "clever", "nextNodeId": "t_s8_phil_or", "monsterComment": "Un pragmatisme assumé. Tu as le cœur aussi sec qu'un livre de comptes.", "mbti": {}, "temperaments": {"malice": 0.5} },
        { "id": "A2", "text": "« Pour la maîtrise. L'or se dépense, l'expérience reste. »", "tag": "bold", "nextNodeId": "t_s8_phil_maitrise", "monsterComment": "L'idéaliste prend la parole. Une belle phrase pour quelqu'un couvert de boue.", "mbti": {}, "temperaments": {"courage": 0.5} },
        { "id": "B2", "text": "« Pour eux. Je ne tire pas des charrettes, je protecte mes gens. »", "tag": "safe", "nextNodeId": "t_s8_phil_gens", "monsterComment": "Le berger et son troupeau. C'est presque émouvant, {nickname}.", "mbti": {}, "temperaments": {"compassion": 1} },
        { "id": "B1", "text": "« Je n'en ai aucune idée. J'avance, c'est tout. »", "tag": "wrong", "nextNodeId": "t_s8_phil_rien", "monsterComment": "La crise existentielle au milieu de la poussière. Merveilleux.", "mbti": {}, "temperaments": {} }
      ]
    },
    "t_s8_phil_or": {
      "kind": "tampon",
      "body": "Vittorio hoche la tête, appréciant votre honnêteté brutale. Penne, derrière vous, semble soudain très abattu par cette vision cynique du voyage. Il baisse les yeux, remettant ses propres choix en question.",
      "choices": [ { "id": "c1", "text": "Attendre la suite", "tag": "neutral", "nextNodeId": "s8_course", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_phil_maitrise": {
      "kind": "tampon",
      "body": "Vittorio sourit grandement. « Un confrère puriste. C'est rare. » Derrière vous, Brodo le vieux cuisinier laisse échapper un très rare ricanement d'approbation.",
      "choices": [ { "id": "c1", "text": "Attendre la suite", "tag": "neutral", "nextNodeId": "s8_course", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_phil_gens": {
      "kind": "tampon",
      "body": "Vittorio vous observe avec un respect nouveau, presque solennel. Cannella, touchée dans son orgueil de marchande, détourne le regard, mais son hostilité s'apaise visiblement.",
      "choices": [ { "id": "c1", "text": "Attendre la suite", "tag": "neutral", "nextNodeId": "s8_course", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_phil_rien": {
      "kind": "tampon",
      "body": "Vittorio éclate de rire. « L'honnêteté de l'absurde ! » Toute votre caravane soupire, consternée par votre manque absolu de vision.",
      "choices": [ { "id": "c1", "text": "Attendre la suite", "tag": "neutral", "nextNodeId": "s8_course", "mbti": {}, "temperaments": {} } ]
    },
    "s8_course": {
      "kind": "scene_porte",
      "axis": "S/N",
      "body": "Vittorio remonte sur son chariot. « Assez discuté. Le premier arrivé au sommet de la Colline des Soupirs gagne le droit d'entrer en premier à Risoletto. » Sa caravane démarre sur les chapeaux de roues avec une organisation militaire stupéfiante. C'est le moment de réagir.",
      "choices": [
        { "id": "A1_ling", "text": "[Linguini est là] Calquer exactement notre formation et notre rythme sur les siens.", "tag": "clever", "nextNodeId": "t_s8_A1_linguini", "monsterComment": "Copier l'expert à la lettre. Le triomphe de la méthode.", "mbti": {"S": 2}, "temperaments": {}, "condition": { "flag": "linguini_left", "expected": false } },
        { "id": "A1_noling", "text": "[Linguini est parti] Tenter de copier son organisation parfaite nous-mêmes.", "tag": "wrong", "nextNodeId": "t_s8_A1_nolinguini", "monsterComment": "Copier un expert sans avoir le cerveau pour le faire. Un désastre en approche.", "mbti": {"S": 2}, "temperaments": {}, "condition": { "flag": "linguini_left", "expected": true } },
        
        { "id": "A2_grogno", "text": "[Grogno est vivant] Adapter son rythme sans changer notre formation.", "tag": "neutral", "nextNodeId": "t_s8_A2_grogno", "monsterComment": "Un compromis prudent. On accélère sans tout casser.", "mbti": {"S": 1}, "temperaments": {}, "condition": { "flag": "grogno_dead", "expected": false } },
        { "id": "A2_nogrogno", "text": "[Grogno est mort] Adapter son rythme. Sans Grogno, on est plus légers.", "tag": "neutral", "nextNodeId": "t_s8_A2_nogrogno", "monsterComment": "L'avantage macabre du convoi réduit. Cynique mais efficace.", "mbti": {"S": 1}, "temperaments": {}, "condition": { "flag": "grogno_dead", "expected": true } },
        
        { "id": "B2_std", "text": "Ignorer sa course. Chercher un chemin intuitif à travers la brume des bas-fonds.", "tag": "safe", "nextNodeId": "t_s8_B2_std", "monsterComment": "L'intuition face à la mécanique. Tu joues aux dés avec le brouillard.", "mbti": {"N": 1}, "temperaments": {}, "condition": { "flag": "boussole_ternie", "expected": false } },
        { "id": "B2_bous", "text": "[Boussole] Se fier à la boussole pour tracer un chemin parfait dans la brume.", "tag": "bold", "nextNodeId": "t_s8_B2_boussole", "monsterComment": "Enfin. Ton gadget inutile devient ton salut. J'adore les retournements de situation.", "mbti": {"N": 1}, "temperaments": {"malice": 0.5}, "condition": { "flag": "boussole_ternie", "expected": true } },
        
        { "id": "B1_std", "text": "Couper tout droit à travers le ravin rocheux. L'instinct pur, sans réfléchir.", "tag": "wrong", "nextNodeId": "t_s8_B1_std", "monsterComment": "Le suicide tactique. Tu vas briser tes charrettes pour une question d'ego.", "mbti": {"N": 2}, "temperaments": {"courage": 0.5} }
      ]
    },
    "t_s8_A1_linguini": {
      "kind": "tampon",
      "body": "Linguini exulte. Carnet en main, il analyse l'écartement des roues de Vittorio et réaligne parfaitement vos charrettes dans leurs sillages. Vous profitez de leur aspiration. L'efficacité est totale, vos bêtes ne forcent presque pas. Vous arrivez au sommet exactement en même temps.",
      "choices": [ { "id": "c1", "text": "Savourer l'efficacité", "tag": "neutral", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_A1_nolinguini": {
      "kind": "tampon",
      "body": "C'est la catastrophe. Sans Linguini pour calculer les charges, vous ordonnez des réalignements absurdes. Les essieux grincent, Cannella hurle de terreur alors que sa charrette vacille. Vous perdez un temps infini à imiter une perfection que vous ne maîtrisez pas. Vittorio gagne avec deux heures d'avance.",
      "choices": [ { "id": "c1", "text": "Assumer l'humiliation", "tag": "neutral", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_A2_grogno": {
      "kind": "tampon",
      "body": "Vous ordonnez d'accélérer en vous allégeant, comme le fait Vittorio. Mais Grogno, consumé par l'avidité et la jalousie, refuse de jeter ses surplus. En tentant de tenir le rythme dans un lacet serré, sa roue surchargée percute un roc. La charrette se retourne avec fracas. Grogno est écrasé sous son propre or.\nLe Monstre apparaît : « La jalousie et la gravité. Un cocktail mortel. Adieu, Grogno. »",
      "flags": { "grogno_dead": true },
      "choices": [ { "id": "c1", "text": "Laisser le corps et finir la montée", "tag": "bold", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_A2_nogrogno": {
      "kind": "tampon",
      "body": "Vous accélérez le rythme. Sans le poids mort (et les plaintes) de feu Grogno, la caravane est remarquablement agile. Penne souffre un peu, mais étonnamment, Cannella l'aide à stabiliser son chargement. Vous arrivez seconds, mais la cohésion est forte.",
      "choices": [ { "id": "c1", "text": "Reprendre son souffle", "tag": "neutral", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_B2_std": {
      "kind": "tampon",
      "body": "Vous plongez dans les bas-fonds brumeux, cherchant une voie parallèle à l'instinct. Le brouillard est épais. Vous tournez en rond pendant une heure avant de retrouver un sentier praticable. Vittorio a gagné depuis longtemps, mais vous avez évité la pression de la course.",
      "choices": [ { "id": "c1", "text": "Rejoindre le sommet lentement", "tag": "neutral", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_B2_boussole": {
      "kind": "tampon",
      "body": "La brume est épaisse, mais vous gardez les yeux rivés sur votre boussole réparée. Le magnétisme vous guide à travers un ancien chemin douanier parfaitement plat et caché de tous. Vous émergez de la brume au sommet de la Colline avec une heure d'avance sur Vittorio, qui n'en croit pas ses yeux.",
      "choices": [ { "id": "c1", "text": "Le saluer ironiquement", "tag": "clever", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_B1_std": {
      "kind": "tampon",
      "body": "Vous forcez les mules dans un ravin rocailleux extrêmement dangereux. Les charrettes rebondissent. Cannella est projetée contre une paroi et se blesse au bras. Vous êtes obligés de jeter un quart des vivres de Brodo pour alléger et sortir de ce piège. Un choix instinctif désastreux.",
      "choices": [ { "id": "c1", "text": "Constater les dégâts", "tag": "neutral", "nextNodeId": "t_s8_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s8_funnel": {
      "kind": "tampon",
      "body": "La course est terminée. Que vous soyez victorieux, humiliés ou endeuillés, la caravane est réunie au sommet de la Colline des Soupirs. En contrebas, s'étalant dans la vallée dorée par le crépuscule, les toits de Risoletto apparaissent enfin. C'est la fin du voyage. Ou presque.",
      "choices": [ { "id": "c1", "text": "Descendre vers la ville", "tag": "neutral", "nextNodeId": "s9_veuve", "monsterComment": "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin.", "mbti": {}, "temperaments": {} } ]
    }
};
Object.assign(data.nodes, scene8);

// ======== SCENE 9 (Patch 8) ========
delete data.nodes['s9_veuve_placeholder'];

const scene9 = {
"s9_veuve": {
      "kind": "scene_porte",
      "axis": "T/F",
      "body": "Sur le pont de pierre menant aux portes de Risoletto, une vieille femme vêtue de noir bloque silencieusement le passage. Elle fixe le vide. « La route m'a pris mon mari il y a vingt ans », murmure-t-elle. « La route a une dette. Un péage de sang ou d'or. Une pièce par marchand... ou une âme. » La caravane se fige.",
      "choices": [
        { "id": "A1_grogno", "text": "[Grogno est vivant] Refuser fermement. Ce chantage est irrationnel.", "tag": "clever", "nextNodeId": "t_s9_A1_grogno", "monsterComment": "La logique face au drame. Implacable.", "mbti": {"T": 2}, "temperaments": {}, "condition": { "flag": "grogno_dead", "expected": false } },
        { "id": "A1_nogrogno", "text": "[Grogno est mort] Refuser net et avancer. Les morts ne font pas la loi.", "tag": "clever", "nextNodeId": "t_s9_A1_nogrogno", "monsterComment": "Froideur absolue. Tu marches sur les fantômes.", "mbti": {"T": 2}, "temperaments": {}, "condition": { "flag": "grogno_dead", "expected": true } },
        { "id": "A2", "text": "Négocier pragmatiquement et lui offrir des vivres au lieu de l'or.", "tag": "neutral", "nextNodeId": "t_s9_A2", "monsterComment": "Le marchandage. Moins héroïque, mais ça préserve la trésorerie.", "mbti": {"T": 1}, "temperaments": {} },
        { "id": "B2", "text": "Payer la pièce pour chaque marchand, par respect pour son deuil.", "tag": "safe", "nextNodeId": "t_s9_B2", "monsterComment": "L'empathie coûte cher, mais elle achète la paix de l'esprit.", "mbti": {"F": 1}, "temperaments": {"compassion": 0.5} },
        { "id": "B1", "text": "Prendre toute la culpabilité de la route et offrir votre propre vie au vide.", "tag": "bold", "nextNodeId": "t_s9_B1_suicide", "monsterComment": "Pardon ? Tu sors du script ?", "mbti": {"F": 2}, "temperaments": {"courage": 1, "compassion": 1} }
      ]
    },
    "t_s9_A1_grogno": {
      "kind": "tampon",
      "body": "Vous refusez. Grogno, furieux qu'on lui réclame son or, force le passage et bouscule la vieille femme. En reculant violemment, il pose le pied sur une poutre pourrie. Le bois cède. Grogno disparaît dans les douves avec un long hurlement. La veuve s'écarte, satisfaite. Le péage de sang est payé.\nLe Monstre flotte au-dessus du pont : « Eh bien. Sa radinerie aura finalement été utile à la communauté. Paix à son âme. Bref, on avance. »",
      "flags": { "grogno_dead": true },
      "choices": [ { "id": "c1", "text": "Franchir les portes", "tag": "neutral", "nextNodeId": "t_s9_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s9_A1_nogrogno": {
      "kind": "tampon",
      "body": "Vous refusez et ordonnez d'avancer. La vieille femme lève une main tremblante. Terrifié par ce geste, Penne jette précipitamment sa propre bourse d'or à ses pieds pour acheter la paix, se ruinant presque. Vous passez sans un mot.",
      "choices": [ { "id": "c1", "text": "Franchir les portes", "tag": "neutral", "nextNodeId": "t_s9_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s9_A2": {
      "kind": "tampon",
      "body": "Brodo, comprenant votre stratégie, dépose deux caisses de vivres frais aux pieds de la femme. Elle les accepte en silence. Vous avez économisé votre or, mais la caravane dîne le ventre vide ce soir.",
      "choices": [ { "id": "c1", "text": "Franchir les portes", "tag": "neutral", "nextNodeId": "t_s9_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s9_B2": {
      "kind": "tampon",
      "body": "Vous rassemblez l'or. En recevant les pièces, la femme vous glisse un étrange petit médaillon en bois sculpté dans la main. « Pour la pureté de votre âme », murmure-t-elle en s'effaçant.",
      "flags": { "medaillon_veuve": true },
      "choices": [ { "id": "c1", "text": "Franchir les portes", "tag": "neutral", "nextNodeId": "t_s9_funnel", "mbti": {}, "temperaments": {} } ]
    },
    "t_s9_B1_suicide": {
      "kind": "tampon",
      "body": "Vous vous avancez sur le parapet de pierre. Penne hurle votre nom, mais c'est trop tard. Pour le salut de la caravane, vous vous laissez tomber dans les eaux tumultueuses en contrebas. Le noir vous engloutit.\nLe Monstre apparaît, complètement abasourdi : « Tu te sacrifies pour des figurants ? C'est la fin la plus absurde, la plus illogique et la plus magnifique que j'aie jamais vue. Rien ne t'y obligeait. Chapeau bas, l'artiste. Rideau. »",
      "choices": [ { "id": "c1", "text": "Fermer les yeux (Renaître)", "tag": "bold", "nextNodeId": "g1_eveil", "action": "reset", "mbti": {}, "temperaments": {} } ]
    },
    "t_s9_funnel": {
      "kind": "tampon",
      "body": "Les portes massives de Risoletto s'ouvrent enfin devant vous. Les rues sont bondées, la musique résonne. C'est l'heure de la foire annuelle. La caravane a atteint son but. Mais l'air semble soudain étonnamment lourd.",
      "choices": [ { "id": "c1", "text": "Entrer dans la ville", "tag": "neutral", "nextNodeId": "s10_foire_placeholder", "monsterComment": "On y est. La ligne d'arrivée. Profite de la fête, {nickname}. La dernière scène approche.", "mbti": {}, "temperaments": {} } ]
    },
    "s10_foire_placeholder": {
      "kind": "scene_porte_placeholder",
      "body": "[PROCHAIN PATCH] Au cœur de la foire, l'ambiance est à la célébration. Vos compagnons vous proposent différentes manières de fêter ça...",
      "choices": [ { "id": "c1", "text": "Attendre le prochain chapitre", "tag": "neutral", "nextNodeId": "s10_foire_placeholder", "mbti": {}, "temperaments": {} } ]
    }
};

Object.assign(data.nodes, scene9);

// Adding ids manually since they were omitted in the provided blocks
for (const [id, node] of Object.entries(data.nodes)) {
    if (!node.id) {
        node.id = id;
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Patches 6, 7 and 8 applied!');
