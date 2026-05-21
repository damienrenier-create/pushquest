# Rapport Exhaustif de l'Arborescence du Gamebook


=========================================================
🎬 SCÈNE PRINCIPALE : g1_eveil
=========================================================
📦 NŒUD : g1_eveil (genese)
  👉 Choix : "Tu avances." -> g2_rencontre
    📦 NŒUD : g2_rencontre (genese)
      👉 Choix : "De quoi parles-tu ?" -> g3_briefing
        📦 NŒUD : g3_briefing (genese)
          👉 Choix : "Et si je refuse ?" -> g4_faux_choix
            📦 NŒUD : g4_faux_choix (genese)
              👉 Choix : "Je la prends." -> s1_bagolio
                  👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                  (Rejoint la scène : s1_bagolio)

=========================================================
🎬 SCÈNE PRINCIPALE : s1_bagolio
=========================================================
📦 NŒUD : s1_bagolio (scene_porte)
  👉 Choix : "Tu te plantes au milieu de la cour, tu lèves les bras, et tu te présentes à tout le monde en parlant fort." -> t_s1_A1
    📦 NŒUD : t_s1_A1 (tampon)
      👉 Choix : "Tu rejoins le feu pour discuter de la suite." -> s2_planification
          (Rejoint la scène : s2_planification)
  👉 Choix : "Tu te diriges vers la table la plus animée, tu salues, tu te glisses dans la conversation." -> t_s1_A2
    📦 NŒUD : t_s1_A2 (tampon)
      👉 Choix : "Le soir tombe, il faut planifier la route." -> s2_planification
          (Rejoint la scène : s2_planification)
  👉 Choix : "Tu fais le tour discrètement, tu observes qui parle à qui, tu essaies de comprendre les dynamiques." -> t_s1_B2
    📦 NŒUD : t_s1_B2 (tampon)
      👉 Choix : "Tu t'approches du feu, prêt à organiser la suite." -> s2_planification
          (Rejoint la scène : s2_planification)
  👉 Choix : "Tu t'installes près du feu en silence, tu attends que quelqu'un vienne te voir." -> t_s1_B1
    📦 NŒUD : t_s1_B1 (tampon)
      👉 Choix : "Continuer" -> t_s1_B1_inter1
          👁️ Monstre (bandeau): "Bon. Tu t'assois. Tu ne dis rien. Très bien. On fait du théâtre contemplatif, je respecte le parti pris."
        📦 NŒUD : t_s1_B1_inter1 (tampon)
          👉 Choix : "Écouter distraitement la conversation de Penne." -> s2_planification
              👁️ Monstre (bandeau): "C'est passif, mais au moins tu utilises tes oreilles. Bref, la nuit tombe."
              (Rejoint la scène : s2_planification)
          👉 Choix : "Nettoyer la terre sous vos ongles." -> s2_planification
              👁️ Monstre (bandeau): "Passionnant. Quel développement de personnage. On avance."
              (Rejoint la scène : s2_planification)
          👉 Choix : "Fixer le fond de votre chope vide." -> s2_planification
              👁️ Monstre (bandeau): "Très bien, le cliché du rôdeur mystérieux. Ça passe. La suite."
              (Rejoint la scène : s2_planification)
          👉 Choix : "S'enfoncer dans une immobilité et un mutisme absolus." -> t_s1_B1_inter2
            📦 NŒUD : t_s1_B1_inter2 (tampon)
              👉 Choix : "Méditer intensément sur le grain du bois de la table." -> s2_planification
                  👁️ Monstre (bandeau): "Magnifique. Une masterclass d'inaction. Heureusement que j'ai le contrôle de l'horloge. Le décor se transforme doucement."
                  (Rejoint la scène : s2_planification)
              👉 Choix : "Se demander si l'aubergiste remarque votre immobilité." -> s2_planification
                  👁️ Monstre (bandeau): "Magnifique. Une masterclass d'inaction. Heureusement que j'ai le contrôle de l'horloge. Le décor se transforme doucement."
                  (Rejoint la scène : s2_planification)
              👉 Choix : "Apprécier n'avoir aucune responsabilité pour l'instant." -> s2_planification
                  👁️ Monstre (bandeau): "Magnifique. Une masterclass d'inaction. Heureusement que j'ai le contrôle de l'horloge. Le décor se transforme doucement."
                  (Rejoint la scène : s2_planification)
              👉 Choix : "Maintenir cette paralysie pour voir qui du temps ou de vous cèdera." -> s2_planification
                  👁️ Monstre (bandeau): "Magnifique. Une masterclass d'inaction. Heureusement que j'ai le contrôle de l'horloge. Le décor se transforme doucement."
                  (Rejoint la scène : s2_planification)

