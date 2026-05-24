-- Migration v3.23c-2 : Défis intersalle de Muscuville (contest_hall)
--
-- 3 PNJ adversaires donnent chacun un défi one-shot :
--   - POMPATOR  : 200 pompes du jour → +100 reps
--   - SQUATILUS : 250 squats du jour → +100 reps
--   - TIROIR    : 30 tractions du jour → +100 reps
--
-- Validation côté serveur via ExerciseSet sums. One-shot par défi (3 flags).

ALTER TABLE "GamebookProgress"
  ADD COLUMN "contestDefiPompatorDone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contestDefiSquatilusDone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contestDefiTiroirDone" BOOLEAN NOT NULL DEFAULT false;
