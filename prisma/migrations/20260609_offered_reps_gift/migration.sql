-- Cadeau de reps (offrir des reps à un autre joueur)
-- Migration ADDITIVE : colonne nullable + index. Aucune donnée existante impactée.

ALTER TABLE "ExerciseSet" ADD COLUMN IF NOT EXISTS "offeredToUserId" TEXT;

CREATE INDEX IF NOT EXISTS "ExerciseSet_offeredToUserId_date_idx" ON "ExerciseSet"("offeredToUserId", "date");
