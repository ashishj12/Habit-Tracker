/*
  Warnings:

  - The `completed_date` column on the `completions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "completions" DROP COLUMN "completed_date",
ADD COLUMN     "completed_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "completions_habit_id_completed_date_idx" ON "completions"("habit_id", "completed_date");

-- CreateIndex
CREATE INDEX "completions_completed_date_idx" ON "completions"("completed_date");

-- CreateIndex
CREATE UNIQUE INDEX "completions_habit_id_completed_date_key" ON "completions"("habit_id", "completed_date");
