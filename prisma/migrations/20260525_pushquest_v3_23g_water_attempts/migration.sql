-- Migration v3.23g : Compteur de tentatives d'entrée dans l'eau (avant le premier bain).
-- Sert à afficher 5 messages narratifs progressifs qui révèlent la mécanique du push coopératif.
ALTER TABLE "GamebookProgress"
  ADD COLUMN "waterShallowAttempts" INTEGER NOT NULL DEFAULT 0;