=========================================================
🎬 SCÈNE PRINCIPALE : s2_planification
=========================================================
📦 NŒUD : s2_planification (scene_porte)
  👉 Choix : "Tracer un itinéraire complet, heure par heure (20 min)." -> t_s2_A1
      👁️ Monstre (bandeau): "Tu viens de transformer mon aventure en tableur comptable, {nickname}."
    📦 NŒUD : t_s2_A1 (tampon)
      👉 Choix : "Continuer" -> t_s2_A1_inter1
        📦 NŒUD : t_s2_A1_inter1 (tampon)
          👉 Choix : "Imposer un couvre-feu immédiat." -> t_s2_A1_inter2
            📦 NŒUD : t_s2_A1_inter2 (tampon)
              👉 Choix : "La caravane s'ébranle" -> s3_confidence
                  👁️ Monstre (bandeau): "Tu as voulu diriger cette caravane comme un camp de redressement. Résultat : des déserteurs. Bref. Le soleil se lève."
                  (Rejoint la scène : s3_confidence)
          👉 Choix : "Assigner des tours de garde avec mots de passe." -> t_s2_A1_inter2
            📦 NŒUD : t_s2_A1_inter2 (tampon)
              👉 Choix : "La caravane s'ébranle" -> s3_confidence
                  👁️ Monstre (bandeau): "Tu as voulu diriger cette caravane comme un camp de redressement. Résultat : des déserteurs. Bref. Le soleil se lève."
                  (Rejoint la scène : s3_confidence)
          👉 Choix : "Confisquer la flasque de vin de Penne." -> t_s2_A1_inter2
            📦 NŒUD : t_s2_A1_inter2 (tampon)
              👉 Choix : "La caravane s'ébranle" -> s3_confidence
                  👁️ Monstre (bandeau): "Tu as voulu diriger cette caravane comme un camp de redressement. Résultat : des déserteurs. Bref. Le soleil se lève."
                  (Rejoint la scène : s3_confidence)
  👉 Choix : "Fixer 3 grandes étapes, et garder le reste flexible." -> t_s2_A2
      👁️ Monstre (bandeau): "Un compromis de centriste. Pourquoi pas."
    📦 NŒUD : t_s2_A2 (tampon)
      👉 Choix : "Le lendemain" -> s3_confidence
          (Rejoint la scène : s3_confidence)
  👉 Choix : "Donner une direction générale, on décidera en route." -> t_s2_B2
      👁️ Monstre (bandeau): "L'improvisation. J'aime l'idée, même si Cannella te regarde de travers."
    📦 NŒUD : t_s2_B2 (tampon)
      👉 Choix : "Le lendemain" -> s3_confidence
          (Rejoint la scène : s3_confidence)
  👉 Choix : "« On verra bien demain matin. »" -> t_s2_B1
      👁️ Monstre (bandeau): "Le chaos absolu. Magnifique."
    📦 NŒUD : t_s2_B1 (tampon)
      👉 Choix : "La caravane s'ébranle" -> s3_confidence
          👁️ Monstre (bandeau): "Ton laxisme a fait fuir des figurants. C'est dommage, l'un d'eux avait une belle moustache. On avance."
          (Rejoint la scène : s3_confidence)

