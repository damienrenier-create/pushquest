const fs = require('fs');

const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));
let nodes = data.nodes;

// Etape 1: Nettoyer le Monstre du body
console.log("--- Etape 1 : Nettoyage Monstre ---");
const monsterRegex = /(?:Le Monstre|Le monstre)[^:«"”]*[:«"”]\s*«?\s*([^»"”\n]+)\s*»?/g;

// Compter les liens entrants pour chaque noeud
const getIncomingChoices = (targetId) => {
    let incoming = [];
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.choices) {
            node.choices.forEach(c => {
                if (c.nextNodeId === targetId) {
                    incoming.push({ nodeId, choice: c });
                }
            });
        }
    }
    return incoming;
};

for (const [nodeId, node] of Object.entries(nodes)) {
    if (node.body) {
        let match;
        // On cherche le texte du monstre
        let newBody = node.body;
        let foundComment = null;
        
        while ((match = monsterRegex.exec(node.body)) !== null) {
            foundComment = match[1].trim(); // Le texte entre guillemets
            // Retirer toute la phrase du body
            const sentenceRegex = new RegExp(`(?:Le Monstre|Le monstre)[^:«"”]*[:«"”]\\s*«?\\s*` + escapeRegExp(match[1]) + `\\s*»?`, 'g');
            newBody = newBody.replace(sentenceRegex, '').trim();
        }
        
        if (foundComment) {
            // Nettoyer les sauts de ligne en trop
            newBody = newBody.replace(/\n{3,}/g, '\n\n').trim();
            node.body = newBody;
            
            // Trouver qui pointe vers ce noeud
            let incoming = getIncomingChoices(nodeId);
            incoming.forEach(inc => {
                // Si on a déjà un commentaire de monstre, on le garde ou on combine
                if (!inc.choice.monsterComment) {
                    inc.choice.monsterComment = foundComment;
                    console.log(`Déplacé vers choix ${inc.choice.id} (dans ${inc.nodeId}) -> ${foundComment}`);
                }
            });
        }
    }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Etape 2: Fusion des tampons redondants
console.log("\n--- Etape 2 : Fusion Tampons ---");
const genericTexts = ["Continuer", "Attendre la suite", "En prendre note", "Se taire"];

let changed = true;
while (changed) {
    changed = false;
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.choices && node.choices.length === 1) {
            let choice = node.choices[0];
            
            // Si le texte est générique et n'a pas de condition spéciale
            if (genericTexts.includes(choice.text) && !choice.condition) {
                let targetId = choice.nextNodeId;
                let targetNode = nodes[targetId];
                
                // Si la cible est aussi un tampon
                if (targetNode && targetNode.kind === 'tampon' || targetNode && targetNode.kind === 'scene_porte_placeholder') {
                    // On vérifie que personne d'autre ne pointe vers targetId (pour éviter de casser d'autres branches)
                    let incoming = getIncomingChoices(targetId);
                    if (incoming.length === 1) {
                        console.log(`Fusion: ${nodeId} absorbe ${targetId}`);
                        
                        // Combiner les corps de texte
                        if (targetNode.body) {
                            if (node.body) node.body += "\n\n";
                            else node.body = "";
                            node.body += targetNode.body;
                        }
                        
                        // Combiner les flags
                        if (targetNode.flags) {
                            node.flags = node.flags || {};
                            Object.assign(node.flags, targetNode.flags);
                        }
                        
                        // Reprendre les choix du noeud cible
                        node.choices = JSON.parse(JSON.stringify(targetNode.choices)); // Deep copy
                        
                        // Si le noeud cible avait un monsterComment sur le choix générique, on le perd, mais ce n'est généralement pas le cas.
                        
                        // Retirer le targetNode de la liste (optionnel, mais propre)
                        delete nodes[targetId];
                        changed = true;
                        break; // Recommencer la boucle car l'objet a été modifié
                    }
                }
            }
        }
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('\nNettoyage terminé !');
