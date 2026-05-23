-- Migration v3.12 : Eau coopérative + Macaron'île
--
-- Ajoute un flag one-way (false → true à vie) qui marque la première baignade
-- du joueur. Une fois true, le joueur peut traverser les cases waterShallow seul.
-- Avant ça, il faut qu'un autre joueur (ou JOJO en cas de "dernier joueur")
-- le pousse pour qu'il bascule à true et atterrisse dans le canal de Macaron'île.
--
-- Architecture du canal (10 cases waterShallow) : implémenté dans la map
-- "macaron_ile" qui contient le canal au nord + plage + ville.

ALTER TABLE "GamebookProgress"
  ADD COLUMN "firstSwimDone" BOOLEAN NOT NULL DEFAULT FALSE;
