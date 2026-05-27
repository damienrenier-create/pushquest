# AUDIT_05_UX.md — UX Designer

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27

---

## 1. Architecture UX

### 1.1 Le `MapClient` est l'unique écran

Tout passe par `MapClient.tsx` (5791 lignes) :
- Affichage map + sprites
- HUD énergie
- Modales (dialogue, shop, inventaire, combat, casino, défi)
- Cinématiques (téléport, sommet, sauvetage)

→ **Un seul écran, beaucoup de couches modales empilées.** Aucune route URL distincte pour chaque sous-écran. Conséquence : F5 perd l'état modal local (un joueur en plein dialogue qui recharge la page revient au monde).

### 1.2 🔴 Aucun deeplink

Impossible d'envoyer à un pote « va voir ce dialogue ici » ou de bookmarker une situation. Toute la navigation est state-only.

---

## 2. HUD & feedback

### 2.1 🟢 HUD énergie permanent — bon

L'énergie disponible est toujours visible. Le coût d'un déplacement (10) est implicite mais constant.

### 2.2 🟠 Pas de prévisualisation du coût

Aucune surimpression « -10 » au survol d'une case. Le joueur apprend par l'expérience. OK pour le tuto, mais sur une décision de longue distance (« si je vais à Pépiteville, ça me coûte combien ? »), pas d'info anticipée.

### 2.3 🔴 Feedback du débit pas toujours synchrone

Plusieurs routes `update` puis le client re-fetch. Latence visible (250-600ms). Pas d'optimistic UI cohérent. Sur les actions rapides (combat, casino), le joueur voit son HP/énergie sauter en différé.

### 2.4 🟠 Aucune notification persistante

Pas de toast d'historique « +200 XP Pionnier reçu ». Le dialogue passe une fois, après c'est perdu. Pas de panneau « événements de la session ».

---

## 3. Onboarding

### 3.1 🔴 Pas de tutoriel des contrôles

Le joueur arrive sur le `MapClient`. Aucun overlay ne lui dit « flèches pour bouger », « ESC pour menu », « E pour interact », « START pour ouvrir le sac ». Le dialogue d'intro mentionne « START pour ouvrir ton sac » au milieu d'un texte sans mise en évidence visuelle du bouton.

### 3.2 🟠 Le `hasSeenWelcomeScreen` est binaire

Soit le joueur a vu, soit pas. Aucune re-onboarding « ça fait 2 mois, voici ce que tu as oublié ». 7 potes ≠ tous régulier.

---

## 4. Modalité dialogue

### 4.1 🟢 Avancement step-by-step lisible

L'utilisateur clique pour avancer. Cohérent avec les JRPG.

### 4.2 🔴 Aucun back/forward

Un joueur qui clique trop vite et rate une ligne ne peut pas revenir. Sur des intros de 13 lignes, c'est frustrant.

### 4.3 🟡 Pas de skip pour dialogues déjà vus

Re-visiter PEPITO joue toujours `PEPITO_DIALOGUE_AFTER` (2 lignes — OK), mais d'autres PNJ rejouent toute leur intro. À vérifier (Phase 1.8).

---

## 5. Combat Daemon

### 5.1 🟠 Aucune indication de type

Les 10 types Daemon (Feu, Eau, Plante, Combat, Roche...) existent en code. Le joueur les voit-il ? Avec quel feedback ? Si non → frustration garantie au moment d'un combat où le type compte.

### 5.2 🔴 Aucune UI de "vue d'équipe"

`Daemon.slotIndex` suggère plusieurs slots. La gestion d'équipe (swap, ordre, équipement par daemon) doit avoir une UI. **À cartographier en Phase 1.8.**

---

## 6. Casino

### 6.1 🟢 5 jeux distincts visuellement différents

Bonne variété (rouge/noir, cockfight, lotto, slot, pattern, stop-ou-encore).

### 6.2 🟠 Aucune mémoire des stats joueur

Le joueur ne voit pas « tu as gagné X / perdu Y depuis le début ». Pas de feedback méta. Une simple ligne dans l'inventaire suffirait.

---

## 7. Accessibilité

### 7.1 🔴 Aucune option contraste/taille texte

Les dialogues sont sur fond foncé (à vérifier), texte petit sur mobile. Aucune option d'accessibilité visible dans le code.

### 7.2 🔴 Aucune nav clavier exhaustive

À vérifier — `MapClient` semble utiliser les flèches pour bouger, mais les modales (sac, shop) sont-elles entièrement navigables au clavier ?

### 7.3 🟡 Aucune annonce aria

Le mode lecteur d'écran est probablement inutilisable.

---

## 8. Mobile

### 8.1 🟠 Pas de contrôles tactiles évidents

Le code de `MapClient` mérite un audit visuel. Sartay teste-t-il mobile ?

---

## 9. Synthèse criticité

| # | Constat | Criticité |
|---|---|---|
| 1 | Aucun deeplink / routing modal | 🔴 |
| 2 | Pas de tuto des contrôles | 🔴 |
| 3 | Pas de back/forward dialogue | 🔴 |
| 4 | Pas d'UI équipe Daemon | 🔴 |
| 5 | Pas d'options d'accessibilité | 🔴 |
| 6 | Pas de prévisualisation coût | 🟠 |
| 7 | Feedback débit non optimiste | 🟠 |
| 8 | Aucune mémoire stats casino | 🟠 |
| 9 | Mobile non audité | 🟠 |

---