=========================================================
🎬 SCÈNE PRINCIPALE : s3_confidence
=========================================================
📦 NŒUD : s3_confidence (scene_porte)
  👉 Choix : "« Si tu pars, tu perds la prime. Reste, termine la livraison et soigne-la après. »" -> t_s3_A1
      👁️ Monstre (bandeau): "Clinique. Implacable. Tu as l'empathie d'un caillou, {nickname}."
    📦 NŒUD : t_s3_A1 (tampon)
      👉 Choix : "Continuer" -> t_s3_A1_inter1
        📦 NŒUD : t_s3_A1_inter1 (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, un boulier imaginaire dans les mains.
« Puisqu'on gère les émotions sur un tableur, qu'est-ce qu'on optimise d'autre aujourd'hui ? »"
          👉 Choix : "Calculer le retour sur investissement du deuil de Penne." -> s4_traces
              (Rejoint la scène : s4_traces)
          👉 Choix : "Proposer de facturer ses larmes au litre." -> s4_traces
              (Rejoint la scène : s4_traces)
          👉 Choix : "Planifier la revente des biens de sa sœur, "au cas où"." -> s4_traces
              (Rejoint la scène : s4_traces)
  👉 Choix : "« Je peux t'avancer une partie de l'argent de ma propre prime, si ça t'aide. »" -> t_s3_A2
      👁️ Monstre (bandeau): "Un compromis pragmatique. Très bien."
    📦 NŒUD : t_s3_A2 (tampon)
      👉 Choix : "Reprendre la route" -> s4_traces
          (Rejoint la scène : s4_traces)
  👉 Choix : "« C'est terrible. Je comprends ta douleur, c'est un choix impossible... »" -> t_s3_B2
      👁️ Monstre (bandeau): "Beaucoup de mots tendres, aucune solution matérielle. J'adore."
    📦 NŒUD : t_s3_B2 (tampon)
      👉 Choix : "Reprendre la route" -> s4_traces
          (Rejoint la scène : s4_traces)
  👉 Choix : "« Ne t'inquiète pas. Je te promets d'aller moi-même m'occuper de ta sœur après la mission. »" -> t_s3_B1
      👁️ Monstre (bandeau): "Oh. La promesse intenable du chevalier blanc."
    📦 NŒUD : t_s3_B1 (tampon)
      👉 Choix : "Continuer" -> t_s3_B1_inter1
        📦 NŒUD : t_s3_B1_inter1 (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte au-dessus de vous, l'air consterné.
« C'est ça. Promets de sauver tout le monde. Tu veux que je te rajoute une auréole tout de suite ? Qui d'autre vas-tu sauver aujourd'hui ? »"
          👉 Choix : "Promettre de soigner le genou arthritique de Linguini." -> s4_traces
              (Rejoint la scène : s4_traces)
          👉 Choix : "Jurer de repeindre personnellement la charrette de Cannella." -> s4_traces
              (Rejoint la scène : s4_traces)
          👉 Choix : "Proposer d'adopter légalement tous les enfants des marchands." -> s4_traces
              (Rejoint la scène : s4_traces)

=========================================================
🎬 SCÈNE PRINCIPALE : s4_traces
=========================================================
📦 NŒUD : s4_traces (scene_porte)
  👉 Choix : "Examiner minutieusement chaque trace (taille, profondeur)." -> t_s4_A1
      👁️ Monstre (bandeau): "Une analyse digne d'un médecin légiste de la forêt."
    📦 NŒUD : t_s4_A1 (tampon)
      👉 Choix : "Continuer l'analyse" -> t_s4_A1_inter1
        📦 NŒUD : t_s4_A1_inter1 (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte au-dessus de vous. « Tu veux qu'on mesure le pH de la terre aussi, {nickname} ? Puisqu'on est dans la science pure, que fais-tu de plus ? »"
          👉 Choix : "Goûter la cendre pour estimer l'heure exacte du feu." -> t_s4_A1_inter2
            📦 NŒUD : t_s4_A1_inter2 (tampon)
              👉 Choix : "Reprendre la route" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Merveilleux. La science a parlé, et elle n'a rien dit."
                  (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Mesurer l'angle de la branche avec un rapporteur imaginaire." -> t_s4_A1_inter2
            📦 NŒUD : t_s4_A1_inter2 (tampon)
              👉 Choix : "Reprendre la route" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Merveilleux. La science a parlé, et elle n'a rien dit."
                  (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Cataloguer l'espèce de chaque brin d'herbe écrasé." -> t_s4_A1_inter2
            📦 NŒUD : t_s4_A1_inter2 (tampon)
              👉 Choix : "Reprendre la route" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Merveilleux. La science a parlé, et elle n'a rien dit."
                  (Rejoint la scène : s5_pont_effondre)
  👉 Choix : "Faire un relevé rapide des faits, puis continuer." -> t_s4_A2
      👁️ Monstre (bandeau): "Rapide, pragmatique. Mais ton œil est attiré par autre chose..."
    📦 NŒUD : t_s4_A2 (tampon)
      👉 Choix : "Écarter les buissons" -> t_s4_A2_hole
        📦 NŒUD : t_s4_A2_hole (tampon)
          👉 Choix : "S'approcher" -> t_s4_A2_inter1
              👁️ Monstre (bandeau): "Un trou géant et mystérieux au milieu de nulle part. C'est un classique de la mise en scène. La vraie question c'est : qu'est-ce que tu vas faire de ça ?"
            📦 NŒUD : t_s4_A2_inter1 (tampon)
              👉 Choix : "Lancer un caillou et attendre le "plouf"." -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Puéril, mais prudent. On reprend la route."
                  (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Hurler dedans pour réveiller ce qui y dort." -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Écho pathétique. Bref, on avance."
                  (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Parier 5 pièces avec Penne qu'il n'osera pas y mettre la tête." -> s5_pont_effondre
                  👁️ Monstre (bandeau): "L'intimidation amicale. J'aime bien. On y va."
                  (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Parier avec Penne que vous pouvez sauter dedans et atterrir en douceur." -> t_s4_A2_inter2
                📦 NŒUD : t_s4_A2_inter2 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît : « L'acteur principal vient de se jeter dans un trou pour un pari. Formidable. Fermez le rideau. Remboursez le public... Non, je plaisante. Ouvre les yeux, {nickname}. »"
                  👉 Choix : "Ouvrir les yeux" -> t_s4_A2_inter3
                    📦 NŒUD : t_s4_A2_inter3 (tampon)
                      👉 Choix : "Rejoindre le convoi" -> s5_pont_effondre
                          (Rejoint la scène : s5_pont_effondre)
  👉 Choix : "Relier ces indices pour essayer de deviner un pattern." -> t_s4_B2
      👁️ Monstre (bandeau): "L'appel du hors-piste. Vas-y, montre-moi ce que tu vaux en improvisation pure, {nickname}."
    📦 NŒUD : t_s4_B2 (tampon)
      👉 Choix : "Faire demi-tour, c'est trop risqué." -> s5_pont_effondre
          👁️ Monstre (bandeau): "Sage décision. L'histoire principale t'attend de toute façon."
          (Rejoint la scène : s5_pont_effondre)
      👉 Choix : "Suivre Risotto dans les bois." -> t_s4_B2_inter1
          👁️ Monstre (bandeau): "Tu t'enfonces dans les ténèbres, {nickname}. Très bien."
        📦 NŒUD : t_s4_B2_inter1 (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte au-dessus : « Le décor se referme. J'aime beaucoup cette tension. »"
          👉 Choix : "Examiner le buisson d'épines." -> t_s4_B2_inter2
            📦 NŒUD : t_s4_B2_inter2 (tampon)
              👉 Choix : "Courir aveuglément après Risotto." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Hurler son nom dans la forêt." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Demander à Risotto ce qu'il voit." -> t_s4_B2_inter2
            📦 NŒUD : t_s4_B2_inter2 (tampon)
              👉 Choix : "Courir aveuglément après Risotto." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Hurler son nom dans la forêt." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Dégainer votre arme, aux aguets." -> t_s4_B2_inter2
            📦 NŒUD : t_s4_B2_inter2 (tampon)
              👉 Choix : "Courir aveuglément après Risotto." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
              👉 Choix : "Hurler son nom dans la forêt." -> t_s4_B2_inter3
                📦 NŒUD : t_s4_B2_inter3 (tampon)
                  ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, la voix anormalement grave : « ... Ce n'était pas dans mon script, ça. Rentre au campement, {nickname}. Tout de suite. Ne te retourne pas. »"
                  👉 Choix : "Fuir vers le sentier" -> s5_pont_effondre
                      (Rejoint la scène : s5_pont_effondre)
  👉 Choix : "Imaginer immédiatement un scénario global dramatique." -> t_s4_B1
      👁️ Monstre (bandeau): "Ah, l'imagination. Sans aucune preuve, tu viens d'inventer une conspiration."
    📦 NŒUD : t_s4_B1 (tampon)
      👉 Choix : "Donner l'alerte" -> t_s4_B1_inter1
        📦 NŒUD : t_s4_B1_inter1 (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre se moque : « Et si c'était juste un sanglier ? Comment communiques-tu ton immense découverte ? »"
          👉 Choix : "Hurler "EMBUSCADE !" et forcer la mise en cercle." -> t_s4_B1_inter2
            📦 NŒUD : t_s4_B1_inter2 (tampon)
              👉 Choix : "Reprendre la route, honteux" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Quel grand chef de guerre tu fais. Allez, on avance."
                  (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Affirmer à Cannella qu'une secte cannibale approche." -> t_s4_B1_inter2
            📦 NŒUD : t_s4_B1_inter2 (tampon)
              👉 Choix : "Reprendre la route, honteux" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Quel grand chef de guerre tu fais. Allez, on avance."
                  (Rejoint la scène : s5_pont_effondre)
          👉 Choix : "Dégainer une arme et charger les buissons au hasard." -> t_s4_B1_inter2
            📦 NŒUD : t_s4_B1_inter2 (tampon)
              👉 Choix : "Reprendre la route, honteux" -> s5_pont_effondre
                  👁️ Monstre (bandeau): "Quel grand chef de guerre tu fais. Allez, on avance."
                  (Rejoint la scène : s5_pont_effondre)

=========================================================
🎬 SCÈNE PRINCIPALE : s5_pont_effondre
=========================================================
📦 NŒUD : s5_pont_effondre (scene_porte)
  👉 Choix : "Organiser un chantier pour consolider les ruines (6h perdues)." -> t_s5_A1
      👁️ Monstre (bandeau): "Une obstination magnifique. Tu as plié la nature à ton tableur Excel."
    📦 NŒUD : t_s5_A1 (tampon)
      👉 Choix : "Ranger la corde et avancer" -> t_s5_bivouac
        📦 NŒUD : t_s5_bivouac (tampon)
          👉 Choix : "Essayer de dormir" -> s6_conflit
              👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
              (Rejoint la scène : s6_conflit)
  👉 Choix : "Faire un détour de 3h par les hauteurs rocailleuses." -> t_s5_A2
      👁️ Monstre (bandeau): "Le choix de la raison. C'est lent, c'est sûr, c'est presque ennuyeux."
    📦 NŒUD : t_s5_A2 (tampon)
      👉 Choix : "Prendre la boussole et continuer" -> t_s5_bivouac
        📦 NŒUD : t_s5_bivouac (tampon)
          👉 Choix : "Essayer de dormir" -> s6_conflit
              👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
              (Rejoint la scène : s6_conflit)
  👉 Choix : "Transformer un pin déraciné par la crue en pont de fortune." -> t_s5_B2
      👁️ Monstre (bandeau): "Faire le funambule sur un tronc mouillé au-dessus d'une mort certaine. J'adore."
    📦 NŒUD : t_s5_B2 (tampon)
      👉 Choix : "Voir la trouvaille de Brodo" -> t_s5_B2_trouvaille
        📦 NŒUD : t_s5_B2_trouvaille (tampon)
          ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte au-dessus de l'eau glaciale. « Prendre le temps de fouiller les poubelles de la rivière en frôlant la mort. J'adore. Que fais-tu de cette découverte, {nickname} ? »"
          👉 Choix : "« Tu l'as trouvé, Brodo. Garde-le. » (Respect)" -> t_s5_bivouac
              👁️ Monstre (bandeau): "Tu laisses l'accessoire au vieux figurant. L'avenir nous dira si c'était judicieux."
            📦 NŒUD : t_s5_bivouac (tampon)
              👉 Choix : "Essayer de dormir" -> s6_conflit
                  👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
                  (Rejoint la scène : s6_conflit)
          👉 Choix : "« Range ça, aide-moi à tirer la corde ! » (Impatience)" -> t_s5_bivouac
              👁️ Monstre (bandeau): "L'urgence avant la politesse. Tu viens de froisser un allié, mais on avance."
            📦 NŒUD : t_s5_bivouac (tampon)
              👉 Choix : "Essayer de dormir" -> s6_conflit
                  👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
                  (Rejoint la scène : s6_conflit)
          👉 Choix : "Prendre la bourse et la jeter à l'eau." -> t_s5_bivouac
              👁️ Monstre (bandeau): "Magnifique. Le type te montre sa trouvaille, tu la balances à la flotte. Une vraie performance."
            📦 NŒUD : t_s5_bivouac (tampon)
              👉 Choix : "Essayer de dormir" -> s6_conflit
                  👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
                  (Rejoint la scène : s6_conflit)
          👉 Choix : "Accepter le silex avec un signe de tête." -> t_s5_B2_silex_get
              👁️ Monstre (bandeau): "Tiens. Un accessoire qui atterrit dans tes poches. Garde ça précieusement."
            📦 NŒUD : t_s5_B2_silex_get (tampon)
              👉 Choix : "Rejoindre le camp" -> t_s5_bivouac
                📦 NŒUD : t_s5_bivouac (tampon)
                  👉 Choix : "Essayer de dormir" -> s6_conflit
                      👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
                      (Rejoint la scène : s6_conflit)
  👉 Choix : "Ignorer l'eau et tailler un raccourci à la machette dans la forêt." -> t_s5_B1
      👁️ Monstre (bandeau): "L'improvisation a ses limites, {nickname}. Et ses victimes."
    📦 NŒUD : t_s5_B1 (tampon)
      👉 Choix : "Laisser le corps et avancer dans le silence" -> t_s5_bivouac
        📦 NŒUD : t_s5_bivouac (tampon)
          👉 Choix : "Essayer de dormir" -> s6_conflit
              👁️ Monstre (bandeau): "Repose-toi, {nickname}. Écoute ce silence. C'est lourd, c'est froid, et tout le monde se regarde en chiens de faïence. Un vrai régal. Bref, dors."
              (Rejoint la scène : s6_conflit)

=========================================================
🎬 SCÈNE PRINCIPALE : s6_conflit
=========================================================
📦 NŒUD : s6_conflit (scene_porte)
  👉 Choix : "Analyser le contrat et donner raison à Linguini. Les faits sont les faits." -> t_s6_A1_confirm
      👁️ Monstre (bandeau): "La vérité clinique. Implacable."
    📦 NŒUD : t_s6_A1_confirm (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît : « Tu as le scalpel en main, {nickname}. On s'arrête là, ou on l'achève ? »"
      👉 Choix : "Exiger que Penne s'excuse publiquement envers Linguini." -> t_s6_A1_extend
          👁️ Monstre (bandeau): "Magnifique. Une cruauté parfaitement procédurière."
        📦 NŒUD : t_s6_A1_extend (tampon)
          👉 Choix : "« Les chiffres disent que tu as tort. C'est tout. »" -> t_s6_A1_climax
              👁️ Monstre (bandeau): "Tranchant jusqu'à l'os. Tu n'as pas de cœur, tu as un boulier."
            📦 NŒUD : t_s6_A1_climax (tampon)
              👉 Choix : "Ranger le Sceau" -> t_s6_funnel
                  👁️ Monstre (bandeau): "L'intégrité clinique paie. Tu as gagné le respect du vieux loup et un passe-droit. Bon. Garde ça précieusement."
                📦 NŒUD : t_s6_funnel (tampon)
                  👉 Choix : "Prendre la route" -> s7_cuisinier
                      👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                      (Rejoint la scène : s7_cuisinier)
          👉 Choix : "« C'était pour l'exemple. Ne le prends pas personnellement. »" -> t_s6_funnel
              👁️ Monstre (bandeau): "Un tout petit sursaut d'empathie à la dernière seconde ? C'est noté."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
      👉 Choix : "Tapoter l'épaule de Penne pour le consoler." -> t_s6_funnel
          👁️ Monstre (bandeau): "Tu tranches avec la loi et tu mets un pansement affectif ? Quelle inconstance. Bref, on avance."
        📦 NŒUD : t_s6_funnel (tampon)
          👉 Choix : "Prendre la route" -> s7_cuisinier
              👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
              (Rejoint la scène : s7_cuisinier)
  👉 Choix : "Ignorer le passé et imposer votre propre calcul strict pour la suite." -> t_s6_A2_confirm
      👁️ Monstre (bandeau): "La règle pure, sans émotion."
    📦 NŒUD : t_s6_A2_confirm (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre observe : « C'est efficace. On maintient la discipline militaire ? »"
      👉 Choix : "Confisquer toutes leurs réserves pour les centraliser." -> t_s6_A2_extend
          👁️ Monstre (bandeau): "L'intendant suprême. J'aime l'excès de zèle."
        📦 NŒUD : t_s6_A2_extend (tampon)
          👉 Choix : "« Tout le monde à part égale. Même vous. »" -> t_s6_A2_climax
              👁️ Monstre (bandeau): "L'égalité mathématique absolue. Implacable."
            📦 NŒUD : t_s6_A2_climax (tampon)
              👉 Choix : "Assumer les conséquences" -> t_s6_funnel
                  👁️ Monstre (bandeau): "Tu as géré cette caravane comme un tableur, {nickname}. Surprise : ce sont des humains. L'égalité pure vient de briser ton groupe. Bref."
                📦 NŒUD : t_s6_funnel (tampon)
                  👉 Choix : "Prendre la route" -> s7_cuisinier
                      👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                      (Rejoint la scène : s7_cuisinier)
          👉 Choix : "Lui donner un peu plus pour qu'elle se taise." -> t_s6_funnel
              👁️ Monstre (bandeau): "La règle pure a ses petites exceptions de confort, apparemment."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
      👉 Choix : "Faire une blague pour détendre l'atmosphère." -> t_s6_funnel
          👁️ Monstre (bandeau): "Un législateur ne fait pas le clown, {nickname}. Pitoyable. On avance."
        📦 NŒUD : t_s6_funnel (tampon)
          👉 Choix : "Prendre la route" -> s7_cuisinier
              👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
              (Rejoint la scène : s7_cuisinier)
  👉 Choix : "Écouter les deux, calmer leurs angoisses et chercher un compromis." -> t_s6_B2_confirm
      👁️ Monstre (bandeau): "La médiation émotionnelle. On est partis pour des heures."
    📦 NŒUD : t_s6_B2_confirm (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre s'ennuie : « Merveilleux. Une thérapie de groupe. On va plus loin dans les sentiments ? »"
      👉 Choix : "Leur demander de se serrer la main." -> t_s6_B2_extend
          👁️ Monstre (bandeau): "C'est beau. On dirait presque du vrai cinéma."
        📦 NŒUD : t_s6_B2_extend (tampon)
          👉 Choix : "Les obliger à s'asseoir et à partager le bouillon." -> t_s6_funnel
              👁️ Monstre (bandeau): "Maman oiseau force ses petits à manger. On atteint des sommets d'assistanat."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
          👉 Choix : "Boire le bouillon vous-même, ils ont eu leur dose." -> t_s6_funnel
              👁️ Monstre (bandeau): "Tu sais t'arrêter avant l'indigestion émotionnelle. Et tu as un bouillon gratuit."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
      👉 Choix : "Regarder votre montre et crier qu'on perd du temps." -> t_s6_funnel
          👁️ Monstre (bandeau): "Tu passes deux heures sur leurs sentiments pour finir en pointeuse d'usine ? Ridicule. Bref."
        📦 NŒUD : t_s6_funnel (tampon)
          👉 Choix : "Prendre la route" -> s7_cuisinier
              👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
              (Rejoint la scène : s7_cuisinier)
  👉 Choix : "Prendre agressivement le parti de Penne, par loyauté pour votre ami." -> t_s6_B1_confirm
      👁️ Monstre (bandeau): "La loyauté toxique. Tu viens de froisser le cerveau de la caravane."
    📦 NŒUD : t_s6_B1_confirm (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre est ravi : « Tu viens de briser le groupe. Tu assumes ta subjectivité ? »"
      👉 Choix : "Aider Linguini à faire ses sacs pour lui montrer la porte." -> t_s6_B1_extend
          👁️ Monstre (bandeau): "Totalement toxique. Formidable. Bon débarras."
        📦 NŒUD : t_s6_B1_extend (tampon)
          👉 Choix : "Lui rendre la carte par principe." -> t_s6_funnel
              👁️ Monstre (bandeau): "Le panache avant la survie. Vous voilà perdus, mais intègres."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
          👉 Choix : "Refuser. C'est la carte de la caravane." -> t_s6_funnel
              👁️ Monstre (bandeau): "Voleur et mauvais ami. Linguini crache par terre. J'adore ton pragmatisme de caniveau."
            📦 NŒUD : t_s6_funnel (tampon)
              👉 Choix : "Prendre la route" -> s7_cuisinier
                  👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
                  (Rejoint la scène : s7_cuisinier)
      👉 Choix : "Tenter d'expliquer logiquement à Linguini que c'est pour la cohésion." -> t_s6_funnel
          👁️ Monstre (bandeau): "Tu es en plein déni. Il crache sur ta fausse logique. Il part."
        📦 NŒUD : t_s6_funnel (tampon)
          👉 Choix : "Prendre la route" -> s7_cuisinier
              👁️ Monstre (bandeau): "Voilà. J'espère que tu aimes ce que tu as fait de tes acteurs, {nickname}. On entre dans le dernier acte."
              (Rejoint la scène : s7_cuisinier)

=========================================================
🎬 SCÈNE PRINCIPALE : s7_cuisinier
=========================================================
📦 NŒUD : s7_cuisinier (scene_porte)
  👉 Choix : "« Ils ont été négligents. Ils n'ont pas fouillé physiquement leurs propres charrettes. »" [Cond: boussole_ternie=false] -> t_s7_A1_std
      👁️ Monstre (bandeau): "Un pragmatisme pur et dur. L'œil de l'inspecteur."
    📦 NŒUD : t_s7_A1_std (tampon)
      👉 Choix : "En prendre note" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "[Boussole Ternie] « Ils n'ont pas fouillé le matériel. D'ailleurs, ma boussole réagit bizarrement depuis hier... »" [Cond: boussole_ternie=true] -> t_s7_A1_hid
      👁️ Monstre (bandeau): "Oh. La mémoire des détails paie enfin."
    📦 NŒUD : t_s7_A1_hid (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît : « Tiens. Ton déchet rocailleux sert finalement à quelque chose. L'intrigue s'épaissit, {nickname}. Garde cette information pour demain. »"
      👉 Choix : "Ranger la boussole discrètement" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "« Une erreur de registre. Ils n'ont pas vérifié leur manifeste de cargaison. »" [Cond: linguini_left=false] -> t_s7_A2_std
      👁️ Monstre (bandeau): "La bureaucratie avant tout. Tu aurais fait un bon greffier."
    📦 NŒUD : t_s7_A2_std (tampon)
      👉 Choix : "Continuer" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "[Contrat de Linguini] « Puisque Linguini est parti, j'ai vérifié notre registre. Il y a une erreur. »" [Cond: linguini_left=true] -> t_s7_A2_hid
      👁️ Monstre (bandeau): "L'opportunisme absolu. Tu assumes parfaitement ton nouveau rôle."
    📦 NŒUD : t_s7_A2_hid (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte dans l'ombre : « Tu as chassé le comptable pour devenir le comptable. Et tu as trouvé une belle anomalie dans leur mascarade. Bravo. »"
      👉 Choix : "Fermer le registre en silence" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "« Ils ont fait confiance à la mauvaise personne. Le danger vient toujours de l'intérieur. »" [Cond: silex_trappeur=false] -> t_s7_B2_std
      👁️ Monstre (bandeau): "L'intuition relationnelle. Tu lis les gens, pas les cartes."
    📦 NŒUD : t_s7_B2_std (tampon)
      👉 Choix : "Se taire" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "[Silex de Trappeur] « Ils étaient aveugles. Comme ce silex que tu m'as donné, Brodo : le feu révèle ce qui est caché. »" [Cond: silex_trappeur=true] -> t_s7_B2_hid
      👁️ Monstre (bandeau): "Utiliser un cadeau comme métaphore. Une flatterie psychologique brillante."
    📦 NŒUD : t_s7_B2_hid (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre sourit : « La paranoïa s'installe doucement. J'aime beaucoup la tournure de cette pièce. »"
      👉 Choix : "Hocher la tête" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "« La cupidité attire la mort. C'est le destin qui punit l'avidité des hommes. »" [Cond: grogno_dead=true] -> t_s7_B1_std
      👁️ Monstre (bandeau): "Une fable abstraite. Les concepts avant la réalité."
    📦 NŒUD : t_s7_B1_std (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre pouffe : « Une fable poétique à des gens qui dorment dans la boue ? Tu as perdu ton auditoire, poète. »"
      👉 Choix : "Aller dormir" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)
  👉 Choix : "« L'or est un poison. C'est l'avidité des marchands qui a scellé leur destin. » (Fixer Grogno)" [Cond: grogno_dead=false] -> t_s7_B1_hid
      👁️ Monstre (bandeau): "La provocation philosophique. Osé, {nickname}."
    📦 NŒUD : t_s7_B1_hid (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, estomaqué : « Voilà. Tu as littéralement tué un homme avec de la mauvaise philosophie, {nickname}. Je n'aurais pas osé. Rideau pour Grogno. »"
      👉 Choix : "Assumer le chaos" -> t_s7_funnel
        📦 NŒUD : t_s7_funnel (tampon)
          👉 Choix : "Prendre la route" -> s8_philosophie
              👁️ Monstre (bandeau): "Le dernier jour. Tout va exploser avant la fin, et j'ai hâte d'être au premier rang. On avance."
              (Rejoint la scène : s8_philosophie)

=========================================================
🎬 SCÈNE PRINCIPALE : s8_philosophie
=========================================================
📦 NŒUD : s8_philosophie (scene_porte)
  👉 Choix : "« Pour l'or. La route n'est qu'un outil, seul le résultat compte. »" -> t_s8_phil_or
      👁️ Monstre (bandeau): "Un pragmatisme assumé. Tu as le cœur aussi sec qu'un livre de comptes."
    📦 NŒUD : t_s8_phil_or (tampon)
      👉 Choix : "Attendre la suite" -> s8_course
          (Rejoint la scène : s8_course)
  👉 Choix : "« Pour la maîtrise. L'or se dépense, l'expérience reste. »" -> t_s8_phil_maitrise
      👁️ Monstre (bandeau): "L'idéaliste prend la parole. Une belle phrase pour quelqu'un couvert de boue."
    📦 NŒUD : t_s8_phil_maitrise (tampon)
      👉 Choix : "Attendre la suite" -> s8_course
          (Rejoint la scène : s8_course)
  👉 Choix : "« Pour eux. Je ne tire pas des charrettes, je protège mes gens. »" -> t_s8_phil_gens
      👁️ Monstre (bandeau): "Le berger et son troupeau. C'est presque émouvant, {nickname}."
    📦 NŒUD : t_s8_phil_gens (tampon)
      👉 Choix : "Attendre la suite" -> s8_course
          (Rejoint la scène : s8_course)
  👉 Choix : "« Je n'en ai aucune idée. J'avance, c'est tout. »" -> t_s8_phil_rien
      👁️ Monstre (bandeau): "La crise existentielle au milieu de la poussière. Merveilleux."
    📦 NŒUD : t_s8_phil_rien (tampon)
      👉 Choix : "Attendre la suite" -> s8_course
          (Rejoint la scène : s8_course)

=========================================================
🎬 SCÈNE PRINCIPALE : s8_course
=========================================================
📦 NŒUD : s8_course (scene_porte)
  👉 Choix : "[Linguini est là] Calquer exactement notre formation et notre rythme sur les siens." [Cond: linguini_left=false] -> t_s8_A1_linguini
      👁️ Monstre (bandeau): "Copier l'expert à la lettre. Le triomphe de la méthode."
    📦 NŒUD : t_s8_A1_linguini (tampon)
      👉 Choix : "Savourer l'efficacité" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "[Linguini est parti] Tenter de copier son organisation parfaite nous-mêmes." [Cond: linguini_left=true] -> t_s8_A1_nolinguini
      👁️ Monstre (bandeau): "Copier un expert sans avoir le cerveau pour le faire. Un désastre en approche."
    📦 NŒUD : t_s8_A1_nolinguini (tampon)
      👉 Choix : "Assumer l'humiliation" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "[Grogno est vivant] Adapter son rythme sans changer notre formation." [Cond: grogno_dead=false] -> t_s8_A2_grogno
      👁️ Monstre (bandeau): "Un compromis prudent. On accélère sans tout casser."
    📦 NŒUD : t_s8_A2_grogno (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît : « La jalousie et la gravité. Un cocktail mortel. Adieu, Grogno. »"
      👉 Choix : "Laisser le corps et finir la montée" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "[Grogno est mort] Adapter son rythme. Sans Grogno, on est plus légers." [Cond: grogno_dead=true] -> t_s8_A2_nogrogno
      👁️ Monstre (bandeau): "L'avantage macabre du convoi réduit. Cynique mais efficace."
    📦 NŒUD : t_s8_A2_nogrogno (tampon)
      👉 Choix : "Reprendre son souffle" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "Ignorer sa course. Chercher un chemin intuitif à travers la brume des bas-fonds." [Cond: boussole_ternie=false] -> t_s8_B2_std
      👁️ Monstre (bandeau): "L'intuition face à la mécanique. Tu joues aux dés avec le brouillard."
    📦 NŒUD : t_s8_B2_std (tampon)
      👉 Choix : "Rejoindre le sommet lentement" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "[Boussole] Se fier à la boussole pour tracer un chemin parfait dans la brume." [Cond: boussole_ternie=true] -> t_s8_B2_boussole
      👁️ Monstre (bandeau): "Enfin. Ton gadget inutile devient ton salut. J'adore les retournements de situation."
    📦 NŒUD : t_s8_B2_boussole (tampon)
      👉 Choix : "Le saluer ironiquement" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)
  👉 Choix : "Couper tout droit à travers le ravin rocheux. L'instinct pur, sans réfléchir." -> t_s8_B1_std
      👁️ Monstre (bandeau): "Le suicide tactique. Tu vas briser tes charrettes pour une question d'ego."
    📦 NŒUD : t_s8_B1_std (tampon)
      👉 Choix : "Constater les dégâts" -> t_s8_funnel
        📦 NŒUD : t_s8_funnel (tampon)
          👉 Choix : "Descendre vers la ville" -> s9_veuve
              👁️ Monstre (bandeau): "On y est, {nickname}. Risoletto. Mais les portes de la ville sont encore fermées, et quelqu'un t'attend sur le chemin."
              (Rejoint la scène : s9_veuve)

=========================================================
🎬 SCÈNE PRINCIPALE : s9_veuve
=========================================================
📦 NŒUD : s9_veuve (scene_porte)
  👉 Choix : "[Grogno est vivant] Refuser fermement. Ce chantage est irrationnel." [Cond: grogno_dead=false] -> t_s9_A1_grogno
      👁️ Monstre (bandeau): "La logique face au drame. Implacable."
    📦 NŒUD : t_s9_A1_grogno (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre flotte au-dessus du pont : « Eh bien. Sa radinerie aura finalement été utile à la communauté. Paix à son âme. Bref, on avance. »"
      👉 Choix : "Franchir les portes" -> t_s9_funnel
        📦 NŒUD : t_s9_funnel (tampon)
          👉 Choix : "Entrer dans la ville" -> s10_foire_placeholder
              👁️ Monstre (bandeau): "On y est. La ligne d'arrivée. Profite de la fête, {nickname}. La dernière scène approche."
            📦 NŒUD : s10_foire_placeholder (scene_porte_placeholder)
              👉 Choix : "Recommencer l'aventure" -> g1_eveil
                📦 NŒUD : g1_eveil (genese)
                  👉 Choix : "Tu avances." -> g2_rencontre
                    📦 NŒUD : g2_rencontre (genese)
                      👉 Choix : "De quoi parles-tu ?" -> g3_briefing
                        📦 NŒUD : g3_briefing (genese)
                          👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                            📦 NŒUD : g4_faux_choix (genese)
                              👉 Choix : "Je la prends." -> s1_bagolio
                                  👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                                  (Rejoint la scène : s1_bagolio)
  👉 Choix : "[Grogno est mort] Refuser net et avancer. Les morts ne font pas la loi." [Cond: grogno_dead=true] -> t_s9_A1_nogrogno
      👁️ Monstre (bandeau): "Froideur absolue. Tu marches sur les fantômes."
    📦 NŒUD : t_s9_A1_nogrogno (tampon)
      👉 Choix : "Franchir les portes" -> t_s9_funnel
        📦 NŒUD : t_s9_funnel (tampon)
          👉 Choix : "Entrer dans la ville" -> s10_foire_placeholder
              👁️ Monstre (bandeau): "On y est. La ligne d'arrivée. Profite de la fête, {nickname}. La dernière scène approche."
            📦 NŒUD : s10_foire_placeholder (scene_porte_placeholder)
              👉 Choix : "Recommencer l'aventure" -> g1_eveil
                📦 NŒUD : g1_eveil (genese)
                  👉 Choix : "Tu avances." -> g2_rencontre
                    📦 NŒUD : g2_rencontre (genese)
                      👉 Choix : "De quoi parles-tu ?" -> g3_briefing
                        📦 NŒUD : g3_briefing (genese)
                          👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                            📦 NŒUD : g4_faux_choix (genese)
                              👉 Choix : "Je la prends." -> s1_bagolio
                                  👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                                  (Rejoint la scène : s1_bagolio)
  👉 Choix : "Négocier pragmatiquement et lui offrir des vivres au lieu de l'or." -> t_s9_A2
      👁️ Monstre (bandeau): "Le marchandage. Moins héroïque, mais ça préserve la trésorerie."
    📦 NŒUD : t_s9_A2 (tampon)
      👉 Choix : "Franchir les portes" -> t_s9_funnel
        📦 NŒUD : t_s9_funnel (tampon)
          👉 Choix : "Entrer dans la ville" -> s10_foire_placeholder
              👁️ Monstre (bandeau): "On y est. La ligne d'arrivée. Profite de la fête, {nickname}. La dernière scène approche."
            📦 NŒUD : s10_foire_placeholder (scene_porte_placeholder)
              👉 Choix : "Recommencer l'aventure" -> g1_eveil
                📦 NŒUD : g1_eveil (genese)
                  👉 Choix : "Tu avances." -> g2_rencontre
                    📦 NŒUD : g2_rencontre (genese)
                      👉 Choix : "De quoi parles-tu ?" -> g3_briefing
                        📦 NŒUD : g3_briefing (genese)
                          👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                            📦 NŒUD : g4_faux_choix (genese)
                              👉 Choix : "Je la prends." -> s1_bagolio
                                  👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                                  (Rejoint la scène : s1_bagolio)
  👉 Choix : "Payer la pièce pour chaque marchand, par respect pour son deuil." -> t_s9_B2
      👁️ Monstre (bandeau): "L'empathie coûte cher, mais elle achète la paix de l'esprit."
    📦 NŒUD : t_s9_B2 (tampon)
      👉 Choix : "Franchir les portes" -> t_s9_funnel
        📦 NŒUD : t_s9_funnel (tampon)
          👉 Choix : "Entrer dans la ville" -> s10_foire_placeholder
              👁️ Monstre (bandeau): "On y est. La ligne d'arrivée. Profite de la fête, {nickname}. La dernière scène approche."
            📦 NŒUD : s10_foire_placeholder (scene_porte_placeholder)
              👉 Choix : "Recommencer l'aventure" -> g1_eveil
                📦 NŒUD : g1_eveil (genese)
                  👉 Choix : "Tu avances." -> g2_rencontre
                    📦 NŒUD : g2_rencontre (genese)
                      👉 Choix : "De quoi parles-tu ?" -> g3_briefing
                        📦 NŒUD : g3_briefing (genese)
                          👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                            📦 NŒUD : g4_faux_choix (genese)
                              👉 Choix : "Je la prends." -> s1_bagolio
                                  👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                                  (Rejoint la scène : s1_bagolio)
  👉 Choix : "Prendre toute la culpabilité de la route et offrir votre propre vie au vide." -> t_s9_B1_suicide
      👁️ Monstre (bandeau): "Pardon ? Tu sors du script ?"
    📦 NŒUD : t_s9_B1_suicide (tampon)
      ⚠️ MONSTRE DANS LE BODY : "Le Monstre apparaît, complètement abasourdi : « Tu te sacrifies pour des figurants ? C'est la fin la plus absurde, la plus illogique et la plus magnifique que j'aie jamais vue. Rien ne t'y obligeait. Chapeau bas, l'artiste. Rideau. »"
      👉 Choix : "Fermer les yeux (Renaître)" -> g1_eveil
        📦 NŒUD : g1_eveil (genese)
          👉 Choix : "Tu avances." -> g2_rencontre
            📦 NŒUD : g2_rencontre (genese)
              👉 Choix : "De quoi parles-tu ?" -> g3_briefing
                📦 NŒUD : g3_briefing (genese)
                  👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                    📦 NŒUD : g4_faux_choix (genese)
                      👉 Choix : "Je la prends." -> s1_bagolio
                          👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                          (Rejoint la scène : s1_bagolio)

=========================================================
🎬 SCÈNE PRINCIPALE : s10_foire_placeholder
=========================================================
📦 NŒUD : s10_foire_placeholder (scene_porte_placeholder)
  👉 Choix : "Recommencer l'aventure" -> g1_eveil
    📦 NŒUD : g1_eveil (genese)
      👉 Choix : "Tu avances." -> g2_rencontre
        📦 NŒUD : g2_rencontre (genese)
          👉 Choix : "De quoi parles-tu ?" -> g3_briefing
            📦 NŒUD : g3_briefing (genese)
              👉 Choix : "Et si je refuse ?" -> g4_faux_choix
                📦 NŒUD : g4_faux_choix (genese)
                  👉 Choix : "Je la prends." -> s1_bagolio
                      👁️ Monstre (bandeau): "Voilà. Excellent. Ferme les yeux une seconde. Quand tu les rouvres, t'es à Bagolio. Et essaye de pas tout casser."
                      (Rejoint la scène : s1_bagolio)