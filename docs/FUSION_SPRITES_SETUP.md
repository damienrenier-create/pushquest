# Génération de sprites de fusion — installation & **garantie de budget**

Ce document explique comment **activer** (optionnellement) la génération automatique des
sprites de Daemons fusionnés, et surtout **comment garantir que ça ne dépasse jamais 20 €**.

> **Par défaut, tout est ÉTEINT.** Tant que `FUSION_GEN_ENABLED` ≠ `"true"`, le jeu n'appelle
> **jamais** l'API payante : chaque fusion affiche le **placeholder « Chimère »** (les deux parents
> en diagonale, teinté par le type). **Coût = 0 €.** Tu ne paies **que** si tu suis l'étape 2 ci-dessous.

---

## 🛡️ La garantie de budget (à lire avant tout)

Il y a **trois ceintures de sécurité**, du plus fort au plus souple :

| # | Ceinture | Où | Ce qu'elle garantit |
|---|----------|-----|---------------------|
| **1** | **Budget Google Cloud** | Console Google Cloud → Billing | **LA vraie garantie.** Coupe/alerte la facturation au seuil que TU fixes. |
| **2** | **Plafond TOTAL applicatif** | `FUSION_GEN_TOTAL_CAP` (défaut **500**) | Au plus ~500 images à vie ≈ **~22 $**. Au-delà : plus aucune génération. |
| **3** | **Plafond journalier** | `FUSION_GEN_DAILY_CAP` (défaut **50**) | Au plus 50 nouvelles paires / 24 h (anti-emballement). |

> ⚠️ **Seule la ceinture 1 (budget Google Cloud) est une garantie *matérielle*.** Les ceintures 2 et 3
> vivent dans le code : elles suffisent en usage normal, mais **le budget Cloud est ce qui t'empêche
> *absolument* de dépasser.** **Ne saute pas l'étape 2.**

**Ordre de grandeur** : modèle image Gemini « Nano Banana » en **0,5K (512 px)** ≈ **0,045 $ / image**.
500 images ≈ **~22 $ (~21 €)** : ce plafond applicatif **effleure** la limite des 20 €, donc **le budget Google Cloud (≈15 €) reste le vrai garde-fou** — tu l'atteins bien avant les 500. Pour 7 potes et ~200 espèces, tu généreras au fil de l'eau.

---

## Étape 1 — Style (rien à générer)

Aucun script à lancer : le générateur **normalise les sprites de référence à la volée** (il fetch les
sprites originaux déjà déployés dans `public/` et les recadre en mémoire). Pas de dossier `_norm` à committer.

Il reste juste, si tu veux ajuster le rendu, à éditer `src/lib/gamebook/yellow/server/fusionStyleBible.ts` :
- `STYLE_ANCHORS` = 2-3 **chemins** de sprites représentatifs du style (défaut : les 3 chimères faites main
  `fusion/dracorex.png`, `fusion/pyromaree.png`, `fusion/aquilwatt.png`) ;
- `STYLE_BIBLE` = la consigne de style (déjà calée sur ton pixel art détaillé).

---

## Étape 2 — Poser le **budget Google Cloud** (LA garantie ≤ 20 €)

**Ne saute pas cette étape.** C'est elle qui rend le dépassement *impossible*.

1. [console.cloud.google.com](https://console.cloud.google.com) → sélectionne ton projet.
2. **Billing → Budgets & alerts → Create budget**.
3. Montant : **15 €** (marge sous 20 €). Période : mensuelle.
4. Seuils d'alerte : 50 % / 90 % / 100 % → alertes e-mail à `damienrenier@hotmail.com`.
5. **(fortement conseillé)** Coupe *dure* : ajoute une alerte à 100 % qui déclenche une
   **Cloud Function** désactivant la facturation du projet (guide Google :
   « *Disable billing to stop usage* »). C'est ce qui **arrête** réellement les dépenses.

> Sans coupe dure, le budget **alerte** mais ne bloque pas instantanément. Pour un plafond
> *matériel*, le budget Cloud (~15 €) coupe AVANT le plafond applicatif (500 ≈ ~22 $) : les deux ensemble te bordent.

---

## Étape 3 — Clés & activation

1. **Clé Gemini** : [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → `GEMINI_API_KEY`.
2. **Vercel Blob** : Vercel → **Storage → Blob → Create** → copie le token → `BLOB_READ_WRITE_TOKEN`.
3. Renseigne le `.env` (local) **et** Vercel → *Settings → Environment Variables* (Production) :

   ```
   FUSION_GEN_ENABLED=true
   GEMINI_API_KEY=...
   BLOB_READ_WRITE_TOKEN=...
   FUSION_GEN_TOTAL_CAP=500
   FUSION_GEN_DAILY_CAP=50
   ```

4. **Migration additive** de la table de cache (une seule fois) :

   ```bash
   npx prisma db push
   ```

   → crée la table `FusionSprite` (cache des générations). **Additif**, ne touche aucune donnée existante.
   Tant qu'elle n'existe pas, le code reste neutre (placeholder), sans erreur.

---

## Comment ça marche (résumé)

- Quand un joueur **prévisualise** une fusion (Autel de la Chimère / Atelier / comparaison plein écran),
  le client appelle `/api/gamebook/yellow/fusion-sprite`.
- Le serveur **génère une seule fois par paire** (clé canonique triée, ordre indifférent), met en cache
  l'URL Blob, et la réutilise partout ensuite. Les paires qui ont un **sprite officiel** ne sont jamais générées.
- Avant tout appel facturé, le serveur vérifie les plafonds **TOTAL** et **journalier**. Si armé n'est pas
  vrai, il répond immédiatement `disabled` — **aucun réseau, aucun coût**.
- Un échec de génération n'affiche jamais d'erreur au joueur : il retombe sur le **placeholder Chimère**.

## Pour tout couper d'un coup

Mets `FUSION_GEN_ENABLED=false` (ou supprime-la) dans Vercel puis redéploie. Retour immédiat au
placeholder, **0 € garanti**. Les sprites déjà générés (en cache Blob) restent affichés.
